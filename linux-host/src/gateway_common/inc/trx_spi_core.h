/******************************************************************************
 @file trx_spi_core.h

 @brief Hardware independent TRX SPI master protocol core (framing, CRC,
        transaction IDs, request/response handling).

 Wire format (matches loki-trx-rcp-wisun source/ti/trx/TRX.h and the tested
 loki-trx-host host_lite master):

   Host -> TRX : [byte0=0][len][tid_tx:4 | tid_ack:4 (low nibble = tid_tx)][0]
                 [payload (len bytes, padded to a 4-byte multiple)][crc16 MSB first]
   TRX -> Host : [free:4|res|error|data_rdy_n|chip_rdy_n][len][tid_tx|tid_ack][status]
                 [payload][crc16 MSB first]
   CRC16-CCITT-FALSE (poly 0x1021, init 0xFFFF) over header + payload.

 The core does no I/O itself: all bus access goes through trx_spi_ops, so the
 same code runs against the real spidev/GPIO layer (linux_spi.c) and against
 a fake TRX in the PC unit test (test/spi/test_spi_link.c).

 This file is not thread safe: the caller serializes calls.
 *****************************************************************************/
#if !defined(TRX_SPI_CORE_H)
#define TRX_SPI_CORE_H

#include <stdint.h>
#include <stdbool.h>
#include <stddef.h>
#include "trx_spi_log.h"

#ifdef __cplusplus
extern "C" {
#endif

#define TRX_SPIBLOCK_SIZE        128
#define TRX_HEADER_SIZE          4
#define TRX_CRC_SIZE             2
#define TRX_MAX_PAYLOAD_SIZE     (TRX_SPIBLOCK_SIZE - TRX_HEADER_SIZE - TRX_CRC_SIZE)
/* Bytes clocked for the first read of a response block: header + CRC */
#define TRX_READ_PROBE_LEN       (TRX_HEADER_SIZE + TRX_CRC_SIZE)
/* Max response blocks drained while looking for the LastStatus of a request */
#define TRX_RESPONSE_DRAIN_MAX   32
/* How long a request waits for its response (INT asserted) */
#define TRX_INT_TIMEOUT_MS       5000
/* A single SPI transfer slower than this is reported (USB/scheduling problem) */
#define TRX_SLOW_XFER_US         20000
/* Guard between two CS cycles (the TRX recovers its RX CRC engine after CS-high) */
#define TRX_CS_REASSERT_GUARD_US 50

#define TRX_HDR0_FREE_MASK       0x0F
#define TRX_HDR0_ERROR_MASK      0x20
#define TRX_HDR0_DRDY_N_MASK     0x40
#define TRX_HDR0_CRDY_N_MASK     0x80
#define TRX_TID_MAX              15
#define TRX_MIN_FREE_BLOCKS      2

#define TRX_REQ_LAST_STATUS               1
#define TRX_REQ_TRANSPORT_ERROR           2
#define TRX_TRANSPORT_ERROR_TID_UNEXPECTED 3

/* Return codes */
#define TRXSPI_OK          0
#define TRXSPI_ERR_IO     (-1)  /* bus / argument failure */
#define TRXSPI_ERR_CRC    (-2)  /* CRC error or malformed response */
#define TRXSPI_ERR_DEVICE (-3)  /* TRX reported a transport error */
#define TRXSPI_ERR_TIMEOUT (-4) /* no response / no LastStatus */

/*! Bus access supplied by the platform layer */
struct trx_spi_ops {
    /*! One CS cycle clocking len bytes. tx may be NULL (zeros are sent). */
    int  (*transfer)(void *ctx, const uint8_t *tx, uint8_t *rx, uint16_t len);
    /*! true while the TRX holds INT low (a response block is pending) */
    bool (*int_asserted)(void *ctx);
    /*! Wait until INT is asserted. Returns 0 if asserted, negative on timeout */
    int  (*wait_int)(void *ctx, uint32_t timeout_ms);
    /*! sleep for us microseconds */
    void (*delay_us)(void *ctx, uint32_t us);
};

/*! Receives the payload of every response block that is not a LastStatus */
typedef void (*trx_spi_block_cb)(void *user, const uint8_t *payload, uint16_t len);

struct trx_spi_core {
    struct trx_spi_ops ops;
    void *ctx;
    trx_spi_block_cb block_cb;
    void *block_user;
    uint8_t host_tid_tx;     /* next TID to send (1..15) */
    uint8_t trx_tid_rx;      /* last TID received from the TRX, echoed as tid_ack */
    uint8_t last_tid_sent;   /* TID of the most recent request block (for LastStatus matching) */
    uint8_t free_blocks;
    bool    trx_error;
    uint32_t crc_errors;
    uint32_t tid_resyncs;
    uint32_t unexpected_blocks;
    /* Statistics (see trx_spi_core_log_stats) */
    uint64_t xfers;            /* SPI transfers (CS cycles) */
    uint64_t xfer_bytes;
    uint64_t xfer_us_total;
    uint64_t xfer_us_max;
    uint32_t slow_xfers;
    uint32_t io_errors;
    uint32_t timeouts;         /* no response / no LastStatus */
    uint32_t trx_errors;       /* error blocks reported by the TRX */
    uint32_t requests;         /* commands sent */
    uint32_t low_free_blocks;  /* responses reporting < TRX_MIN_FREE_BLOCKS free blocks */
};

/*! Logs the counters at the given level */
void trx_spi_core_log_stats(const struct trx_spi_core *c, int level);

void trx_spi_core_init(struct trx_spi_core *c, const struct trx_spi_ops *ops, void *ctx,
                       trx_spi_block_cb cb, void *user);

/*! Reset the host side transaction state (TID counters) */
void trx_spi_core_reset_state(struct trx_spi_core *c);

/*!
 * Send one request block payload and return the payload of the LastStatus
 * response in rx (rx size >= TRX_MAX_PAYLOAD_SIZE). Any other response block
 * seen before the LastStatus is passed to block_cb.
 */
int trx_spi_core_send_command(struct trx_spi_core *c, const uint8_t *payload, uint8_t len,
                              uint8_t *rx, uint16_t *rx_len);

/*! Read one pending response block (INT asserted) into rx; payload length in rx_len */
int trx_spi_core_read_block(struct trx_spi_core *c, uint8_t *rx, uint16_t *rx_len);

uint16_t trx_spi_crc16(const uint8_t *data, uint16_t len);

#ifdef __cplusplus
}
#endif
#endif /* TRX_SPI_CORE_H */
