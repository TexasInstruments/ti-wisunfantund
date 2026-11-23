/******************************************************************************
 @file mpsse_spi.h

 @brief FTDI MPSSE (FT232H) SPI master engine for the TRX SPI link.

 Pure protocol code: it only encodes MPSSE command bytes and decodes the
 replies. All USB access goes through struct mpsse_io, so the same code runs on
 libftdi (linux_ftdi_io.c) and on a PC emulator (test/spi/test_mpsse_spi.c).
 It provides the four operations of struct trx_spi_ops, so trx_spi_core.c and
 trx_spi_link.c run on the FT232H unchanged.

 FT232H ADBUS pin use (low byte):
     AD0 SCLK (out)   AD1 MOSI (out)   AD2 MISO (in)   AD3 CS (out, idle high)
     AD4..AD7 GPIO: INT input (default AD4), optional RESET output
 SPI mode 0 (CPOL=0, CPHA=0): MPSSE opcode 0x31 (out on falling edge, in on
 rising edge, MSB first).
 *****************************************************************************/
#if !defined(MPSSE_SPI_H)
#define MPSSE_SPI_H

#include <stdint.h>
#include <stdbool.h>
#include <stddef.h>
#include "trx_spi_core.h"

#ifdef __cplusplus
extern "C" {
#endif

/* MPSSE opcodes used */
#define MPSSE_SET_BITS_LOW        0x80
#define MPSSE_GET_BITS_LOW        0x81
#define MPSSE_LOOPBACK_DISABLE    0x85
#define MPSSE_SET_CLK_DIVISOR     0x86
#define MPSSE_SEND_IMMEDIATE      0x87
#define MPSSE_DISABLE_DIV5        0x8A
#define MPSSE_DISABLE_3PHASE      0x8D
#define MPSSE_DISABLE_ADAPTIVE    0x97
#define MPSSE_DATA_BYTES_INOUT_MODE0 0x31  /* out on -ve edge, in on +ve edge, MSB first */
#define MPSSE_BAD_COMMAND_ECHO    0xFA

/* ADBUS bit assignments */
#define MPSSE_PIN_SCLK  0x01
#define MPSSE_PIN_MOSI  0x02
#define MPSSE_PIN_MISO  0x04
#define MPSSE_PIN_CS    0x08

#define MPSSE_CLOCK_HZ   60000000UL   /* FT232H base clock with divide-by-5 disabled */
#define MPSSE_IO_TIMEOUT_MS 200

/*! USB byte pipe to the FT232H */
struct mpsse_io {
    /*! returns bytes written (== len) or negative */
    int (*write)(void *ctx, const uint8_t *buf, size_t len);
    /*! reads exactly len bytes within timeout_ms; returns bytes read (may be < len on timeout) or negative */
    int (*read)(void *ctx, uint8_t *buf, size_t len, uint32_t timeout_ms);
    /*! Optional (may be NULL). Held around every write+read sequence so that two threads
     *  (the sender and the INT polling rx thread) cannot interleave MPSSE commands and replies. */
    void (*lock)(void *ctx);
    void (*unlock)(void *ctx);
};

struct mpsse_spi_cfg {
    uint32_t speed_hz;      /* requested clock, the engine picks the closest not above */
    int      int_pin;       /* ADBUS bit 4..7 used as INT input (active low) */
    int      reset_pin;     /* ADBUS bit 4..7 used as RESET output, or -1 */
    bool     wait_poci;     /* after CS falls, wait for MISO low (chip ready) before clocking */
    uint32_t poci_timeout_us;
};

struct mpsse_spi {
    struct mpsse_io io;
    void *io_ctx;
    struct mpsse_spi_cfg cfg;
    uint8_t dir;            /* ADBUS direction byte */
    uint8_t idle;           /* ADBUS value with CS high, clock low */
    uint16_t divisor;
    uint32_t actual_hz;
    uint32_t io_errors;
    uint32_t poci_timeouts;
    uint32_t gpio_reads;
    uint8_t last_pins;      /* last ADBUS value read by the INT poll, for change-only logging */
    bool last_pins_valid;
};

/*! Computes the clock divisor for a requested speed. Returns the actual speed, divisor in *div */
uint32_t mpsse_spi_divisor(uint32_t speed_hz, uint16_t *div);

/*! Configure the FT232H (MPSSE sync check, clocking, pin directions). Returns 0 or negative */
int mpsse_spi_open(struct mpsse_spi *m, const struct mpsse_io *io, void *io_ctx,
                   const struct mpsse_spi_cfg *cfg);

/*! Pulse RESET low for hold_us then high (needs cfg.reset_pin). Returns 0 or negative */
int mpsse_spi_reset_pulse(struct mpsse_spi *m, uint32_t hold_us, uint32_t release_us);

/*! The trx_spi_ops for this engine; pass the struct mpsse_spi as ctx */
const struct trx_spi_ops *mpsse_spi_ops(void);

/* individual operations (also reachable through mpsse_spi_ops) */
int  mpsse_spi_transfer(void *ctx, const uint8_t *tx, uint8_t *rx, uint16_t len);
bool mpsse_spi_int_asserted(void *ctx);
int  mpsse_spi_wait_int(void *ctx, uint32_t timeout_ms);
void mpsse_spi_delay_us(void *ctx, uint32_t us);

#ifdef __cplusplus
}
#endif
#endif /* MPSSE_SPI_H */
