/******************************************************************************
 @file ti_wisunfan_config_cert.h

 @brief TI Wi-SUN FAN configuration parameters for Border Router
 applications

 *****************************************************************************/
#ifndef TI_WISUNFAN_CONFIG_CERT_H
#define TI_WISUNFAN_CONFIG_CERT_H

/******************************************************************************
 Includes
 *****************************************************************************/
#include "ti_wisunfan_features.h"

#ifdef __cplusplus
extern "C"
{
#endif

#define CONFIG_PAN_ID                   0xABCD
#define CONFIG_WISUN_DEVICE_TYPE             MESH_DEVICE_TYPE_WISUN_BORDER_ROUTER
#define CONFIG_CCA_THRESHOLD                 -83
#define CONFIG_CUSTOM_PHY               false
#define CONFIG_NETNAME               "Wi-SUN Network"
#define CONFIG_BROADCAST_INTERVAL           1020
#define CONFIG_BROADCAST_DWELL_TIME         255
#define CONFIG_UNICAST_DWELL_TIME        255
#define CONFIG_TRANSMIT_POWER           14
#define CONFIG_FH_ENABLE                true
#define CONFIG_UNICAST_FIXED_CHANNEL_NUM     10
#define CONFIG_BROADCAST_FIXED_CHANNEL_NUM   10

#if defined(CERT_REGION_NA)
#define CONFIG_REG_DOMAIN               0x01
#elif defined(CERT_REGION_BZ)
#define CONFIG_REG_DOMAIN               0x07
#elif defined(CERT_REGION_JP)
#define CONFIG_REG_DOMAIN               0x02
#else
#error "You must defined a valid certification region (e.g CERT_REGION_NA)"
#endif

#if defined(CERT_FIXED_CHANNEL)
#define CONFIG_CHANNEL_FUNCTION             0
#elif defined (CERT_HOPPING)
#define CONFIG_CHANNEL_FUNCTION             2
#else
#error "Invalid channel function definition"
#endif

#if defined(CERT_REGION_NA) && defined(CERT_FIXED_CHANNEL) && defined(CERT_DATA_RATE_50KBPS)
/*! Setting for channel spacing */
#define CONFIG_CHANNEL_SPACING           200
/*! Setting for total number of channels */
#define CONFIG_TOTAL_CHANNELS            129
/*! Setting to get channel 0 center frequency in MHz*/
#define CONFIG_CENTER_FREQ              902.2
/*! Setting to get phyModeID */
#define CONFIG_PHY_ID                   2
/*! Setting for operating mode selection */
#define CONFIG_OP_MODE_ID                 OPERATING_MODE_1b
/*! Setting for operating mode selection */
#define CONFIG_OP_MODE_CLASS               1
#define CONFIG_UNICAST_CHANNEL_MASK       { 0x01,0x00,0x00,0x00,0x00,0x00, \
                                          0x00,0x00,0x00,0x00,0x00,0x00, \
                                          0x00,0x00,0x00,0x00,0x00 }
#define CONFIG_ASYNC_CHANNEL_MASK         { 0x01,0x00,0x00,0x00,0x00,0x00, \
                                          0x00,0x00,0x00,0x00,0x00,0x00, \
                                          0x00,0x00,0x00,0x00,0x00 }
#define CONFIG_BROADCAST_CHANNEL_MASK     { 0x01,0x00,0x00,0x00,0x00,0x00, \
                                          0x00,0x00,0x00,0x00,0x00,0x00, \
                                          0x00,0x00,0x00,0x00,0x00 }
#define CONFIG_REGULATION_CHANNEL_MASK    { 0xFF,0xFF,0xFF,0xFF,0xFF,0xFF, \
                                          0xFF,0xFF,0xFF,0xFF,0xFF,0xFF, \
                                          0xFF,0xFF,0xFF,0xFF,0x01 }
#elif defined(CERT_REGION_NA) && defined(CERT_HOPPING) && defined(CERT_DATA_RATE_150KBPS)
/*! Setting for channel spacing */
#define CONFIG_CHANNEL_SPACING           400
/*! Setting for total number of channels */
#define CONFIG_TOTAL_CHANNELS            64
/*! Setting to get channel 0 center frequency in MHz*/
#define CONFIG_CENTER_FREQ              902.4
/*! Setting to get phyModeID */
#define CONFIG_PHY_ID                   5
/*! Setting for channel page*/
#define CONFIG_CHANNEL_PAGE             9
/*! Setting for operating mode selection */
#define CONFIG_OP_MODE_ID                 OPERATING_MODE_3
/*! Setting for operating mode selection */
#define CONFIG_OP_MODE_CLASS               2
#define CONFIG_UNICAST_CHANNEL_MASK       { 0xFF,0xFF,0xFF,0xFF,0xFF,0xFF, \
                                          0xFF,0xFF,0x00,0x00,0x00,0x00, \
                                          0x00,0x00,0x00,0x00,0x00 }
#define CONFIG_ASYNC_CHANNEL_MASK         { 0xFF,0xFF,0xFF,0xFF,0xFF,0xFF, \
                                          0xFF,0xFF,0x00,0x00,0x00,0x00, \
                                          0x00,0x00,0x00,0x00,0x00 }
#define CONFIG_BROADCAST_CHANNEL_MASK     { 0xFF,0xFF,0xFF,0xFF,0xFF,0xFF, \
                                          0xFF,0xFF,0x00,0x00,0x00,0x00, \
                                          0x00,0x00,0x00,0x00,0x00 }
#define CONFIG_REGULATION_CHANNEL_MASK    { 0xFF,0xFF,0xFF,0xFF,0xFF,0xFF, \
                                          0xFF,0xFF,0x00,0x00,0x00,0x00, \
                                          0x00,0x00,0x00,0x00,0x00 }
#elif defined(CERT_REGION_BZ) && defined(CERT_FIXED_CHANNEL) && defined(CERT_DATA_RATE_50KBPS)
/*! Setting for channel spacing */
#define CONFIG_CHANNEL_SPACING           200
/*! Setting for total number of channels */
#define CONFIG_TOTAL_CHANNELS            129
/*! Setting to get channel 0 center frequency in MHz*/
#define CONFIG_CENTER_FREQ              902.2
/*! Setting to get phyModeID */
#define CONFIG_PHY_ID                   2
/*! Setting for operating mode selection */
#define CONFIG_OP_MODE_ID                 OPERATING_MODE_1b
/*! Setting for operating mode selection */
#define CONFIG_OP_MODE_CLASS               1
#define CONFIG_UNICAST_CHANNEL_MASK       { 0x01,0x00,0x00,0x00,0x00,0x00, \
                                          0x00,0x00,0x00,0x00,0x00,0x00, \
                                          0x00,0x00,0x00,0x00,0x00 }
#define CONFIG_ASYNC_CHANNEL_MASK         { 0x01,0x00,0x00,0x00,0x00,0x00, \
                                          0x00,0x00,0x00,0x00,0x00,0x00, \
                                          0x00,0x00,0x00,0x00,0x00 }
#define CONFIG_BROADCAST_CHANNEL_MASK     { 0x01,0x00,0x00,0x00,0x00,0x00, \
                                          0x00,0x00,0x00,0x00,0x00,0x00, \
                                          0x00,0x00,0x00,0x00,0x00 }
#define CONFIG_REGULATION_CHANNEL_MASK    { 0xFF,0xFF,0xFF,0x03,0x00,0x00, \
                                          0x00,0x00,0xFE,0xFF,0xFF,0xFF, \
                                          0xFF,0xFF,0xFF,0xFF,0x01 }
#elif defined(CERT_REGION_BZ) && defined(CERT_HOPPING) && defined(CERT_DATA_RATE_150KBPS)
#define CONFIG_CHANNEL_SPACING           400

/*! Setting for total number of channels */
#define CONFIG_TOTAL_CHANNELS            64

/*! Setting to get channel 0 center frequency in MHz*/
#define CONFIG_CENTER_FREQ              902.4

/*! Setting to get phyModeID */
#define CONFIG_PHY_ID                   5

/*! Setting for channel page*/
#define CONFIG_CHANNEL_PAGE             9

/*! Setting for operating mode selection */
#define CONFIG_OP_MODE_ID                 OPERATING_MODE_3

/*! Setting for operating mode selection */
#define CONFIG_OP_MODE_CLASS               2
#define CONFIG_UNICAST_CHANNEL_MASK       { 0xFF,0x0F,0x00,0x00,0xFE,0xFF, \
                                          0xFF,0xFF,0x00,0x00,0x00,0x00, \
                                          0x00,0x00,0x00,0x00,0x00 }
#define CONFIG_ASYNC_CHANNEL_MASK         { 0xFF,0x0F,0x00,0x00,0xFE,0xFF, \
                                          0xFF,0xFF,0x00,0x00,0x00,0x00, \
                                          0x00,0x00,0x00,0x00,0x00 }
#define CONFIG_BROADCAST_CHANNEL_MASK     { 0xFF,0x0F,0x00,0x00,0xFE,0xFF, \
                                          0xFF,0xFF,0x00,0x00,0x00,0x00, \
                                          0x00,0x00,0x00,0x00,0x00 }
#define CONFIG_REGULATION_CHANNEL_MASK    { 0xFF,0x0F,0x00,0x00,0xFE,0xFF, \
                                          0xFF,0xFF,0x00,0x00,0x00,0x00, \
                                          0x00,0x00,0x00,0x00,0x00 }
#elif defined(CERT_REGION_JP) && defined(CERT_FIXED_CHANNEL) && defined(CERT_DATA_RATE_100KBPS)
/*! Setting for channel spacing */
#define CONFIG_CHANNEL_SPACING           400

/*! Setting for total number of channels */
#define CONFIG_TOTAL_CHANNELS            18

/*! Setting to get channel 0 center frequency in MHz*/
#define CONFIG_CENTER_FREQ              920.9

/*! Setting to get phyModeID */
#define CONFIG_PHY_ID                   4

/*! Setting for channel page*/
#define CONFIG_CHANNEL_PAGE             9

/*! Setting for operating mode selection */
#define CONFIG_OP_MODE_ID                 OPERATING_MODE_2b

/*! Setting for operating mode selection */
#define CONFIG_OP_MODE_CLASS               2
#define CONFIG_UNICAST_CHANNEL_MASK       { 0x10,0x00,0x00,0x00,0x00,0x00, \
                                          0x00,0x00,0x00,0x00,0x00,0x00, \
                                          0x00,0x00,0x00,0x00,0x00 }
#define CONFIG_ASYNC_CHANNEL_MASK         { 0x10,0x00,0x00,0x00,0x00,0x00, \
                                          0x00,0x00,0x00,0x00,0x00,0x00, \
                                          0x00,0x00,0x00,0x00,0x00 }
#define CONFIG_BROADCAST_CHANNEL_MASK     { 0x10,0x00,0x00,0x00,0x00,0x00, \
                                          0x00,0x00,0x00,0x00,0x00,0x00, \
                                          0x00,0x00,0x00,0x00,0x00 }
#define CONFIG_REGULATION_CHANNEL_MASK    { 0xF0,0xFF,0x03,0x00,0x00,0x00, \
                                          0x00,0x00,0x00,0x00,0x00,0x00, \
                                          0x00,0x00,0x00,0x00,0x00 }
#elif defined(CERT_REGION_JP) && defined(CERT_HOPPING) && defined(CERT_DATA_RATE_100KBPS)
/*! Setting for channel spacing */
#define CONFIG_CHANNEL_SPACING           400

/*! Setting for total number of channels */
#define CONFIG_TOTAL_CHANNELS            18

/*! Setting to get channel 0 center frequency in MHz*/
#define CONFIG_CENTER_FREQ              920.9

/*! Setting to get phyModeID */
#define CONFIG_PHY_ID                   4

/*! Setting for channel page*/
#define CONFIG_CHANNEL_PAGE             9

/*! Setting for operating mode selection */
#define CONFIG_OP_MODE_ID                 OPERATING_MODE_2b

/*! Setting for operating mode selection */
#define CONFIG_OP_MODE_CLASS               2
#define CONFIG_UNICAST_CHANNEL_MASK       { 0xF0,0xFF,0x03,0x00,0x00,0x00, \
                                          0x00,0x00,0x00,0x00,0x00,0x00, \
                                          0x00,0x00,0x00,0x00,0x00 }
#define CONFIG_ASYNC_CHANNEL_MASK         { 0xF0,0xFF,0x03,0x00,0x00,0x00, \
                                          0x00,0x00,0x00,0x00,0x00,0x00, \
                                          0x00,0x00,0x00,0x00,0x00 }
#define CONFIG_BROADCAST_CHANNEL_MASK     { 0xF0,0xFF,0x03,0x00,0x00,0x00, \
                                          0x00,0x00,0x00,0x00,0x00,0x00, \
                                          0x00,0x00,0x00,0x00,0x00 }
#define CONFIG_REGULATION_CHANNEL_MASK    { 0xF0,0xFF,0x03,0x00,0x00,0x00, \
                                          0x00,0x00,0x00,0x00,0x00,0x00, \
                                          0x00,0x00,0x00,0x00,0x00 }
#else
#error "Invalid region - channel function - data rate combination"
#endif


#ifdef __cplusplus
}
#endif

#endif /* TI_WISUNFAN_CONFIG_CERT_H */
