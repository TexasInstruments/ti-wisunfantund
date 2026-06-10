/*
 * MQTTClient.cpp — MQTT 3.1.1 lwip client (QoS 0 only) for wfantund
 * Transport replaced: tcp_app direct calls → SendDataFn/TcpConnectFn/TcpDisconnectFn callbacks
 */

#if HAVE_CONFIG_H
#include <config.h>
#endif

#include "MQTTClient.h"
#include "time-utils.h"

#include <syslog.h>
#include <string.h>
#include <stdio.h>
#include <assert.h>

#define MQTT_MSG_TYPE_CONNECT 1
#define MQTT_MSG_TYPE_CONNACK 2
#define MQTT_MSG_TYPE_PUBLISH 3
#define MQTT_MSG_TYPE_SUBSCRIBE 8
#define MQTT_MSG_TYPE_SUBACK 9
#define MQTT_MSG_TYPE_UNSUBSCRIBE 10
#define MQTT_MSG_TYPE_UNSUBACK 11
#define MQTT_MSG_TYPE_PINGREQ 12
#define MQTT_MSG_TYPE_PINGRESP 13
#define MQTT_MSG_TYPE_DISCONNECT 14

#define MQTT_CONNECT_FLAG_CLEAN_SESSION (1 << 1)

namespace nl
{
    namespace wpantund
    {

        MQTTClient::MQTTClient(SendDataFn sendData, TcpConnectFn tcpConnect, TcpDisconnectFn tcpDisconnect)
            : mSendData(sendData), mTcpConnect(tcpConnect), mTcpDisconnect(tcpDisconnect), mState(MQTT_STATE_DISCONNECTED), mBrokerPort(0), mKeepAlive(0), mTxHead(0), mTxTail(0), mRxLen(0), mMsgIdx(0), mLastCyclicMs(0), mCyclicTick(0), mServerWatchdog(0), mPktIdSeq(0)
        {
            memset(mTxBuf, 0, sizeof(mTxBuf));
            memset(mRxBuf, 0, sizeof(mRxBuf));
        }

        MQTTClient::~MQTTClient()
        {
            do_close();
        }

        /* ============================================================
         * TX ring buffer helpers
         * ============================================================ */

        size_t MQTTClient::tx_free() const
        {
            return MQTT_OUTPUT_BUF_SIZE - ((mTxTail - mTxHead + MQTT_OUTPUT_BUF_SIZE) % MQTT_OUTPUT_BUF_SIZE) - 1;
        }

        size_t MQTTClient::tx_len() const
        {
            return (mTxTail - mTxHead + MQTT_OUTPUT_BUF_SIZE) % MQTT_OUTPUT_BUF_SIZE;
        }

        void MQTTClient::tx_append_u8(uint8_t v)
        {
            mTxBuf[mTxTail] = v;
            mTxTail = (mTxTail + 1) % MQTT_OUTPUT_BUF_SIZE;
        }

        void MQTTClient::tx_append_u16(uint16_t v)
        {
            tx_append_u8((uint8_t)(v >> 8));
            tx_append_u8((uint8_t)(v & 0xff));
        }

        void MQTTClient::tx_append(const uint8_t *data, size_t len)
        {
            for (size_t i = 0; i < len; i++)
            {
                tx_append_u8(data[i]);
            }
        }

        void MQTTClient::tx_append_string(const char *s, uint16_t len)
        {
            tx_append_u16(len);
            tx_append((const uint8_t *)s, len);
        }

        void MQTTClient::tx_append_fixed_header(uint8_t msg_type, uint8_t flags, uint32_t remaining_len)
        {
            tx_append_u8((uint8_t)(((msg_type & 0x0f) << 4) | (flags & 0x0f)));
            do
            {
                uint8_t enc = (uint8_t)(remaining_len & 0x7f);
                remaining_len >>= 7;
                if (remaining_len > 0)
                    enc |= 0x80;
                tx_append_u8(enc);
            } while (remaining_len > 0);
        }

        void MQTTClient::tx_flush()
        {
            /* Copy ring buffer into a contiguous block and send via callback */
            size_t len = tx_len();
            if (len == 0)
                return;

            /* Allocate temporary buffer (stack ok for typical MQTT packets ≤512B) */
            uint8_t tmp[MQTT_OUTPUT_BUF_SIZE];
            for (size_t i = 0; i < len; i++)
            {
                tmp[i] = mTxBuf[(mTxHead + i) % MQTT_OUTPUT_BUF_SIZE];
            }
            mTxHead = mTxTail; /* consume all */
            mSendData(tmp, len);
        }

        uint16_t MQTTClient::next_pkt_id()
        {
            mPktIdSeq++;
            if (mPktIdSeq == 0)
                mPktIdSeq = 1;
            return mPktIdSeq;
        }

        /* ============================================================
         * Public API
         * ============================================================ */

        int MQTTClient::connect(const std::string &addr, uint16_t port,
                                const std::string &client_id, uint16_t keepalive)
        {
            if (mState != MQTT_STATE_DISCONNECTED)
            {
                syslog(LOG_WARNING, "MQTTClient::connect: already connected/connecting");
                return -1;
            }

            mBrokerAddr = addr;
            mBrokerPort = port;
            mClientId = client_id;
            mKeepAlive = keepalive;
            mTxHead = mTxTail = 0;
            mRxLen = mMsgIdx = 0;
            mCyclicTick = mServerWatchdog = 0;
            mLastCyclicMs = 0;

            /* ---- Build MQTT CONNECT packet into TX buffer ---- */
            uint16_t client_id_len = (uint16_t)client_id.size();
            uint32_t remaining_len = 2 + 4 + 1 + 1 + 2    /* proto name + level + flags + keepalive */
                                     + 2 + client_id_len; /* client id length-prefixed */

            if (tx_free() < remaining_len + 5 /* max fixed header */)
            {
                syslog(LOG_ERR, "MQTTClient::connect: TX buffer too small");
                return -2;
            }

            tx_append_fixed_header(MQTT_MSG_TYPE_CONNECT, 0, remaining_len);
            tx_append_string("MQTT", 4);
            tx_append_u8(4); /* Protocol level 3.1.1 */
            tx_append_u8(MQTT_CONNECT_FLAG_CLEAN_SESSION);
            tx_append_u16(keepalive);
            tx_append_string(client_id.c_str(), client_id_len);
            /* CONNECT packet is buffered; it will be flushed in handle_tcp_connected() */

            /* ---- Initiate TCP connection ---- */
            mState = MQTT_STATE_TCP_CONNECTING;
            syslog(LOG_INFO, "MQTTClient: connecting TCP to [%s]:%d", addr.c_str(), port);

            if (!mTcpConnect(addr, port))
            {
                syslog(LOG_ERR, "MQTTClient: TcpConnect failed");
                mState = MQTT_STATE_DISCONNECTED;
                mTxHead = mTxTail = 0;
                return -1;
            }

            /* Schedule connect-timeout cyclic check */
            mLastCyclicMs = time_ms();

            return 0;
        }

        void MQTTClient::disconnect()
        {
            if (mState == MQTT_STATE_CONNECTED)
            {
                /* Send MQTT DISCONNECT packet */
                if (tx_free() >= 2)
                {
                    tx_append_fixed_header(MQTT_MSG_TYPE_DISCONNECT, 0, 0);
                    tx_flush();
                }
            }
            do_close();
        }

        int MQTTClient::publish(const std::string &topic,
                                const uint8_t *payload, size_t payload_len,
                                uint8_t retain)
        {
            if (mState != MQTT_STATE_CONNECTED)
            {
                return -1;
            }

            uint16_t topic_len = (uint16_t)topic.size();
            uint32_t remaining_len = 2 + topic_len + (uint32_t)payload_len;

            if (tx_free() < remaining_len + 5)
            {
                return -2;
            }

            /* QoS 0: flags = retain bit only */
            uint8_t flags = retain ? 0x01 : 0x00;
            tx_append_fixed_header(MQTT_MSG_TYPE_PUBLISH, flags, remaining_len);
            tx_append_string(topic.c_str(), topic_len);
            if (payload && payload_len > 0)
            {
                tx_append(payload, payload_len);
            }
            tx_flush();
            return 0;
        }

        int MQTTClient::subscribe(const std::string &topic, uint8_t qos)
        {
            if (mState != MQTT_STATE_CONNECTED)
                return -1;

            uint16_t topic_len = (uint16_t)topic.size();
            uint32_t remaining_len = 2 /* pkt_id */ + 2 + topic_len + 1 /* QoS */;

            if (tx_free() < remaining_len + 5)
                return -2;

            uint16_t pkt_id = next_pkt_id();
            /* SUBSCRIBE uses QoS 1 in the fixed header flags (byte 0) */
            tx_append_fixed_header(MQTT_MSG_TYPE_SUBSCRIBE, 0x02, remaining_len);
            tx_append_u16(pkt_id);
            tx_append_string(topic.c_str(), topic_len);
            tx_append_u8(qos & 0x03);
            tx_flush();
            return 0;
        }

        int MQTTClient::unsubscribe(const std::string &topic)
        {
            if (mState != MQTT_STATE_CONNECTED)
                return -1;

            uint16_t topic_len = (uint16_t)topic.size();
            uint32_t remaining_len = 2 /* pkt_id */ + 2 + topic_len;

            if (tx_free() < remaining_len + 5)
                return -2;

            uint16_t pkt_id = next_pkt_id();
            /* UNSUBSCRIBE uses QoS 1 in fixed header flags */
            tx_append_fixed_header(MQTT_MSG_TYPE_UNSUBSCRIBE, 0x02, remaining_len);
            tx_append_u16(pkt_id);
            tx_append_string(topic.c_str(), topic_len);
            tx_flush();
            return 0;
        }

        void MQTTClient::set_incoming_publish_callback(IncomingPublishFn cb)
        {
            mIncomingPublishCb = cb;
        }

        /* ============================================================
         * TCP event callbacks (called from SpinelNCPVendorCustom)
         * ============================================================ */

        void MQTTClient::handle_tcp_connected()
        {
            if (mState != MQTT_STATE_TCP_CONNECTING)
            {
                syslog(LOG_WARNING, "MQTTClient::handle_tcp_connected: unexpected state %d", (int)mState);
                return;
            }
            syslog(LOG_INFO, "MQTTClient: TCP connected, sending CONNECT packet");
            mState = MQTT_STATE_CONNECTING;
            mMsgIdx = 0;
            mRxLen = 0;
            mCyclicTick = 0;
            mLastCyclicMs = time_ms();

            /* Flush the buffered MQTT CONNECT packet */
            tx_flush();
        }

        void MQTTClient::handle_tcp_disconnected()
        {
            syslog(LOG_INFO, "MQTTClient: TCP connection lost");
            if (mState != MQTT_STATE_DISCONNECTED)
            {
                mState = MQTT_STATE_DISCONNECTED;
            }
            mTxHead = mTxTail = 0;
            mRxLen = mMsgIdx = 0;
            mLastCyclicMs = 0;
        }

        void MQTTClient::handle_tcp_rx(const uint8_t *data, size_t len)
        {
            if (mState == MQTT_STATE_DISCONNECTED || mState == MQTT_STATE_TCP_CONNECTING)
            {
                return;
            }
            /* Reset server watchdog on any received data */
            mServerWatchdog = 0;
            parse_incoming(data, len);
        }

        /* ============================================================
         * Incoming packet parser (ported from mqtt_parse_incoming)
         * ============================================================ */

        void MQTTClient::parse_incoming(const uint8_t *data, size_t data_len)
        {
            /* Append data to RX buffer for reassembly */
            for (size_t i = 0; i < data_len; i++)
            {
                if (mRxLen < MQTT_RX_BUF_SIZE)
                {
                    mRxBuf[mRxLen++] = data[i];
                }
            }

            /* Process complete packets from RX buffer */
            while (mRxLen >= 2)
            {
                /* Decode fixed header: 1 byte type/flags + variable-length remaining */
                uint8_t type_byte = mRxBuf[0];
                uint32_t remaining = 0;
                size_t hdr_len = 1;
                uint32_t multiplier = 1;
                bool len_done = false;

                for (size_t i = 1; i <= 4; i++)
                {
                    if (i >= mRxLen)
                        goto wait_more; /* incomplete header */
                    uint8_t enc = mRxBuf[i];
                    remaining += (uint32_t)(enc & 0x7f) * multiplier;
                    multiplier *= 128;
                    hdr_len++;
                    if ((enc & 0x80) == 0)
                    {
                        len_done = true;
                        break;
                    }
                }
                if (!len_done)
                    goto wait_more;

                /* Full packet = header + remaining payload */
                if (mRxLen < hdr_len + remaining)
                    goto wait_more;

                {
                    uint8_t msg_type = (type_byte >> 4) & 0x0f;
                    uint8_t flags = type_byte & 0x0f;
                    const uint8_t *payload = mRxBuf + hdr_len;

                    switch (msg_type)
                    {
                    case MQTT_MSG_TYPE_CONNACK:
                        handle_connack(payload, (size_t)remaining);
                        break;
                    case MQTT_MSG_TYPE_PUBLISH:
                        handle_publish(payload, (size_t)remaining, (flags >> 1) & 0x03);
                        break;
                    case MQTT_MSG_TYPE_SUBACK:
                        handle_suback(payload, (size_t)remaining);
                        break;
                    case MQTT_MSG_TYPE_PINGRESP:
                        syslog(LOG_DEBUG, "MQTTClient: PINGRESP received");
                        break;
                    default:
                        syslog(LOG_DEBUG, "MQTTClient: ignoring packet type %d", (int)msg_type);
                        break;
                    }

                    /* Consume this packet from RX buffer */
                    size_t consumed = hdr_len + (size_t)remaining;
                    memmove(mRxBuf, mRxBuf + consumed, mRxLen - consumed);
                    mRxLen -= consumed;
                }
                continue;
            wait_more:
                break;
            }
        }

        void MQTTClient::handle_connack(const uint8_t *payload, size_t len)
        {
            if (mState != MQTT_STATE_CONNECTING)
                return;
            if (len < 2)
            {
                do_close();
                return;
            }

            uint8_t rc = payload[1];
            if (rc == 0)
            {
                syslog(LOG_INFO, "MQTTClient: CONNACK accepted");
                mState = MQTT_STATE_CONNECTED;
                mCyclicTick = 0;
                mServerWatchdog = 0;
                mLastCyclicMs = time_ms();
            }
            else
            {
                syslog(LOG_WARNING, "MQTTClient: CONNACK refused (rc=%d)", (int)rc);
                do_close();
            }
        }

        void MQTTClient::handle_publish(const uint8_t *payload, size_t len, uint8_t qos)
        {
            if (len < 2)
                return;
            uint16_t topic_len = ((uint16_t)payload[0] << 8) | payload[1];
            if (len < (size_t)(2 + topic_len))
                return;

            /* Extract topic (null-terminate temporarily) */
            char topic_buf[128];
            size_t copy_len = topic_len < sizeof(topic_buf) - 1 ? topic_len : sizeof(topic_buf) - 1;
            memcpy(topic_buf, payload + 2, copy_len);
            topic_buf[copy_len] = '\0';

            size_t pkt_id_len = (qos > 0) ? 2 : 0;
            const uint8_t *msg_payload = payload + 2 + topic_len + pkt_id_len;
            size_t msg_len = len - 2 - topic_len - pkt_id_len;

            syslog(LOG_INFO, "MQTTClient: PUBLISH topic=%s len=%zu msg=%s", topic_buf, msg_len, msg_payload);

            if (mIncomingPublishCb)
            {
                mIncomingPublishCb(std::string(topic_buf), msg_payload, msg_len);
            }
        }

        void MQTTClient::handle_suback(const uint8_t *payload, size_t len)
        {
            /* len >= 3: pkt_id(2) + return_code(1) */
            if (len >= 3)
            {
                syslog(LOG_INFO, "MQTTClient: SUBACK granted_qos=%d", (int)payload[2]);
            }
        }

        /* ============================================================
         * Timer integration
         * ============================================================ */

        cms_t MQTTClient::get_ms_to_next_event() const
        {
            if (mState == MQTT_STATE_DISCONNECTED)
            {
                return CMS_DISTANT_FUTURE;
            }
            /* We want to be called every MQTT_CYCLIC_TIMER_INTERVAL_S seconds */
            if (mLastCyclicMs == 0)
                return CMS_DISTANT_FUTURE;
            cms_t elapsed = time_ms() - mLastCyclicMs;
            cms_t interval_ms = (cms_t)MQTT_CYCLIC_TIMER_INTERVAL_S * 1000;
            if (elapsed >= interval_ms)
                return 0;
            return interval_ms - elapsed;
        }

        void MQTTClient::process()
        {
            if (mState == MQTT_STATE_DISCONNECTED)
                return;
            if (mLastCyclicMs == 0)
                return;

            cms_t elapsed = time_ms() - mLastCyclicMs;
            cms_t interval_ms = (cms_t)MQTT_CYCLIC_TIMER_INTERVAL_S * 1000;
            if (elapsed < interval_ms)
                return;

            mLastCyclicMs = time_ms();
            mCyclicTick += MQTT_CYCLIC_TIMER_INTERVAL_S;

            if (mState == MQTT_STATE_CONNECTING || mState == MQTT_STATE_TCP_CONNECTING)
            {
                /* Check connect timeout */
                if (mCyclicTick >= MQTT_CONNECT_TIMEO_S)
                {
                    syslog(LOG_WARNING, "MQTTClient: CONNECT timeout");
                    do_close();
                }
                return;
            }

            if (mState == MQTT_STATE_CONNECTED && mKeepAlive > 0)
            {
                mServerWatchdog += MQTT_CYCLIC_TIMER_INTERVAL_S;

                /* Server unresponsive: 1.5 * keepalive without a message */
                if (mServerWatchdog > mKeepAlive + mKeepAlive / 2)
                {
                    syslog(LOG_WARNING, "MQTTClient: server keepalive timeout");
                    do_close();
                    return;
                }

                /* Send PINGREQ at keepalive interval */
                if (mCyclicTick >= mKeepAlive)
                {
                    send_pingreq();
                    mCyclicTick = 0;
                }
            }
        }

        void MQTTClient::send_pingreq()
        {
            if (tx_free() < 2)
                return;
            tx_append_fixed_header(MQTT_MSG_TYPE_PINGREQ, 0, 0);
            tx_flush();
            syslog(LOG_DEBUG, "MQTTClient: sent PINGREQ");
        }

        /* ============================================================
         * Internal close
         * ============================================================ */

        void MQTTClient::do_close()
        {
            if (mState != MQTT_STATE_DISCONNECTED)
            {
                mTcpDisconnect();
            }
            mState = MQTT_STATE_DISCONNECTED;
            mTxHead = mTxTail = 0;
            mRxLen = mMsgIdx = 0;
            mCyclicTick = mServerWatchdog = 0;
            mLastCyclicMs = 0;
        }

        const char *MQTTClient::get_status_str() const
        {
            switch (mState)
            {
            case MQTT_STATE_CONNECTED:
                return "connected";
            case MQTT_STATE_CONNECTING:
                return "connecting";
            case MQTT_STATE_TCP_CONNECTING:
                return "tcp_connecting";
            default:
                return "disconnected";
            }
        }

    } // namespace wpantund
} // namespace nl