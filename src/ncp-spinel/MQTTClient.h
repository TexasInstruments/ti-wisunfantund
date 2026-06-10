/*
 * MQTTClient.h — MQTT 3.1.1 client (QoS 0 only) for wfantund
 *
 * Transport: uses Spinel TCP commands (TCP:ClientConnect / TCP:Send)
 * rather than direct tcp_app calls.
 */
#ifndef WPANTUND_MQTT_CLIENT_H
#define WPANTUND_MQTT_CLIENT_H

#include <stdint.h>
#include <string>
#include <vector>
#include <functional>
#include "time-utils.h"   // for cms_t and time_ms()

namespace nl {
namespace wpantund {

/* ---- MQTT connection states ---- */
enum MQTTState {
    MQTT_STATE_DISCONNECTED  = 0,
    MQTT_STATE_TCP_CONNECTING = 1,
    MQTT_STATE_CONNECTING    = 2,   // TCP connected, waiting for CONNACK
    MQTT_STATE_CONNECTED     = 3,
};

/* ---- Cyclic timer interval (seconds) ---- */
#define MQTT_CYCLIC_TIMER_INTERVAL_S   10
#define MQTT_CONNECT_TIMEO_S           30
#define MQTT_OUTPUT_BUF_SIZE          512
#define MQTT_RX_BUF_SIZE              256

class MQTTClient {
public:
    /* SendDataFn: called to push raw bytes over TCP (via TCP:Send Spinel) */
    typedef std::function<void(const uint8_t *data, size_t len)> SendDataFn;
    /* TcpConnectFn: called to initiate TCP connection (via TCP:ClientConnect Spinel) */
    typedef std::function<bool(const std::string &addr, uint16_t port)> TcpConnectFn;
    /* TcpDisconnectFn: called to close TCP connection (via TCP:Disconnect Spinel) */
    typedef std::function<void()> TcpDisconnectFn;

    /* Incoming publish callback: called when a PUBLISH packet is received from broker */
    typedef std::function<void(const std::string &topic,
                               const uint8_t *payload, size_t payload_len)> IncomingPublishFn;

    MQTTClient(SendDataFn     sendData,
               TcpConnectFn   tcpConnect,
               TcpDisconnectFn tcpDisconnect);

    ~MQTTClient();

    /* ---- API called from SpinelNCPVendorCustom ---- */

    /**
     * Start MQTT connection. Initiates TCP connection; MQTT CONNECT is sent
     * automatically when TCP connection is established (handle_tcp_connected).
     * @return 0 on success, -1 on invalid args or already connected
     */
    int connect(const std::string &addr, uint16_t port,
                const std::string &client_id, uint16_t keepalive);

    /** Send MQTT DISCONNECT and close TCP connection. */
    void disconnect();

    /**
     * Publish a message (QoS 0 only).
     * @return 0 on success, -1 if not connected, -2 if no buffer space
     */
    int publish(const std::string &topic,
                const uint8_t *payload, size_t payload_len,
                uint8_t retain = 0);

    /**
     * Subscribe to a topic.
     * @return 0 on success, -1 if not connected
     */
    int subscribe(const std::string &topic, uint8_t qos = 0);

    /**
     * Unsubscribe from a topic.
     * @return 0 on success, -1 if not connected
     */
    int unsubscribe(const std::string &topic);

    /** Set callback for incoming PUBLISH messages from broker. */
    void set_incoming_publish_callback(IncomingPublishFn cb);

    /* ---- Called from SpinelNCPInstance when NCP sends unsolicited Spinel data ---- */

    /** Called when unsolicited TCP_SEND_ALL arrives (raw TCP RX data from NCP). */
    void handle_tcp_rx(const uint8_t *data, size_t len);

    /** Called when unsolicited TCP_STATUS arrives with connected=1. */
    void handle_tcp_connected();

    /** Called when unsolicited TCP_STATUS arrives with connected=0. */
    void handle_tcp_disconnected();

    /* ---- Status ---- */
    MQTTState get_state() const { return mState; }
    const char *get_status_str() const;

    /* ---- Timer integration with wfantund's event loop ---- */
    /** Returns milliseconds until the next process() call is needed.
     *  Returns CMS_DISTANT_FUTURE if no timer is active. */
    cms_t get_ms_to_next_event() const;

    /** Called periodically by SpinelNCPVendorCustom::process().
     *  Handles MQTT keepalive PINGREQ, CONNECT timeout. */
    void process();

private:
    /* Transport callbacks */
    SendDataFn      mSendData;
    TcpConnectFn    mTcpConnect;
    TcpDisconnectFn mTcpDisconnect;

    /* Incoming publish callback */
    IncomingPublishFn mIncomingPublishCb;

    /* Connection state */
    MQTTState mState;
    std::string mBrokerAddr;
    uint16_t    mBrokerPort;
    std::string mClientId;
    uint16_t    mKeepAlive;   /* seconds */

    /* Output buffer (flat byte array, head/tail ring buffer) */
    uint8_t  mTxBuf[MQTT_OUTPUT_BUF_SIZE];
    size_t   mTxHead;
    size_t   mTxTail;

    /* Input buffer for partial MQTT packet reassembly */
    uint8_t  mRxBuf[MQTT_RX_BUF_SIZE];
    size_t   mRxLen;
    size_t   mMsgIdx;       /* bytes consumed for current message */

    /* Keepalive timer state */
    cms_t    mLastCyclicMs;   /* when we last ran the cyclic check */
    uint32_t mCyclicTick;
    uint32_t mServerWatchdog;

    /* Packet ID (for Subscribe/Unsubscribe which use QoS 1 in the control packet) */
    uint16_t mPktIdSeq;

    /* ---- Internal helpers ---- */
    size_t tx_free() const;
    size_t tx_len() const;
    void   tx_append(const uint8_t *data, size_t len);
    void   tx_append_u8(uint8_t v);
    void   tx_append_u16(uint16_t v);
    void   tx_append_string(const char *s, uint16_t len);
    void   tx_append_fixed_header(uint8_t msg_type, uint8_t flags, uint32_t remaining_len);
    void   tx_flush();

    uint16_t next_pkt_id();

    void parse_incoming(const uint8_t *data, size_t len);
    void handle_connack(const uint8_t *payload, size_t len);
    void handle_publish(const uint8_t *payload, size_t len, uint8_t qos);
    void handle_suback(const uint8_t *payload, size_t len);

    void do_close();
    void send_pingreq();
};

} // namespace wpantund
} // namespace nl

#endif /* WPANTUND_MQTT_CLIENT_H */