/******************************************************************************
 @file trx_spi_link.c

 @brief Wi-SUN RCP byte stream over the TRX SPI transport. See trx_spi_link.h.
        Port of loki-trx-rcp-wisun host_rcp/rcp_bridge.c.
 *****************************************************************************/
#include "trx_spi_link.h"
#include <stdio.h>
#include <string.h>

#define ENVELOPE_LEN        3U
#define STREAM_HDR          (ENVELOPE_LEN + 1U)
/* TRX_Request_LastStatus (TRX.h): [len=4][request=1][req:7|res0:1][tid:4 low | status:4 high] + params */
#define LAST_STATUS_MIN_LEN 4U
#define BLOCK_ALIGN         4U
#define MAX_REQ_LEN         (STREAM_HDR + TRXLINK_CHUNK_MAX)

static void lock(struct trx_rcp_link *l)
{
    if (l->lock != NULL) {
        l->lock(l->lock_user);
    }
}

static void unlock(struct trx_rcp_link *l)
{
    if (l->unlock != NULL) {
        l->unlock(l->lock_user);
    }
}

static void core_block_cb(void *user, const uint8_t *payload, uint16_t len)
{
    trx_link_on_block((struct trx_rcp_link *)user, payload, len);
}

void trx_link_init(struct trx_rcp_link *l, const struct trx_spi_ops *ops, void *ops_ctx,
                   trx_link_sink sink, void *sink_user,
                   void (*lock_fn)(void *), void (*unlock_fn)(void *), void *lock_user)
{
    memset(l, 0, sizeof(*l));
    trx_spi_core_init(&l->core, ops, ops_ctx, core_block_cb, l);
    l->sink = sink;
    l->sink_user = sink_user;
    l->lock = lock_fn;
    l->unlock = unlock_fn;
    l->lock_user = lock_user;
}

/* Request status from a LastStatus payload, or -1. expected_req is the request type that was sent. */
static int parse_status(const uint8_t *rx, uint16_t rx_len, uint8_t expected_req, uint8_t sent_tid)
{
    if (rx_len < LAST_STATUS_MIN_LEN || rx[1] != TRX_REQ_LAST_STATUS) {
        TRXLOG(TRXLOG_ERROR, "link: malformed LastStatus (len %u, request %u)", (unsigned)rx_len,
               (rx_len >= 2) ? (unsigned)rx[1] : 0U);
        trx_spi_log_hex(TRXLOG_ERROR, "malformed LastStatus", rx, rx_len);
        return -1;
    }
    if ((rx[2] & 0x7FU) != expected_req) {
        TRXLOG(TRXLOG_WARN, "link: LastStatus is for request type %u, expected %u", (unsigned)(rx[2] & 0x7FU),
               (unsigned)expected_req);
    }
    if (sent_tid != 0U && (rx[3] & 0x0FU) != (sent_tid & 0x0FU)) {
        TRXLOG(TRXLOG_WARN, "link: LastStatus tid %u does not match the request tid %u (stale or lost block?)",
               (unsigned)(rx[3] & 0x0FU), (unsigned)(sent_tid & 0x0FU));
    }
    return (int)((rx[3] >> 4) & 0x0FU);
}

/* Returns the request status (>= 0) or a negative transport error */
static int send_request(struct trx_rcp_link *l, const uint8_t *req, uint8_t len)
{
    uint8_t rx[TRX_SPIBLOCK_SIZE];
    uint16_t rx_len = 0;
    int ret;
    int status;

    lock(l);
    ret = trx_spi_core_send_command(&l->core, req, len, rx, &rx_len);
    unlock(l);
    if (ret < 0) {
        TRXLOG(TRXLOG_ERROR, "link: request type %u (%u bytes) failed: core error %d", (unsigned)req[1],
               (unsigned)len, ret);
        return ret;
    }
    status = parse_status(rx, rx_len, req[1], l->core.last_tid_sent);
    if (status < 0) {
        l->bad_status++;
        return TRXLINK_ERR_STATUS;
    }
    return status;
}

int trx_link_send(struct trx_rcp_link *l, const uint8_t *data, size_t len)
{
    size_t offset = 0;

    while (offset < len) {
        const size_t remaining = len - offset;
        const uint8_t chunk = (uint8_t)((remaining > TRXLINK_CHUNK_MAX) ? TRXLINK_CHUNK_MAX : remaining);
        uint8_t req[MAX_REQ_LEN];
        uint32_t attempt = 0;
        int status;

        req[0] = (uint8_t)(STREAM_HDR + chunk);
        req[1] = (uint8_t)TRXLINK_REQ_WISUN_RCP;
        req[2] = (uint8_t)TRXLINK_CMD_STREAM;
        req[3] = l->tx_seq;
        memcpy(&req[STREAM_HDR], &data[offset], chunk);

        for (;;) {
            const uint32_t flow_before = l->flow_updates;

            status = send_request(l, req, req[0]);
            if (status != TRXLINK_STATUS_INVALID_STATE) {
                break;
            }
            /* Firmware NPI RX ring full: wait for a FLOW message or the retry period.
             * The bus lock is NOT held here, so the receive side keeps draining. */
            l->retry_count++;
            attempt++;
            if (attempt == 1) {
                l->refused_chunks++;
            }
            if (attempt > l->retry_max_run) {
                l->retry_max_run = attempt;
            }
            if (attempt == 1 || (attempt % 100) == 0) {
                TRXLOG(TRXLOG_WARN, "link: RCP refused chunk seq %u (INVALID_STATE: RX ring full or stack not up), "
                       "retry %u/%u, rx_free=%u", (unsigned)l->tx_seq, (unsigned)attempt, TRXLINK_RETRY_MAX,
                       (unsigned)l->rx_free);
            }
            if (attempt >= TRXLINK_RETRY_MAX) {
                l->full_aborts++;
                TRXLOG(TRXLOG_ERROR, "link: RCP stayed full for %u retries, giving up on %u of %u bytes (seq %u)",
                       TRXLINK_RETRY_MAX, (unsigned)(len - offset), (unsigned)len, (unsigned)l->tx_seq);
                return TRXLINK_ERR_FULL;
            }
            if (l->flow_updates == flow_before) {
                l->core.ops.delay_us(l->core.ctx, TRXLINK_RETRY_WAIT_MS * 1000U);
            }
        }
        if (status < 0) {
            return status;
        }
        if (status != TRXLINK_STATUS_SUCCESS) {
            l->rejected_chunks++;
            TRXLOG(TRXLOG_ERROR, "link: RCP rejected chunk seq %u with status %d (3=invalid param: bad chunk length; "
                   "15=not implemented: RCP firmware lacks Req_WISUN_RCP or is an old image; 2=fail)",
                   (unsigned)l->tx_seq, status);
            return TRXLINK_ERR_STATUS;
        }
        if (attempt > 0) {
            TRXLOG(TRXLOG_DEBUG, "link: chunk seq %u accepted after %u retries", (unsigned)l->tx_seq,
                   (unsigned)attempt);
        }
        TRXLOG(TRXLOG_DEBUG, "link: TX chunk seq %u, %u bytes (%u/%u of frame)", (unsigned)l->tx_seq,
               (unsigned)chunk, (unsigned)(offset + chunk), (unsigned)len);
        /* The sequence number advances only for an accepted chunk, so a retry repeats it */
        l->tx_seq++;
        l->tx_bytes += chunk;
        l->tx_chunks++;
        l->last_tx_us = trx_spi_now_us();
        offset += chunk;
    }
    return 0;
}

int trx_link_reset(struct trx_rcp_link *l)
{
    const uint8_t req[ENVELOPE_LEN] = {ENVELOPE_LEN, (uint8_t)TRXLINK_REQ_WISUN_RCP, (uint8_t)TRXLINK_CMD_RESET};
    int status;

    TRXLOG(TRXLOG_INFO, "link: sending RESET to the RCP (resets its stream sequence and flow state)");
    l->resets_sent++;
    status = send_request(l, req, (uint8_t)sizeof(req));
    if (status == TRXLINK_STATUS_SUCCESS) {
        TRXLOG(TRXLOG_INFO, "link: RCP RESET acknowledged");
    } else {
        l->reset_failures++;
        if (status == TRXLINK_STATUS_INVALID_STATE) {
            TRXLOG(TRXLOG_WARN, "link: RCP RESET refused (INVALID_STATE): the RCP stack is not up yet. Normal for "
                   "a second after power-up; the first write retries");
        } else if (status == 15) {
            TRXLOG(TRXLOG_ERROR, "link: RCP RESET returned NOT_IMPLEMENTED: the TRX firmware does not handle "
                   "Req_WISUN_RCP (not the RCP image, built without TRX_RCP_TIMAC=ON?)");
        } else if (status < 0) {
            TRXLOG(TRXLOG_ERROR, "link: RCP RESET failed with transport error %d (see the core messages above)", status);
        } else {
            TRXLOG(TRXLOG_WARN, "link: RCP RESET returned status %d", status);
        }
    }
    l->tx_seq = 0;
    l->rx_seq_valid = 0;
    return status;
}

static void handle_rcp_request(struct trx_rcp_link *l, const uint8_t *req, uint8_t req_len)
{
    if (req_len < ENVELOPE_LEN) {
        return;
    }
    if (req[2] == TRXLINK_CMD_STREAM && req_len > STREAM_HDR) {
        const uint8_t seq = req[3];

        if (l->rx_seq_valid && seq != (uint8_t)(l->rx_seq + 1U)) {
            /* The MT FCS catches damage above this layer */
            l->seq_errors++;
            TRXLOG(TRXLOG_WARN, "link: RX sequence gap: got %u, expected %u (stream bytes lost; MT FCS will reject "
                   "the damaged frame)", (unsigned)seq, (unsigned)(uint8_t)(l->rx_seq + 1U));
        }
        TRXLOG(TRXLOG_DEBUG, "link: RX chunk seq %u, %u bytes", (unsigned)seq, (unsigned)(req_len - STREAM_HDR));
        l->rx_seq = seq;
        l->rx_seq_valid = 1;
        l->rx_bytes += (uint32_t)(req_len - STREAM_HDR);
        l->rx_chunks++;
        l->last_rx_us = trx_spi_now_us();
        if (l->sink != NULL) {
            l->sink(l->sink_user, &req[STREAM_HDR], (size_t)(req_len - STREAM_HDR));
        }
    } else if (req[2] == TRXLINK_CMD_FLOW && req_len >= ENVELOPE_LEN + 2U) {
        l->rx_free = (uint16_t)(req[3] | ((uint16_t)req[4] << 8));
        l->flow_updates++;
        TRXLOG(TRXLOG_DEBUG, "link: FLOW update, RCP rx ring free = %u bytes", (unsigned)l->rx_free);
    } else {
        l->unknown_cmds++;
        TRXLOG(TRXLOG_WARN, "link: ignoring unknown Req_WISUN_RCP cmdType 0x%02X (%u bytes): host and firmware "
               "protocol versions differ?", (unsigned)req[2], (unsigned)req_len);
    }
}

void trx_link_on_block(struct trx_rcp_link *l, const uint8_t *payload, uint16_t len)
{
    uint16_t offset = 0;

    TRXLOG(TRXLOG_TRACE, "link: parsing block of %u bytes", (unsigned)len);

    while ((uint16_t)(offset + 2U) <= len) {
        const uint8_t req_len = payload[offset];

        if (req_len < 2U || (uint16_t)(offset + req_len) > len) {
            l->malformed_blocks++;
            TRXLOG(TRXLOG_WARN, "link: malformed request at offset %u of %u-byte block (len field %u): rest ignored",
                   (unsigned)offset, (unsigned)len, (unsigned)req_len);
            trx_spi_log_hex(TRXLOG_WARN, "malformed block", payload, len);
            break;
        }
        if (payload[offset + 1U] == TRXLINK_REQ_WISUN_RCP) {
            handle_rcp_request(l, &payload[offset], req_len);
        }
        offset = (uint16_t)(offset + req_len);
        offset = (uint16_t)((offset + (BLOCK_ALIGN - 1U)) & ~(BLOCK_ALIGN - 1U));
    }
}

int trx_link_service(struct trx_rcp_link *l)
{
    uint8_t rx[TRX_SPIBLOCK_SIZE];
    uint16_t rx_len = 0;
    int ret = 0;

    lock(l);
    /* Another thread may have drained the block while this one waited for the lock */
    if (l->core.ops.int_asserted(l->core.ctx)) {
        ret = trx_spi_core_read_block(&l->core, rx, &rx_len);
        if (ret == 0) {
            if (rx_len > 0) {
                trx_link_on_block(l, rx, rx_len);
            } else {
                l->empty_service++;
                TRXLOG(TRXLOG_DEBUG, "link: INT was asserted but the block was empty");
            }
            ret = 1;
        } else {
            TRXLOG(TRXLOG_ERROR, "link: reading the pending block failed (%d)", ret);
        }
    }
    unlock(l);
    return ret;
}

void trx_link_log_stats(const struct trx_rcp_link *l, int level)
{
    uint64_t now = trx_spi_now_us();

    TRXLOG(level, "link stats: tx_bytes=%u tx_chunks=%u rx_bytes=%u rx_chunks=%u | retries=%u (refused chunks %u, "
           "longest run %u, gave up %u) rejected=%u seq_err=%u bad_status=%u | flow_updates=%u rx_free=%u | "
           "resets=%u (failed %u) unknown_cmd=%u malformed=%u empty_int=%u",
           (unsigned)l->tx_bytes, (unsigned)l->tx_chunks, (unsigned)l->rx_bytes, (unsigned)l->rx_chunks,
           (unsigned)l->retry_count, (unsigned)l->refused_chunks, (unsigned)l->retry_max_run,
           (unsigned)l->full_aborts, (unsigned)l->rejected_chunks, (unsigned)l->seq_errors, (unsigned)l->bad_status,
           (unsigned)l->flow_updates, (unsigned)l->rx_free, (unsigned)l->resets_sent, (unsigned)l->reset_failures,
           (unsigned)l->unknown_cmds, (unsigned)l->malformed_blocks, (unsigned)l->empty_service);
    {
        char tx_age[24];
        char rx_age[24];

        if (l->last_tx_us) {
            snprintf(tx_age, sizeof(tx_age), "%llu ms", (unsigned long long)((now - l->last_tx_us) / 1000ULL));
        } else {
            snprintf(tx_age, sizeof(tx_age), "never");
        }
        if (l->last_rx_us) {
            snprintf(rx_age, sizeof(rx_age), "%llu ms", (unsigned long long)((now - l->last_rx_us) / 1000ULL));
        } else {
            snprintf(rx_age, sizeof(rx_age), "never");
        }
        TRXLOG(level, "link idle: last accepted TX chunk %s ago, last RX block %s ago", tx_age, rx_age);
    }
    trx_spi_core_log_stats(&l->core, level);
}
