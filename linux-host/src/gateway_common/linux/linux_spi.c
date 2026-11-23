/******************************************************************************
 @file linux_spi.c

 @brief Linux spidev + sysfs GPIO implementation of the TRX SPI stream.

 Replaces linux_uart.c as the transport to the RCP when [spi-cfg] is used.
 Threading model (same as the UART stream with the rd_thread flag):
   - one rx thread waits for the TRX INT line, reads the pending SPI blocks and
     pushes the MT bytes into a FIFO;
   - STREAM_rdBytes() reads from that FIFO;
   - STREAM_wrBytes() runs the SPI transactions on the caller's thread.
 A mutex serializes the two users of the bus.

 Bus handling is ported from loki-trx-rcp-wisun host_rcp/trx_spi/trx_spi_master.c
 (tested against the TRX): SPI mode 0, 8 bit, hardware chip select driven by
 the kernel around each ioctl, INT on a sysfs GPIO with edge "falling".
 *****************************************************************************/
#include "stream.h"
#include "fifo.h"
#include "threads.h"
#include "stream_spi.h"
#include "trx_spi_link.h"
#include "mpsse_spi.h"
#include "trx_spi_log.h"
#ifdef ENABLE_FTDI_SPI
#include "linux_ftdi_io.h"
#endif
#include "log.h"
#include "timer.h"

#define _STREAM_IMPLIMENTOR_ 1
#include "stream_private.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <fcntl.h>
#include <errno.h>
#include <poll.h>
#include <pthread.h>
#include <time.h>
#include <sys/ioctl.h>
#include <linux/spi/spidev.h>
#include <gpiod.h>
#include <dirent.h>


#include "ns_trace.h"
#define TRACE_GROUP "spi"

#define SPI_MODE_VALUE      0       /* CPOL=0 CPHA=0 */
#define SPI_BITS            8
#define RX_FIFO_BYTES       (16 * 1024)
#define INT_WAIT_MS         100
#define RESET_HOLD_US       1000
#define RESET_RELEASE_US    30000

static const int spi_test = 'S';

/* Routes the SPI stack's log lines into the application trace (trace group "spi") */
static void spi_log_sink(void *user, int level, const char *msg)
{
    (void)user;
    switch (level) {
    case TRXLOG_ERROR: tr_err("%s", msg); break;
    case TRXLOG_WARN:  tr_warn("%s", msg); break;
    case TRXLOG_INFO:  tr_info("%s", msg); break;
    default:           tr_debug("%s", msg); break;
    }
}

#define LSTS_birth 0
#define LSTS_alive 1
#define LSTS_exit  2
#define LSTS_dead  3

struct linux_spi {
    struct io_stream *pParent;
    const int *test_ptr;
    struct spi_cfg cfg;
    int spi_fd;
    struct gpiod_chip *int_chip;
    struct gpiod_line *int_line;
    int int_event_fd;
    struct gpiod_chip *reset_chip;
    struct gpiod_line *reset_line;
    struct trx_rcp_link link;
    const struct trx_spi_ops *ops;     /* spidev ops or the MPSSE ops */
    void *ops_ctx;                     /* this, or &mpsse */
    struct mpsse_spi mpsse;            /* backend = ftdi */
#ifdef ENABLE_FTDI_SPI
    struct ftdi_io *ftdi;
#endif
    pthread_mutex_t bus_lock;
    bool lock_init;
    volatile int thread_state;
    intptr_t rx_fifo;
    intptr_t rx_thread;
    volatile uint32_t fifo_overflow;
    uint64_t last_stats_us;
    uint64_t rx_loops;
    uint64_t opened_us;
    uint32_t wr_calls;
    uint32_t wr_bytes;
    uint32_t wr_failures;
    uint32_t rd_calls;
    uint32_t rd_bytes;
    uint32_t rd_timeouts;
    uint32_t rx_service_errors;
    uint32_t rx_service_errors_in_row;
    uint32_t fifo_high;
    uint32_t int_wait_timeouts;
    uint32_t int_waits;
};
/* ------------------------------------------------------------------ */
/* libgpiod helpers (maps global GPIO numbers to chip + line offset)   */
/* ------------------------------------------------------------------ */
static int gpio_resolve_chip_offset(int global_gpio, char *chip_name, size_t chip_name_len, unsigned int *offset)
{
    if (global_gpio < 0 || chip_name == NULL || chip_name_len == 0 || offset == NULL) {
        return -1;
    }

    /* Maps global GPIO numbers to /dev/gpiochipN + line offset across all kernels:
     *   gpio 0..31   -> gpiochip0, offset 0..31
     *   gpio 32..63  -> gpiochip1, offset 0..31  (e.g. gpio 60 / P9_12 -> gpiochip1, line 28)
     *   gpio 64..95  -> gpiochip2, offset 0..31
     *   gpio 96..127 -> gpiochip3, offset 0..31 */
    snprintf(chip_name, chip_name_len, "gpiochip%d", global_gpio / 32);
    *offset = (unsigned int)(global_gpio % 32);
    return 0;
}


static struct gpiod_line *gpio_acquire_line(int global_gpio, struct gpiod_chip **out_chip)
{
    char chip_name[32];
    unsigned int offset = 0;
    struct gpiod_chip *chip;
    struct gpiod_line *line;

    if (gpio_resolve_chip_offset(global_gpio, chip_name, sizeof(chip_name), &offset) < 0) {
        return NULL;
    }
    chip = gpiod_chip_open_by_name(chip_name);
    if (chip == NULL) {
        TRXLOG(TRXLOG_ERROR, "libgpiod: cannot open %s for gpio %d: %s", chip_name, global_gpio, strerror(errno));
        return NULL;
    }
    line = gpiod_chip_get_line(chip, offset);
    if (line == NULL) {
        TRXLOG(TRXLOG_ERROR, "libgpiod: cannot get %s line %u (gpio %d): %s", chip_name, offset, global_gpio,
               strerror(errno));
        gpiod_chip_close(chip);
        return NULL;
    }
    *out_chip = chip;
    return line;
}

/* ------------------------------------------------------------------ */
/* trx_spi_ops implementation                                          */
/* ------------------------------------------------------------------ */
static int ops_transfer(void *ctx, const uint8_t *tx, uint8_t *rx, uint16_t len)
{
    struct linux_spi *pLS = (struct linux_spi *)ctx;
    struct spi_ioc_transfer xfer;

    memset(&xfer, 0, sizeof(xfer));
    xfer.tx_buf = (uintptr_t)tx;
    xfer.rx_buf = (uintptr_t)rx;
    xfer.len = len;
    xfer.speed_hz = pLS->cfg.speed_hz;
    xfer.bits_per_word = SPI_BITS;
    xfer.cs_change = 0;
    if (ioctl(pLS->spi_fd, SPI_IOC_MESSAGE(1), &xfer) < 0) {
        TRXLOG(TRXLOG_ERROR, "spidev: SPI_IOC_MESSAGE of %u bytes failed: %s", (unsigned)len, strerror(errno));
        return -1;
    }
    return 0;
}

static bool ops_int_asserted(void *ctx)
{
    struct linux_spi *pLS = (struct linux_spi *)ctx;
    int val = gpiod_line_get_value(pLS->int_line);
    return (val == 0);   /* active low */
}

static int ops_wait_int(void *ctx, uint32_t timeout_ms)
{
    struct linux_spi *pLS = (struct linux_spi *)ctx;
    struct pollfd pfd;
    struct gpiod_line_event ev;
    int r;

    /* 1. If INT is currently asserted low, service immediately.
     *    Drain any stale events that arrived while we were busy. */
    if (gpiod_line_get_value(pLS->int_line) == 0) {
        while (gpiod_line_event_read(pLS->int_line, &ev) == 0) {
            /* Discard stale events */
        }
        return 0;
    }

    /* 2. INT is deasserted. Wait for next falling edge. */
    pfd.fd = pLS->int_event_fd;
    pfd.events = POLLIN | POLLERR;
    pfd.revents = 0;
    r = poll(&pfd, 1, (int)timeout_ms);
    if (r <= 0) {
        return -1;
    }

    /* 3. Event arrived. Consume exactly ONE event. */
    if (gpiod_line_event_read(pLS->int_line, &ev) != 0) {
        return -1;
    }

    /* 4. Verify INT is still asserted (level-triggered check).
     *    If RCP pulsed quickly, loop to wait for next edge. */
    if (gpiod_line_get_value(pLS->int_line) == 0) {
        return 0;
    }

    /* 5. Spurious pulse - INT deasserted before we checked. Retry. */
    return ops_wait_int(ctx, timeout_ms);
}


static void ops_delay_us(void *ctx, uint32_t us)
{
    struct timespec ts;
    (void)ctx;
    ts.tv_sec = us / 1000000U;
    ts.tv_nsec = (long)(us % 1000000U) * 1000L;
    while (nanosleep(&ts, &ts) < 0 && errno == EINTR) {
    }
}

static const struct trx_spi_ops linux_spi_ops = {
    .transfer = ops_transfer,
    .int_asserted = ops_int_asserted,
    .wait_int = ops_wait_int,
    .delay_us = ops_delay_us,
};

static void bus_lock(void *user)   { pthread_mutex_lock(&((struct linux_spi *)user)->bus_lock); }
static void bus_unlock(void *user) { pthread_mutex_unlock(&((struct linux_spi *)user)->bus_lock); }

/* ------------------------------------------------------------------ */
/* stream plumbing                                                     */
/* ------------------------------------------------------------------ */
static struct linux_spi *spi_pio_to_pls(struct io_stream *pIO)
{
    struct linux_spi *pLS;

    if (pIO == NULL) {
        return NULL;
    }
    pLS = (struct linux_spi *)(pIO->opaque_ptr);
    if (pLS != NULL && pLS->test_ptr != &spi_test) {
        pLS = NULL;
    }
    return pLS;
}

bool STREAM_isSpi(intptr_t h)
{
    return spi_pio_to_pls(STREAM_hToStruct(h)) != NULL;
}

/* MT bytes arriving from the RCP: called with the bus lock held, never blocks */
static void spi_sink(void *user, const uint8_t *data, size_t len)
{
    struct linux_spi *pLS = (struct linux_spi *)user;
    int r = FIFO_insert(pLS->rx_fifo, data, len);

    if (r < 0 || (size_t)r != len) {
        pLS->fifo_overflow++;
        TRXLOG(TRXLOG_ERROR, "rx fifo overflow, dropped %u bytes (consumer too slow; total overflows %u)",
               (unsigned)(len - (size_t)(r > 0 ? r : 0)), (unsigned)pLS->fifo_overflow);
    }
}

static intptr_t spi_rx_thread(intptr_t h)
{
    struct linux_spi *pLS = (struct linux_spi *)h;

    pLS->thread_state = LSTS_alive;
    while (pLS->thread_state == LSTS_alive) {
        int r;

        if (pLS->pParent->is_error) {
            break;
        }
        if (!pLS->ops->int_asserted(pLS->ops_ctx)) {
            pLS->int_waits++;
            if (pLS->ops->wait_int(pLS->ops_ctx, INT_WAIT_MS) < 0) {
                pLS->int_wait_timeouts++;
            }
        }
        pLS->rx_loops++;
        r = trx_link_service(&pLS->link);
        {
            int waiting = FIFO_getItemsAvail(pLS->rx_fifo);

            if (waiting > 0 && (uint32_t)waiting > pLS->fifo_high) {
                pLS->fifo_high = (uint32_t)waiting;
                if (pLS->fifo_high > (RX_FIFO_BYTES * 3U) / 4U) {
                    TRXLOG(TRXLOG_WARN, "rx fifo is %u of %u bytes full: the MT reader is slower than the RCP "
                           "(mt_msg_rx_thread handles one message per 100 ms pass)", (unsigned)pLS->fifo_high,
                           (unsigned)RX_FIFO_BYTES);
                }
            }
        }
        if (pLS->cfg.stats_interval_s > 0) {
            uint64_t now = trx_spi_now_us();
            if (pLS->last_stats_us == 0) {
                pLS->last_stats_us = now;
            } else if (now - pLS->last_stats_us >= (uint64_t)pLS->cfg.stats_interval_s * 1000000ULL) {
                pLS->last_stats_us = now;
                trx_link_log_stats(&pLS->link, TRXLOG_INFO);
                TRXLOG(TRXLOG_INFO, "stream stats: up %llu s | writes=%u (%u bytes, %u failed) reads=%u (%u bytes, "
                       "%u empty) | rx fifo items=%d high=%u overflow=%u | rx_loops=%llu int_waits=%u (no INT %u) "
                       "service_errors=%u",
                       (unsigned long long)((now - pLS->opened_us) / 1000000ULL), (unsigned)pLS->wr_calls,
                       (unsigned)pLS->wr_bytes, (unsigned)pLS->wr_failures, (unsigned)pLS->rd_calls,
                       (unsigned)pLS->rd_bytes, (unsigned)pLS->rd_timeouts, FIFO_getItemsAvail(pLS->rx_fifo),
                       (unsigned)pLS->fifo_high, (unsigned)pLS->fifo_overflow, (unsigned long long)pLS->rx_loops,
                       (unsigned)pLS->int_waits, (unsigned)pLS->int_wait_timeouts, (unsigned)pLS->rx_service_errors);
            }
        }
        if (r < 0) {
            /* CRC / bus error on a read: keep going, the MT FCS and the SRSP
             * timeout/retry above recover. A dead bus shows up as repeated errors. */
            pLS->rx_service_errors++;
            pLS->rx_service_errors_in_row++;
            TRXLOG(TRXLOG_ERROR, "rx thread: service error %d (%u in a row, %u total; link stats follow at debug level)",
                   r, (unsigned)pLS->rx_service_errors_in_row, (unsigned)pLS->rx_service_errors);
            if (pLS->rx_service_errors_in_row == 20) {
                TRXLOG(TRXLOG_ERROR, "rx thread: 20 consecutive read failures: the link is down, not a single bad block. "
                       "Check cabling, the TRX power, and the clock speed; raising log-level to trace shows the raw bytes");
                trx_link_log_stats(&pLS->link, TRXLOG_ERROR);
            }
            trx_link_log_stats(&pLS->link, TRXLOG_DEBUG);
            pLS->ops->delay_us(pLS->ops_ctx, 1000);
        } else {
            if (pLS->rx_service_errors_in_row >= 20) {
                TRXLOG(TRXLOG_INFO, "rx thread: link recovered after %u consecutive failures",
                       (unsigned)pLS->rx_service_errors_in_row);
            }
            pLS->rx_service_errors_in_row = 0;
        }
    }
    pLS->thread_state = LSTS_dead;
    return 0;
}

static int _spi_wrBytes(struct io_stream *pIO, const void *databytes, size_t nbytes, int timeout_mSecs)
{
    struct linux_spi *pLS = spi_pio_to_pls(pIO);
    int r;

    (void)timeout_mSecs;
    if (pLS == NULL) {
        return -1;
    }
    pLS->wr_calls++;
    TRXLOG(TRXLOG_DEBUG, "stream write: %u bytes from the MT layer", (unsigned)nbytes);
    r = trx_link_send(&pLS->link, (const uint8_t *)databytes, nbytes);
    if (r == 0) {
        pLS->wr_bytes += (uint32_t)nbytes;
        return (int)nbytes;
    }
    pLS->wr_failures++;
    TRXLOG(TRXLOG_ERROR, "stream write of %u bytes failed (%d: %s)%s", (unsigned)nbytes, r,
           (r == TRXLINK_ERR_FULL) ? "RCP stayed full, it is not consuming bytes: is its main loop running?" :
           (r == TRXLINK_ERR_STATUS) ? "RCP rejected the data" :
           (r == TRXSPI_ERR_TIMEOUT) ? "no answer from the TRX: INT/wiring/firmware" :
           (r == TRXSPI_ERR_CRC) ? "bad response CRC: signal integrity" :
           (r == TRXSPI_ERR_DEVICE) ? "TRX transport error" :
           (r == TRXSPI_ERR_IO) ? "bus I/O error" : "see core messages",
           (r == TRXSPI_ERR_IO) ? ": bus/USB error, marking the link dead" : "");
    if (r == TRXSPI_ERR_IO) {
        pLS->pParent->is_error = true;   /* bus gone */
    }
    return 0;
}

static int _spi_rdBytes(struct io_stream *pIO, void *databytes, size_t nbytes, int timeout_mSecs)
{
    struct linux_spi *pLS = spi_pio_to_pls(pIO);

    if (pLS == NULL) {
        return -1;
    }
    if (pLS->pParent->is_error) {
        return -1;
    }
    {
        int got = FIFO_removeWithTimeout(pLS->rx_fifo, databytes, nbytes, timeout_mSecs);

        pLS->rd_calls++;
        if (got > 0) {
            pLS->rd_bytes += (uint32_t)got;
            TRXLOG(TRXLOG_TRACE, "stream read: %d of %u bytes handed to the MT layer", got, (unsigned)nbytes);
        } else {
            pLS->rd_timeouts++;
        }
        return got;
    }
}

static bool _spi_pollRxAvail(struct io_stream *pIO, int mSec_timeout)
{
    struct linux_spi *pLS = spi_pio_to_pls(pIO);

    if (pLS == NULL) {
        return false;
    }
    if (FIFO_getItemsAvail(pLS->rx_fifo) > 0) {
        return true;
    }
    if (mSec_timeout > 0) {
        (void)FIFO_waitForInsert(pLS->rx_fifo, mSec_timeout);
    }
    return FIFO_getItemsAvail(pLS->rx_fifo) > 0;
}

static int _spi_flush(struct io_stream *pIO)
{
    /* every write is a complete synchronous SPI transaction */
    return spi_pio_to_pls(pIO) ? 0 : -1;
}

static void _spi_closePtr(struct linux_spi *pLS)
{
    int n;

    if (pLS == NULL) {
        return;
    }
    TRXLOG(TRXLOG_INFO, "spi stream closing after %llu s: writes=%u (%u bytes, %u failed) reads=%u (%u bytes) "
           "fifo_high=%u fifo_overflow=%u service_errors=%u",
           (unsigned long long)(pLS->opened_us ? (trx_spi_now_us() - pLS->opened_us) / 1000000ULL : 0ULL),
           (unsigned)pLS->wr_calls, (unsigned)pLS->wr_bytes, (unsigned)pLS->wr_failures, (unsigned)pLS->rd_calls,
           (unsigned)pLS->rd_bytes, (unsigned)pLS->fifo_high, (unsigned)pLS->fifo_overflow,
           (unsigned)pLS->rx_service_errors);
    trx_link_log_stats(&pLS->link, TRXLOG_INFO);
    if (pLS->rx_thread) {
        pLS->thread_state = LSTS_exit;
        for (n = 0; n < 500 && pLS->thread_state != LSTS_dead; n++) {
            TIMER_sleep(1);
        }
        pLS->rx_thread = 0;
    }
    if (pLS->rx_fifo) {
        FIFO_destroy(pLS->rx_fifo);
        pLS->rx_fifo = 0;
    }
#ifdef ENABLE_FTDI_SPI
    if (pLS->ftdi != NULL) {
        ftdi_io_close(pLS->ftdi);
        pLS->ftdi = NULL;
    }
#endif
    if (pLS->reset_line != NULL) {
        gpiod_line_release(pLS->reset_line);
        pLS->reset_line = NULL;
    }
    if (pLS->reset_chip != NULL) {
        gpiod_chip_close(pLS->reset_chip);
        pLS->reset_chip = NULL;
    }
    if (pLS->int_line != NULL) {
        gpiod_line_release(pLS->int_line);
        pLS->int_line = NULL;
    }
    if (pLS->int_chip != NULL) {
        gpiod_chip_close(pLS->int_chip);
        pLS->int_chip = NULL;
    }
    pLS->int_event_fd = -1;
    if (pLS->spi_fd >= 0) {
        close(pLS->spi_fd);
    }
    if (pLS->lock_init) {
        pthread_mutex_destroy(&pLS->bus_lock);
    }
    if (pLS->cfg.devname) {
        free((void *)pLS->cfg.devname);
    }
    if (pLS->cfg.ftdi_serial) {
        free((void *)pLS->cfg.ftdi_serial);
    }
    if (pLS->pParent) {
        STREAM_destroyPrivate(pLS->pParent);
    }
    memset(pLS, 0, sizeof(*pLS));
    free(pLS);
}


static void _spi_close(struct io_stream *pIO)
{
    _spi_closePtr(spi_pio_to_pls(pIO));
}

static const struct io_stream_funcs STREAM_spi_funcs = {
    .name     = "spi",
    .close_fn = _spi_close,
    .wr_fn    = _spi_wrBytes,
    .rd_fn    = _spi_rdBytes,
    .flush_fn = _spi_flush,
    .poll_fn  = _spi_pollRxAvail,
};

static int spi_hw_open(struct linux_spi *pLS)
{
    uint8_t mode = SPI_MODE_VALUE;
    uint8_t bits = SPI_BITS;
    uint32_t speed = pLS->cfg.speed_hz;

    TRXLOG(TRXLOG_INFO, "spidev: opening %s (mode %d, %d bits, %u Hz)", pLS->cfg.devname, SPI_MODE_VALUE, SPI_BITS,
           (unsigned)speed);
    pLS->spi_fd = open(pLS->cfg.devname, O_RDWR);
    if (pLS->spi_fd < 0) {
        TRXLOG(TRXLOG_ERROR, "spidev: cannot open %s: %s (does the node exist? config-pin set? permissions?)",
               pLS->cfg.devname, strerror(errno));
        return -1;
    }
    if (ioctl(pLS->spi_fd, SPI_IOC_WR_MODE, &mode) < 0 ||
        ioctl(pLS->spi_fd, SPI_IOC_WR_BITS_PER_WORD, &bits) < 0 ||
        ioctl(pLS->spi_fd, SPI_IOC_WR_MAX_SPEED_HZ, &speed) < 0) {
        TRXLOG(TRXLOG_ERROR, "spidev: cannot configure %s: %s", pLS->cfg.devname, strerror(errno));
        return -1;
    }
    {
        uint32_t got_speed = 0;
        uint8_t got_mode = 0;
        if (ioctl(pLS->spi_fd, SPI_IOC_RD_MAX_SPEED_HZ, &got_speed) == 0 &&
            ioctl(pLS->spi_fd, SPI_IOC_RD_MODE, &got_mode) == 0) {
            TRXLOG(TRXLOG_INFO, "spidev: configured: mode %u, max speed %u Hz", (unsigned)got_mode,
                   (unsigned)got_speed);
        }
    }

    /* INT: input, falling edge (active low) */
    pLS->int_line = gpio_acquire_line(pLS->cfg.int_gpio, &pLS->int_chip);
    if (pLS->int_line == NULL) {
        return -1;
    }
    if (gpiod_line_request_falling_edge_events(pLS->int_line, "trx-spi-int") < 0) {
        TRXLOG(TRXLOG_ERROR, "spidev: cannot request falling-edge events on INT gpio %d: %s",
               pLS->cfg.int_gpio, strerror(errno));
        return -1;
    }
    pLS->int_event_fd = gpiod_line_event_get_fd(pLS->int_line);
    if (pLS->int_event_fd < 0) {
        TRXLOG(TRXLOG_ERROR, "spidev: cannot get event fd for INT gpio %d: %s",
               pLS->cfg.int_gpio, strerror(errno));
        return -1;
    }
    TRXLOG(TRXLOG_INFO, "spidev: INT gpio %d ready (falling edge, level now %d)", pLS->cfg.int_gpio,
           gpiod_line_get_value(pLS->int_line));

    /* RESET: optional, pulsed low like the tested master. Not wired on every board. */
    if (pLS->cfg.reset_gpio != SPI_CFG_GPIO_NONE) {
        pLS->reset_line = gpio_acquire_line(pLS->cfg.reset_gpio, &pLS->reset_chip);
        if (pLS->reset_line == NULL) {
            return -1;
        }
        TRXLOG(TRXLOG_INFO, "spidev: pulsing RESET gpio %d", pLS->cfg.reset_gpio);
        /* Request output starting at 0 (asserted low) */
        if (gpiod_line_request_output(pLS->reset_line, "trx-spi-reset", 0) < 0) {
            TRXLOG(TRXLOG_ERROR, "spidev: cannot request output on RESET gpio %d: %s",
                   pLS->cfg.reset_gpio, strerror(errno));
            return -1;
        }
        usleep(RESET_HOLD_US);
        if (gpiod_line_set_value(pLS->reset_line, 1) < 0) {
            return -1;
        }
        usleep(RESET_RELEASE_US);
    }
    return 0;
}

static int ftdi_hw_open(struct linux_spi *pLS)
{
#ifdef ENABLE_FTDI_SPI
    struct mpsse_spi_cfg mc;

    memset(&mc, 0, sizeof(mc));
    mc.speed_hz = pLS->cfg.speed_hz;
    mc.int_pin = pLS->cfg.ftdi_int_pin;
    mc.reset_pin = pLS->cfg.ftdi_reset_pin;
    mc.wait_poci = pLS->cfg.ftdi_wait_poci;

    pLS->ftdi = ftdi_io_open(pLS->cfg.ftdi_vid, pLS->cfg.ftdi_pid, pLS->cfg.ftdi_serial);
    if (pLS->ftdi == NULL) {
        return -1;
    }
    if (mpsse_spi_open(&pLS->mpsse, &ftdi_io_ops, pLS->ftdi, &mc) < 0) {
        TRXLOG(TRXLOG_ERROR, "FT232H did not enter MPSSE mode or the pin configuration is invalid");
        return -1;
    }
    TRXLOG(TRXLOG_INFO, "FT232H MPSSE SPI clock %u Hz (requested %u), INT=AD%d%s", (unsigned)pLS->mpsse.actual_hz,
           (unsigned)pLS->cfg.speed_hz, pLS->cfg.ftdi_int_pin, pLS->cfg.ftdi_wait_poci ? ", POCI wait on" : "");
    if (pLS->cfg.ftdi_reset_pin != SPI_CFG_GPIO_NONE) {
        if (mpsse_spi_reset_pulse(&pLS->mpsse, RESET_HOLD_US, RESET_RELEASE_US) < 0) {
            return -1;
        }
    }
    pLS->ops = mpsse_spi_ops();
    pLS->ops_ctx = &pLS->mpsse;
    return 0;
#else
    (void)pLS;
    TRXLOG(TRXLOG_ERROR, "backend = ftdi requested, but this binary was built without ENABLE_FTDI_SPI "
           "(install libftdi1-dev and rebuild, see docs/SPI_FT232H_BACKEND.md)");
    return -1;
#endif
}

intptr_t STREAM_createSpi(const struct spi_cfg *pCFG)
{
    struct linux_spi *pLS = NULL;
    int r;

    if (pCFG != NULL) {
        trx_spi_log_set(spi_log_sink, NULL, pCFG->log_level);
    }
    if (pCFG == NULL || pCFG->speed_hz == 0 || pCFG->speed_hz > 4000000U) {
        TRXLOG(TRXLOG_ERROR, "spi: invalid configuration (speed %u Hz, max 4000000)",
               (pCFG != NULL) ? (unsigned)pCFG->speed_hz : 0U);
        goto fail;
    }
    if (pCFG->backend == SPI_BACKEND_SPIDEV && (pCFG->devname == NULL || pCFG->int_gpio < 0)) {
        TRXLOG(TRXLOG_ERROR, "spi: invalid spidev configuration (devname/int-gpio)");
        goto fail;
    }
    TRXLOG(TRXLOG_INFO, "spi: creating stream: backend=%s speed=%u Hz log-level=%d stats-interval=%ds",
           (pCFG->backend == SPI_BACKEND_FTDI) ? "ftdi" : "spidev", (unsigned)pCFG->speed_hz, pCFG->log_level,
           pCFG->stats_interval_s);
    pLS = calloc(1, sizeof(*pLS));
    if (pLS == NULL) {
        goto fail;
    }
    pLS->spi_fd = -1;
    pLS->int_event_fd = -1;
    pLS->test_ptr = &spi_test;
    pLS->pParent = STREAM_createPrivate(&STREAM_spi_funcs, (intptr_t)pLS);
    if (pLS->pParent == NULL) {
        goto fail;
    }
    pLS->cfg = *pCFG;
    pLS->cfg.devname = strdup(pCFG->devname ? pCFG->devname : "ftdi");
    if (pLS->cfg.devname == NULL) {
        goto fail;
    }
    pLS->cfg.ftdi_serial = pCFG->ftdi_serial ? strdup(pCFG->ftdi_serial) : NULL;
    if (pthread_mutex_init(&pLS->bus_lock, NULL) != 0) {
        goto fail;
    }
    pLS->lock_init = true;

    if (pCFG->backend == SPI_BACKEND_FTDI) {
        if (ftdi_hw_open(pLS) < 0) {
            goto fail;
        }
    } else {
        if (spi_hw_open(pLS) < 0) {
            goto fail;
        }
        pLS->ops = &linux_spi_ops;
        pLS->ops_ctx = pLS;
    }

    pLS->rx_fifo = FIFO_create(pLS->cfg.devname, sizeof(uint8_t), RX_FIFO_BYTES, true);
    if (pLS->rx_fifo == 0) {
        goto fail;
    }

    trx_link_init(&pLS->link, pLS->ops, pLS->ops_ctx, spi_sink, pLS, bus_lock, bus_unlock, pLS);

    /* Clear the firmware's NPI buffers and sequence state, as the pty bridge does */
    r = trx_link_reset(&pLS->link);
    if (r != TRXLINK_STATUS_SUCCESS) {
        /* Not fatal: the firmware may still be booting; the first write retries */
        TRXLOG(TRXLOG_WARN, "spi: RESET request to the RCP returned %d (continuing; first write retries)", r);
    }

    pLS->thread_state = LSTS_birth;
    pLS->rx_thread = THREAD_create(pLS->cfg.devname, spi_rx_thread, (intptr_t)pLS, 0);
    if (pLS->rx_thread == 0) {
        TRXLOG(TRXLOG_ERROR, "spi: cannot create the rx thread");
        goto fail;
    }
    pLS->opened_us = trx_spi_now_us();
    TRXLOG(TRXLOG_INFO, "spi stream up: backend %s, %s %u Hz", (pCFG->backend == SPI_BACKEND_FTDI) ? "ftdi" : "spidev",
            pLS->cfg.devname, (unsigned)pLS->cfg.speed_hz);
    return STREAM_structToH(pLS->pParent);

fail:
    _spi_closePtr(pLS);
    return 0;
}
