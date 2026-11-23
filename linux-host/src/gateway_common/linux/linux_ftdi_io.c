/******************************************************************************
 @file linux_ftdi_io.c

 @brief libftdi1 USB layer for the FT232H MPSSE SPI engine (mpsse_spi.c).

 Only the USB byte pipe lives here; every protocol decision is in mpsse_spi.c,
 which is covered by the PC tests. Keep this file thin.
 *****************************************************************************/
#ifdef ENABLE_FTDI_SPI

#include "linux_ftdi_io.h"
#include <ftdi.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <pthread.h>

#include "trx_spi_log.h"

#define FTDI_LATENCY_MS    1       /* default 16 ms would make every transaction slow */
#define FTDI_CHUNK_BYTES   4096

struct ftdi_io {
    struct ftdi_context *ctx;
    pthread_mutex_t lock;     /* serializes MPSSE command/reply sequences between threads */
};

static uint32_t now_ms(void)
{
    struct timespec ts;
    clock_gettime(CLOCK_MONOTONIC, &ts);
    return (uint32_t)(ts.tv_sec * 1000U + ts.tv_nsec / 1000000U);
}

struct ftdi_io *ftdi_io_open(int vid, int pid, const char *serial)
{
    struct ftdi_io *io = calloc(1, sizeof(*io));
    int r;

    if (io == NULL) {
        return NULL;
    }
    (void)pthread_mutex_init(&io->lock, NULL);
    io->ctx = ftdi_new();
    if (io->ctx == NULL) {
        goto fail;
    }
    if (ftdi_set_interface(io->ctx, INTERFACE_A) < 0) {
        goto fail;
    }
    /* libftdi detaches the kernel ftdi_sio driver if it is bound */
    r = ftdi_usb_open_desc(io->ctx, vid, pid, NULL, serial);
    if (r < 0) {
        TRXLOG(TRXLOG_ERROR, "ftdi: cannot open %04x:%04x%s%s: %s (udev rule / permissions / ftdi_sio bound? "
               "see docs/SPI_FT232H_BACKEND.md section 5)", vid, pid, serial ? " serial " : "",
               serial ? serial : "", ftdi_get_error_string(io->ctx));
        goto fail_ctx;
    }
    if (ftdi_usb_reset(io->ctx) < 0 ||
        ftdi_set_latency_timer(io->ctx, FTDI_LATENCY_MS) < 0 ||
        ftdi_read_data_set_chunksize(io->ctx, FTDI_CHUNK_BYTES) < 0 ||
        ftdi_write_data_set_chunksize(io->ctx, FTDI_CHUNK_BYTES) < 0 ||
        ftdi_set_event_char(io->ctx, 0, 0) < 0 ||
        ftdi_set_error_char(io->ctx, 0, 0) < 0 ||
        ftdi_set_bitmode(io->ctx, 0x00, BITMODE_RESET) < 0 ||
        ftdi_set_bitmode(io->ctx, 0x00, BITMODE_MPSSE) < 0 ||
        ftdi_usb_purge_buffers(io->ctx) < 0) {
        TRXLOG(TRXLOG_ERROR, "ftdi: cannot set up MPSSE mode: %s", ftdi_get_error_string(io->ctx));
        goto fail_open;
    }
    TRXLOG(TRXLOG_INFO, "ftdi: opened %04x:%04x%s%s, MPSSE mode, latency timer %d ms", vid, pid,
           serial ? " serial " : "", serial ? serial : "", FTDI_LATENCY_MS);
    return io;

fail_open:
    ftdi_usb_close(io->ctx);
fail_ctx:
    ftdi_free(io->ctx);
    pthread_mutex_destroy(&io->lock);
    free(io);
    return NULL;
fail:
    if (io->ctx != NULL) {
        ftdi_free(io->ctx);
    }
    pthread_mutex_destroy(&io->lock);
    free(io);
    return NULL;
}

void ftdi_io_close(struct ftdi_io *io)
{
    if (io == NULL) {
        return;
    }
    TRXLOG(TRXLOG_INFO, "ftdi: closing adapter");
    (void)ftdi_set_bitmode(io->ctx, 0x00, BITMODE_RESET);
    ftdi_usb_close(io->ctx);
    ftdi_free(io->ctx);
    pthread_mutex_destroy(&io->lock);
    free(io);
}

static int io_write(void *ctx, const uint8_t *buf, size_t len)
{
    struct ftdi_io *io = (struct ftdi_io *)ctx;
    size_t done = 0;

    while (done < len) {
        int r = ftdi_write_data(io->ctx, buf + done, (int)(len - done));
        if (r < 0) {
            return -1;
        }
        done += (size_t)r;
    }
    return (int)done;
}

static int io_read(void *ctx, uint8_t *buf, size_t len, uint32_t timeout_ms)
{
    struct ftdi_io *io = (struct ftdi_io *)ctx;
    size_t done = 0;
    uint32_t start = now_ms();

    /* ftdi_read_data returns what is available (possibly 0): loop until len bytes or timeout */
    while (done < len) {
        int r = ftdi_read_data(io->ctx, buf + done, (int)(len - done));
        if (r < 0) {
            return -1;
        }
        done += (size_t)r;
        if (r == 0 && (uint32_t)(now_ms() - start) >= timeout_ms) {
            break;
        }
    }
    return (int)done;
}

static void io_lock(void *ctx)   { (void)pthread_mutex_lock(&((struct ftdi_io *)ctx)->lock); }
static void io_unlock(void *ctx) { (void)pthread_mutex_unlock(&((struct ftdi_io *)ctx)->lock); }

const struct mpsse_io ftdi_io_ops = {
    .write = io_write,
    .read = io_read,
    .lock = io_lock,
    .unlock = io_unlock,
};

#endif /* ENABLE_FTDI_SPI */
