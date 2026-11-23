/******************************************************************************
 @file trx_spi_core.c

 @brief Hardware independent TRX SPI master protocol core. See trx_spi_core.h.

 Ported from loki-trx-rcp-wisun host_rcp/trx_spi/trx_spi_master.c (tested
 against the TRX) with these deliberate differences:
   - all bus access is through struct trx_spi_ops (no spidev/GPIO here);
   - the request payload is zero padded to a 4-byte multiple and the CRC
     covers the padded length, exactly like loki-trx-host host_lite
     (prepAndSendTransaction, TRXHOST-664); the firmware skips the padding;
   - debug hex dumps are removed from the data path.
 *****************************************************************************/
#include "trx_spi_core.h"
#include <string.h>

#define TRX_SEND_COMMAND_MAX_ATTEMPTS 2
#define TRX_ALIGN4(x) ((uint8_t)(((x) + 3U) & ~3U))

static uint16_t crc_table[256];
static bool crc_table_ready;

static void crc_init_table(void)
{
    uint16_t i;
    int b;
    for (i = 0; i < 256; i++) {
        uint16_t crc = (uint16_t)(i << 8);
        for (b = 0; b < 8; b++) {
            crc = (crc & 0x8000U) ? (uint16_t)((crc << 1) ^ 0x1021U) : (uint16_t)(crc << 1);
        }
        crc_table[i] = crc;
    }
    crc_table_ready = true;
}

uint16_t trx_spi_crc16(const uint8_t *data, uint16_t len)
{
    uint16_t crc = 0xFFFFU;
    uint16_t i;
    if (!crc_table_ready) {
        crc_init_table();
    }
    for (i = 0; i < len; i++) {
        crc = (uint16_t)((crc << 8) ^ crc_table[(crc >> 8) ^ data[i]]);
    }
    return crc;
}

struct resp_info {
    uint8_t free_blocks;
    bool    error;
    bool    data_ready;
    bool    chip_ready;
    uint8_t payload_len;
    uint8_t tid_tx;
    uint8_t tid_ack;
    uint8_t status;
};

/* Validates length and CRC of a received block; rx holds at least rx_len bytes */
static bool parse_response(const uint8_t *rx, uint16_t rx_len, struct resp_info *info)
{
    uint16_t real_len;
    uint16_t crc_calc;
    uint16_t crc_wire;

    if (rx_len < (TRX_HEADER_SIZE + TRX_CRC_SIZE)) {
        TRXLOG(TRXLOG_ERROR, "rx block too short: %u bytes (need >= %d)", (unsigned)rx_len,
               TRX_HEADER_SIZE + TRX_CRC_SIZE);
        return false;
    }
    if (rx[1] > TRX_MAX_PAYLOAD_SIZE) {
        TRXLOG(TRXLOG_ERROR, "rx header declares payload length %u > max %d (bus noise, or TRX not driving MISO)",
               (unsigned)rx[1], TRX_MAX_PAYLOAD_SIZE);
        trx_spi_log_hex(TRXLOG_ERROR, "bad rx block", rx, rx_len);
        return false;
    }
    real_len = (uint16_t)(TRX_HEADER_SIZE + rx[1] + TRX_CRC_SIZE);
    if (real_len > rx_len) {
        TRXLOG(TRXLOG_ERROR, "rx block truncated: header says %u bytes, only %u clocked", (unsigned)real_len,
               (unsigned)rx_len);
        return false;
    }
    crc_calc = trx_spi_crc16(rx, (uint16_t)(real_len - TRX_CRC_SIZE));
    crc_wire = (uint16_t)(((uint16_t)rx[real_len - 2] << 8) | rx[real_len - 1]);
    if (crc_calc != crc_wire) {
        TRXLOG(TRXLOG_ERROR, "rx CRC error: calc 0x%04X, wire 0x%04X (len %u). Check wiring, clock speed, chip ready",
               (unsigned)crc_calc, (unsigned)crc_wire, (unsigned)real_len);
        trx_spi_log_hex(TRXLOG_ERROR, "rx block with bad CRC", rx, real_len);
        return false;
    }
    info->free_blocks = rx[0] & TRX_HDR0_FREE_MASK;
    info->error       = (rx[0] & TRX_HDR0_ERROR_MASK) != 0;
    info->data_ready  = (rx[0] & TRX_HDR0_DRDY_N_MASK) == 0;
    info->chip_ready  = (rx[0] & TRX_HDR0_CRDY_N_MASK) == 0;
    info->payload_len = rx[1];
    info->tid_tx      = rx[2] & 0x0F;
    info->tid_ack     = (uint8_t)((rx[2] & 0xF0) >> 4);
    info->status      = rx[3];
    TRXLOG(TRXLOG_DEBUG, "rx hdr: free=%u error=%d data_rdy=%d chip_rdy=%d len=%u tid_tx=%u tid_ack=%u status=0x%02X",
           (unsigned)info->free_blocks, info->error, info->data_ready, info->chip_ready,
           (unsigned)info->payload_len, (unsigned)info->tid_tx, (unsigned)info->tid_ack, (unsigned)info->status);
    return true;
}

void trx_spi_core_reset_state(struct trx_spi_core *c)
{
    TRXLOG(TRXLOG_INFO, "core: host state reset (tid_tx=1, tid_ack=0)");
    c->host_tid_tx = 1;
    c->trx_tid_rx = 0;
    c->free_blocks = 0x0F;
    c->trx_error = false;
}

void trx_spi_core_init(struct trx_spi_core *c, const struct trx_spi_ops *ops, void *ctx,
                       trx_spi_block_cb cb, void *user)
{
    memset(c, 0, sizeof(*c));
    c->ops = *ops;
    c->ctx = ctx;
    c->block_cb = cb;
    c->block_user = user;
    trx_spi_core_reset_state(c);
}

/* One CS cycle clocking max(tx_len, min_rx_len) bytes */
static int do_transfer(struct trx_spi_core *c, const uint8_t *tx, uint16_t tx_len,
                       uint16_t min_rx_len, uint8_t *rx, uint16_t *rx_len)
{
    uint8_t tx_buf[TRX_SPIBLOCK_SIZE];
    uint8_t rx_buf[TRX_SPIBLOCK_SIZE];
    uint16_t len = (tx_len > min_rx_len) ? tx_len : min_rx_len;
    uint64_t t0;
    uint64_t dt;
    int ret;

    if (len > TRX_SPIBLOCK_SIZE) {
        TRXLOG(TRXLOG_ERROR, "transfer length %u exceeds block size %d", (unsigned)len, TRX_SPIBLOCK_SIZE);
        return TRXSPI_ERR_IO;
    }
    memset(tx_buf, 0, sizeof(tx_buf));
    memset(rx_buf, 0, sizeof(rx_buf));
    if (tx != NULL && tx_len > 0) {
        memcpy(tx_buf, tx, tx_len);
    }
    if (tx_len > 0) {
        trx_spi_log_hex(TRXLOG_TRACE, "SPI MOSI", tx_buf, len);
    }
    t0 = trx_spi_now_us();
    ret = c->ops.transfer(c->ctx, tx_buf, rx_buf, len);
    dt = trx_spi_now_us() - t0;
    c->xfers++;
    c->xfer_bytes += len;
    c->xfer_us_total += dt;
    if (dt > c->xfer_us_max) {
        c->xfer_us_max = dt;
    }
    if (dt > TRX_SLOW_XFER_US) {
        c->slow_xfers++;
        TRXLOG(TRXLOG_WARN, "slow SPI transfer: %llu us for %u bytes (limit %d us): USB/scheduling latency?",
               (unsigned long long)dt, (unsigned)len, TRX_SLOW_XFER_US);
    }
    /* The TRX recovers its RX CRC engine after every CS deassert */
    c->ops.delay_us(c->ctx, TRX_CS_REASSERT_GUARD_US);
    if (ret < 0) {
        c->io_errors++;
        TRXLOG(TRXLOG_ERROR, "SPI transfer of %u bytes failed (bus/USB error) after %llu us", (unsigned)len,
               (unsigned long long)dt);
        return TRXSPI_ERR_IO;
    }
    TRXLOG(TRXLOG_DEBUG, "SPI xfer %u bytes (tx %u) in %llu us", (unsigned)len, (unsigned)tx_len,
           (unsigned long long)dt);
    trx_spi_log_hex(TRXLOG_TRACE, "SPI MISO", rx_buf, len);
    memcpy(rx, rx_buf, len);
    *rx_len = len;
    return TRXSPI_OK;
}

/* Reads the remainder of a block whose probe showed a longer payload */
static int extend_read(struct trx_spi_core *c, uint8_t *rx, uint16_t *rx_len)
{
    uint16_t full;
    if (*rx_len < TRX_HEADER_SIZE) {
        return TRXSPI_ERR_IO;
    }
    if (rx[1] > TRX_MAX_PAYLOAD_SIZE) {
        c->crc_errors++;
        TRXLOG(TRXLOG_ERROR, "probe read: payload length %u > max %d (header %02X %02X %02X %02X): bus noise or TRX idle",
               (unsigned)rx[1], TRX_MAX_PAYLOAD_SIZE, rx[0], rx[1], rx[2], rx[3]);
        return TRXSPI_ERR_CRC;
    }
    full = (uint16_t)(TRX_HEADER_SIZE + rx[1] + TRX_CRC_SIZE);
    if (full > *rx_len) {
        /* Reopen CS and clock the whole block again (as the tested master does) */
        TRXLOG(TRXLOG_DEBUG, "probe read shows payload %u: re-reading full block of %u bytes", (unsigned)rx[1],
               (unsigned)full);
        return do_transfer(c, NULL, 0, full, rx, rx_len);
    }
    return TRXSPI_OK;
}

static void note_response(struct trx_spi_core *c, const struct resp_info *info)
{
    if (info->free_blocks < TRX_MIN_FREE_BLOCKS && c->free_blocks >= TRX_MIN_FREE_BLOCKS) {
        c->low_free_blocks++;
        TRXLOG(TRXLOG_WARN, "TRX reports only %u free SPI blocks (need >= %d): it is falling behind",
               (unsigned)info->free_blocks, TRX_MIN_FREE_BLOCKS);
    }
    c->free_blocks = info->free_blocks;
    c->trx_error = info->error;
    if (info->tid_tx != 0) {
        c->trx_tid_rx = info->tid_tx;
    }
}

int trx_spi_core_send_command(struct trx_spi_core *c, const uint8_t *payload, uint8_t len,
                              uint8_t *out, uint16_t *out_len)
{
    int attempt;

    if (len > TRX_MAX_PAYLOAD_SIZE) {
        TRXLOG(TRXLOG_ERROR, "command of %u bytes exceeds max payload %d", (unsigned)len, TRX_MAX_PAYLOAD_SIZE);
        return TRXSPI_ERR_IO;
    }
    c->requests++;

    for (attempt = 0; attempt < TRX_SEND_COMMAND_MAX_ATTEMPTS; attempt++) {
        uint8_t tx[TRX_SPIBLOCK_SIZE];
        uint8_t rx[TRX_SPIBLOCK_SIZE];
        uint16_t rx_actual = 0;
        uint8_t padded = TRX_ALIGN4(len);
        uint8_t tid_tx = c->host_tid_tx;
        uint16_t total;
        uint16_t crc;
        struct resp_info info;
        bool have_undrained;
        bool got_status = false;
        int drain;
        int ret;

        if (padded > TRX_MAX_PAYLOAD_SIZE) {
            padded = len;
        }
        if (tid_tx == 0 || tid_tx > TRX_TID_MAX) {
            tid_tx = 1;
        }
        memset(tx, 0, sizeof(tx));
        tx[0] = 0;
        tx[1] = padded;
        tx[2] = (uint8_t)((tid_tx & 0x0F) | ((c->trx_tid_rx & 0x0F) << 4));
        tx[3] = 0;
        if (len > 0) {
            memcpy(&tx[TRX_HEADER_SIZE], payload, len);
        }
        crc = trx_spi_crc16(tx, (uint16_t)(TRX_HEADER_SIZE + padded));
        tx[TRX_HEADER_SIZE + padded]     = (uint8_t)(crc >> 8);
        tx[TRX_HEADER_SIZE + padded + 1] = (uint8_t)(crc & 0xFF);
        total = (uint16_t)(TRX_HEADER_SIZE + padded + TRX_CRC_SIZE);
        c->host_tid_tx = (tid_tx >= TRX_TID_MAX) ? 1 : (uint8_t)(tid_tx + 1);
        c->last_tid_sent = tid_tx;

        TRXLOG(TRXLOG_DEBUG, "tx request #%u attempt %d: %u bytes (padded %u), tid_tx=%u tid_ack=%u, req type %u",
               (unsigned)c->requests, attempt + 1, (unsigned)len, (unsigned)padded, (unsigned)tid_tx,
               (unsigned)c->trx_tid_rx, (len >= 2) ? (unsigned)payload[1] : 0U);
        trx_spi_log_hex(TRXLOG_TRACE, "tx block", tx, total);

        /* Full duplex: this transfer's MISO half may already carry an earlier
         * response block, which must go through the same handling as any other. */
        ret = do_transfer(c, tx, total, TRX_READ_PROBE_LEN, rx, &rx_actual);
        if (ret < 0) {
            return ret;
        }
        have_undrained = (rx_actual >= TRX_HEADER_SIZE) && ((rx[0] & TRX_HDR0_DRDY_N_MASK) == 0);
        if (have_undrained) {
            TRXLOG(TRXLOG_DEBUG, "response block already queued on MISO during the send (len %u)", (unsigned)rx[1]);
            ret = extend_read(c, rx, &rx_actual);
            if (ret < 0) {
                return ret;
            }
        }

        for (drain = 0; !got_status && drain < TRX_RESPONSE_DRAIN_MAX; drain++) {
            if (have_undrained) {
                have_undrained = false;
            } else {
                if (!c->ops.int_asserted(c->ctx)) {
                    uint64_t w0 = trx_spi_now_us();

                    TRXLOG(TRXLOG_DEBUG, "waiting for INT (response to request #%u, drain %d)",
                           (unsigned)c->requests, drain);
                    if (c->ops.wait_int(c->ctx, TRX_INT_TIMEOUT_MS) < 0) {
                        c->timeouts++;
                        TRXLOG(TRXLOG_ERROR, "timeout: INT not asserted within %d ms after request #%u "
                               "(TRX not running / not answering? INT wired? last tid_rx=%u free=%u)",
                               TRX_INT_TIMEOUT_MS, (unsigned)c->requests, (unsigned)c->trx_tid_rx,
                               (unsigned)c->free_blocks);
                        return TRXSPI_ERR_TIMEOUT;
                    }
                    TRXLOG(TRXLOG_DEBUG, "INT asserted after %llu us", (unsigned long long)(trx_spi_now_us() - w0));
                }
                ret = do_transfer(c, NULL, 0, TRX_READ_PROBE_LEN, rx, &rx_actual);
                if (ret < 0) {
                    return ret;
                }
                ret = extend_read(c, rx, &rx_actual);
                if (ret < 0) {
                    return ret;
                }
            }
            if (!parse_response(rx, rx_actual, &info)) {
                c->crc_errors++;
                TRXLOG(TRXLOG_ERROR, "request #%u: response failed validation (crc_errors=%u)",
                       (unsigned)c->requests, (unsigned)c->crc_errors);
                return TRXSPI_ERR_CRC;
            }
            if (info.error) {
                got_status = true;
            } else if (info.payload_len >= 2 && rx[TRX_HEADER_SIZE + 1] == TRX_REQ_LAST_STATUS) {
                got_status = true;
                TRXLOG(TRXLOG_DEBUG, "LastStatus for request type %u: status=%u tid=%u (after %d extra block(s))",
                       (unsigned)((info.payload_len >= 3) ? (rx[TRX_HEADER_SIZE + 2] & 0x7FU) : 0U),
                       (unsigned)((info.payload_len >= 4) ? (rx[TRX_HEADER_SIZE + 3] >> 4) : 0U),
                       (unsigned)((info.payload_len >= 4) ? (rx[TRX_HEADER_SIZE + 3] & 0x0FU) : 0U), drain);
            } else {
                /* Side effect block (stream data, flow report, ping echo ...) */
                c->unexpected_blocks++;
                TRXLOG(TRXLOG_DEBUG, "side-effect block while waiting for LastStatus: req type %u, %u bytes",
                       (unsigned)((info.payload_len >= 2) ? rx[TRX_HEADER_SIZE + 1] : 0U), (unsigned)info.payload_len);
                if (c->block_cb != NULL && info.payload_len > 0) {
                    c->block_cb(c->block_user, &rx[TRX_HEADER_SIZE], info.payload_len);
                }
                note_response(c, &info);
            }
        }
        if (!got_status) {
            c->timeouts++;
            TRXLOG(TRXLOG_ERROR, "no LastStatus within %d response blocks for request #%u (TRX flooding or confused)",
                   TRX_RESPONSE_DRAIN_MAX, (unsigned)c->requests);
            return TRXSPI_ERR_TIMEOUT;
        }

        note_response(c, &info);

        if (info.error) {
            c->trx_errors++;
            TRXLOG(TRXLOG_WARN, "TRX reported an error block for request #%u (status 0x%02X, %u payload bytes)",
                   (unsigned)c->requests, (unsigned)info.status, (unsigned)info.payload_len);
            trx_spi_log_hex(TRXLOG_WARN, "TRX error payload", &rx[TRX_HEADER_SIZE], info.payload_len);
            /* Error payload is a TRX_Request_TransportError:
             * [len][request=2][tid_ok:4|tid_error:4][error] */
            if (attempt == 0 && info.payload_len >= 4) {
                const uint8_t *e = &rx[TRX_HEADER_SIZE];
                if (e[1] == TRX_REQ_TRANSPORT_ERROR && e[3] == TRX_TRANSPORT_ERROR_TID_UNEXPECTED) {
                    /* The firmware keeps its TID across host restarts: adopt the one it expects */
                    TRXLOG(TRXLOG_WARN, "TID_UNEXPECTED: sent tid %u, TRX expects %u: resyncing and retrying "
                           "(normal after a host restart; repeated = lost blocks on the bus)",
                           (unsigned)tid_tx, (unsigned)(e[2] & 0x0F));
                    c->host_tid_tx = (uint8_t)(e[2] & 0x0F);
                    if (c->host_tid_tx == 0) {
                        c->host_tid_tx = 1;
                    }
                    c->tid_resyncs++;
                    continue;
                }
            }
            TRXLOG(TRXLOG_ERROR, "TRX transport error, request #%u not accepted (attempt %d)", (unsigned)c->requests,
                   attempt + 1);
            return TRXSPI_ERR_DEVICE;
        }

        if (out != NULL && out_len != NULL) {
            if (info.payload_len > 0) {
                memcpy(out, &rx[TRX_HEADER_SIZE], info.payload_len);
            }
            *out_len = info.payload_len;
        }
        return TRXSPI_OK;
    }
    TRXLOG(TRXLOG_ERROR, "request #%u failed after %d attempts", (unsigned)c->requests,
           TRX_SEND_COMMAND_MAX_ATTEMPTS);
    return TRXSPI_ERR_DEVICE;
}

void trx_spi_core_log_stats(const struct trx_spi_core *c, int level)
{
    TRXLOG(level, "core stats: requests=%u xfers=%llu bytes=%llu avg=%llu us max=%llu us slow=%u | "
           "crc_err=%u timeouts=%u io_err=%u trx_err=%u tid_resync=%u side_blocks=%u low_free=%u",
           (unsigned)c->requests, (unsigned long long)c->xfers, (unsigned long long)c->xfer_bytes,
           (unsigned long long)(c->xfers ? c->xfer_us_total / c->xfers : 0ULL), (unsigned long long)c->xfer_us_max,
           (unsigned)c->slow_xfers, (unsigned)c->crc_errors, (unsigned)c->timeouts, (unsigned)c->io_errors,
           (unsigned)c->trx_errors, (unsigned)c->tid_resyncs, (unsigned)c->unexpected_blocks,
           (unsigned)c->low_free_blocks);
}

int trx_spi_core_read_block(struct trx_spi_core *c, uint8_t *out, uint16_t *out_len)
{
    uint8_t rx[TRX_SPIBLOCK_SIZE];
    uint16_t rx_actual = 0;
    struct resp_info info;
    int ret;

    ret = do_transfer(c, NULL, 0, TRX_READ_PROBE_LEN, rx, &rx_actual);
    if (ret < 0) {
        return ret;
    }
    ret = extend_read(c, rx, &rx_actual);
    if (ret < 0) {
        return ret;
    }
    if (!parse_response(rx, rx_actual, &info)) {
        c->crc_errors++;
        TRXLOG(TRXLOG_ERROR, "async read: response failed validation (crc_errors=%u)", (unsigned)c->crc_errors);
        return TRXSPI_ERR_CRC;
    }
    note_response(c, &info);
    TRXLOG(TRXLOG_DEBUG, "async read: %u payload bytes (tid_tx=%u free=%u)", (unsigned)info.payload_len,
           (unsigned)info.tid_tx, (unsigned)info.free_blocks);
    if (info.payload_len > 0) {
        memcpy(out, &rx[TRX_HEADER_SIZE], info.payload_len);
    }
    *out_len = info.payload_len;
    return TRXSPI_OK;
}
