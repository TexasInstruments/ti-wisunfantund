/******************************************************************************
 
 Group: WCS LPC
 Target Device: Linux

 ******************************************************************************
 
 Copyright (c) 2016-2025, Texas Instruments Incorporated
 All rights reserved.

 Redistribution and use in source and binary forms, with or without
 modification, are permitted provided that the following conditions
 are met:

 *  Redistributions of source code must retain the above copyright
    notice, this list of conditions and the following disclaimer.

 *  Redistributions in binary form must reproduce the above copyright
    notice, this list of conditions and the following disclaimer in the
    documentation and/or other materials provided with the distribution.

 *  Neither the name of Texas Instruments Incorporated nor the names of
    its contributors may be used to endorse or promote products derived
    from this software without specific prior written permission.

 THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
 THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR
 CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS;
 OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR
 OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
 EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

 ******************************************************************************
 
 
 *****************************************************************************/

/*
 *  ======== application.c ========
 */

#ifndef WISUN_NCP_ENABLE
#undef EXCLUDE_TRACE
#endif
#include "mbed_config_app.h"

/* For usleep() */
#include <unistd.h>
#include <stdint.h>
#include <unistd.h>
#include <stddef.h>
#include <string.h>
#include <stdio.h>
#include <stdlib.h>
#include <assert.h>

#include "saddr.h"

#include "nsconfig.h"
#include "mesh_system.h"
#include "socket_api.h"
#include "ip6string.h"
#include "net_interface.h"
#include "wisun_tasklet.h"
#include "ns_trace.h"
#include "fhss_config.h"
#include "randLIB.h"
#include "ws_management_api.h"

#include "6LoWPAN/ws/ws_common_defines.h"
#include "Common_Protocols/ipv6_constants.h"
#include "6LoWPAN/ws/ws_common.h"
#include "Common_Protocols/udp.h"

#include "mbed-mesh-api/mesh_interface_types.h"
#include "borderrouter_tasklet.h"
#include "nsdynmemLIB.h"
#include "6LoWPAN/ws/ws_config.h"
#include "ti_wisunfan_features.h"
#if defined(WISUN_CERT_CONFIG) && defined(LINUX_NANOSTACK)
#include "cert/ti_wisunfan_config_cert.h"
#else
#include "ti_wisunfan_config.h"
#endif

#include "application.h"
#include "eventOS_event_timer.h"
#ifdef WISUN_NCP_ENABLE
/* OpenThread Internal/Example Header files */
#include "otsupport/otrtosapi.h"
#include "openthread/ncp.h"
#include "platform/system.h"
#else
#endif //WISUN_NCP_ENABLE

/******************************************************************************
Defines & enums
 *****************************************************************************/

#define TRACE_GROUP "main"

#define NOT_INITIALIZED -1

/******************************************************************************
 Static & Global Variables
 *****************************************************************************/

#ifdef TI_WISUN_FAN_DEBUG
bool disable_ns_messages = false;
#endif


static int8_t interface_id = NOT_INITIALIZED;
static bool _configured = false;

#ifdef NWK_TEST
uint32_t ticks_before_joining = 0;
uint32_t ticks_after_joining = 0;
#endif //NWK_TEST

#ifdef WISUN_NCP_ENABLE
int8_t ncp_tasklet_id = -1;
otInstance *OtStack_instance = NULL;

#ifdef WISUN_TEST_METRICS
extern JOIN_TIME_s node_join_time;
#endif
#endif //WISUN_NCP_ENABLE

#ifdef WISUN_TEST_MPL_EMBEDDED
#define SEND_BUF_SIZE 24
#define multicast_addr_str "ff15::810a:64d1"
#define UDP_PKT_INTERVAL 1000
#define MASTER_GROUP 0
#define MY_GROUP 1
#endif

#ifdef WISUN_RCP_ENABLE
int8_t rcp_tasklet_id = -1;
#endif // WISUN_RCP_ENABLE

// Set via cfg-props read in during runtime
extern uint16_t ncp_socket_port;
#define NCP_SOCKET_USE_IPV6 true

ti_wisun_config_t ti_wisun_config =
{
    .rapid_join = FEATURE_RAPID_JOIN_ENABLE,
    .network_size_config = FEATURE_NETWORK_PROFILE,
    .mpl_low_latency = FEATURE_MPL_LOW_LATENCY_ENABLE,
    .rapid_disconnect_detect_br = FEATURE_RAPID_DISCONNECT_DETECT_BR_SEC,
    .rapid_disconnect_detect_rn = FEATURE_RAPID_DISCONNECT_DETECT_RN_SEC,
    .auth_type  = NETWORK_AUTH_TYPE,
    .use_fixed_gtk_keys = false,
    .force_star_topology = FEATURE_FORCE_STAR_TOPOLOGY,
    .use_dhcp_solicit_for_renew = true,
    .fixed_gtk_keys = {
        FIXED_GTK_KEY_1,
        FIXED_GTK_KEY_2,
        FIXED_GTK_KEY_3,
        FIXED_GTK_KEY_4,
    }
};

// Default values for br_config, can be overriden by an INI .cfg file
ti_br_config_t ti_br_config =
{
    .use_external_dhcp_server = FEATURE_EXTERNAL_DHCP_SERVER_ENABLE,
    .external_dhcp_server_addr = FEATURE_EXTERNAL_DHCP_SERVER_ADDR,
    .use_external_radius_server = FEATURE_EXTERNAL_RADIUS_SERVER_ENABLE,
    .external_radius_server_addr = FEATURE_EXTERNAL_RADIUS_SERVER_ADDR,
    .external_radius_server_shared_secret = FEATURE_EXTERNAL_RADIUS_SERVER_SHARED_SECRET,
    .external_radius_server_shared_secret_length = FEATURE_EXTERNAL_RADIUS_SERVER_SHARED_SECRET_LENGTH,
};


#define CONFIG_CHANNEL_PAGE 9
configurable_props_t cfg_props = {
    .ccaDefaultdBm = CONFIG_CCA_THRESHOLD,
    .phyTxPower = CONFIG_TRANSMIT_POWER,
    .uc_channel_function = CONFIG_CHANNEL_FUNCTION,
    .uc_channel_list = CONFIG_UNICAST_CHANNEL_MASK,
    .uc_fixed_channel = CONFIG_UNICAST_FIXED_CHANNEL_NUM,
    .uc_dwell_interval = CONFIG_UNICAST_DWELL_TIME,
    .bc_channel_function = CONFIG_CHANNEL_FUNCTION,
    .bc_channel_list = CONFIG_BROADCAST_CHANNEL_MASK,
    .bc_fixed_channel = CONFIG_BROADCAST_FIXED_CHANNEL_NUM,
    .bc_interval = CONFIG_BROADCAST_INTERVAL,
    .bc_dwell_interval = CONFIG_BROADCAST_DWELL_TIME,
    .async_channel_list = CONFIG_ASYNC_CHANNEL_MASK,
    .pan_id = CONFIG_PAN_ID,
    .network_name = CONFIG_NETNAME,
    .wisun_device_type = CONFIG_WISUN_DEVICE_TYPE,
    .ch0_center_frequency = CONFIG_CENTER_FREQ * 1000,
    .config_channel_spacing = CONFIG_CHANNEL_SPACING,
    .config_number_of_channels = CONFIG_TOTAL_CHANNELS,
    .config_phy_id = CONFIG_PHY_ID,
    .config_reg_domain = CONFIG_REG_DOMAIN,
    .operating_class = CONFIG_OP_MODE_CLASS,
    .operating_mode = CONFIG_OP_MODE_ID,
    .fan_support_version = 1,
    .config_chan_plan = 0,
    .config_chan_plan_id = 255,
    .hwaddr = CONFIG_INVALID_HWADDR,
#ifdef WISUN_FAN_CORE_1_1
    .mdr_enable = 0 ,
    .num_phy_mode = 1,
    .Phy_Mode_Id = {CONFIG_PHY_ID},
#endif
    .channel_page = CONFIG_CHANNEL_PAGE,
    .rx_on_when_idle = true,
#ifdef FEATURE_FULL_FUNCTION_DEVICE
    .ffd = true,
#else
    .ffd = false,
#endif
    .regulatory_channel_list = CONFIG_REGULATION_CHANNEL_MASK,
};

/******************************************************************************
Function declarations Local & Global
 *****************************************************************************/
extern void ws_br_handler_init();
extern void border_router_loadcfg_init(void);
extern bool is_net_if_up(void);

#ifdef WISUN_NCP_ENABLE
extern void platformNcpSendProcess();
extern void platformNcpSendAsyncProcess();
extern void platformNcpSocketProcess(tcp_socket_event_data_s *data);
#ifdef WISUN_AUTO_START
static inline void auto_start_assert_led();
static inline void autoStartSignal();
extern otError nanostack_net_if_up();
extern otError nanostack_net_stack_up(void);
#endif //WISUN_AUTO_START
#endif //WISUN_NCP_ENABLE

#ifdef WISUN_TEST_MPL_EMBEDDED
static uint8_t recv_buffer[SEND_BUF_SIZE] = {0};
static uint32_t num_pkts = 0;

int8_t socket_id;
uint8_t multi_cast_addr[16] = {0};

uint32_t gPktCount = 0;
timeout_t *gUDP_pkt_timeout;
void handle_message(char* msg);
extern void timac_GetBC_Slot_BFIO(uint16_t *slot, uint32_t *bfio);
uint16_t startUDPArgs[2];
#endif

bool is_in_eapol_eui_allow_list(uint8_t *euiAddress);
bool insert_eapol_eui_allow_list(uint8_t* euiAddress);
bool remove_eapol_eui_allow_list(uint8_t* euiAddress);

#ifdef WISUN_RCP_ENABLE
extern void processIncomingAresp(void);
#endif

/******************************************************************************
Function definitions
 *****************************************************************************/

/*!
 * Configure the network size - pre step to configuring and
 * starting the network.
 * MBED_CONF_MBED_MESH_API_WISUN_NETWORK_SIZE macro defined in
 * application/mbed_config_app.h is used in this function to
 * determine the network size.
 * In the Out of Box example, this macro is set to a small
 * network i.e less than or around 100 nodes
 */
mesh_error_t nanostack_wisunInterface_configure(void)
{
    int ret;

    // tr_info("Library info | Date: %s, Time: %s, Version: %s", ti154stack_lib_date, ti154stack_lib_time,
    //         ti154stack_lib_version);

    if (_configured) {
        // Already configured
        return MESH_ERROR_NONE;
    }
#ifdef MBED_CONF_MBED_MESH_API_WISUN_NETWORK_SIZE
#ifndef TI_WISUN_FAN_OPT
    ret = ws_management_network_size_set(interface_id, MBED_CONF_MBED_MESH_API_WISUN_NETWORK_SIZE);
    if (ret < 0) {
        return MESH_ERROR_PARAM;
    }
#else
    ws_cfg_set_intferface_all();
#endif //TI_WISUN_FAN_OPT
#endif

    _configured = true;
    return MESH_ERROR_NONE;
}

#ifndef WISUN_NCP_ENABLE
/*
 *  ======== mainThread ========
 */
void *mainThread(void *arg0)
{
    int16_t ret;

    if(MESH_ERROR_NONE != nanostack_wisunInterface_configure())
    {
        // error occurred; do not proceed further
        while(1);
    }

    ws_br_handler_init();

    border_router_loadcfg_init();

    if(!is_net_if_up())
    {
        // error occurred; do not proceed further
        while(1);
    }

    // if here: all ok - kick start border router tasklet
    border_router_tasklet_start();

#ifdef NWK_TEST
    /* this should only be initialized once */
    nwkTest_init();
#endif

    while (1) {

#ifdef NWK_TEST
        nwkTest_run();
#endif
        // keep this thread asleep, unused after setup
        usleep(30000);
    }
}

#else //WISUN_NCP_ENABLE

/*!
 * Signal NCP tasklet with the event NCP_SEND_RESPONSE_EVENT,
 * so that NCP_tasklet can process the sending of a response
 * back to the host, when the host sends a command.
 * e.g. Response to a command from host to set/get configuration.
 */
void platformNcpSendRspSignal()
{
    //post an event to ncp_tasklet
    arm_event_s event = {
           .sender = 0,
           .receiver = ncp_tasklet_id,
           .priority = ARM_LIB_HIGH_PRIORITY_EVENT,
           .event_type = NCP_SEND_RESPONSE_EVENT,
           .event_id = 0,
           .event_data = 0
       };

   eventOS_event_send(&event);
}

/*!
 * Signal NCP tasklet with the event NCP_SEND_ASYNC_RSPONSE_EVENT
 * so that NCP tasket can process the sending of an async response
 * back to the host - e.g. reception of a packet by the NWP
 */
void platformNcpSendAsyncRspSignal()
{
    //post an event to ncp_tasklet
    arm_event_s event = {
           .sender = 0,
           .receiver = ncp_tasklet_id,
           .priority = ARM_LIB_HIGH_PRIORITY_EVENT,
           .event_type = NCP_SEND_ASYNC_RSPONSE_EVENT,
           .event_id = 0,
           .event_data = 0
       };

   eventOS_event_send(&event);
}

/*!
 * Callback from the NCP Socket module indicating need for processing
 * incoming message to NCP.
 */
void platformSocketSignal(uint8_t *buffer, uint16_t length)
{
    if (length == 0 || buffer == NULL)
    {
        tr_error("Invalid input parameters from NCP socket module! Got length: %d and buffer: %p", length, buffer);
        assert(0);
        return;
    }

    // Dynamically allocate a buffer for the data and length of the data
    uint8_t *event_buf = (uint8_t *) ns_dyn_mem_alloc(length);
    memcpy(event_buf, buffer, length);

    tcp_socket_event_data_s *event_data  = (tcp_socket_event_data_s *) ns_dyn_mem_alloc(sizeof(tcp_socket_event_data_s));

    event_data->buf = event_buf;
    event_data->length = length;

    //post an event to ncp_tasklet
    arm_event_s event = {
           .sender = 0,
           .receiver = ncp_tasklet_id,
           .priority = ARM_LIB_HIGH_PRIORITY_EVENT,
           .event_type = NCP_SOCKET_EVENT,
           .event_id = 0,
           .data_ptr = event_data
       };

   eventOS_event_send(&event);
}

#ifdef WISUN_AUTO_START
/*!
 * Blink Leds continuously when an assert occurs
 */
static inline void auto_start_assert_led()
{
    while(1)
    {
        sleep(2);
    }
}

/*!
 * Post event to NCP tasklet to do net interface configuration
 * and start wisun stack without having to receive commands on
 * the NCP interface
 */
static inline void autoStartSignal()
{
    arm_event_s auto_event = {
                           .sender = 0,
                           .receiver = ncp_tasklet_id,
                           .priority = ARM_LIB_HIGH_PRIORITY_EVENT,
                           .event_type = NCP_AUTO_START_EVENT,
                           .event_id = 0,
                           .event_data = 0
                         };

    eventOS_event_send(&auto_event);
}
#endif //WISUN_AUTO_START

#ifdef WISUN_TEST_MPL_EMBEDDED
/*!
 * Callback for handling any activity on the udp socket
 */
void socket_callback(void *cb)
{
    socket_callback_t *sock_cb = (socket_callback_t *) cb;

#ifdef WISUN_TEST_METRICS
    int16_t len;
    ns_address_t source_addr;
#endif
    tr_debug("socket_callback() sock=%d, event=0x%x, interface=%d, data len=%d",
             sock_cb->socket_id, sock_cb->event_type, sock_cb->interface_id, sock_cb->d_len);

    switch (sock_cb->event_type & SOCKET_EVENT_MASK) {
        case SOCKET_DATA:
            tr_info("socket_callback: SOCKET_DATA, sock=%d, bytes=%d", sock_cb->socket_id, sock_cb->d_len);

#ifdef WISUN_TEST_METRICS
            tr_mpl("socket_callback: SOCKET_DATA, sock=%d, bytes=%d", sock_cb->socket_id, sock_cb->d_len);

            /* Convert string addr to ipaddr array */
            len = socket_recvfrom(socket_id, recv_buffer, sizeof(recv_buffer), 0, &source_addr);
            if(len > 0)
              {
                  num_pkts++;
                  tr_mpl("Recv[%d]: %s, Pkts:%d", len, recv_buffer, num_pkts);
                  handle_message((char*)recv_buffer);
              }
              else if(NS_EWOULDBLOCK != len)
              {
                  tr_mpl("Recv error %x", len);
              }
#endif
            break;
        case SOCKET_CONNECT_DONE:
            tr_info("socket_callback: SOCKET_CONNECT_DONE");
            break;
        case SOCKET_CONNECT_FAIL:
            tr_info("socket_callback: SOCKET_CONNECT_FAIL");
            break;
        case SOCKET_CONNECT_AUTH_FAIL:
            tr_info("socket_callback: SOCKET_CONNECT_AUTH_FAIL");
            break;
        case SOCKET_INCOMING_CONNECTION:
            tr_info("socket_callback: SOCKET_INCOMING_CONNECTION");
            break;
        case SOCKET_TX_FAIL:
            tr_info("socket_callback: SOCKET_TX_FAIL");
            break;
        case SOCKET_CONNECT_CLOSED:
            tr_info("socket_callback: SOCKET_CONNECT_CLOSED");
            break;
        case SOCKET_CONNECTION_RESET:
            tr_info("socket_callback: SOCKET_CONNECTION_RESET");
            break;
        case SOCKET_NO_ROUTE:
            tr_info("socket_callback: SOCKET_NO_ROUTE");
            break;
        case SOCKET_TX_DONE:
            tr_info("socket_callback: SOCKET_TX_DONE");
            break;
        case SOCKET_NO_RAM:
            tr_info("socket_callback: SOCKET_NO_RAM");
            break;
        case SOCKET_CONNECTION_PROBLEM:
            tr_info("socket_callback: SOCKET_CONNECTION_PROBLEM");
            break;
        default:
            break;
    }
}

/*!
 * Setup udp socket and bind to a specific port number
 */
bool udpSocketSetup(void)
{
    int8_t ret;
    ns_ipv6_mreq_t mreq;
    ns_address_t bind_addr;

    tr_info("opening udp socket");
    socket_id = socket_open(SOCKET_UDP, 0, socket_callback);
    if (socket_id < 0) {
        tr_debug("socket open failed with error %d", socket_id);
        return false;
    }

    // how many hops the multicast message can go
    static const int16_t multicast_hops = 2;
    socket_setsockopt(socket_id, SOCKET_IPPROTO_IPV6, SOCKET_IPV6_MULTICAST_HOPS, &multicast_hops, sizeof(multicast_hops));

    static const int32_t buf_size = 20;
    int32_t rtn = 20;
//    rtn = socket_setsockopt(socket_id, SOCKET_SOL_SOCKET, SOCKET_SO_RCVBUF, &buf_size, sizeof buf_size);
//    tr_info("set rx buffer len %x, status %x", buf_size, rtn);
/*
    rtn = socket_setsockopt(socket_id, SOCKET_SOL_SOCKET, SOCKET_SO_SNDBUF, &buf_size, sizeof buf_size);
    tr_info("set Tx buffer len %x, status %x", buf_size, rtn);
*/
    /* Convert string addr to ipaddr array */
    stoip6(multicast_addr_str, strlen(multicast_addr_str), multi_cast_addr);

    memcpy(mreq.ipv6mr_multiaddr, multi_cast_addr, 16);
    mreq.ipv6mr_interface = 0;
    socket_setsockopt(socket_id, SOCKET_IPPROTO_IPV6, SOCKET_IPV6_JOIN_GROUP, &mreq, sizeof(mreq));

    bind_addr.type = ADDRESS_IPV6;
    memcpy(bind_addr.address, ns_in6addr_any, 16);
    bind_addr.identifier = UDP_PORT_TEST;
    ret = socket_bind(socket_id, &bind_addr);
    if (ret < 0) {
        tr_error("socket bind failed with error %d", ret);
        return false;
    }
    return true;
}

/*!
 * Process received message
 */
void handle_message(char* msg) {
    uint8_t state=0;
    uint16_t group=0xffff;

    if (strstr(msg, "t:lights;") == NULL) {
       return;
    }

    if (strstr(msg, "s:1;") != NULL) {
        state = 1;
    }
    else if (strstr(msg, "s:0;") != NULL) {
        state = 0;
    }

    // 0==master, 1==default group
    char *msg_ptr = strstr(msg, "g:");
    if (msg_ptr) {
        char *ptr;
        group = strtol(msg_ptr, &ptr, 10);
    }

    // in this example we only use one group
    // if (group==MASTER_GROUP || group==MY_GROUP) {
    //     GPIO_write(CONFIG_GPIO_RLED, state);
    // }
}

/*!
 * Send UDP Traffic to configured Socket ID
 * This function gets called by the eventOS timer
 * Timer is canceled at the completion of sending
 * desired UDP packets.
 */
void sendUDPTraffic () {
//    uint16_t count;
    int16_t ret;
    ns_address_t send_addr = {0};
    uint16_t slotIdx;
    uint32_t bfio;
    uint8_t hopCount = 1;
    uint16_t pktLen = 20;
    int16_t multicast_hops;
    uint8_t* send_buf;

    /* Set multicast send address */
    send_addr.type = ADDRESS_IPV6;
    send_addr.identifier = UDP_PORT_TEST;
    memcpy(send_addr.address, multi_cast_addr, 16);

    hopCount = (uint8_t) startUDPArgs[0];
    pktLen   = (uint16_t) startUDPArgs[1];

    send_buf = malloc(pktLen);

    timac_GetBC_Slot_BFIO(&slotIdx, &bfio);
//    tr_mpl("UDP payload slot(%d), BFIO(%u)", slotIdx, bfio);

    if (send_buf)
    {
        snprintf(send_buf, pktLen, "Id:%d:bfio:%u:%d:%d", slotIdx,bfio, hopCount, pktLen);
    }

    // Send UDP Packet until the desired numbers
    if (gPktCount--) {
        // Set #of hops for multicast message
        multicast_hops = hopCount;
        socket_setsockopt(socket_id, SOCKET_IPPROTO_IPV6, SOCKET_IPV6_MULTICAST_HOPS, &multicast_hops, sizeof(multicast_hops));
        ret = socket_sendto(socket_id, &send_addr, send_buf, pktLen);
    } else {
       eventOS_timeout_cancel(gUDP_pkt_timeout);
    }

    if (send_buf)
    {
        free(send_buf);
    }
}

/*!
 * Set up number of UDP packets to be send
 * and set up timer to send the packets.
 */
void startUDPTraffic (uint32_t numPkts, uint8_t pktInterval, uint8_t hopCount, uint16_t pktLen) {
    uint32_t updPktInterval;

    if (numPkts){
        gPktCount = numPkts;
    } else {
        gPktCount = 0xFFFFFFFF;
    }
    startUDPArgs[0] = hopCount;
    startUDPArgs[1] = pktLen;
    // Convert seconds to mSec
    updPktInterval = pktInterval * 1000;
    gUDP_pkt_timeout = eventOS_timeout_every_ms(sendUDPTraffic, updPktInterval, NULL);
}
#endif

extern void otNcpConfigure(int newNcpSocketPort, bool newUseIpv6);

/*!
 * Core logic for NCP tasklet. Helps process incoming, outgoing
 * messages on NCP interface based on the received event
 */
void ncp_tasklet(arm_event_s *event)
{
    arm_library_event_type_e event_type;
    event_type = (arm_library_event_type_e)event->event_type;
    switch (event_type)
    {
            case ARM_LIB_TASKLET_INIT_EVENT:

                ncp_tasklet_id = event->receiver;

                OtStack_instance = otInstanceInitSingle();
                assert(OtStack_instance);

                // workaround for not being able to add arguments to otNcpInit call
                otNcpConfigure(ncp_socket_port, NCP_SOCKET_USE_IPV6);
                otNcpInit(OtStack_instance);

#ifdef WISUN_AUTO_START
                //post an event to ncp_tasklet
                autoStartSignal();
#endif //WISUN_AUTO_START

                break;

#ifdef WISUN_AUTO_START
            case NCP_AUTO_START_EVENT:

                /* Automatically  bring the interface up & initiate Joining */
                /*  Equivalent to running ifconfig up and wisunstack start by default at startup */
                if(nanostack_net_if_up() != OT_ERROR_NONE)
                {
                    //assert here
                    assert(0);
                }
                if(nanostack_net_stack_up() != OT_ERROR_NONE)
                {
                    //assert here
                    assert(0);
                }
                break;
#endif //WISUN_AUTO_START

            case NCP_SOCKET_EVENT:
                platformNcpSocketProcess(event->data_ptr);
                break;

            case NCP_SEND_RESPONSE_EVENT:
                platformNcpSendProcess();
                break;

            case NCP_SEND_ASYNC_RSPONSE_EVENT:
                platformNcpSendAsyncProcess();
                break;
            default:
                break;
     }
}

/*!
 * Create the NCP tasklet whose core logic is defined in ncp_tasklet()
 * Also, post the event to initialize it after creating the tasklet
 *
 */
void ncp_tasklet_start(void)
{
        eventOS_event_handler_create(
        &ncp_tasklet,
        ARM_LIB_TASKLET_INIT_EVENT);
}

/*!
 * Helper function - returns the first non-zero channel from a list of
 * channels that is sent as input.
 */
uint8_t get_first_fixed_channel(uint8_t * channel_list)
{
    uint8_t idx, sizeOfChannelMask;
    uint8_t fixedChannelNum = 0;
    uint8_t bit_location = 0;
    uint8_t byteEntry = 0;
    sizeOfChannelMask = CHANNEL_BITMAP_SIZE;

    for(idx = 0; idx < sizeOfChannelMask; idx++)
    {
        byteEntry = channel_list[idx];
        bit_location = 0;
        while (bit_location < 8)
        {
            if (byteEntry & 0x01) {
                return fixedChannelNum;
            }
            else {
               fixedChannelNum++;
            }

            bit_location++;
            // shift byteEntry 1 to the right to pop off last bit
            byteEntry = byteEntry >> 1;
        }
    }
    return fixedChannelNum;
}

sAddrExt_t zeroExtAddr = {0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00};
sAddrExt_t eapol_eui_allow_list[EAPOL_EUI_LIST_SIZE];
bool is_in_eapol_eui_allow_list(uint8_t *euiAddress)
{
    uint16_t index = 0;

    for(index = 0; index < EAPOL_EUI_LIST_SIZE; index++)
    {
      if(sAddrExtCmp(euiAddress, eapol_eui_allow_list[index]))
      {
          /* specified dest address found in list */
          return true;
      }
    }
    return false;
}

bool insert_eapol_eui_allow_list(uint8_t* euiAddress)
{
    uint8_t index = 0;
    bool retVal = false;
    if (is_in_eapol_eui_allow_list(euiAddress))
    {
        // Already in allow list
        return true;
    }

    for(index = 0; index < EAPOL_EUI_LIST_SIZE; index++)
    {
        if(sAddrExtCmp(eapol_eui_allow_list[index], zeroExtAddr))
        {
            /* copy the string over if there is nothing stored there */
            sAddrExtCpy(eapol_eui_allow_list[index], euiAddress);
            retVal = true;
            break;
        }
    }

    return(retVal);
}
bool remove_eapol_eui_allow_list(uint8_t* euiAddress)
{
    uint8_t index = 0;
    bool retVal = false;

    for(index = 0; index < EAPOL_EUI_LIST_SIZE; index++)
    {
        if(sAddrExtCmp(eapol_eui_allow_list[index], euiAddress))
        {
            /* copy the string over if there is nothing stored there */
            sAddrExtCpy(eapol_eui_allow_list[index], zeroExtAddr);
            retVal = true;
            break;
        }
    }

    return(retVal);
}

#ifdef WISUN_TEST_METRICS
/*
 * Get latest test metrics
 */
void get_test_metrics(test_metrics_s *test_metrics)
{
    test_metrics->revision = 3;
    // Populate join time
    memcpy(&test_metrics->join_time, &node_join_time, sizeof(JOIN_TIME_s));

    // Populate MAC debug
    timac_getMACDebugCounts(&test_metrics->mac_debug);

    // Populate heap debug
    const mem_stat_t *heap_stats = ns_dyn_mem_get_mem_stat();

    test_metrics->heap_debug.heap_sector_size = heap_stats->heap_sector_size;
    test_metrics->heap_debug.heap_sector_allocated_bytes =
            heap_stats->heap_sector_allocated_bytes;
    test_metrics->heap_debug.heap_sector_allocated_bytes_max =
            heap_stats->heap_sector_allocated_bytes_max;

    timac_getMACPerfData(&test_metrics->mac_perf_data);

    // Populate length
    test_metrics->length = (uint16_t) sizeof(test_metrics_s);
}
#endif

#endif //WISUN_NCP_ENABLE

#ifdef WISUN_RCP_ENABLE

void platformRcpAReqRxedSignal(uintptr_t arg)
{
    //post an event to ncp_tasklet
    arm_event_s event = {
           .sender = 0,
           .receiver = rcp_tasklet_id,
           .priority = ARM_LIB_HIGH_PRIORITY_EVENT,
           .event_type = RCP_RX_ARESP_FROM_MAC_EVENT,
           .event_id = 0,
           .event_data = arg
       };

   eventOS_event_send(&event);
}


/*!
 * Core logic for RCP tasklet. Helps process incoming, outgoing
 * messages on RCP interface based on the received event
 */
void rcp_tasklet(arm_event_s *event)
{
    arm_library_event_type_e event_type;
    event_type = (arm_library_event_type_e)event->event_type;
    switch (event_type)
    {
            case ARM_LIB_TASKLET_INIT_EVENT:

                rcp_tasklet_id = event->receiver;              
                break;

            case RCP_RX_ARESP_FROM_MAC_EVENT:
                processIncomingAresp();
                break;

            case RCP_SEND_REQ_TO_MAC_EVENT:
                // consider sending request here  
                break;

            default:
                break;
     }
}

/*!
 * Create the RCP tasklet whose core logic is defined in rcp_tasklet()
 * Also, post the event to initialize it after creating the tasklet
 *
 */
void rcp_tasklet_start(void)
{
        eventOS_event_handler_create(
        &rcp_tasklet,
        ARM_LIB_TASKLET_INIT_EVENT);
}


#endif // WISUN_RCP_ENABLE
