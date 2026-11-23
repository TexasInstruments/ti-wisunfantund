/******************************************************************************
 @file trx_spi_link.h

 @brief Wi-SUN RCP byte stream over the TRX SPI transport.

 The RCP firmware (loki-trx-rcp-wisun source/ti/trx/rcp/npi_tl_trxspi.c) carries
 the unchanged MT/NPI byte stream (0xFE SOF, 2 byte length, cmd0, cmd1, data,
 FCS) inside Req_WISUN_RCP (96) requests:

   request       : [len][96][cmdType][payload...]
   cmdType 0x01  STREAM : payload = [seq][up to 112 bytes of the MT byte stream]
   cmdType 0x02  FLOW   : payload = [rx_free_lo][rx_free_hi] (firmware -> host)
   cmdType 0x03  RESET  : no payload; the firmware resets its stream sequence and flow state
                          (it does NOT flush its NPI RX/TX buffers, see npi_tl_trxspi.c)

 Requests inside one SPI block start on 4 byte boundaries.
 This is a port of loki-trx-rcp-wisun host_rcp/rcp_bridge.c; the behaviour is
 identical so the firmware sees the same traffic as with the pty bridge.
 *****************************************************************************/
#if !defined(TRX_SPI_LINK_H)
#define TRX_SPI_LINK_H

#include "trx_spi_core.h"

#ifdef __cplusplus
extern "C" {
#endif

#define TRXLINK_REQ_WISUN_RCP   96U
#define TRXLINK_CMD_STREAM      0x01U
#define TRXLINK_CMD_FLOW        0x02U
#define TRXLINK_CMD_RESET       0x03U
#define TRXLINK_CHUNK_MAX       112U

#define TRXLINK_STATUS_SUCCESS       0
#define TRXLINK_STATUS_INVALID_PARAM 3
#define TRXLINK_STATUS_INVALID_STATE 4

/* Retry policy when the firmware NPI RX ring is full (or not ready yet) */
#define TRXLINK_RETRY_WAIT_MS   5U
#define TRXLINK_RETRY_MAX       1000U

/* Link level errors. They are deliberately different from the TRXSPI_ERR_* codes (-1..-4) of the core,
 * which trx_link_send()/trx_link_reset() pass through unchanged, so a caller can tell them apart. */
#define TRXLINK_ERR_FULL   (-20) /* firmware stayed full for TRXLINK_RETRY_MAX attempts */
#define TRXLINK_ERR_STATUS (-21) /* firmware rejected a request */

/*! Receives MT stream bytes coming from the RCP */
typedef void (*trx_link_sink)(void *user, const uint8_t *data, size_t len);

struct trx_rcp_link {
    struct trx_spi_core core;
    trx_link_sink sink;
    void *sink_user;
    /* Serializes access to the SPI bus; may be NULL for single threaded use */
    void (*lock)(void *user);
    void (*unlock)(void *user);
    void *lock_user;
    /* Statistics, readable for debugging */
    volatile uint32_t flow_updates;
    volatile uint16_t rx_free;
    uint32_t retry_count;
    uint32_t seq_errors;
    uint32_t bad_status;
    uint32_t rx_bytes;
    uint32_t tx_bytes;
    uint32_t tx_chunks;          /* STREAM chunks accepted by the RCP */
    uint32_t rx_chunks;          /* STREAM chunks received from the RCP */
    uint32_t refused_chunks;     /* chunks refused with INVALID_STATE at least once */
    uint32_t retry_max_run;      /* longest run of retries for one chunk */
    uint32_t full_aborts;        /* chunks given up after TRXLINK_RETRY_MAX retries */
    uint32_t rejected_chunks;    /* chunks the RCP rejected with another status */
    uint32_t unknown_cmds;       /* Req_WISUN_RCP blocks with an unknown cmdType */
    uint32_t malformed_blocks;   /* response blocks with a bad inner length */
    uint32_t empty_service;      /* INT was low but the block was empty */
    uint32_t resets_sent;
    uint32_t reset_failures;
    uint64_t last_rx_us;         /* time of the last block received from the RCP */
    uint64_t last_tx_us;         /* time of the last chunk accepted by the RCP */
    uint8_t tx_seq;
    uint8_t rx_seq;
    uint8_t rx_seq_valid;
};

void trx_link_init(struct trx_rcp_link *l, const struct trx_spi_ops *ops, void *ops_ctx,
                   trx_link_sink sink, void *sink_user,
                   void (*lock)(void *), void (*unlock)(void *), void *lock_user);

/*! Send MT bytes to the RCP; chunks them and retries while the firmware is full */
int trx_link_send(struct trx_rcp_link *l, const uint8_t *data, size_t len);

/*! Ask the firmware to reset its stream sequence/flow state (not its NPI buffers). Returns the request status or negative */
int trx_link_reset(struct trx_rcp_link *l);

/*! Service one pending response block if INT is asserted. Returns 1 if a block was read, 0 if none, <0 on error */
int trx_link_service(struct trx_rcp_link *l);

/*! Logs link + core counters at the given level (called on close and periodically by linux_spi.c) */
void trx_link_log_stats(const struct trx_rcp_link *l, int level);

/*! Parse every request in a received block (stream bytes go to the sink) */
void trx_link_on_block(struct trx_rcp_link *l, const uint8_t *payload, uint16_t len);

#ifdef __cplusplus
}
#endif
#endif /* TRX_SPI_LINK_H */
