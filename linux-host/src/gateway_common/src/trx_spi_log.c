/******************************************************************************
 @file trx_spi_log.c

 @brief Logging for the TRX SPI stack. See trx_spi_log.h.
 *****************************************************************************/
#include "trx_spi_log.h"
#include <stdarg.h>
#include <stdio.h>
#include <string.h>
#include <time.h>

#define LOG_LINE_MAX     320
#define HEX_BYTES_PER_LINE 32

static trx_log_fn g_fn;
static void *g_user;
static volatile int g_level = TRXLOG_INFO;
static uint64_t g_t0_us;

uint64_t trx_spi_now_us(void)
{
    struct timespec ts;
    clock_gettime(CLOCK_MONOTONIC, &ts);
    return (uint64_t)ts.tv_sec * 1000000ULL + (uint64_t)ts.tv_nsec / 1000ULL;
}

void trx_spi_log_set(trx_log_fn fn, void *user, int level)
{
    g_fn = fn;
    g_user = user;
    if (level < TRXLOG_ERROR) {
        level = TRXLOG_ERROR;
    }
    if (level > TRXLOG_TRACE) {
        level = TRXLOG_TRACE;
    }
    g_level = (fn != NULL) ? level : -1;   /* -1: nothing passes the level test */
}

int trx_spi_log_level(void)
{
    return g_level;
}

static int stamp(char *buf, size_t size)
{
    uint64_t now = trx_spi_now_us();
    uint64_t rel;

    if (g_t0_us == 0) {
        g_t0_us = now;
    }
    rel = now - g_t0_us;
    return snprintf(buf, size, "[%llu.%03u] ", (unsigned long long)(rel / 1000000ULL),
                    (unsigned)((rel / 1000ULL) % 1000ULL));
}

void trx_spi_log(int level, const char *fmt, ...)
{
    char buf[LOG_LINE_MAX];
    va_list ap;
    int n;

    if (g_fn == NULL || level > g_level) {
        return;
    }
    n = stamp(buf, sizeof(buf));
    if (n < 0 || (size_t)n >= sizeof(buf)) {
        return;
    }
    va_start(ap, fmt);
    (void)vsnprintf(buf + n, sizeof(buf) - (size_t)n, fmt, ap);
    va_end(ap);
    g_fn(g_user, level, buf);
}

void trx_spi_log_hex(int level, const char *prefix, const uint8_t *data, uint16_t len)
{
    char buf[LOG_LINE_MAX];
    uint16_t off = 0;

    if (g_fn == NULL || level > g_level) {
        return;
    }
    if (len == 0 || data == NULL) {
        trx_spi_log(level, "%s (0 bytes)", prefix);
        return;
    }
    while (off < len) {
        uint16_t n = (uint16_t)((len - off > HEX_BYTES_PER_LINE) ? HEX_BYTES_PER_LINE : (len - off));
        int pos = stamp(buf, sizeof(buf));
        uint16_t i;

        pos += snprintf(buf + pos, sizeof(buf) - (size_t)pos, "%s (%u bytes) +%u:", prefix, (unsigned)len,
                        (unsigned)off);
        for (i = 0; i < n && (size_t)pos + 4 < sizeof(buf); i++) {
            pos += snprintf(buf + pos, sizeof(buf) - (size_t)pos, " %02X", data[off + i]);
        }
        g_fn(g_user, level, buf);
        off = (uint16_t)(off + n);
    }
}
