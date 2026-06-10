/******************************************************************************
 @file  tcp_app.c
 @brief TCP Socket Application over Wi-SUN IPv6 mesh (Nanostack socket API)

 Always compiled in DUAL mode: both server and client code are present.
 Mode is selected at runtime via wfanctl (tcp_socket_setup / tcp_client_connect).
 *****************************************************************************/

#include "mbed_config_app.h"
#include <stdint.h>
#include <stdbool.h>
#include <string.h>
#include "socket_api.h"
#include "ip6string.h"
#include "ns_trace.h"
#include "eventOS_event_timer.h"
#include "ti_wisunfan_features.h"
#include "tcp_app.h"

#define TRACE_GROUP ("tcpa")
#define RETRY_MS (5000u)

static uint8_t tcp_recv_buf[FEATURE_TCP_APP_BUF_SIZE];

/* Called directly to notify ncp_base_mtd when TCP data arrives or state changes.
 * Defined in ncp_base_mtd.cpp — no function pointers needed. */
extern void ncp_notify_tcp_rx(const uint8_t *data, uint16_t len);
extern void ncp_notify_tcp_event(int event);

/* ---- Runtime state ---- */
static int tcp_current_mode = -1;    /* -1=stopped, 0=server, 1=client */
static char tcp_cli_target_addr[64]; /* stored for reconnection        */
static uint16_t tcp_cli_target_port; /* stored for reconnection        */

/* ==========================================================================
 * SERVER SIDE
 * ======================================================================== */

static int8_t tcp_listen_sock = -1;
static int8_t tcp_conn_socks[FEATURE_TCP_MAX_CLIENTS];

static void srv_pool_init(void)
{
    for (int ind = 0; ind < FEATURE_TCP_MAX_CLIENTS; ind++)
    {
        tcp_conn_socks[ind] = -1;
    }
}

static int srv_pool_free_slot(void)
{
    for (int ind = 0; ind < FEATURE_TCP_MAX_CLIENTS; ind++)
    {
        if (tcp_conn_socks[ind] == -1)
        {
            return ind;
        }
    }
    return -1;
}

static int srv_pool_slot_of(int8_t id)
{
    for (int ind = 0; ind < FEATURE_TCP_MAX_CLIENTS; ind++)
    {
        if (tcp_conn_socks[ind] == id)
        {
            return ind;
        }
    }
    return -1;
}

static void srv_pool_remove(int8_t id)
{
    int s = srv_pool_slot_of(id);
    socket_close(id);
    if (s >= 0)
    {
        tcp_conn_socks[s] = -1;
    }
}

static void tcp_srv_conn_cb(void *cb)
{
    socket_callback_t *sock = (socket_callback_t *)cb;
    int16_t len;
    int slot;
    tr_info("TCP SERVER CONNECTION CALLBACK");
    switch (sock->event_type & SOCKET_EVENT_MASK)
    {
    case SOCKET_DATA:
    {
        len = socket_recv(sock->socket_id, tcp_recv_buf, sizeof(tcp_recv_buf), 0);
        if (len > 0)
        {
            tcp_recv_buf[len] = '\0';
            slot = srv_pool_slot_of(sock->socket_id);
            ncp_notify_tcp_rx(tcp_recv_buf, (uint16_t)len);
        }
        else if (len == 0)
        {
            slot = srv_pool_slot_of(sock->socket_id);
            srv_pool_remove(sock->socket_id);
        }
        break;
    }
    case SOCKET_TX_FAIL:
    case SOCKET_CONNECT_CLOSED:
    case SOCKET_CONNECTION_RESET:
    case SOCKET_CONNECTION_PROBLEM:
    {
        slot = srv_pool_slot_of(sock->socket_id);
        tr_warn("TCP Srv: slot[%d] reset", slot);
        srv_pool_remove(sock->socket_id);
        break;
    }
    case SOCKET_TX_DONE:
    default:
    {
        tr_debug("%d", sock->event_type);
        break;
    }
    }
}

static void tcp_srv_listen_cb(void *cb)
{
    tr_info("TCP SERVER LISTEN CALLBACK");
    socket_callback_t *sock = (socket_callback_t *)cb;
    ns_address_t caddr;
    char astr[40];
    int32_t rcvbuf;
    int8_t ns;
    int slot;
    if ((sock->event_type & SOCKET_EVENT_MASK) != SOCKET_INCOMING_CONNECTION)
    {
        tr_debug("TCP Srv listen: 0x%x", sock->event_type);
        return;
    }

    slot = srv_pool_free_slot();
    if (slot < 0)
    {
        ns = socket_accept(tcp_listen_sock, NULL, tcp_srv_conn_cb);
        if (ns >= 0)
        {
            socket_close(ns);
        }
        tr_warn("TCP Srv: pool full (%d/%d), connection refused", FEATURE_TCP_MAX_CLIENTS, FEATURE_TCP_MAX_CLIENTS);
        return;
    }

    ns = socket_accept(tcp_listen_sock, &caddr, tcp_srv_conn_cb);
    if (ns < 0)
    {
        tr_error("TCP Srv: accept failed %d", ns);
        return;
    }

    tcp_conn_socks[slot] = ns;
    rcvbuf = (int32_t)FEATURE_TCP_APP_BUF_SIZE;
    socket_setsockopt(ns, SOCKET_SOL_SOCKET, SOCKET_SO_RCVBUF, &rcvbuf, sizeof(rcvbuf));
    ip6tos(caddr.address, astr);
    tr_info("TCP Srv: slot[%d] from [%s]:%d sock=%d, %d/%d connected", slot, astr, caddr.identifier, ns, tcp_client_count(), FEATURE_TCP_MAX_CLIENTS);
}

static bool tcp_server_init(uint16_t port)
{
    ns_address_t ba;
    int8_t ret;
    tr_info("TCP SERVER INIT");
    srv_pool_init();

    tcp_listen_sock = socket_open(SOCKET_TCP, 0, tcp_srv_listen_cb);
    if (tcp_listen_sock < 0)
    {
        tr_error("TCP Srv: socket_open failed %d ", tcp_listen_sock);
        return false;
    }
    ba.type = ADDRESS_IPV6;
    ba.identifier = port;
    memcpy(ba.address, ns_in6addr_any, 16);
    ret = socket_bind(tcp_listen_sock, &ba);
    if (ret < 0)
    {
        tr_error("TCP Srv: bind failed %d", ret);
        socket_close(tcp_listen_sock);
        tcp_listen_sock = -1;
        return false;
    }

    ret = socket_listen(tcp_listen_sock, 5);
    if (ret < 0)
    {
        tr_error("TCP Srv: listen failed %d", ret);
        socket_close(tcp_listen_sock);
        tcp_listen_sock = -1;
        return false;
    }

    tr_info("TCP Srv: listening port=%d max_clients=%d", port, FEATURE_TCP_MAX_CLIENTS);
    return true;
}

/* ==========================================================================
 * SINGLE CLIENT
 * ======================================================================== */

static int8_t tcp_cli_sock = -1;
static timeout_t *tcp_cli_timer = NULL;

static void tcp_cli_cb(void *cb);

static void tcp_cli_retry_cb(void *arg)
{
    tr_info("TCP CLIENT Retry Connection");
    int32_t r = FEATURE_TCP_APP_BUF_SIZE;
    ns_address_t a;
    (void)arg;
    tcp_cli_timer = NULL;
    socket_close(tcp_cli_sock);
    tcp_cli_sock = socket_open(SOCKET_TCP, 0, tcp_cli_cb);
    if (tcp_cli_sock < 0)
    {
        tcp_cli_timer = eventOS_timeout_ms(tcp_cli_retry_cb, RETRY_MS, NULL);
        return;
    }
    socket_setsockopt(tcp_cli_sock, SOCKET_SOL_SOCKET, SOCKET_SO_RCVBUF, &r, sizeof(r));

    a.type = ADDRESS_IPV6;
    a.identifier = tcp_cli_target_port;
    stoip6(tcp_cli_target_addr, strlen(tcp_cli_target_addr), a.address);
    tr_info("Binding - %s", tcp_cli_target_addr);
    if (socket_connect(tcp_cli_sock, &a, 0) < 0)
    {
        tcp_cli_timer = eventOS_timeout_ms(tcp_cli_retry_cb, RETRY_MS, NULL);
    }
}

static void tcp_cli_cb(void *cb)
{
    tr_info("TCP CLIENT Callback");
    socket_callback_t *sock = (socket_callback_t *)cb;
    int16_t len;

    switch (sock->event_type & SOCKET_EVENT_MASK)
    {
    case SOCKET_CONNECT_DONE:
    {
        ncp_notify_tcp_event(0);
        tr_info("TCP Cli: connected to [%s]:%d", tcp_cli_target_addr, tcp_cli_target_port);
        break;
    }
    case SOCKET_CONNECT_FAIL:
    {
        tr_warn("TCP Cli: connect fail, retry %d ms", RETRY_MS);
        tcp_cli_timer = eventOS_timeout_ms(tcp_cli_retry_cb, RETRY_MS, NULL);
        break;
    }
    case SOCKET_DATA:
    {
        len = socket_recv(sock->socket_id, tcp_recv_buf, sizeof(tcp_recv_buf), 0);
        if (len > 0)
        {
            tcp_recv_buf[len] = '\0';
            ncp_notify_tcp_rx(tcp_recv_buf, (uint16_t)len);
            tr_info("%s", tcp_recv_buf);
            tr_info("TCP Cli: RX %d bytes", len);
        }
        else if (len == 0)
        {
            tr_info("TCP Cli: disconnected, reconnecting in %d ms", RETRY_MS);
            ncp_notify_tcp_event(1);
            socket_close(tcp_cli_sock);
            tcp_cli_sock = -1;
            tcp_cli_timer = eventOS_timeout_ms(tcp_cli_retry_cb, RETRY_MS, NULL);
        }
        break;
    }
    case SOCKET_TX_FAIL:
    case SOCKET_CONNECT_CLOSED:
    case SOCKET_CONNECTION_RESET:
    {
        ncp_notify_tcp_event(1);
        socket_close(tcp_cli_sock);
        tcp_cli_sock = -1;
        break;
    }
    case SOCKET_TX_DONE:
    case SOCKET_CONNECTION_PROBLEM:
    default:
        tr_debug("%d", sock->event_type);
        break;
    }
}

static bool tcp_client_init(void)
{
    tr_info("TCP CLIENT INIT");
    int32_t r = FEATURE_TCP_APP_BUF_SIZE;
    ns_address_t a;

    tcp_cli_sock = socket_open(SOCKET_TCP, 0, tcp_cli_cb);
    if (tcp_cli_sock < 0)
    {
        tr_error("TCP Cli: socket_open failed %d", tcp_cli_sock);
        return false;
    }
    socket_setsockopt(tcp_cli_sock, SOCKET_SOL_SOCKET, SOCKET_SO_RCVBUF, &r, sizeof(r));
    a.type = ADDRESS_IPV6;
    a.identifier = tcp_cli_target_port;
    stoip6(tcp_cli_target_addr, strlen(tcp_cli_target_addr), a.address);
    if (socket_connect(tcp_cli_sock, &a, 0) < 0)
    {
        tcp_cli_timer = eventOS_timeout_ms(tcp_cli_retry_cb, RETRY_MS, NULL);
    }
    return true;
}

/* ==========================================================================
 * RUNTIME CONTROL API
 * ======================================================================== */

int tcp_get_mode(void)
{
    return tcp_current_mode;
}

const char *tcp_get_mode_str(void)
{
    switch (tcp_current_mode)
    {
    case TCP_APP_SERVER:
        return "server";
    case TCP_APP_CLIENT:
        return "client";
    default:
        return "stopped";
    }
}

bool tcp_socket_setup(uint16_t port)
{
    tcp_current_mode = TCP_APP_SERVER;
    tr_info("TCP: Starting SERVER on port %d", port);
    return tcp_server_init(port);
}

bool tcp_client_connect(const char *ipv6_addr_str, uint16_t port)
{
    tcp_current_mode = TCP_APP_CLIENT;

    strncpy(tcp_cli_target_addr, ipv6_addr_str, sizeof(tcp_cli_target_addr) - 1);
    tcp_cli_target_addr[sizeof(tcp_cli_target_addr) - 1] = '\0';
    tcp_cli_target_port = port;

    int32_t r = FEATURE_TCP_APP_BUF_SIZE;
    ns_address_t a;

    tcp_cli_sock = socket_open(SOCKET_TCP, 0, tcp_cli_cb);
    if (tcp_cli_sock < 0)
    {
        tr_error("TCP Cli: socket_open failed %d", tcp_cli_sock);
        return false;
    }
    socket_setsockopt(tcp_cli_sock, SOCKET_SOL_SOCKET, SOCKET_SO_RCVBUF, &r, sizeof(r));

    a.type = ADDRESS_IPV6;
    a.identifier = port;
    stoip6(ipv6_addr_str, strlen(ipv6_addr_str), a.address);

    tr_info("TCP Cli: SYN to [%s]:%d", ipv6_addr_str, port);
    if (socket_connect(tcp_cli_sock, &a, 0) < 0)
    {
        tcp_cli_timer = eventOS_timeout_ms(tcp_cli_retry_cb, RETRY_MS, NULL);
    }
    return true;
}

void tcp_disconnect(void)
{
    if (tcp_current_mode == TCP_APP_SERVER)
    {
        for (int i = 0; i < FEATURE_TCP_MAX_CLIENTS; i++)
        {
            if (tcp_conn_socks[i] >= 0)
            {
                socket_close(tcp_conn_socks[i]);
                tcp_conn_socks[i] = -1;
            }
        }
        if (tcp_listen_sock >= 0)
        {
            socket_close(tcp_listen_sock);
            tcp_listen_sock = -1;
        }
    }
    if (tcp_current_mode == TCP_APP_CLIENT)
    {
        if (tcp_cli_timer)
        {
            eventOS_timeout_cancel(tcp_cli_timer);
            tcp_cli_timer = NULL;
        }
        if (tcp_cli_sock >= 0)
        {
            socket_close(tcp_cli_sock);
            tcp_cli_sock = -1;
        }
    }
    tcp_current_mode = -1;
    tr_info("TCP App stopped");
}

/* ==========================================================================
 * PUBLIC API
 * ======================================================================== */

bool tcp_send_data(const uint8_t *data, uint16_t len)
{
    if (tcp_current_mode == TCP_APP_SERVER)
    {
        bool sent = false;
        for (int i = 0; i < FEATURE_TCP_MAX_CLIENTS; i++)
            if (tcp_conn_socks[i] >= 0 &&
                socket_send(tcp_conn_socks[i], data, len) >= 0)
                sent = true;
        return sent;
    }
    if (tcp_current_mode == TCP_APP_CLIENT)
    {
        if (tcp_cli_sock < 0)
        {
            tr_warn("TCP App: no connection");
            return false;
        }
        return socket_send(tcp_cli_sock, data, len) >= 0;
    }
    tr_warn("TCP: not started");
    return false;
}

bool tcp_send_data_to(int slot, const uint8_t *data, uint16_t len)
{
    if (tcp_current_mode == TCP_APP_SERVER)
    {
        if (slot < 0 || slot >= FEATURE_TCP_MAX_CLIENTS || tcp_conn_socks[slot] < 0)
        {
            return false;
        }
        return socket_send(tcp_conn_socks[slot], data, len) >= 0;
    }
    (void)slot;
    return tcp_send_data(data, len);
}

int tcp_client_count(void)
{
    if (tcp_current_mode == TCP_APP_SERVER)
    {
        int c = 0;
        for (int i = 0; i < FEATURE_TCP_MAX_CLIENTS; i++)
            if (tcp_conn_socks[i] >= 0)
                c++;
        return c;
    }
    if (tcp_current_mode == TCP_APP_CLIENT)
    {
        return (tcp_cli_sock >= 0) ? 1 : 0;
    }
    return 0;
}

bool tcp_is_connected(void)
{
    return tcp_client_count() > 0;
}
