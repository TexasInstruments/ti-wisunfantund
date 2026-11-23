/******************************************************************************
 @file mpsse_spi.c

 @brief FTDI MPSSE (FT232H) SPI master engine. See mpsse_spi.h.

 One SPI transaction = ONE USB write (CS low, clock bytes, CS high, send
 immediate) and ONE USB read, which keeps the per-transaction USB cost to a
 single round trip (about the 1 ms latency timer).
 *****************************************************************************/
#include "mpsse_spi.h"
#include <string.h>
#include <time.h>
#include <errno.h>

#define MAX_XFER   TRX_SPIBLOCK_SIZE
/* While waiting for INT, report once per this many microseconds at DEBUG level */
#define MPSSE_WAIT_REPORT_US 1000000U

static void sleep_us(uint32_t us)
{
    struct timespec ts;
    ts.tv_sec = us / 1000000U;
    ts.tv_nsec = (long)(us % 1000000U) * 1000L;
    while (nanosleep(&ts, &ts) < 0 && errno == EINTR) {
    }
}

uint32_t mpsse_spi_divisor(uint32_t speed_hz, uint16_t *div)
{
    uint32_t d;
    if (speed_hz == 0) {
        speed_hz = 1;
    }
    /* sck = 60 MHz / ((1 + div) * 2); choose the smallest div whose sck <= speed_hz */
    d = (uint32_t)((MPSSE_CLOCK_HZ + (2UL * speed_hz) - 1UL) / (2UL * speed_hz));
    if (d == 0) {
        d = 1;
    }
    d -= 1U;
    if (d > 0xFFFFU) {
        d = 0xFFFFU;
    }
    *div = (uint16_t)d;
    return (uint32_t)(MPSSE_CLOCK_HZ / ((1UL + d) * 2UL));
}

static void io_lock(struct mpsse_spi *m)
{
    if (m->io.lock != NULL) {
        m->io.lock(m->io_ctx);
    }
}

static void io_unlock(struct mpsse_spi *m)
{
    if (m->io.unlock != NULL) {
        m->io.unlock(m->io_ctx);
    }
}

/* quiet: no per-call trace line. The INT poll runs about every 500 us, so tracing each USB call there
 * would write thousands of lines per second. Errors are always logged. */
static int io_write_q(struct mpsse_spi *m, const uint8_t *b, size_t n, bool quiet)
{
    int r = m->io.write(m->io_ctx, b, n);
    if (r < 0 || (size_t)r != n) {
        m->io_errors++;
        TRXLOG(TRXLOG_ERROR, "mpsse: USB write of %u bytes failed (returned %d): adapter unplugged or USB error",
               (unsigned)n, r);
        return -1;
    }
    if (!quiet) {
        TRXLOG(TRXLOG_TRACE, "mpsse: USB write %u bytes", (unsigned)n);
    }
    return 0;
}

static int io_write(struct mpsse_spi *m, const uint8_t *b, size_t n)
{
    return io_write_q(m, b, n, false);
}

static int io_read_q(struct mpsse_spi *m, uint8_t *b, size_t n, bool quiet)
{
    int r = m->io.read(m->io_ctx, b, n, MPSSE_IO_TIMEOUT_MS);
    if (r < 0 || (size_t)r != n) {
        m->io_errors++;
        TRXLOG(TRXLOG_ERROR, "mpsse: USB read of %u bytes returned %d within %d ms (short read = MPSSE did not "
               "answer: bad command, adapter reset, or latency problem)", (unsigned)n, r, MPSSE_IO_TIMEOUT_MS);
        return -1;
    }
    if (!quiet) {
        TRXLOG(TRXLOG_TRACE, "mpsse: USB read %u bytes", (unsigned)n);
    }
    return 0;
}

static int io_read(struct mpsse_spi *m, uint8_t *b, size_t n)
{
    return io_read_q(m, b, n, false);
}

int mpsse_spi_open(struct mpsse_spi *m, const struct mpsse_io *io, void *io_ctx,
                   const struct mpsse_spi_cfg *cfg)
{
    uint8_t cmd[24];
    uint8_t echo[2];
    size_t n = 0;

    memset(m, 0, sizeof(*m));
    m->io = *io;
    m->io_ctx = io_ctx;
    m->cfg = *cfg;
    if (m->cfg.poci_timeout_us == 0) {
        m->cfg.poci_timeout_us = 10000;   /* same as the tested BBB / host_lite master */
    }
    if (cfg->int_pin < 4 || cfg->int_pin > 7) {
        TRXLOG(TRXLOG_ERROR, "mpsse: INT pin AD%d invalid (must be AD4..AD7)", cfg->int_pin);
        return -1;
    }
    if (cfg->reset_pin != -1 && (cfg->reset_pin < 4 || cfg->reset_pin > 7 || cfg->reset_pin == cfg->int_pin)) {
        TRXLOG(TRXLOG_ERROR, "mpsse: RESET pin AD%d invalid (AD4..AD7 and different from INT AD%d)", cfg->reset_pin,
               cfg->int_pin);
        return -1;
    }

    m->dir = (uint8_t)(MPSSE_PIN_SCLK | MPSSE_PIN_MOSI | MPSSE_PIN_CS);
    m->idle = (uint8_t)MPSSE_PIN_CS;                 /* CS high, SCLK low (mode 0 idle) */
    if (cfg->reset_pin >= 0) {
        m->dir  |= (uint8_t)(1U << cfg->reset_pin);
        m->idle |= (uint8_t)(1U << cfg->reset_pin);  /* RESET released (high) */
    }
    m->actual_hz = mpsse_spi_divisor(cfg->speed_hz, &m->divisor);
    TRXLOG(TRXLOG_INFO, "mpsse: open: requested %u Hz -> divisor %u = %u Hz; INT=AD%d RESET=%s POCI-wait=%s",
           (unsigned)cfg->speed_hz, (unsigned)m->divisor, (unsigned)m->actual_hz, cfg->int_pin,
           (cfg->reset_pin >= 0) ? "wired" : "none", cfg->wait_poci ? "on" : "off");

    /* 1. Bad command: the MPSSE answers 0xFA <cmd>. Proves the engine is in MPSSE mode. */
    cmd[0] = 0xAB;
    cmd[1] = MPSSE_SEND_IMMEDIATE;
    if (io_write(m, cmd, 2) < 0 || io_read(m, echo, 2) < 0 ||
        echo[0] != MPSSE_BAD_COMMAND_ECHO || echo[1] != 0xAB) {
        m->io_errors++;
        TRXLOG(TRXLOG_ERROR, "mpsse: MPSSE sync probe failed (expected FA AB, got %02X %02X): chip not in MPSSE "
               "mode, or not an FT232H/FT2232H", echo[0], echo[1]);
        return -2;
    }
    TRXLOG(TRXLOG_DEBUG, "mpsse: MPSSE sync probe OK (FA AB)");

    /* 2. Clocking: 60 MHz base, no adaptive clock, no 3-phase, no loopback, divisor */
    cmd[n++] = MPSSE_DISABLE_DIV5;
    cmd[n++] = MPSSE_DISABLE_ADAPTIVE;
    cmd[n++] = MPSSE_DISABLE_3PHASE;
    cmd[n++] = MPSSE_LOOPBACK_DISABLE;
    cmd[n++] = MPSSE_SET_CLK_DIVISOR;
    cmd[n++] = (uint8_t)(m->divisor & 0xFF);
    cmd[n++] = (uint8_t)(m->divisor >> 8);
    /* 3. Pins: CS high, clock low, directions */
    cmd[n++] = MPSSE_SET_BITS_LOW;
    cmd[n++] = m->idle;
    cmd[n++] = m->dir;
    TRXLOG(TRXLOG_DEBUG, "mpsse: pins: dir=0x%02X idle=0x%02X (SCLK=AD0 MOSI=AD1 MISO=AD2 CS=AD3, idle CS high)",
           m->dir, m->idle);
    return io_write(m, cmd, n);
}

static int transfer_locked(struct mpsse_spi *m, const uint8_t *tx, uint8_t *rx, uint16_t len)
{
    uint8_t cmd[MAX_XFER + 16];
    uint8_t cs_low = (uint8_t)(m->idle & ~MPSSE_PIN_CS);
    size_t n = 0;
    uint16_t l1;

    if (len == 0 || len > MAX_XFER) {
        TRXLOG(TRXLOG_ERROR, "mpsse: transfer length %u invalid (1..%d)", (unsigned)len, MAX_XFER);
        return -1;
    }

    /* CS low */
    cmd[n++] = MPSSE_SET_BITS_LOW;
    cmd[n++] = cs_low;
    cmd[n++] = m->dir;

    if (m->cfg.wait_poci) {
        /* Chip-ready handshake of loki-trx-host (Plat_SPI_assertCs): after CS falls the TRX
         * drives POCI low when it can receive. Wait for it before clocking. */
        uint32_t waited = 0;
        uint8_t pin;
        uint8_t q[2] = {MPSSE_GET_BITS_LOW, MPSSE_SEND_IMMEDIATE};

        if (io_write(m, cmd, n) < 0) {
            return -1;
        }
        n = 0;
        for (;;) {
            if (io_write(m, q, 2) < 0 || io_read(m, &pin, 1) < 0) {
                return -1;
            }
            if ((pin & MPSSE_PIN_MISO) == 0) {
                TRXLOG(TRXLOG_TRACE, "mpsse: POCI low after %u us (chip ready)", (unsigned)waited);
                break;
            }
            if (waited >= m->cfg.poci_timeout_us) {
                uint8_t undo[3] = {MPSSE_SET_BITS_LOW, m->idle, m->dir};
                m->poci_timeouts++;
                TRXLOG(TRXLOG_ERROR, "mpsse: TRX did not drive POCI low within %u us after CS fell "
                       "(chip not ready / not running / MISO not connected); CS released (timeouts=%u)",
                       (unsigned)m->cfg.poci_timeout_us, (unsigned)m->poci_timeouts);
                (void)io_write(m, undo, 3);   /* release CS so the caller can retry cleanly */
                return -1;
            }
            sleep_us(100);
            waited += 100;
        }
    }

    /* Clock len bytes full duplex, mode 0 */
    l1 = (uint16_t)(len - 1U);
    cmd[n++] = MPSSE_DATA_BYTES_INOUT_MODE0;
    cmd[n++] = (uint8_t)(l1 & 0xFF);
    cmd[n++] = (uint8_t)(l1 >> 8);
    if (tx != NULL) {
        memcpy(&cmd[n], tx, len);
    } else {
        memset(&cmd[n], 0, len);
    }
    n += len;

    /* CS high, then flush the reply to the host now */
    cmd[n++] = MPSSE_SET_BITS_LOW;
    cmd[n++] = m->idle;
    cmd[n++] = m->dir;
    cmd[n++] = MPSSE_SEND_IMMEDIATE;

    if (io_write(m, cmd, n) < 0) {
        return -1;
    }
    if (io_read(m, rx, len) < 0) {
        return -1;
    }
    return 0;
}

int mpsse_spi_transfer(void *ctx, const uint8_t *tx, uint8_t *rx, uint16_t len)
{
    struct mpsse_spi *m = (struct mpsse_spi *)ctx;
    int r;

    io_lock(m);
    r = transfer_locked(m, tx, rx, len);
    io_unlock(m);
    return r;
}

static int read_pins(struct mpsse_spi *m, uint8_t *pins)
{
    uint8_t q[2] = {MPSSE_GET_BITS_LOW, MPSSE_SEND_IMMEDIATE};
    int r = 0;

    io_lock(m);
    m->gpio_reads++;
    if (io_write_q(m, q, 2, true) < 0 || io_read_q(m, pins, 1, true) < 0) {
        r = -1;
    }
    io_unlock(m);
    return r;
}

bool mpsse_spi_int_asserted(void *ctx)
{
    struct mpsse_spi *m = (struct mpsse_spi *)ctx;
    uint8_t pins;
    bool asserted;

    if (read_pins(m, &pins) < 0) {
        return false;
    }
    asserted = (pins & (uint8_t)(1U << m->cfg.int_pin)) == 0;   /* active low */
    {
        /* Only the input bits matter; the output bits (CS, clock, MOSI) are ours and do not change here */
        const uint8_t in_mask = (uint8_t)(MPSSE_PIN_MISO | (1U << m->cfg.int_pin));

        if (!m->last_pins_valid || ((pins ^ m->last_pins) & in_mask) != 0) {
            TRXLOG(TRXLOG_TRACE, "mpsse: pins %s: ADBUS=0x%02X INT(AD%d)=%s MISO=%d",
                   m->last_pins_valid ? "changed" : "first read", pins, m->cfg.int_pin,
                   asserted ? "ASSERTED" : "idle", (pins & MPSSE_PIN_MISO) ? 1 : 0);
        }
        m->last_pins = pins;
        m->last_pins_valid = true;
    }
    return asserted;
}

int mpsse_spi_wait_int(void *ctx, uint32_t timeout_ms)
{
    /* No edge interrupts over USB: poll the level about once per ms (the latency timer) */
    struct mpsse_spi *m = (struct mpsse_spi *)ctx;
    uint32_t waited_us = 0;
    uint32_t next_report_us = MPSSE_WAIT_REPORT_US;

    for (;;) {
        if (mpsse_spi_int_asserted(ctx)) {
            return 0;
        }
        if (waited_us >= timeout_ms * 1000U) {
            return -1;
        }
        if (waited_us >= next_report_us) {
            /* One line per second instead of one per poll */
            TRXLOG(TRXLOG_DEBUG, "mpsse: still waiting for INT (AD%d) after %u ms: INT=idle MISO=%d, %u pin reads so far",
                   m->cfg.int_pin, (unsigned)(waited_us / 1000U), (m->last_pins & MPSSE_PIN_MISO) ? 1 : 0,
                   (unsigned)m->gpio_reads);
            next_report_us += MPSSE_WAIT_REPORT_US;
        }
        sleep_us(500);
        waited_us += 500;
    }
}

void mpsse_spi_delay_us(void *ctx, uint32_t us)
{
    (void)ctx;
    sleep_us(us);
}

int mpsse_spi_reset_pulse(struct mpsse_spi *m, uint32_t hold_us, uint32_t release_us)
{
    uint8_t cmd[3];
    uint8_t low;

    if (m->cfg.reset_pin < 0) {
        TRXLOG(TRXLOG_WARN, "mpsse: reset requested but no RESET pin is configured (ftdi-reset-pin)");
        return -1;
    }
    TRXLOG(TRXLOG_INFO, "mpsse: pulsing RESET (AD%d) low for %u us, then waiting %u us", m->cfg.reset_pin,
           (unsigned)hold_us, (unsigned)release_us);
    low = (uint8_t)(m->idle & ~(1U << m->cfg.reset_pin));
    cmd[0] = MPSSE_SET_BITS_LOW; cmd[1] = low; cmd[2] = m->dir;
    io_lock(m);
    if (io_write(m, cmd, 3) < 0) {
        io_unlock(m);
        return -1;
    }
    sleep_us(hold_us);
    cmd[1] = m->idle;
    if (io_write(m, cmd, 3) < 0) {
        io_unlock(m);
        return -1;
    }
    io_unlock(m);
    sleep_us(release_us);
    return 0;
}

static const struct trx_spi_ops mpsse_ops = {
    .transfer = mpsse_spi_transfer,
    .int_asserted = mpsse_spi_int_asserted,
    .wait_int = mpsse_spi_wait_int,
    .delay_us = mpsse_spi_delay_us,
};

const struct trx_spi_ops *mpsse_spi_ops(void)
{
    return &mpsse_ops;
}
