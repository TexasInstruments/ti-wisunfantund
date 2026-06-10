/******************************************************************************
 @file  tcp_app.h
 @brief TCP Socket Application over Wi-SUN IPv6 mesh
 *****************************************************************************/

#ifndef TCP_APP_H
#define TCP_APP_H

#include <stdint.h>
#include <stdbool.h>

#ifdef __cplusplus
extern "C" {
#endif

/* Mode constants */
#define TCP_APP_SERVER  0
#define TCP_APP_CLIENT  1
#define TCP_APP_DUAL    2

#ifndef FEATURE_TCP_MAX_CLIENTS
#define FEATURE_TCP_MAX_CLIENTS   1
#endif

/* Runtime commands from wfanctl */
bool tcp_socket_setup(uint16_t port);
bool tcp_client_connect(const char *ipv6_addr_str, uint16_t port);
bool tcp_send_data(const uint8_t *data, uint16_t len);
bool tcp_send_data_to(int slot, const uint8_t *data, uint16_t len);
void tcp_disconnect(void);

/* Status queries */
int         tcp_get_mode(void);
const char *tcp_get_mode_str(void);
int         tcp_client_count(void);
bool        tcp_is_connected(void);


#ifdef __cplusplus
}
#endif

#endif /* TCP_APP_H */