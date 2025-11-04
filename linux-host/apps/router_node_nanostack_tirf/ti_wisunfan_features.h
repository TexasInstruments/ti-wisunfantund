
/******************************************************************************
 @file ti_wisunfan_features.h

 @brief TI Wi-SUN FAN feature parameters definitions for borderrouter applications

 *****************************************************************************/
#ifndef TI_WISUNFAN_FEATURES_H
#define TI_WISUNFAN_FEATURES_H

#ifdef __cplusplus
extern "C"
{
#endif

#include <stdint.h>
#include "6LoWPAN/ws/ws_config.h"

#define FEATURE_MAC_SECURITY
#define NETWORK_AUTH_TYPE DEFAULT_MBEDTLS_AUTH

#define FIXED_GTK_KEY_1 {0xBB, 0x06, 0x08, 0x57, 0x2C, 0xE1, 0x4D, 0x7B, 0xA2, 0xD1, 0x55, 0x49, 0x9C, 0xC8, 0x51, 0x9B}
#define FIXED_GTK_KEY_2 {0x18, 0x49, 0x83, 0x5A, 0x01, 0x68, 0x4F, 0xC8, 0xAC, 0xA5, 0x83, 0xF3, 0x70, 0x40, 0xF7, 0x4C}
#define FIXED_GTK_KEY_3 {0x59, 0xEA, 0x58, 0xA4, 0xB8, 0x83, 0x49, 0x38, 0xAD, 0xCB, 0x6B, 0xE3, 0x88, 0xC2, 0x62, 0x63}
#define FIXED_GTK_KEY_4 {0xE4, 0x26, 0xB4, 0x91, 0xBC, 0x05, 0x4A, 0xF3, 0x9B, 0x59, 0xF0, 0x53, 0xEC, 0x12, 0x8E, 0x5F}

#define FEATURE_FORCE_STAR_TOPOLOGY (false)

/* Builds the image with frequencyHopping mode of operation */
#define FEATURE_FREQ_HOP_MODE

#define FEATURE_RAPID_JOIN_ENABLE (true)
#define FEATURE_MPL_LOW_LATENCY_ENABLE (false)
#define FEATURE_RAPID_DISCONNECT_DETECT_BR_SEC (1800)
#define FEATURE_RAPID_DISCONNECT_DETECT_RN_SEC (7200)
#define FEATURE_NETWORK_PROFILE (CONFIG_NETWORK_SIZE_SMALL)

// Enable External DHCP Server
#define FEATURE_EXTERNAL_DHCP_SERVER_ENABLE (true)
#define FEATURE_EXTERNAL_DHCP_SERVER_ADDR {0x20,0x20,0xAB,0xCD,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00}

// Enable External Radius Server
#define FEATURE_EXTERNAL_RADIUS_SERVER_ENABLE (true)
#define FEATURE_EXTERNAL_RADIUS_SERVER_ADDR {0x20,0x20,0xAB,0xCD,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00}
#define FEATURE_EXTERNAL_RADIUS_SERVER_SHARED_SECRET {116,111,112,115,101,99,114,101,116}
#define FEATURE_EXTERNAL_RADIUS_SERVER_SHARED_SECRET_LENGTH 9

#ifdef __cplusplus
}

#endif

#endif /* TI_WISUNFAN_FEATURES_H */
