/******************************************************************************
 @file trx_spi_log.h

 @brief Logging for the TRX SPI stack (core, link, MPSSE engine, Linux layer).

 The protocol code does not know about the application's trace system. It logs
 through one hook installed with trx_spi_log_set(): linux_spi.c routes it to
 ns_trace (tr_err/tr_warn/tr_info/tr_debug, trace group "spi"); the PC tests
 route it to a buffer so they can check that the right messages are produced.

 Levels (each level includes the ones above it):
   ERROR  a failure that breaks a transfer or the link (CRC error, timeout, I/O error)
   WARN   recoverable anomaly (TID resync, TRX transport error, retry storm, sequence gap)
   INFO   lifecycle: open/close, configuration, clock, reset, statistics summary
   DEBUG  one line per request/response/chunk/retry, decoded headers, timing
   TRACE  hex dumps of every SPI frame, INT line polling, USB byte counts
 Every line starts with "[seconds.millis]" since the first message, so latency
 and ordering problems can be read directly from the log.
 *****************************************************************************/
#if !defined(TRX_SPI_LOG_H)
#define TRX_SPI_LOG_H

#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

#define TRXLOG_ERROR 0
#define TRXLOG_WARN  1
#define TRXLOG_INFO  2
#define TRXLOG_DEBUG 3
#define TRXLOG_TRACE 4

typedef void (*trx_log_fn)(void *user, int level, const char *msg);

/*! Install the sink and the maximum level that is passed to it (fn == NULL disables logging) */
void trx_spi_log_set(trx_log_fn fn, void *user, int level);
int  trx_spi_log_level(void);

void trx_spi_log(int level, const char *fmt, ...) __attribute__((format(printf, 2, 3)));
/*! Hex dump, 32 bytes per line: "<prefix> (<len> bytes): xx xx ..." */
void trx_spi_log_hex(int level, const char *prefix, const uint8_t *data, uint16_t len);

/*! Monotonic microseconds (also used for transfer timing) */
uint64_t trx_spi_now_us(void);

/* The level test is done before the arguments are evaluated for formatting */
#define TRXLOG(lvl, ...) \
    do { if ((lvl) <= trx_spi_log_level()) { trx_spi_log((lvl), __VA_ARGS__); } } while (0)

#ifdef __cplusplus
}
#endif
#endif /* TRX_SPI_LOG_H */
