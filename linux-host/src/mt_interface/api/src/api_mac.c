/******************************************************************************
 @file api_mac.c

 @brief TIMAC 2.0 API

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

/******************************************************************************
 Includes
*****************************************************************************/

#include "ti_semaphore.h"
#include "mutex.h"
#include "log.h"
#include "fatal.h"
#include "rand_data.h"
#include "mutex.h"
#include "timer.h"
#include "stream.h"
#include "stream_uart.h"
#include "stream_socket.h"

#include "mt_msg.h"
#include "api_mac.h"
#include "api_mac_linux.h"

#include "ns_trace.h"

#define TRACE_GROUP "APIM"

#include <stdio.h>
#include <stdarg.h>
#include <stdint.h>
#include <malloc.h>
#include <string.h>

/******************************************************************************
 Structures
*****************************************************************************/

/*!
  @struct secPibStruct
  Used to dispatch pib set/get requests from a dispatch table.
*/
struct secPibStruct
{
    /*! the active message */
    struct mt_msg *pMsg;
    /*! result of the get/set */
    ApiMac_status_t result;
    /*! How many messages where transfered, ie: 2=success */
    int n_msgs;
    /*! Is this get/set an error */
    bool is_error;
    /*! True if setting */
    bool is_set;
    /*! Attribute id as an integer */
    int attr;
    /*! data location */
    void *pValue;
};

/*!
  @struct secPibHandler
  Entry in a pib sec pib get/set dispatch table.
*/
struct secPibHandler
{
    /*! The corrisponding attribute as an integer */
    int attr;
    /*! Handler for this attribute */
    void (*handler)(struct secPibStruct *pInfo);
};

/******************************************************************************
  Global Vars see: api_mac.h or api_mac_linux.h for details.
******************************************************************************/

/*!

  @brief When waiting for the next AREQ, how long to block.

  When the application calls ApiMac_processIncoming()
  the code processes all pending async requests then blocks
  on a semaphore waiting for the next Areq, this is the timeout
  period to wait before giving up, 0 means do not wait, return
  immediately.
*/
int ApiMacLinux_areq_timeout_mSecs = DEFAULT_ApiMacLinux_areq_timeout_mSecs;

/*!
  Debug log flags for the API MAC module.
  these flags are used by the "main" app when parsing the
  application INI file to set/clear/enable/disable log flags.

  See the file: "log.h" for more details.
*/
const struct ini_flag_name api_mac_log_flags[] =
{
    { .name = "api-mac-wait", .value = LOG_DBG_API_MAC_wait },
    { .name = "api-mac-stats", .value = LOG_DBG_API_MAC_datastats },
    /* terminate */
    { .name = NULL, .value = 0 }
};

struct mt_version_info MT_DEVICE_version_info;

/******************************************************************************
 Constants, definitions, and Local Defines
*****************************************************************************/

/* These values come from the API_MAC embedded implimentation */

/*! Capability Information - Device is capable of becoming a PAN coordinator */
#define CAPABLE_PAN_COORD       0x01
/*! Capability Information - Device is an FFD  */
#define CAPABLE_FFD             0x02
/*!
  Capability Information - Device is mains powered rather than battery powered
*/
#define CAPABLE_MAINS_POWER     0x04
/*! Capability Information - Device has its receiver on when idle  */
#define CAPABLE_RX_ON_IDLE      0x08
/*!
  Capability Information - Device is capable of sending
  and receiving secured frames
*/
#define CAPABLE_SECURITY        0x40
/*!
  Capability Information - Request allocation of a short address in the
  associate procedure
*/
#define CAPABLE_ALLOC_ADDR      0x80

/*! Msgs processed while awaiting a reset rsp */
#define MAX_MSGS_PROCESSED_POST_RESET 20

/*! Offset into the payload for the payload IEs */
#define PAYLOAD_IE_OFFSET                    0
/*! Offset into the IE for the subIE */
#define PAYLOAD_IE_SUBIE_OFFSET              0

/*! Macro to get the IE Type */
#define PAYLOAD_IE_TYPE(p) (((p)[PAYLOAD_IE_OFFSET+1] >> 7) & 0x01)

/*! Macro to get the IE Group ID */
#define PAYLOAD_IE_GROUP_ID(p)                          \
    ((((uint8_t *)p)[PAYLOAD_IE_OFFSET+1] >> 3) & 0x0f)

/*! Macro to get the IE Content Length */
#define PAYLOAD_IE_CONTENT_LEN(p)                           \
    ((((uint8_t *)p)[PAYLOAD_IE_OFFSET+0] & 0x00ff) +       \
     ((((uint8_t *)p)[PAYLOAD_IE_OFFSET+1] & 0x0007) << 8))

/*! Type value for payload IE */
#define PAYLOAD_IE_TYPE_VAL 1
/*! Type value for payload IE */
#define PAYLOAD_IE_HEADER_LEN 2

/*! Macro to get the short subIE length */
#define PAYLOAD_IE_SHORT_SUBIE_LEN(p) ((p)[PAYLOAD_IE_SUBIE_OFFSET+0])

/*! Macro to get the long subIE length */
#define PAYLOAD_IE_LONG_SUBIE_LEN(p)                \
    (((p)[PAYLOAD_IE_OFFSET+0] & 0x00ff) +          \
     (((p)[PAYLOAD_IE_OFFSET+1] & 0x0007)  << 8))

/*! Macro to get the subIE type */
#define PAYLOAD_IE_SUBIE_TYPE(p) (((p)[PAYLOAD_IE_SUBIE_OFFSET+1] >> 7) & 0x01)

/*! Macro to get the subIE ID */
#define PAYLOAD_IE_SUBIE_ID(p) ((p)[PAYLOAD_IE_SUBIE_OFFSET+1] & 0x7f)

/*! subIE header length */
#define PAYLOAD_SUB_IE_HEADER_LEN 2

/*! Short subIE type */
#define PAYLOAD_SUB_ID_IE_TYPE_SHORT 0
/*! Long subIE type */
#define PAYLOAD_SUB_ID_IE_TYPE_LONG 1

/*! Short subIE header length */
#define PAYLOAD_SUB_ID_IE_SHORT_HEADER_LEN  2

/*! Payload IE SubIE Type Size */
#define PAYLOAD_IE_SUB_IE_TYPE_SIZE 1
/*! Payload IE SubIE Type Position */
#define PAYLOAD_IE_SUB_IE_TYPE_POSITION 15
/*! Payload IE SubIE ID Short Size */
#define PAYLOAD_IE_SUB_IE_ID_SHORT_SIZE 7
/*! Payload IE SubIE ID Short Position */
#define PAYLOAD_IE_SUB_IE_ID_SHORT_POSITION 8
/*! Payload IE SubIE Short Length Size */
#define PAYLOAD_IE_SUB_IE_LEN_SHORT_SIZE 8
/*! Payload IE SubIE Short Length Position */
#define PAYLOAD_IE_SUB_IE_LEN_SHORT_POSITION 0
/*! Payload IE SubIE ID Long Size */
#define PAYLOAD_IE_SUB_IE_ID_LONG_SIZE 4
/*! Payload IE SubIE ID Long Position */
#define PAYLOAD_IE_SUB_IE_SUB_ID_LONG_POSITION 11
/*! Payload IE SubIE ID Long Length Size */
#define PAYLOAD_IE_SUB_IE_LEN_LONG_SIZE 11
/*! Payload IE SubIE Long Length Position */
#define PAYLOAD_IE_SUB_IE_LEN_LONG_POSITION 0

/*! Unpack a field from a uint16_t */
#define IE_UNPACKING(var,size,position) (((uint16_t)(var)>>(position))\
                &(((uint16_t)1<<(size))-1))

/*! Make a uint16_t from 2 uint8_t */
#define MAKE_UINT16(low, high) (((low)&0x00FF)|(((high)&0x00FF)<<8))

/*! Get the SubIE type field (bool) */
#define GET_SUBIE_TYPE(ctl)                          \
    (bool)(IE_UNPACKING(ctl,                         \
                        PAYLOAD_IE_SUB_IE_TYPE_SIZE, \
                        PAYLOAD_IE_SUB_IE_TYPE_POSITION))

/*! Get the SubIE Long ID  */
#define GET_SUBIE_ID_LONG(ctl)                                      \
    (uint8_t)(IE_UNPACKING(ctl,                                     \
                           PAYLOAD_IE_SUB_IE_ID_LONG_SIZE,          \
                           PAYLOAD_IE_SUB_IE_SUB_ID_LONG_POSITION))

/*! Get the SubIE Long Length */
#define GET_SUBIE_LEN_LONG(ctl)                                         \
    (uint16_t)(IE_UNPACKING(ctl,                                        \
                            PAYLOAD_IE_SUB_IE_LEN_LONG_SIZE,            \
                            PAYLOAD_IE_SUB_IE_LEN_LONG_POSITION))

/*! Get the SubIE Short ID  */
#define GET_SUBIE_ID_SHORT(ctl)                                         \
    (uint8_t)(IE_UNPACKING(ctl,                                         \
                           PAYLOAD_IE_SUB_IE_ID_SHORT_SIZE,             \
                           PAYLOAD_IE_SUB_IE_ID_SHORT_POSITION))

/*! Get the SubIE Short Length */
#define GET_SUBIE_LEN_SHORT(ctl)                                        \
    (uint16_t)(IE_UNPACKING(ctl,                                        \
                            PAYLOAD_IE_SUB_IE_LEN_SHORT_SIZE,           \
                            PAYLOAD_IE_SUB_IE_LEN_SHORT_POSITION))

/******************************************************************************
  Local Structs
******************************************************************************/

/* forward */
struct mt_msg_dispatch;

/*
  @typedef msg_dispatch_handler

  @brief Function prototype for an AREQ handler.

  When an async message comes in, the handler for that message is
  found in a dispatch table, this is the prototype of a handler
  in that table.
*/
typedef void msg_dispatch_handler(const struct mt_msg_dispatch *pDTE,
                                  struct mt_msg *pMsg);

/*!
 * @struct mt_msg_dispatch
 * @brief Dispatch table entry for a message handler/parser.
 */
struct mt_msg_dispatch
{
    /*! cmd0 to match against */
    int cmd0;
    /*! cmd1 to match against */
    int cmd1;
    /*! for use by the handler */
    intptr_t cookie;
    /*! for log purposes */
    const char *dbg_prefix;
    /*! handler for this command */
    msg_dispatch_handler *pHandler;
};

/******************************************************************************
 * Local Variables
 ******************************************************************************/

/*! When specific ASYNC messages arrive, we call these functions. */
static ApiMac_callbacks_t *pApiMac_callbacks;

/*! used as random source for ApiMac_randomByte() */
static struct rand_data_one rand_data_source;

/******************************************************************************
 Local Function Prototypes
 *****************************************************************************/
static void *api_mac_callocMem(struct mt_msg *pMsg, const char *pWhy, int cnt,
                               int siz);
static void api_mac_freeMem(void *pMem);
static void decode_Sec(struct mt_msg *pMsg, ApiMac_sec_t *pSec);
static void encode_Sec(struct mt_msg *pMsg, ApiMac_sec_t *pSec);
static void decode_Addr(struct mt_msg *pMsg, ApiMac_sAddr_t *pAddr);
static void encode_Addr(struct mt_msg *pMsg, const ApiMac_sAddr_t *pAddr);
static void api_rd_panDesc(struct mt_msg *pMsg, ApiMac_panDesc_t *pD);
static void process_areq_associate_ind(const struct mt_msg_dispatch *p,
                                       struct mt_msg *pMsg);
static void process_areq_sync_loss_ind(const struct mt_msg_dispatch *p,
                                       struct mt_msg *pMsg);
static void process_areq_data_cnf(const struct mt_msg_dispatch *p,
                                  struct mt_msg *pMsg);
static void process_areq_data_ind(const struct mt_msg_dispatch *p,
                                  struct mt_msg *pMsg);
static void process_areq_purge_cnf(const struct mt_msg_dispatch *p,
                                   struct mt_msg *pMsg);
static void process_areq_orphan_ind(const struct mt_msg_dispatch *p,
                                    struct mt_msg *pMsg);
static void process_areq_associate_cnf(const struct mt_msg_dispatch *p,
                                       struct mt_msg *pMsg);
static void process_areq_beacon_notify(const struct mt_msg_dispatch *p,
                                       struct mt_msg *pMsg);
static void process_areq_disassociate_ind(const struct mt_msg_dispatch *p,
                                          struct mt_msg *pMsg);
static void process_areq_disassociate_cnf(const struct mt_msg_dispatch *p,
                                          struct mt_msg *pMsg);
static void process_areq_poll_cnf(const struct mt_msg_dispatch *p,
                                  struct mt_msg *pMsg);
static void process_areq_scan_cnf(const struct mt_msg_dispatch *p,
                                  struct mt_msg *pMsg);
static void process_areq_comm_status_ind(const struct mt_msg_dispatch *p,
                                         struct mt_msg *pMsg);
static void process_areq_start_cnf(const struct mt_msg_dispatch *p,
                                   struct mt_msg *pMsg);
static void process_areq_ws_async_cnf(const struct mt_msg_dispatch *p,
                                      struct mt_msg *pMsg);
static void process_areq_ws_async_ind(const struct mt_msg_dispatch *p,
                                      struct mt_msg *pMsg);
static void process_areq_poll_ind(const struct mt_msg_dispatch *p,
                                  struct mt_msg *pMsg);
static void process_areq_reset_ind(const struct mt_msg_dispatch *p,
                                   struct mt_msg *pMsg);
static void process_areq(struct mt_msg *pMsg);
static void resetCoPDevice(void);
static void *createInterface(void);
static uint16_t convertTxOptions(ApiMac_txOptions_t *txOptions);
static int API_MAC_TxRx_Status(struct mt_msg *pMsg);
static struct mt_msg *api_new_msg(int len, int cmd0, int cmd1,
                                  const char *dbg_prefix);
static int API_MAC_Get_Common(int cmd0, int cmd1, int att_id, int wiresize, 
                              int datasize, void *pValue);
static int API_MAC_Set_Common(int cmd0, int cmd1, int att_id, int wiresize, 
                              uint64_t v);
static ApiMac_status_t API_MAC_SetGetArray_Common(bool is_set, int cmd0,
                                                  int cmd1, int pib_attribute,
                                                  uint8_t *pValue);
static void sec_pib_ApiMac_securityAttribute_keyTable(struct secPibStruct *p);
static void sec_pib_ApiMac_securityAttribute_keyIdLookupEntry(struct secPibStruct *p);
static void sec_pib_ApiMac_securityAttribute_keyDeviceEntry(struct secPibStruct *p);
static void sec_pib_ApiMac_securityAttribute_keyUsageEntry(struct secPibStruct *p);
static void sec_pib_ApiMac_securityAttribute_keyEntry(struct secPibStruct *p);
static void sec_pib_ApiMac_securityAttribute_deviceEntry(struct secPibStruct *p);
static void sec_pib_ApiMac_securityAttribute_securityLevelEntry(struct secPibStruct *p);
static ApiMac_status_t common_ApiMac_mlmeGetSetSecurityReqStruct(int is_set,
    ApiMac_securityAttribute_struct_t pibAttribute, void *pValue);

/******************************************************************************
  Functions.
******************************************************************************/

/*!
 * @brief Allocate memory associated with this message.
 * @param pMsg - associated message
 * @param why - message for error logging
 * @param cnt - number of items to allocate
 * @param siz - size of each item to allocate
 *
 * If required, logs error messages
 */
static void *api_mac_callocMem(struct mt_msg *pMsg,
                               const char *pWhy,
                               int cnt,
                               int siz)
{
    void *vp;

    vp = calloc(cnt, siz);
    if(vp == NULL)
    {
        tr_err("no memory for: %s\n", pWhy);
    }
    return (vp);
}

/*!
 * @brief Compliment of api_mac_callocMem()
 * @param pMem - data to free
 */
static void api_mac_freeMem(void *pMem)
{
    if(pMem)
    {
        free(pMem);
    }
}

/*!
 * @brief common routine to decode a security component of a message
 * @param pMsg - the message to read from
 * @param pSec - the security item to fill in
 */
static void decode_Sec(struct mt_msg *pMsg, ApiMac_sec_t *pSec)
{
    MT_MSG_rdBuf_DBG(pMsg,
                     (void *)(&pSec->keySource[0]),
                     APIMAC_KEY_SOURCE_MAX_LEN, "keySource");
    pSec->securityLevel = MT_MSG_rdU8_DBG(pMsg, "securityLevel");
    pSec->keyIdMode     = MT_MSG_rdU8_DBG(pMsg, "keyIdMode");
    pSec->keyIndex      = MT_MSG_rdU8_DBG(pMsg, "keyIndex");
}

/*!
 * @brief Common routine to handle a "security" component of a message.
 * @param wrPtr - where to encode the security information
 * @param pSec  - the security information to encode
 * @return updated wrPtr
 *
 * An example use of this can be found in ApiMac_mlmeAssociateReq()
 */
static void encode_Sec(struct mt_msg *pMsg, ApiMac_sec_t *pSec)
{
    MT_MSG_wrBuf_DBG(pMsg,
                     (void *)(&(pSec->keySource[0])),
                     APIMAC_KEY_SOURCE_MAX_LEN, "keySource");
    MT_MSG_wrU8_DBG(pMsg, pSec->securityLevel, "securityLevel");
    MT_MSG_wrU8_DBG(pMsg, pSec->keyIdMode, "keyIdMode");
    MT_MSG_wrU8_DBG(pMsg, pSec->keyIndex, "keyIndex");
}

/*!
 * @brief Decode an address from a message
 * @return void
 */
static void decode_Addr(struct mt_msg *pMsg, ApiMac_sAddr_t *pAddr)
{
    int x;
    pAddr->addrMode = MT_MSG_rdU8_DBG(pMsg, "addrMode");
    switch(pAddr->addrMode)
    {
    default:
    case ApiMac_addrType_none:
        /* read something.. */
        for(x = 0 ; x < 8 ; x++)
        {
            pAddr->addr.extAddr[x] = MT_MSG_rdU8_DBG(pMsg, "filler");
        }
        break;
    case ApiMac_addrType_short:
        pAddr->addr.shortAddr = MT_MSG_rdU16_DBG(pMsg, "shortAddr");
        for(x = 2 ; x < 8 ; x++)
        {
            /* read & toss */
            MT_MSG_rdU8_DBG(pMsg, "filler");
        }
        break;
    case ApiMac_addrType_extended:
        for(x = 0 ; x < 8 ; x++)
        {
            pAddr->addr.extAddr[x] = MT_MSG_rdU8_DBG(pMsg, "extaddr");
        }
    }
}

/*!
 * @brief internal helper function to encode an address
 * @param pMsg - the message to write to
 * @param pAddr - the address to write/encode
 */
static void encode_Addr(struct mt_msg *pMsg, const ApiMac_sAddr_t *pAddr)
{
    int x;
    MT_MSG_wrU8_DBG(pMsg, pAddr->addrMode, "addrMode");
    switch(pAddr->addrMode)
    {
    case ApiMac_addrType_none:
        /* zero fill */
        for(x = 0 ; x < 8 ; x++)
        {
            MT_MSG_wrU8_DBG(pMsg, 0, "addr-fill");
        }
        break;
    case ApiMac_addrType_short:
        MT_MSG_wrU16_DBG(pMsg,  pAddr->addr.shortAddr, "shortAddr");
        for(x = 2 ; x < 8 ; x++)
        {
            MT_MSG_wrU8_DBG(pMsg, 0,"addr-fill");
        }
        break;
    case ApiMac_addrType_extended:
        for(x = 0 ; x < 8 ; x++)
        {
            MT_MSG_wrU8_DBG(pMsg, pAddr->addr.extAddr[x], "ext-addr");
        }
        break;
    default:
        BUG_HERE("API error bad address type\n");
        /* insert fill bytes */
        MT_MSG_wrU32_DBG(pMsg, 0, "dbg-fill");
        MT_MSG_wrU32_DBG(pMsg, 0, "dbg-fill");
        break;
    }
}

/*!
 * @brief common code to parse a pan descriptor from an MT message
 *
 * @param pMsg - message to parse
 * @param pD - where to put the message
 * @param flavor - 0 if a beacon, !0 if a scan response type
 */
static void api_rd_panDesc(struct mt_msg *pMsg,
                           ApiMac_panDesc_t *pD)
{
    decode_Addr(pMsg, &(pD->coordAddress));
    pD->coordPanId     = MT_MSG_rdU16_DBG(pMsg, "coordPanId");
    pD->superframeSpec = MT_MSG_rdU16_DBG(pMsg, "superFrameSpec");
    pD->logicalChannel = MT_MSG_rdU8_DBG(pMsg, "logicalChannel");
    pD->channelPage    = MT_MSG_rdU8_DBG(pMsg, "channelPage");
    pD->gtsPermit      = MT_MSG_rdU8_DBG(pMsg, "gtsPermit");
    pD->linkQuality    = MT_MSG_rdU8_DBG(pMsg, "linkQuality");
    pD->timestamp      = MT_MSG_rdU32_DBG(pMsg, "timestamp");
    pD->securityFailure = MT_MSG_rdU8_DBG(pMsg, "securityFailure");
    decode_Sec(pMsg, &(pD->sec));
}

static bool is_bad_addr( ApiMac_sAddrExt_t p )
{
    int x;
    /* A bad MAC address is defined as all 1s */
    for( x = 0 ; x < APIMAC_SADDR_EXT_LEN ; x++ ){
        if( p[x] != 0x0ff ){
            return false;
        }
    }
    return true;
}


/*!
  Initialize this module.

  Public function defined in api_mac.h
*/
void *ApiMac_init(bool enableFH)
{
    int r;
    bool b;
    void *sem;
    static bool initialMacInit = true;

    if (initialMacInit) 
    {
        sem = createInterface();
        initialMacInit = false;
    }

    memset( (void *)(&MT_DEVICE_version_info), 0, sizeof(MT_DEVICE_version_info) );
    r = MT_MSG_getVersion( API_MAC_msg_interface, &MT_DEVICE_version_info );
    if( r != 2 )
    {
        FATAL_printf("Cannot get VERSION info from CoProcessor\n");
    }


    if(enableFH)
    {
        ApiMac_enableFH();
    }

    ApiMac_mlmeResetReq(true);

    /* get mac address from the co-processor */
    {
        ApiMac_sAddrExt_t cfg, prim;
        /* First: the one from the CCFG */
        r = MT_MSG_getExtAddress( API_MAC_msg_interface, NULL, prim, cfg );
        if( r != 4 ){
            FATAL_printf("Cannot get MAC addresses from CoProcessor\n");
        }
        /* if not programed, use the factory one */
        b = is_bad_addr( cfg );
        if( b ){
            memcpy( cfg, prim, APIMAC_SADDR_EXT_LEN);
        }

        /* Oh no things are horrible bad! */
        if( is_bad_addr( cfg )){
            /* we must invent a random one */
            RAND_DATA_initOne( &(rand_data_source), ((uint32_t)( TIMER_getAbsNow() ) ));
            int x;
            for( x = 0 ; x < APIMAC_SADDR_EXT_LEN ; x++ ){
                cfg[x] = ApiMac_randomByte();
            }
            /* Set the Local admin bit */
            cfg[0] |= 2;
            /* unicast bit */
            cfg[0] &= (~1);
        }

        ApiMac_mlmeSetReqArray( ApiMac_attribute_extendedAddress, cfg );
    } 

    return sem;   
}

/*!
  Register for MAC callbacks.

  Public function defined in api_mac.h
*/
void ApiMac_registerCallbacks(ApiMac_callbacks_t *pCallbacks)
{
    pApiMac_callbacks = pCallbacks;
}

/*!
 * @brief Process an associate indication
 *
 * @param p - dispatch table entry
 * @param pMsg - the message to process.
 */
static void process_areq_associate_ind(const struct mt_msg_dispatch *p,
                                       struct mt_msg *pMsg)
{
    int r;
    ApiMac_mlmeAssociateInd_t indication;

    (void)p;

    memset((void *)(&indication), 0, sizeof(indication));

    MT_MSG_rdBuf_DBG(pMsg,
                     (void *)(&indication.deviceAddress[0]),
                     APIMAC_SADDR_EXT_LEN, "extaddr");

    r = MT_MSG_rdU8_DBG(pMsg, "capInfo");
    ApiMac_buildMsgCapInfo((uint8_t)(r),
                           &(indication.capabilityInformation));

    decode_Sec(pMsg, &indication.sec);

    MT_MSG_parseComplete(pMsg);
    if(pMsg->is_error)
    {
        return;
    }

    if(pApiMac_callbacks->pAssocIndCb)
    {
        (*(pApiMac_callbacks->pAssocIndCb))(&indication);
    }
}

/*!
 * @brief Process a sync loss indication
 *
 * @param p - dispatch table entry
 * @param pMsg - the message to process.
 */
static void process_areq_sync_loss_ind(const struct mt_msg_dispatch *p,
                                       struct mt_msg *pMsg)
{
    ApiMac_mlmeSyncLossInd_t indication;

    (void)p;

    memset((void *)(&indication), 0, sizeof(indication));

    indication.reason         = MT_MSG_rdU8_DBG(pMsg, "reason");
    indication.panId          = MT_MSG_rdU16_DBG(pMsg, "panID");
    indication.logicalChannel = MT_MSG_rdU8_DBG(pMsg, "logicalChannel");
    indication.channelPage    = MT_MSG_rdU8_DBG(pMsg, "channelPage");
    indication.phyID          = MT_MSG_rdU8_DBG(pMsg, "phyID");
    decode_Sec(pMsg, &indication.sec);

    MT_MSG_parseComplete(pMsg);
    if(pMsg->is_error)
    {
        return;
    }

    if(pApiMac_callbacks->pSyncLossIndCb)
    {
        (*(pApiMac_callbacks->pSyncLossIndCb))(&indication);
    }
}

/*!
 * @brief Process a data conformation
 *
 * @param p - dispatch table entry
 * @param pMsg - the message to process.
 */
static void process_areq_data_cnf(const struct mt_msg_dispatch *p,
                                  struct mt_msg *pMsg)
{
    ApiMac_mcpsDataCnf_t indication;

    (void)p;

    memset((void *)(&indication), 0, sizeof(indication));

    indication.status          = MT_MSG_rdU8_DBG(pMsg, "status");
    indication.msduHandle      = MT_MSG_rdU8_DBG(pMsg, "msdu-handle");
    indication.timestamp       = MT_MSG_rdU32_DBG(pMsg, "timestamp");
    indication.timestamp2      = MT_MSG_rdU16_DBG(pMsg, "timestamp2");
    indication.retries         = MT_MSG_rdU8_DBG(pMsg, "retries" );
    indication.mpduLinkQuality = MT_MSG_rdU8_DBG(pMsg, "mpduLinkQuality");
    indication.correlation     = MT_MSG_rdU8_DBG(pMsg, "correlation");
    indication.rssi            = MT_MSG_rdU8_DBG(pMsg, "rssi" );
    indication.frameCntr       = MT_MSG_rdU32_DBG(pMsg, "frameCntr");

    MT_MSG_parseComplete(pMsg);
    if(pMsg->is_error)
    {
        return;
    }

    if(pApiMac_callbacks->pDataCnfCb)
    {
        (*(pApiMac_callbacks->pDataCnfCb))(&indication);
    }
}

/*!
 * @brief Process a data indication
 *
 * @param p - dispatch table entry
 * @param pMsg - the message to process.
 */
static void process_areq_data_ind(const struct mt_msg_dispatch *p,
                                  struct mt_msg *pMsg)
{
    ApiMac_mcpsDataInd_t indication;

    memset((void *)(&indication), 0, sizeof(indication));

    (void)p;

    decode_Addr(pMsg, (&indication.srcAddr));
    decode_Addr(pMsg, (&indication.dstAddr));
    indication.timestamp       = MT_MSG_rdU32_DBG(pMsg, "timestamp");
    indication.timestamp2      = MT_MSG_rdU16_DBG(pMsg, "timestamp2");
    indication.srcPanId        = MT_MSG_rdU16_DBG(pMsg, "srcPanId");
    indication.dstPanId        = MT_MSG_rdU16_DBG(pMsg, "dstPanId");
    indication.mpduLinkQuality = MT_MSG_rdU8_DBG(pMsg, "mdpuLinkQuality");
    indication.correlation     = MT_MSG_rdU8_DBG(pMsg, "correlation");
    indication.rssi            = MT_MSG_rdU8_DBG(pMsg, "rssi");
    indication.dsn             = MT_MSG_rdU8_DBG(pMsg, "dsn");
    decode_Sec(pMsg, &indication.sec);
    indication.frameCntr       = MT_MSG_rdU32_DBG(pMsg, "frameCntr");

    indication.msdu.len        = MT_MSG_rdU16_DBG(pMsg, "msdu.len");
    indication.payloadIeLen    = MT_MSG_rdU16_DBG(pMsg, "payloadIeLen");

    indication.msdu.p          = &(pMsg->iobuf[ pMsg->iobuf_idx ]);
    MT_MSG_rdBuf_DBG(pMsg, NULL, indication.msdu.len, "msdu.data");

    indication.pPayloadIE      = &(pMsg->iobuf[ pMsg->iobuf_idx ]);
    MT_MSG_rdBuf_DBG(pMsg, NULL, indication.payloadIeLen, "payloadData");

    MT_MSG_parseComplete(pMsg);
    if(pMsg->is_error)
    {
        return;
    }


    //LOG_printf( LOG_DBG_API_MAC_datastats,
                // "data-ind: len=%2d addr: %02x:%02x:%02x:%02x:%02x:%02x:%02x:%02x\n",
                // pMsg->expected_len,
                // indication.srcAddr.addr.extAddr[0],
                // indication.srcAddr.addr.extAddr[1],
                // indication.srcAddr.addr.extAddr[2],
                // indication.srcAddr.addr.extAddr[3],
                // indication.srcAddr.addr.extAddr[4],
                // indication.srcAddr.addr.extAddr[5],
                // indication.srcAddr.addr.extAddr[6],
                // indication.srcAddr.addr.extAddr[7]);

    if(pApiMac_callbacks->pDataIndCb)
    {
        (*(pApiMac_callbacks->pDataIndCb))(&indication);
    }
}

/*!
 * @brief Process a purge confirmation
 *
 * @param p - dispatch table entry
 * @param pMsg - the message to process.
 */
static void process_areq_purge_cnf(const struct mt_msg_dispatch *p,
                                   struct mt_msg *pMsg)
{
    ApiMac_mcpsPurgeCnf_t indication;

    (void)p;

    memset((void *)(&indication), 0, sizeof(indication));

    indication.status = MT_MSG_rdU8_DBG(pMsg, "status");
    indication.msduHandle = MT_MSG_rdU8_DBG(pMsg, "handle");

    MT_MSG_parseComplete(pMsg);
    if(pMsg->is_error)
    {
        return;
    }

    if(pApiMac_callbacks->pPurgeCnfCb)
    {
        (*(pApiMac_callbacks->pPurgeCnfCb))(&indication);
    }
}

/*!
 * @brief Process an orphan indication
 *
 * @param p - dispatch table entry
 * @param pMsg - the message to process.
 */
static void process_areq_orphan_ind(const struct mt_msg_dispatch *p,
                                    struct mt_msg *pMsg)
{
    ApiMac_mlmeOrphanInd_t indication;

    (void)p;

    memset((void *)(&indication), 0, sizeof(indication));

    MT_MSG_rdBuf_DBG(pMsg,
                 (void *)(&indication.orphanAddress[0]),
                 APIMAC_SADDR_EXT_LEN, "ext-addr");
    //LOG_printf( LOG_DBG_API_MAC_datastats,
                // "orphan: %02x:%02x:%02x:%02x:%02x:%02x:%02x:%02x\n",
                // indication.orphanAddress[0],
                // indication.orphanAddress[1],
                // indication.orphanAddress[2],
                // indication.orphanAddress[3],
                // indication.orphanAddress[4],
                // indication.orphanAddress[5],
                // indication.orphanAddress[6],
                // indication.orphanAddress[7]);

    decode_Sec(pMsg, &(indication.sec));

    MT_MSG_parseComplete(pMsg);
    if(pMsg->is_error)
    {
        return;
    }

    if(pApiMac_callbacks->pOrphanIndCb)
    {
        (*(pApiMac_callbacks->pOrphanIndCb))(&indication);
    }
}

/*!
 * @brief Process an associate confirmation
 *
 * @param p - dispatch table entry
 * @param pMsg - the message to process.
 */
static void process_areq_associate_cnf(const struct mt_msg_dispatch *p,
                                       struct mt_msg *pMsg)
{
    ApiMac_mlmeAssociateCnf_t indication;

    (void)(p);

    memset((void *)(&indication), 0, sizeof(indication));

    indication.status = MT_MSG_rdU8_DBG(pMsg, "status");
    indication.assocShortAddress = MT_MSG_rdU16_DBG(pMsg, "shorAddress");
    decode_Sec(pMsg, &indication.sec);

    MT_MSG_parseComplete(pMsg);
    if(pMsg->is_error)
    {
        return;
    }

    if(pApiMac_callbacks->pAssocCnfCb)
    {
        (*(pApiMac_callbacks->pAssocCnfCb))(&indication);
    }
}

/*!
 * @brief Process a beacon notify message
 *
 * @param p - dispatch table entry
 * @param pMsg - the message to process.
 */
static void process_areq_beacon_notify(const struct mt_msg_dispatch *p,
                                       struct mt_msg *pMsg)
{
    int x;
    int idx_save;
    ApiMac_mlmeBeaconNotifyInd_t indication;

    (void)(p);

    /* simplify, do this check at the top. */
    if(pApiMac_callbacks->pBeaconNotifyIndCb == NULL)
    {
        return;
    }

    memset((void *)(&indication), 0, sizeof(indication));

    indication.beaconType = MT_MSG_rdU8_DBG(pMsg, "beacontype");
    indication.bsn        = MT_MSG_rdU8_DBG(pMsg, "bsn");
    switch(indication.beaconType)
    {
    default:
        tr_err("unknown beacon type: %d\n", indication.beaconType);
        break;
    case ApiMac_beaconType_normal:
        /* standard beacon  */
        indication.panDesc.timestamp = MT_MSG_rdU32_DBG(pMsg, "timestamp");
        decode_Addr(pMsg, &(indication.panDesc.coordAddress));
        indication.panDesc.coordPanId = MT_MSG_rdU16_DBG(pMsg, "pan-PandID");
        indication.panDesc.superframeSpec = MT_MSG_rdU16_DBG(pMsg, "pan-super-frame");
        indication.panDesc.logicalChannel = MT_MSG_rdU8_DBG(pMsg, "pan-logical-channel");
        indication.panDesc.channelPage = MT_MSG_rdU8_DBG(pMsg, "pan-channel-page");
        indication.panDesc.gtsPermit = MT_MSG_rdU8_DBG(pMsg, "pan-gts-permit");
        indication.panDesc.linkQuality = MT_MSG_rdU8_DBG(pMsg, "pan-link-quality");
        indication.panDesc.securityFailure = MT_MSG_rdU8_DBG(pMsg, "pan-security-failure");
        decode_Sec(pMsg, &(indication.panDesc.sec));
        indication.beaconData.beacon.numPendShortAddr = MT_MSG_rdU8_DBG(pMsg, "num-pend-short-addr");
        indication.beaconData.beacon.numPendExtAddr   = MT_MSG_rdU8_DBG(pMsg, "num-pend-ext-addr");
        indication.beaconData.beacon.sduLength        = MT_MSG_rdU8_DBG(pMsg, "sdu-length");

        /* remember where we are now. */
        idx_save = pMsg->iobuf_idx;
        /* fake parse these ...  */
        MT_MSG_rdBuf_DBG(pMsg, NULL,
                         2 * indication.beaconData.beacon.numPendShortAddr,
                         "pend-short-addr");
        MT_MSG_rdBuf_DBG(pMsg, NULL,
                         8 * indication.beaconData.beacon.numPendExtAddr,
                         "pend-ext-addr");
        MT_MSG_rdBuf_DBG(pMsg, NULL,
                         indication.beaconData.beacon.sduLength, "sdu.data");
        MT_MSG_parseComplete(pMsg);

        if(pMsg->is_error)
        {
            goto fail_1;
        }

        /* allocate space for these */
        indication.beaconData.beacon.pShortAddrList =
            (uint16_t *)api_mac_callocMem(pMsg,
                                          "beacon",
                                          indication.beaconData.beacon.numPendShortAddr+1,
                                          sizeof(uint16_t));
        indication.beaconData.beacon.pExtAddrList   =
            (uint8_t *)api_mac_callocMem(pMsg,
                                         "beacon",
                                         indication.beaconData.beacon.numPendExtAddr+1,
                                         8);
        indication.beaconData.beacon.pSdu           =
            (uint8_t *)api_mac_callocMem(pMsg,
                                         "beacon",
                                         indication.beaconData.beacon.sduLength+1,
                                         1);

        if(pMsg->is_error)
        {
            goto fail_1;
        }
        /* reset to the starting point */
        pMsg->iobuf_idx = idx_save;

        /* and read properly to do byte swap if required */
        for(x = 0 ; x < indication.beaconData.beacon.numPendShortAddr ; x++)
        {
            indication.beaconData.beacon.pShortAddrList[x] =
                MT_MSG_rdU16_DBG(pMsg, "short-addr");
        }

        /* read properly to deal with alignment  */
        for(x = 0 ; x < indication.beaconData.beacon.numPendExtAddr ; x++)
        {
            MT_MSG_rdBuf_DBG(pMsg,
                         indication.beaconData.beacon.pExtAddrList + (x *8),
                         8, "dummy");
        }

        /* these are just bytes.. */
        MT_MSG_rdBuf_DBG(pMsg,
                     indication.beaconData.beacon.pSdu,
                     indication.beaconData.beacon.sduLength, "sdu-data");

        MT_MSG_parseComplete(pMsg);
        if(!(pMsg->is_error))
        {
            (*(pApiMac_callbacks->pBeaconNotifyIndCb))(&indication);
        }
    fail_1:
        if(indication.beaconData.beacon.pShortAddrList)
        {
            api_mac_freeMem((void *)(indication.beaconData.beacon.pShortAddrList));
            indication.beaconData.beacon.pShortAddrList = NULL;
        }
        if(indication.beaconData.beacon.pExtAddrList)
        {
            api_mac_freeMem((void *)(indication.beaconData.beacon.pExtAddrList));
            indication.beaconData.beacon.pExtAddrList = NULL;
        }
        if(indication.beaconData.beacon.pSdu)
        {
            api_mac_freeMem((void *)(indication.beaconData.beacon.pSdu));
            indication.beaconData.beacon.pSdu = NULL;
        }

        break;
    case ApiMac_beaconType_enhanced:
        indication.beaconData.eBeacon.coexist.beaconOrder       = MT_MSG_rdU8_DBG(pMsg, "beaconOrder");
        indication.beaconData.eBeacon.coexist.superFrameOrder   = MT_MSG_rdU8_DBG(pMsg, "superFrameOrder");
        indication.beaconData.eBeacon.coexist.finalCapSlot      = MT_MSG_rdU8_DBG(pMsg, "finalCapSlot");
        indication.beaconData.eBeacon.coexist.eBeaconOrder      = MT_MSG_rdU8_DBG(pMsg, "eBeaconOrder");
        indication.beaconData.eBeacon.coexist.offsetTimeSlot    = MT_MSG_rdU8_DBG(pMsg, "offsetTimeSlot");
        indication.beaconData.eBeacon.coexist.capBackOff        = MT_MSG_rdU8_DBG(pMsg, "capBackOff");
        indication.beaconData.eBeacon.coexist.eBeaconOrderNBPAN = MT_MSG_rdU16_DBG(pMsg, "beaconordernpan");
        MT_MSG_parseComplete(pMsg);
        if(pMsg->is_error)
        {
            break;
        }
        if(pApiMac_callbacks->pBeaconNotifyIndCb)
        {
            (*(pApiMac_callbacks->pBeaconNotifyIndCb))(&indication);
        }
        break;
    }
}

/*!
 * @brief Process a disassociate indication
 *
 * @param p - dispatch table entry
 * @param pMsg - the message to process.
 */
static void process_areq_disassociate_ind(const struct mt_msg_dispatch *p,
                                          struct mt_msg *pMsg)
{
    ApiMac_mlmeDisassociateInd_t indication;

    (void)(p);

    memset((void *)(&indication), 0, sizeof(indication));

    MT_MSG_rdBuf_DBG(pMsg,
                 (void *)(&indication.deviceAddress[0]),
                 APIMAC_SADDR_EXT_LEN, "ext-addr");
    indication.disassociateReason = MT_MSG_rdU8_DBG(pMsg, "reason");
    decode_Sec(pMsg, &(indication.sec));

    MT_MSG_parseComplete(pMsg);
    if(pMsg->is_error)
    {
        return;
    }

    if(pApiMac_callbacks->pDisassociateIndCb)
    {
        (*(pApiMac_callbacks->pDisassociateIndCb))(&indication);
    }
}

/*!
 * @brief Process a disassociate confirmation
 *
 * @param p - dispatch table entry
 * @param pMsg - the message to process.
 */
static void process_areq_disassociate_cnf(const struct mt_msg_dispatch *p,
                                          struct mt_msg *pMsg)
{
    ApiMac_mlmeDisassociateCnf_t indication;

    (void)(p);

    memset((void *)(&indication), 0, sizeof(indication));

    indication.status = MT_MSG_rdU8_DBG(pMsg, "status");
    decode_Addr(pMsg, &indication.deviceAddress);
    indication.panId = MT_MSG_rdU16_DBG(pMsg, "pan-id");

    MT_MSG_parseComplete(pMsg);
    if(pMsg->is_error)
    {
        return;
    }

    if(pApiMac_callbacks->pDisassociateCnfCb)
    {
        (*(pApiMac_callbacks->pDisassociateCnfCb))(&indication);
    }
}

/*!
 * @brief Process a poll confirmation
 *
 * @param p - dispatch table entry
 * @param pMsg - the message to process.
 */
static void process_areq_poll_cnf(const struct mt_msg_dispatch *p,
                                  struct mt_msg *pMsg)
{
    ApiMac_mlmePollCnf_t indication;

    (void)(p);

    memset((void *)(&indication), 0, sizeof(indication));

    indication.status = MT_MSG_rdU8_DBG(pMsg ,"status");
    indication.framePending = MT_MSG_rdU8_DBG(pMsg, "framePending");

    MT_MSG_parseComplete(pMsg);
    if(pMsg->is_error)
    {
        return;
    }

    if(pApiMac_callbacks->pPollCnfCb)
    {
        (*(pApiMac_callbacks->pPollCnfCb))(&indication);
    }
}

/*!
 * @brief Process a scan confirmation
 *
 * @param p - dispatch table entry
 * @param pMsg - the message to process.
 */
static void process_areq_scan_cnf(const struct mt_msg_dispatch *p,
                                  struct mt_msg *pMsg)
{
    int x;
    ApiMac_panDesc_t *pPD;
    ApiMac_mlmeScanCnf_t     indication;
    uint8_t *pU8;

    (void)(p);

    pU8 = NULL;
    pPD = NULL;

    memset((void *)(&indication), 0, sizeof(indication));

    indication.status = MT_MSG_rdU8_DBG(pMsg, "status");

    indication.scanType          = MT_MSG_rdU8_DBG(pMsg, "scanType");
    indication.channelPage       = MT_MSG_rdU8_DBG(pMsg, "channelPage");
    indication.phyId             = MT_MSG_rdU8_DBG(pMsg, "phyId");
    MT_MSG_rdBuf_DBG(pMsg, (void *)(indication.unscannedChannels), 17, "unscannedchannels");
    indication.resultListSize    = MT_MSG_rdU8_DBG(pMsg, "resultListSize");

    switch(indication.scanType)
    {
    default:
        //LOG_printf(LOG_ERROR,
                //    "areq-scan-cnf unknown type: %d\n",
                //    indication.scanType);
        pMsg->is_error = true;
        break;
    case ApiMac_scantype_orphan:
        if(indication.resultListSize)
        {
            tr_err("orphan scan size not zero?\n");
        }
        break;
    case ApiMac_scantype_energyDetect:
        pU8 = (uint8_t *)api_mac_callocMem(pMsg,
                                           "scan result",
                                           indication.resultListSize + 1,
                                           sizeof(uint8_t));
        indication.result.pEnergyDetect = pU8;
        if(pMsg->is_error)
        {
            break;
        }
        MT_MSG_rdBuf_DBG(pMsg,
                         (void *)(pU8),
                         indication.resultListSize,
                         "energydata");
        break;
    case ApiMac_scantype_activeEnhanced:
    case ApiMac_scantype_active:
    case ApiMac_scantype_passive:
        pPD = (ApiMac_panDesc_t *)api_mac_callocMem(
            pMsg,
            "scan result",
            indication.resultListSize + 1,
            sizeof(*indication.result.pPanDescriptor));

        indication.result.pPanDescriptor = pPD;
        if(pMsg->is_error)
        {
            break;
        }
        for(x = 0; x < indication.resultListSize; x++)
        {
            api_rd_panDesc(pMsg, pPD + x);
        }
        break;
    }

    /* did we properly parse this? */
    MT_MSG_parseComplete(pMsg);

    if(!pMsg->is_error)
    {
        if(pApiMac_callbacks->pScanCnfCb)
        {
            (*(pApiMac_callbacks->pScanCnfCb))(&indication);
        }
    }
    if(pPD)
    {
        api_mac_freeMem((void *)(pPD));
        pPD = NULL;
    }

    if(pU8)
    {
        api_mac_freeMem((void *)(pU8));
    }
}

/*!
 * @brief Process a communications status indication
 *
 * @param p - dispatch table entry
 * @param pMsg - the message to process.
 */
static void process_areq_comm_status_ind(const struct mt_msg_dispatch *p,
                                         struct mt_msg *pMsg)
{
    ApiMac_mlmeCommStatusInd_t indication;

    (void)(p);

    memset((void *)(&indication), 0, sizeof(indication));

    indication.status = MT_MSG_rdU8_DBG(pMsg, "status");
    decode_Addr(pMsg, &indication.srcAddr);
    decode_Addr(pMsg, &indication.dstAddr);
    indication.panId = MT_MSG_rdU16_DBG(pMsg, "panID");
    indication.reason = MT_MSG_rdU8_DBG(pMsg, "reason");
    decode_Sec(pMsg, &indication.sec);

    MT_MSG_parseComplete(pMsg);
    if(pMsg->is_error)
    {
        return;
    }

    if(pApiMac_callbacks->pCommStatusCb)
    {
        (*(pApiMac_callbacks->pCommStatusCb))(&indication);
    }
}

/*!
 * @brief Process a start confirmation
 *
 * @param p - dispatch table entry
 * @param pMsg - the message to process.
 */
static void process_areq_start_cnf(const struct mt_msg_dispatch *p,
                                   struct mt_msg *pMsg)
{
    ApiMac_mlmeStartCnf_t indication;

    (void)(p);

    memset((void *)(&indication), 0, sizeof(indication));

    indication.status = MT_MSG_rdU8_DBG(pMsg, "status");

    MT_MSG_parseComplete(pMsg);
    if(pMsg->is_error)
    {
        return;
    }

    if(pApiMac_callbacks->pStartCnfCb)
    {
        (*(pApiMac_callbacks->pStartCnfCb))(&indication);
    }
}

/*!
 * @brief Process a WiSun async confirm
 *
 * @param p - dispatch table entry
 * @param pMsg - the message to process.
 */
static void process_areq_ws_async_cnf(const struct mt_msg_dispatch *p,
                                      struct mt_msg *pMsg)
{
    ApiMac_mlmeWsAsyncCnf_t indication;

    (void)(p);

    memset((void *)(&indication), 0, sizeof(indication));

    indication.status = MT_MSG_rdU8_DBG(pMsg, "status");

    MT_MSG_parseComplete(pMsg);
    if(pMsg->is_error)
    {
        return;
    }

    if(pApiMac_callbacks->pWsAsyncCnfCb)
    {
        (*(pApiMac_callbacks->pWsAsyncCnfCb))(&indication);
    }
}

/*!
 * @brief Process a WiSun async indication.
 *
 * @param p - dispatch table entry
 * @param pMsg - the message to process.
 */
static void process_areq_ws_async_ind(const struct mt_msg_dispatch *p,
                                      struct mt_msg *pMsg)
{
    ApiMac_mlmeWsAsyncInd_t indication;

    (void)(p);

    memset((void *)(&indication), 0, sizeof(indication));

    decode_Addr(pMsg, &indication.srcAddr);
    decode_Addr(pMsg, &indication.dstAddr);
    indication.timestamp = MT_MSG_rdU32_DBG(pMsg, "timestamp");
    indication.timestamp2 = MT_MSG_rdU16_DBG(pMsg, "timestamp2");
    indication.srcPanId = MT_MSG_rdU16_DBG(pMsg, "src-pan-id");
    indication.dstPanId = MT_MSG_rdU16_DBG(pMsg, "dst-pan-id");
    indication.mpduLinkQuality = MT_MSG_rdU8_DBG(pMsg, "mdpu-link-quality");
    indication.correlation = MT_MSG_rdU8_DBG(pMsg, "correlation");
    indication.rssi = MT_MSG_rdU8_DBG(pMsg, "rssi");
    indication.dsn = MT_MSG_rdU8_DBG(pMsg, "dsn");
    decode_Sec(pMsg, &(indication.sec));
    indication.frameCntr = MT_MSG_rdU32_DBG(pMsg, "framecntr");
    indication.fhFrameType = MT_MSG_rdU8_DBG(pMsg,"frameType" );
    // indication.fhProtoDispatch = MT_MSG_rdU8_DBG(pMsg, "fh-protodisptch");
    indication.msdu.len = MT_MSG_rdU16_DBG(pMsg, "msdu-len");
    indication.payloadIeLen = MT_MSG_rdU16_DBG(pMsg, "payload-ie-len" );

    if(indication.msdu.len)
    {
        indication.msdu.p = api_mac_callocMem(pMsg,
                                        "ws_async_ind",
                                        indication.msdu.len,
                                        sizeof(uint8_t));
        MT_MSG_rdBuf_DBG(pMsg, (void *)(indication.msdu.p),
                         indication.msdu.len,
                         "msdu.data");
    }
    if(indication.payloadIeLen)
    {
        indication.pPayloadIE = api_mac_callocMem(pMsg,
                                            "ws_async_ind",
                                            indication.payloadIeLen,
                                            sizeof(uint8_t));
        MT_MSG_rdBuf_DBG(pMsg,
                         (void *)(indication.pPayloadIE),
                         indication.payloadIeLen, "payload");

    }

    MT_MSG_parseComplete(pMsg);
    if(!pMsg->is_error)
    {
        if(pApiMac_callbacks->pWsAsyncIndCb)
        {
            (*(pApiMac_callbacks->pWsAsyncIndCb))(&indication);
        }
    }
    if(indication.msdu.p)
    {
        api_mac_freeMem((void *)indication.msdu.p);
        indication.msdu.p = NULL;
    }
    if(indication.pPayloadIE)
    {
        api_mac_freeMem((void *)(indication.pPayloadIE));
        indication.pPayloadIE = NULL;
    }
}

/*!
 * @brief process a poll indication.
 * @param pMsg - the message
 */
static void process_areq_poll_ind(const struct mt_msg_dispatch *p,
                                  struct mt_msg *pMsg)
{
    ApiMac_mlmePollInd_t indication;

    (void)(p);

    decode_Addr(pMsg, &indication.srcAddr);
    indication.srcPanId = MT_MSG_rdU16_DBG(pMsg, "srcPanId");
    indication.noRsp = MT_MSG_rdU8_DBG(pMsg, "noRsp") ? true : false;

    MT_MSG_parseComplete(pMsg);
    if(pMsg->is_error)
    {
        return;
    }
    if(pApiMac_callbacks->pPollIndCb)
    {
        (*(pApiMac_callbacks->pPollIndCb))(&indication);
    }
}

/*!
 * @brief process a reset indication
 * @param pMsg - the message
 */
static void process_areq_reset_ind(const struct mt_msg_dispatch *p,
                                   struct mt_msg *pMsg)
{
    ApiMac_mcpsResetInd_t indication;
    const char *r_str;
    int transport;
    int product;
    int major;
    int minor;
    int maint;

    (void)(p);

    memset((void *)(&indication), 0, sizeof(indication));
    
    indication.reason = MT_MSG_rdU8_DBG(pMsg, "reason");

    /* Log reset reason */
    switch( indication.reason )
    {
        default: r_str = "unknown"; break;
        case ApiMac_resetReason_hardware: r_str = "hardware"; break;
        case ApiMac_resetReason_hostReq: r_str = "host-req"; break;
        case ApiMac_resetReason_halAssert: r_str = "hal-assert"; break;
        case ApiMac_resetReason_macAssert: r_str = "mac-assert"; break;
        case ApiMac_resetReason_rtosAssert: r_str = "rtos-assert"; break;
    }

    transport = MT_MSG_rdU8_DBG( pMsg, "transport" );
    product   = MT_MSG_rdU8_DBG( pMsg, "product" );
    major     = MT_MSG_rdU8_DBG( pMsg, "major" );
    minor     = MT_MSG_rdU8_DBG( pMsg, "minor" );
    maint     = MT_MSG_rdU8_DBG( pMsg, "maint" );

    tr_warn("Reset Indication: reason: %d (%s) version: %d/%d/%d/%d/%d\n",
            indication.reason, 
            r_str,
            transport,
            product,
            major, 
            minor,
            maint );

    /* Verify entire message has been parsed */
    MT_MSG_parseComplete(pMsg);
    if(pMsg->is_error)
    {
        return;
    }

    if(pApiMac_callbacks->pResetIndCb)
    {
        (*(pApiMac_callbacks->pResetIndCb))(&indication);
    }
}

/*!
 * @brief Internal function to process/handle messages.
 *
 * @param pMsg - the message to process
 */
static void process_areq(struct mt_msg *pMsg)
{
    const struct mt_msg_dispatch *p;

    /* Lookup table to dispatch messages */
    static const struct mt_msg_dispatch lut[] = {
        {
            .cmd0 = MAC_SYNC_LOSS_IND_cmd0,
            .cmd1 = MAC_SYNC_LOSS_IND_cmd1,
            .dbg_prefix = "sync-loss-ind"    ,
            .pHandler = process_areq_sync_loss_ind
        },
        {
            .cmd0 = MAC_ASSOCIATE_IND_cmd0,
            .cmd1 = MAC_ASSOCIATE_IND_cmd1,
            .dbg_prefix = "associate-ind"    ,
            .pHandler = process_areq_associate_ind
        },
        {
            .cmd0 = MAC_ASSOCIATE_CNF_cmd0,
            .cmd1 = MAC_ASSOCIATE_CNF_cmd1,
            .dbg_prefix = "associate-cnf"    ,
            .pHandler = process_areq_associate_cnf
        },
        {
            .cmd0 = MAC_BEACON_NOTIFY_IND_cmd0,
            .cmd1 = MAC_BEACON_NOTIFY_IND_cmd1,
            .dbg_prefix = "beacon-notify"    ,
            .pHandler = process_areq_beacon_notify },
        {
            .cmd0 = MAC_DATA_CNF_cmd0,
            .cmd1 = MAC_DATA_CNF_cmd1,
            .dbg_prefix = "data-cnf" ,
            .pHandler = process_areq_data_cnf },
        {
            .cmd0 = MAC_DATA_IND_cmd0,
            .cmd1 = MAC_DATA_IND_cmd1,
            .dbg_prefix = "data-ind"         ,
            .pHandler = process_areq_data_ind
        },
        {
            .cmd0 = MAC_DISASSOCIATE_IND_cmd0,
            .cmd1 = MAC_DISASSOCIATE_IND_cmd1,
            .dbg_prefix = "disassociate-ind" ,
            .pHandler = process_areq_disassociate_ind
        },
        {
            .cmd0 = MAC_DISASSOCIATE_CNF_cmd0,
            .cmd1 = MAC_DISASSOCIATE_CNF_cmd1,
            .dbg_prefix = "disassociate-cnf" ,
            .pHandler = process_areq_disassociate_cnf
        },

        /* 0x88- not used */
        /* 0x89- not used */

        {
            .cmd0 = MAC_ORPHAN_IND_cmd0,
            .cmd1 = MAC_ORPHAN_IND_cmd1,
            .dbg_prefix = "orphan-ind"       ,
            .pHandler = process_areq_orphan_ind
        },
        {
            .cmd0 = MAC_POLL_CNF_cmd0,
            .cmd1 = MAC_POLL_CNF_cmd1,
            .dbg_prefix = "poll-cnf"         ,
            .pHandler = process_areq_poll_cnf
        },
        {
            .cmd0 = MAC_SCAN_CNF_cmd0,
            .cmd1 = MAC_SCAN_CNF_cmd1,
            .dbg_prefix = "scan-cnf"         ,
            .pHandler = process_areq_scan_cnf
        },
        {
            .cmd0 = MAC_COMM_STATUS_IND_cmd0,
            .cmd1 = MAC_COMM_STATUS_IND_cmd1,
            .dbg_prefix = "status-ind"       ,
            .pHandler = process_areq_comm_status_ind
        },
        {
            .cmd0 = MAC_START_CNF_cmd0,
            .cmd1 = MAC_START_CNF_cmd1,
            .dbg_prefix = "start-cnf"        ,
            .pHandler = process_areq_start_cnf
        },
        /* 0x8f - not used */
        {
            .cmd0 = MAC_PURGE_CNF_cmd0,
            .cmd1 = MAC_PURGE_CNF_cmd1,
            .dbg_prefix = "purge-cnf"        ,
            .pHandler = process_areq_purge_cnf
        },
        {
            .cmd0 = MAC_POLL_IND_cmd0,
            .cmd1 = MAC_POLL_IND_cmd1,
            .dbg_prefix = "poll-ind"         ,
            .pHandler = process_areq_poll_ind
        },
        {
            .cmd0 = MAC_WS_ASYNC_CNF_cmd0,
            .cmd1 = MAC_WS_ASYNC_CNF_cmd1,
            .dbg_prefix = "ws-async-cnf"     ,
            .pHandler = process_areq_ws_async_cnf
        },
        {
            .cmd0 = MAC_WS_ASYNC_IND_cmd0,
            .cmd1 = MAC_WS_ASYNC_IND_cmd1,
            .dbg_prefix = "ws-async-ind"     ,
            .pHandler = process_areq_ws_async_ind
        },
        {
            .cmd0 = SYS_RESET_IND_cmd0,
            .cmd1 = SYS_RESET_IND_cmd1,
            .dbg_prefix = "reset-indication"     ,
            .pHandler = process_areq_reset_ind
        },
        /* terminate */
        { .pHandler = NULL }
    };

    if(pApiMac_callbacks == NULL)
    {
        tr_err("no-callbacks\n");
        return;
    }

    p = lut;

    while(p->pHandler)
    {
        if((p->cmd0 == (pMsg->cmd0 & 0x7F)) && (p->cmd1 == pMsg->cmd1))
        {
            break;
        }
        p++;
    }
    if(p->pHandler)
    {
        pMsg->pLogPrefix = p->dbg_prefix;
        //LOG_printf(LOG_DBG_MT_MSG_traffic,
                //    "%s: rx: %s\n",
                //    pMsg->pSrcIface->dbg_name,
                //    pMsg->pLogPrefix);
        tr_debug("process-areq\n");
        (*(p->pHandler))(p, pMsg);
    }
    else
    {
        pMsg->pLogPrefix = "unknown-areq";
        
        tr_debug("***UNKNOWN AREQ***\n");
        LOG_hexdump(LOG_DBG_MT_MSG_areq, 0, pMsg->iobuf, pMsg->iobuf_nvalid);
        
        /* an AREQ we do not know/understand. */
        if(pApiMac_callbacks)
        {
            if(pApiMac_callbacks->pUnprocessedCb)
            {
                pApiMac_callbacks->pUnprocessedCb(0, 0, (void *)(pMsg));
            }
        }
    }
}

/*!
  Process at most one incoming messages
  Public function defined in api_mac.h
*/
void ApiMac_processIncoming(void)
{
    struct mt_msg *pMsg;

    pMsg = MT_MSG_LIST_remove(API_MAC_msg_interface,
                              &(API_MAC_msg_interface->rx_list),
                              ApiMacLinux_areq_timeout_mSecs);

    if(pMsg == NULL)
    {
        //LOG_printf(LOG_DBG_API_MAC_wait, "no-msg\n");
        return;
    }

    /* process the message */
    if(pMsg->m_type == MT_MSG_TYPE_areq|| pMsg->m_type == MT_MSG_TYPE_areq_frag_data)
    {
        process_areq(pMsg);
    }
    else
    {
        /* embedded code passes:
           src
           0
           pointer to message.

           We have no specific source, so we set src=0
        */
        tr_err("unprocessed-msg\n");
        if(pApiMac_callbacks)
        {
            if(pApiMac_callbacks->pUnprocessedCb)
            {
                pApiMac_callbacks->pUnprocessedCb(0, 0, (void *)(pMsg));
            }
        }
    }
    MT_MSG_free(pMsg);
}

/*!
 * @brief send reset command and await response from CoProcessor
 */
static void resetCoPDevice(void)
{
    struct mt_msg *pMsg;
    uint8_t resetAttempt = 0;

    /* Send reset request */
    MT_MSG_reset(API_MAC_msg_interface, 1);

    while (resetAttempt < MAX_MSGS_PROCESSED_POST_RESET)
    {
        /* Wait for incoming message */
        pMsg = MT_MSG_LIST_remove(API_MAC_msg_interface,
                                  &(API_MAC_msg_interface->rx_list),
                                  ApiMacLinux_areq_timeout_mSecs);

        /* Attempt again if reset response not received */
        if((NULL == pMsg) || 
           (0x41 != (pMsg->cmd0 & 0x7F)) || (0x80 != pMsg->cmd1))
        {
            resetAttempt++;
            MT_MSG_free(pMsg);  
        }
        else 
        {   
            tr_debug("Reset Indication: CoP init\n");
            MT_MSG_free(pMsg); 
            break;
        }
    }

    if(MAX_MSGS_PROCESSED_POST_RESET == resetAttempt)
    {
        FATAL_printf("No reset response received after device reset\n");
    } 
}

/*!
  Initialize this MT MSG interface.
*/
static void *createInterface(void)
{
    int r;

    MT_MSG_init();

    if( API_MAC_msg_interface == NULL )
    {
        BUG_HERE("msg interface not specified(NULL)\n");
    }

    r = MT_MSG_interfaceCreate(API_MAC_msg_interface);
    if(r != 0)
    {
        FATAL_printf("Cannot init interface (%d)\n", r);
    }

    /* Reset device for initialization */
    resetCoPDevice();

    /* We return "other" list semaphore.
       When we get an AREQ, we post here
       If some external event occurs
       We let the caller post here also
    */
    return ((void *)(API_MAC_msg_interface->rx_list.sem));
}

/*!
 * @brief       Convert API txOptions to bitmasked txOptions.
 *
 * @param       txOptions - tx options structure
 * @return      bitmasked txoptions
 */
static uint16_t convertTxOptions(ApiMac_txOptions_t *txOptions)
{
    uint16_t retVal = 0;

    if(txOptions->ack == true)
    {
        retVal |= MAC_TXOPTION_ACK;
    }
    if(txOptions->indirect == true)
    {
        retVal |= MAC_TXOPTION_INDIRECT;
    }
    if(txOptions->pendingBit == true)
    {
        retVal |= MAC_TXOPTION_PEND_BIT;
    }
    if(txOptions->noRetransmits == true)
    {
        retVal |= MAC_TXOPTION_NO_RETRANS;
    }
    if(txOptions->noConfirm == true)
    {
        retVal |= MAC_TXOPTION_NO_CNF;
    }
    if(txOptions->useAltBE == true)
    {
        retVal |= MAC_TXOPTION_ALT_BE;
    }
    if(txOptions->usePowerAndChannel == true)
    {
        retVal |= MAC_TXOPTION_PWR_CHAN;
    }

    return (retVal);
}

/*!
 * @brief Internal function to send a synchronous request expecting a status
 *
 * @param pMsg - the message to send.
 * @return the status byte code returned from the remote end.
 *
 * Note: This routine also frees both messsages (tx and response)
 */
static int API_MAC_TxRx_Status(struct mt_msg *pMsg)
{
    int r;

    r = MT_MSG_txrx(pMsg);

    /* We should get 2 back.
       1 = we transmitted a message
       1 = we rx'ed a message
       =====
       1+1 = 2 = success
    */
    // if(r != 2)
    // {
    //     /* Something is wrong... */
    //     r = ApiMac_status_badState;
    //     goto fail;
    // }

    /* Got response */
    /* status is a single byte. */
    r = MT_MSG_rdU8_DBG(pMsg->pSrsp, "status");
    /* we should be done now */
    MT_MSG_parseComplete(pMsg->pSrsp);

    /* anything wrong? */
    if(pMsg->is_error || pMsg->pSrsp->is_error)
    {
        r = ApiMac_status_invalidParameter;
    }
    //LOG_printf(LOG_DBG_MT_MSG_traffic,
            //    "SREQ: (%s) SRSP: Result: %d (0x%02x)\n",
            //    pMsg->pLogPrefix, r, r);
fail:
    MT_MSG_free(pMsg);
    return (r);
}

/*!
 * @brief Allocate a new message
 * @param len - expected payload length, or -1 if unknown
 * @param cmd0 - cmd0 value
 * @param cmd1 - cmd1 value
 * @return pointer to an allocated message, or NULL if no memory
 */
static struct mt_msg *api_new_msg(int len, int cmd0,
                                  int cmd1,
                                  const char *dbg_prefix)
{
    struct mt_msg *pMsg;

    pMsg = MT_MSG_alloc(len, cmd0, cmd1);
    if(pMsg)
    {
        pMsg->pLogPrefix = dbg_prefix;
        MT_MSG_setSrcIface(pMsg, NULL);
        MT_MSG_setDestIface(pMsg, API_MAC_msg_interface);
    }
    return (pMsg);
}

/*!
  This function sends application data to the MAC for
  transmission in a MAC data frame.

  Public function defined in api_mac.h
*/
ApiMac_status_t ApiMac_mcpsDataReq(ApiMac_mcpsDataReq_t *pData)
{
    struct mt_msg *pMsg;
    int n;
    n = 0x23;
    n = n + pData->msdu.len;
    n = n + pData->payloadIELen;

    pMsg = api_new_msg(n, 0x22, 0x05, "mcpsDataReq");
    if(!pMsg)
    {
        return (ApiMac_status_noResources);
    }
    encode_Addr(pMsg, &(pData->dstAddr));
    MT_MSG_wrU16_DBG(pMsg, pData->dstPanId, "dstPanId");
    MT_MSG_wrU8_DBG(pMsg, pData->srcAddrMode , "srcAddrMode");
    MT_MSG_wrU8_DBG(pMsg, pData->msduHandle, "msduHandle");
    MT_MSG_wrU8_DBG(pMsg, convertTxOptions(&(pData->txOptions)), "txOptions");
    MT_MSG_wrU8_DBG(pMsg, pData->channel, "channel");
    MT_MSG_wrU8_DBG(pMsg, pData->power, "power");
    encode_Sec(pMsg, &(pData->sec));
    MT_MSG_wrU32_DBG(pMsg, pData->includeFhIEs, "includeFhIEs");

    MT_MSG_wrU16_DBG(pMsg, pData->msdu.len, "msdu.len");
    MT_MSG_wrU16_DBG(pMsg, pData->payloadIELen, "payloadIELen");

    MT_MSG_wrBuf_DBG(pMsg, pData->msdu.p, pData->msdu.len, "msdu-data");
    MT_MSG_wrBuf_DBG(pMsg, pData->pIEList, pData->payloadIELen, "payload-IE");

    return (API_MAC_TxRx_Status(pMsg));
}

/*!
  This function purges and discards a data request from the MAC
  data queue.

  Public function defined in api_mac.h
*/
ApiMac_status_t ApiMac_mcpsPurgeReq(uint8_t msduHandle)
{
    struct mt_msg *pMsg;

    pMsg = api_new_msg(1, 0x22, 0x0e, "mcpsPurgeReq");
    if(!pMsg)
    {
        return (ApiMac_status_noResources);
    }

    MT_MSG_wrU8_DBG(pMsg, msduHandle, "handle");

    return (API_MAC_TxRx_Status(pMsg));
}

/*!
  This function sends an associate request to a coordinator
  device.

  Public function defined in api_mac.h
*/
ApiMac_status_t ApiMac_mlmeAssociateReq(ApiMac_mlmeAssociateReq_t *pData)
{
    struct mt_msg *pMsg;

    pMsg = api_new_msg(0x1a, 0x22, 0x06, "mlmeAssociateReq");
    if(pMsg == NULL)
    {
        return (ApiMac_status_noResources);
    }

    MT_MSG_wrU8_DBG(pMsg, pData->logicalChannel, "logicalChannel");
    MT_MSG_wrU8_DBG(pMsg, pData->channelPage, "channelPage");
    MT_MSG_wrU8_DBG(pMsg, pData->phyID, "phyID");
    encode_Addr(pMsg, &(pData->coordAddress));
    MT_MSG_wrU16_DBG(pMsg, pData->coordPanId, "coordPanId");
    MT_MSG_wrU8_DBG(pMsg,
                    ApiMac_convertCapabilityInfo(
                        &(pData->capabilityInformation)),
                    "capabilityInfo");
    encode_Sec(pMsg, &(pData->sec));

    return (API_MAC_TxRx_Status(pMsg));
}

/*!
  This function is used by an associated device to notify the
  coordinator of its intent to leave the PAN.

  Public function defined in api_mac.h
*/
ApiMac_status_t ApiMac_mlmeDisassociateReq(ApiMac_mlmeDisassociateReq_t *pData)
{
    struct mt_msg *pMsg;

    pMsg = api_new_msg(0x18, 0x22, 0x07, "mlmeDisassociateReq");
    if(pMsg == NULL)
    {
        return (ApiMac_status_noResources);
    }

    encode_Addr(pMsg, &(pData->deviceAddress));
    MT_MSG_wrU16_DBG(pMsg, pData->devicePanId, "panId");
    MT_MSG_wrU8_DBG(pMsg, pData->disassociateReason, "reason");
    MT_MSG_wrU8_DBG(pMsg, pData->txIndirect , "txIndirect");
    encode_Sec(pMsg, &(pData->sec));

    return (API_MAC_TxRx_Status(pMsg));
}

/*!
 * @brief Internal common routine to handle all PIB get requests.
 *
 * @param cmd0 - command 0 value to use
 * @param cmd1 - command 1 value to use
 * @param att_id - the attribute id
 * @param wiresize - transmission size of the item
 * @param datasize - variable size of the item
 * @param pValue - pointer to the value
 *
 *
 * If the wiresize & data size is positive
 *    The value is a numeric (byte swap applies)
 * else
 *    (negative) the value is an array of bytes
 *
 * Also see: API_MAC_Set_Common()
 */
static int API_MAC_Get_Common(int cmd0,
                              int cmd1,
                              int att_id,
                              int wiresize,
                              int datasize,
                              void *pValue)
{
    int r;
    uint64_t v;
    struct mt_msg *pMsg;
    struct mt_msg *pSrsp;
    int l;

    v = 0;

    /* some attributes are 16bit numbers */
    if(att_id > 0x100)
    {
        l = 2;
    }
    else
    {
        l = 1;
    }
    pMsg = api_new_msg(l, cmd0, cmd1, "pib-get-common");
    if(!pMsg)
    {
        return (ApiMac_status_noResources);
    }

    if(l == 1)
    {
        MT_MSG_wrU8_DBG(pMsg, att_id, "pib-id8");
    }
    else
    {
        MT_MSG_wrU16_DBG(pMsg, att_id, "pib-id16");
    }

    // security requests require two index dummy bytes
    switch (att_id)
    {
        /* NOTE: "security" structures are not handled in this function. */
        /* Hence they are not listed here */

        /* security array of bytes */
    case ApiMac_securityAttribute_autoRequestKeySource:
    case ApiMac_securityAttribute_defaultKeySource:
    case ApiMac_securityAttribute_panCoordExtendedAddress:
        /* uint8s */
    case ApiMac_securityAttribute_securityLevelTableEntries:
    case ApiMac_securityAttribute_autoRequestSecurityLevel:
    case ApiMac_securityAttribute_autoRequestKeyIdMode:
    case ApiMac_securityAttribute_autoRequestKeyIndex:
        /* uint16s */
    case ApiMac_securityAttribute_keyTableEntries:
    case ApiMac_securityAttribute_deviceTableEntries:
    case ApiMac_securityAttribute_panCoordShortAddress:
        /* uint32s - there are none */
        /* uint64s - there are none */

        MT_MSG_wrU16_DBG(pMsg, 0, "idx1-not-used");
        MT_MSG_wrU16_DBG(pMsg, 0, "idx2-not-used");
        break;
    default:
        // these do not apply.
        break;
    }

    /* do the transfer */
    r = MT_MSG_txrx(pMsg);

    if(r != 2)
    {
        r = ApiMac_status_badState;
        goto fail;
    }

    pSrsp = pMsg->pSrsp;

    /* read the status byte */
    r = MT_MSG_rdU8_DBG(pSrsp, "status");
    if(r != ApiMac_status_success)
    {
        goto fail;
    }

    if(wiresize < 0)
    {
        /* Negative is an array of bytes */
        /* so negate the size and call rdBuf */
        MT_MSG_rdBuf_DBG(pSrsp, pValue, -wiresize, "data-bytes");
    }
    else
    {
        switch(wiresize)
        {
        default:
            BUG_HERE("invalid wiresize: %d\n", wiresize);
            break;
        case 1:
            v = MT_MSG_rdU8_DBG(pSrsp, "pib-value8");
            break;
        case 2:
            v = MT_MSG_rdU16_DBG(pSrsp, "pib-value16");
            break;
        case 4:
            v = MT_MSG_rdU32_DBG(pSrsp, "pib-value32");
            break;
        case 8:
            v = MT_MSG_rdU64_DBG(pSrsp, "pib-value64");
            break;
        }
    }
    MT_MSG_parseComplete(pSrsp);

    if(pSrsp->is_error)
    {
        /* something is wrong */
        r = ApiMac_status_unsupportedAttribute;
        goto fail;
    }

    if(datasize < 0)
    {
        /* negative case was handled above, both wire & data size
           are either both positive, or both negative */
    }
    else
    {
        switch(datasize)
        {
        default:
            BUG_HERE("invalid data: %d\n", wiresize);
            break;
        case 1:
            (*(uint8_t *)(pValue)) = (uint8_t)(v);
            break;
        case 2:
            (*(uint16_t *)(pValue)) = (uint16_t)(v);
            break;
        case 4:
            (*(uint32_t *)(pValue)) = (uint32_t)(v);
            break;
        case 8:
            (*(uint64_t *)(pValue)) = (uint64_t)(v);
            break;
        }
    }
    r = ApiMac_status_success;
fail:
    if(pMsg)
    {
        MT_MSG_free(pMsg);
    }
    if( r != ApiMac_status_success )
    {
        //LOG_printf(LOG_ERROR, "*** ERROR ** Set/Get operation failed with status code: 0x%02x\n", r);
    }
    return (r);
}

/*!
 * @brief Internal common routine to handle all PIB set requests.
 *
 * @param cmd0 - the command 0 value to use
 * @param cmd1 - the command 1 value to use
 * @param att_id - the attribute id
 * @param wiresize - size of the value on the wire
 * @param datasize - size of the value in memory
 * @param pValue - pointer to the value
 *
 * Also see: API_MAC_Get_Common()
 */
static int API_MAC_Set_Common(int cmd0,
                              int cmd1,
                              int att_id,
                              int wiresize,
                              uint64_t v)
{
    struct mt_msg *pMsg;
    ApiMac_status_t r;
    int n_wrote;
    int len;

    if(wiresize < 0)
    {
        BUG_HERE("wrong api use\n");
    }
    /* +1 for the attribute number */
    /* +N for the wiressize */
    len = 1;
    if( att_id < 0x0100 )
    {
        /* non-frequency hopping gets filler bytes */
        len += 16;
    }
    else
    {
        /* frequency hopping *DOES*NOT* get filler bytes */
        len += 1; /* All FH attribute ids are 16bit not 8bit */
        len += wiresize;
    }
    pMsg = api_new_msg(len, cmd0, cmd1, "pib-set-common");

    if(!pMsg)
    {
        return (ApiMac_status_noResources);
    }

    n_wrote = 0;
    if(att_id > 0x100)
    {
        MT_MSG_wrU16_DBG(pMsg, att_id, "pib-id16");
        n_wrote += 2;
    }
    else
    {
        MT_MSG_wrU8_DBG(pMsg, att_id, "pib-id8");
        n_wrote += 1;
    }

    switch(wiresize)
    {
    default:
        BUG_HERE("invalid wiresize: %d\n", wiresize);
        break;
    case 1:
        MT_MSG_wrU8_DBG(pMsg , (uint8_t)(v), "pib-value8");
        n_wrote += 1;
        break;
    case 2:
        MT_MSG_wrU16_DBG(pMsg , (uint16_t)(v), "pib-value16");
        n_wrote += 2;
        break;
    case 4:
        MT_MSG_wrU32_DBG(pMsg , (uint32_t)(v), "pib-value32");
        n_wrote += 4;
        break;
    case 8:
        MT_MSG_wrU64_DBG(pMsg , (uint64_t)(v), "pib-value64");
        n_wrote += 8;
        break;
    }

    // insert filler as required.
    while( n_wrote < len ){
        MT_MSG_wrU8_DBG(pMsg, 0, "filler");
        n_wrote++;
    }

    r = (API_MAC_TxRx_Status(pMsg));
    if( r != ApiMac_status_success )
    {
        //LOG_printf(LOG_ERROR, "**ERROR** Set/Operation failed with status code: 0x%02x\n", r);
    }
    return (r);
}

/*!
 * @brief Common code to handle a PIB item Get/Set array type.
 * @param is_set - true if set operation
 * @param cmd0 - the command value
 * @param cmd1 - the command value
 * @param pib_attribute - the attribute id.
 * @param pValue - pointer to the data being transfered.
 */
static ApiMac_status_t API_MAC_SetGetArray_Common(bool is_set,
                                                  int cmd0,
                                                  int cmd1,
                                                  int pib_attribute,
                                                  uint8_t *pValue)
{
    int n;
    struct mt_msg *pMsg;
    int wiresize;
    int datasize;
    bool is_secure;
    ApiMac_status_t r;

    wiresize = 0;
    datasize = 0;

    /* Assume it is not a security releated request */
    is_secure = false;
    switch( pib_attribute )
    {
    case ApiMac_securityAttribute_autoRequestKeySource:
    case ApiMac_securityAttribute_defaultKeySource:
    case ApiMac_securityAttribute_panCoordExtendedAddress:
        is_secure = true;
        break;
    default:
        is_secure = false;
        break;
    }

    switch (pib_attribute)
    {
    default:
        break;
    case ApiMac_attribute_beaconPayload:
        wiresize = 16;
        datasize = 16;
        break;
    case ApiMac_securityAttribute_autoRequestKeySource:
    case ApiMac_securityAttribute_defaultKeySource:
    case ApiMac_securityAttribute_panCoordExtendedAddress:
    case ApiMac_attribute_coordExtendedAddress:
    case ApiMac_attribute_extendedAddress:
    case ApiMac_FHAttribute_trackParentEUI:
        wiresize = 8;
        datasize = 8;
        break;
    case ApiMac_FHAttribute_gtk0Hash:
    case ApiMac_FHAttribute_gtk1Hash:
    case ApiMac_FHAttribute_gtk2Hash:
    case ApiMac_FHAttribute_gtk3Hash:
        wiresize = APIMAC_FH_GTK_HASH_SIZE;
        datasize = APIMAC_FH_GTK_HASH_SIZE;
        break;

    case ApiMac_FHAttribute_unicastExcludedChannels:
    case ApiMac_FHAttribute_broadcastExcludedChannels:
        wiresize = APIMAC_FH_MAX_BIT_MAP_SIZE;
        break;
    case ApiMac_FHAttribute_netName:
        wiresize = APIMAC_FH_NET_NAME_SIZE_MAX;
        break;
    }

    if(wiresize == 0)
    {
        BUG_HERE("unknown attribute id: %d (0x%x)\n", pib_attribute, pib_attribute);
        return (ApiMac_status_unsupportedAttribute);
    }

    if(!is_set)
    {
        return (API_MAC_Get_Common(cmd0,
                                   cmd1,
                                   pib_attribute,
                                   -wiresize,
                                   -datasize,
                                   pValue));
    }
    /* sets are different */

    /* determine msg length */
    n = 0;
    if( pib_attribute < 0x100 )
    {
        n += 1;
    }
    else
    {
        n += 2;
    }
    if( is_secure )
    {
        n = n + 4;
    }
    n = n + wiresize;

    pMsg = api_new_msg(n, cmd0, cmd1, "pib-getset-array-common");
    if(pMsg == NULL)
    {
        return (ApiMac_status_noResources);
    }
    if(pib_attribute < 0x100)
    {
        MT_MSG_wrU8_DBG(pMsg, pib_attribute, "pib-id8");
    }
    else
    {
        MT_MSG_wrU16_DBG(pMsg, pib_attribute, "pib-id16");
    }
    if(is_secure)
    {
        MT_MSG_wrU16_DBG(pMsg, 0, "idx1-not-used");
        MT_MSG_wrU16_DBG(pMsg, 0, "idx2-not-used");
    }
    MT_MSG_wrBuf_DBG(pMsg, pValue, wiresize, "data-bytes");

    r = (API_MAC_TxRx_Status(pMsg));
    if( r != ApiMac_status_success )
    {
        //LOG_printf(LOG_ERROR, "**ERROR** Set/Operation failed with status code: 0x%02x\n", r);
    }
    return (r);
}

/*!
  This function gets an attribute value
  in the MAC PIB.

  Public function defined in api_mac.h
*/
ApiMac_status_t ApiMac_mlmeGetReqBool(ApiMac_attribute_bool_t pibAttribute,
                                      bool *pValue)
{
    return (API_MAC_Get_Common(0x022,
                               0x08,
                               pibAttribute,
                               1, sizeof(bool),
                               (void *)(pValue)));
}

/*!
  This function gets an attribute value
  in the MAC PIB.

  Public function defined in api_mac.h
*/
ApiMac_status_t ApiMac_mlmeGetReqUint8(ApiMac_attribute_uint8_t pibAttribute,
                                       uint8_t *pValue)
{
    return (API_MAC_Get_Common(0x022,
                               0x08,
                               pibAttribute,
                               1,
                               sizeof(uint8_t),
                               (void *)(pValue)));
}

/*!
  This function gets an attribute value
  in the MAC PIB.

  Public function defined in api_mac.h
*/
ApiMac_status_t ApiMac_mlmeGetReqUint16(ApiMac_attribute_uint16_t pibAttribute,
                                        uint16_t *pValue)
{
    return (API_MAC_Get_Common(0x022,
                               0x08,
                               pibAttribute,
                               2,
                               sizeof(uint16_t),
                               (void *)(pValue)));
}

/*!
  This function gets an attribute value
  in the MAC PIB.

  Public function defined in api_mac.h
*/
ApiMac_status_t ApiMac_mlmeGetReqUint32(ApiMac_attribute_uint32_t pibAttribute,
                                        uint32_t *pValue)
{
    return (API_MAC_Get_Common(0x022,
                               0x08,
                               pibAttribute,
                               4,
                               sizeof(uint32_t),
                               (void *)(pValue)));
}

/*!
  This function gets an attribute value
  in the MAC PIB.

  Public function defined in api_mac.h
*/
ApiMac_status_t ApiMac_mlmeGetReqArray(ApiMac_attribute_array_t pibAttribute,
                                       uint8_t *pValue)
{

    return (API_MAC_SetGetArray_Common(false,
                                       0x22,
                                       0x08,
                                       pibAttribute,
                                       (void *)(pValue)));
}

/*!
  This function sets an attribute value
  in the MAC PIB.

  Public function defined in api_mac.h
*/
ApiMac_status_t ApiMac_mlmeSetReqArray(ApiMac_attribute_array_t pibAttribute,
                                       uint8_t *pValue)
{

    return (API_MAC_SetGetArray_Common(true,
                                       0x22,
                                       0x09,
                                       pibAttribute,
                                       (void *)(pValue)));
}

/*!
  This function gets an attribute value
  in the MAC PIB.

  Public function defined in api_mac.h
*/
ApiMac_status_t ApiMac_mlmeGetFhReqUint16(
    ApiMac_FHAttribute_uint16_t pibAttribute,
    uint16_t *pValue)
{
    return (API_MAC_Get_Common(0x22,
                               0x42,
                               pibAttribute,
                               2,
                               sizeof(uint16_t),
                               pValue));
}

/*!
  This function gets an attribute value
  in the MAC PIB.

  Public function defined in api_mac.h
*/
ApiMac_status_t ApiMac_mlmeGetFhReqUint32(
    ApiMac_FHAttribute_uint32_t pibAttribute,
    uint32_t *pValue)
{
    return (API_MAC_Get_Common(0x22,
                               0x42,
                               pibAttribute,
                               2,
                               sizeof(uint32_t),
                               pValue));
}

ApiMac_status_t ApiMac_mlmeSetFhReqArray(
    ApiMac_FHAttribute_array_t pibAttribute, uint8_t *pValue)
{
    return (API_MAC_SetGetArray_Common(true, 0x22, 0x43, pibAttribute, pValue));
}

/*!
  This function gets an FH attribute value
  in the MAC PIB.

  Public function defined in api_mac.h
*/
ApiMac_status_t ApiMac_mlmeGetFhReqArray(
    ApiMac_FHAttribute_array_t pibAttribute, uint8_t *pValue)
{
    return (API_MAC_SetGetArray_Common(false,
                                       0x22,
                                       0x42,
                                       pibAttribute,
                                       pValue));
}

/*!
  This function gets an attribute value
  in the MAC Security PIB.

  Public function defined in api_mac.h
*/
ApiMac_status_t ApiMac_mlmeGetSecurityReqUint8(
    ApiMac_securityAttribute_uint8_t pibAttribute, uint8_t *pValue)
{
    return (API_MAC_Get_Common(0x22,
                               0x30,
                               pibAttribute,
                               1,
                               1,
                               (void *)(pValue)));
}

/*!
  This function gets an attribute value
  in the MAC Security PIB.

  Public function defined in api_mac.h
*/
ApiMac_status_t ApiMac_mlmeGetSecurityReqUint16(
    ApiMac_securityAttribute_uint16_t pibAttribute, uint16_t *pValue)
{
    return (API_MAC_Get_Common(0x22,
                               0x30,
                               pibAttribute,
                               2,
                               2,
                               (void *)(pValue)));
}

/*!
  This function gets an attribute value
  in the MAC Security PIB.

  Public function defined in api_mac.h
*/
ApiMac_status_t ApiMac_mlmeGetSecurityReqArray(
    ApiMac_securityAttribute_array_t pibAttribute, uint8_t *pValue)
{
    return (API_MAC_SetGetArray_Common(false,
                                       0x22,
                                       0x30,
                                       pibAttribute,
                                       (void *)(pValue)));
}

/*!
 * @brief Handle a pib security attribute key table request
 * @param p - security get/set operational details.
 * See common_ApiMac_mlmeGetSetSecurityReqStruct() for details
 */
static void sec_pib_ApiMac_securityAttribute_keyTable(struct secPibStruct *p)
{
    if(!(p->is_set) || (p->pValue))
    {
        /* Linux code only supports a NULL here */
        //LOG_printf(LOG_ERROR, "%s: pib: %d SET and only NULL supported\n",
        //  __FUNCTION__, p->attr);
        p->is_error = true;
        return;
    }
    MT_MSG_wrU8_DBG(p->pMsg, p->attr, "addr");
    MT_MSG_wrU16_DBG(p->pMsg, 0, "idx1"); /* index1 */
    MT_MSG_wrU16_DBG(p->pMsg, 0, "idx2"); /* index2 */

    p->n_msgs = MT_MSG_txrx(p->pMsg);
    if(p->n_msgs == 2)
    {
        p->result = MT_MSG_rdU8_DBG(p->pMsg->pSrsp, "status");
    }
}


/*!
 * @brief Handle a pib security attribute key id lookup entry request request
 * @param p - security get/set operational details.
 * See common_ApiMac_mlmeGetSetSecurityReqStruct() for details
 */
static void
sec_pib_ApiMac_securityAttribute_keyIdLookupEntry(struct secPibStruct *p)
{
    ApiMac_securityPibKeyIdLookupEntry_t *pSecPibKeyIdLookupEntry;

    pSecPibKeyIdLookupEntry =
        (ApiMac_securityPibKeyIdLookupEntry_t *)(p->pValue);

    MT_MSG_wrU8_DBG(p->pMsg,
                    p->attr, "attr");
    MT_MSG_wrU16_DBG(p->pMsg,
                    pSecPibKeyIdLookupEntry->keyIndex, "keyIndex"); /* index1 */
    MT_MSG_wrU8_DBG(p->pMsg,
                    pSecPibKeyIdLookupEntry->keyIdLookupIndex, "lookupIndex");

    if(p->is_set)
    {
        MT_MSG_wrBuf_DBG(p->pMsg,
                         pSecPibKeyIdLookupEntry->lookupEntry.lookupData,
                         sizeof(pSecPibKeyIdLookupEntry->lookupEntry.lookupData),
                         "lookupData");
        MT_MSG_wrU8_DBG(p->pMsg,
                        pSecPibKeyIdLookupEntry->lookupEntry.lookupDataSize,
                        "lookupSize");
    }

    p->n_msgs = MT_MSG_txrx(p->pMsg);
    if(p->n_msgs != 2)
    {
        return;
    }
    /* read status byte */
    p->result = MT_MSG_rdU8_DBG(p->pMsg->pSrsp, "status");
    if(p->is_set)
    {
        return;
    }

    pSecPibKeyIdLookupEntry->keyIndex =
        MT_MSG_rdU16_DBG(p->pMsg->pSrsp, "keyIndex");
    pSecPibKeyIdLookupEntry->keyIdLookupIndex =
        MT_MSG_rdU8_DBG(p->pMsg->pSrsp, "keyIdLookupIndex");

    MT_MSG_rdBuf_DBG(p->pMsg->pSrsp,
            pSecPibKeyIdLookupEntry->lookupEntry.lookupData,
            sizeof(pSecPibKeyIdLookupEntry->lookupEntry.lookupData),
                     "lookupData");
    pSecPibKeyIdLookupEntry->lookupEntry.lookupDataSize =
        MT_MSG_rdU8_DBG(p->pMsg->pSrsp, "lookupDataSize");
}

/*!
 * @brief Handle a pib security attribute key device entry request
 * @param p - security get/set operational details.
 * See common_ApiMac_mlmeGetSetSecurityReqStruct() for details
 */
static void
sec_pib_ApiMac_securityAttribute_keyDeviceEntry(struct secPibStruct *p)
{
    ApiMac_securityPibKeyDeviceEntry_t *pSecPibKeyDeviceEntry;

    pSecPibKeyDeviceEntry = (ApiMac_securityPibKeyDeviceEntry_t *)(p->pValue);

    MT_MSG_wrU8_DBG(p->pMsg,
                    p->attr,
                    "attr");
    MT_MSG_wrU16_DBG(p->pMsg,
                    pSecPibKeyDeviceEntry->keyIndex,
                    "keyIndex"); /* index1 */
    MT_MSG_wrU16_DBG(p->pMsg,
                    pSecPibKeyDeviceEntry->keyDeviceIndex,
                    "keyDeviceIndex"); /* index2 */

    if(p->is_set)
    {
        MT_MSG_wrU16_DBG(p->pMsg,
                        pSecPibKeyDeviceEntry->deviceEntry.deviceDescriptorHandle,
                        "descriptorHandle");
        MT_MSG_wrU8_DBG(p->pMsg,
                        pSecPibKeyDeviceEntry->deviceEntry.uniqueDevice,
                        "uniqueDevice");
        MT_MSG_wrU8_DBG(p->pMsg,
                        pSecPibKeyDeviceEntry->deviceEntry.blackListed,
                        "blackListed");
    }
    p->n_msgs = MT_MSG_txrx(p->pMsg);
    if(p->n_msgs != 2)
    {
        return;
    }

    p->result = MT_MSG_rdU8_DBG(p->pMsg->pSrsp, "status");
    if(p->is_set)
    {
        return;
    }

    pSecPibKeyDeviceEntry->keyIndex =
        MT_MSG_rdU16_DBG(p->pMsg->pSrsp, "idx1"); /* index1 */
    pSecPibKeyDeviceEntry->keyDeviceIndex =
        MT_MSG_rdU16_DBG(p->pMsg->pSrsp, "idx2"); /* index2 */

    pSecPibKeyDeviceEntry->deviceEntry.deviceDescriptorHandle =
        MT_MSG_rdU16_DBG(p->pMsg->pSrsp, "descriptorHandle");
    pSecPibKeyDeviceEntry->deviceEntry.uniqueDevice =
        MT_MSG_rdU8_DBG(p->pMsg->pSrsp, "uniqueDevice");
    pSecPibKeyDeviceEntry->deviceEntry.blackListed =
        MT_MSG_rdU8_DBG(p->pMsg->pSrsp, "blacklisted");
}

/*!
 * @brief handle a pib security key usage entry
 * @param p - security get/set operational details.
 * See common_ApiMac_mlmeGetSetSecurityReqStruct() for details
 */
static void
sec_pib_ApiMac_securityAttribute_keyUsageEntry(struct secPibStruct *p)
{
    ApiMac_securityPibKeyUsageEntry_t *pSecPibKeyUsageEntry;

    pSecPibKeyUsageEntry = (ApiMac_securityPibKeyUsageEntry_t *)(p->pValue);

    MT_MSG_wrU8_DBG(p->pMsg,
                    p->attr,
                    "attr");
    MT_MSG_wrU16_DBG(p->pMsg,
                    pSecPibKeyUsageEntry->keyIndex,
                    "keyIndex"); /* index1 */
    MT_MSG_wrU8_DBG(p->pMsg,
                    pSecPibKeyUsageEntry->keyUsageIndex,
                    "keyUsageIndex"); /* index2 */

    if(p->is_set)
    {
        MT_MSG_wrU8_DBG(p->pMsg,
                        pSecPibKeyUsageEntry->usageEntry.frameType,
                        "frameType");
        MT_MSG_wrU8_DBG(p->pMsg,
                        pSecPibKeyUsageEntry->usageEntry.cmdFrameId,
                        "cmdframeId");
    }

    p->n_msgs = MT_MSG_txrx(p->pMsg);
    if(p->n_msgs != 2)
    {
        return;
    }

    p->result = MT_MSG_rdU8_DBG(p->pMsg->pSrsp, "status");
    if(p->is_set)
    {
        return;
    }

    pSecPibKeyUsageEntry->keyIndex =
        MT_MSG_rdU16_DBG(p->pMsg->pSrsp,
                        "keyIndex");
    pSecPibKeyUsageEntry->keyUsageIndex =
        MT_MSG_rdU8_DBG(p->pMsg->pSrsp,
                        "keyUsageIndex");

    pSecPibKeyUsageEntry->usageEntry.frameType =
        MT_MSG_rdU8_DBG(p->pMsg->pSrsp,
                        "frameType");
    pSecPibKeyUsageEntry->usageEntry.cmdFrameId =
        MT_MSG_rdU8_DBG(p->pMsg->pSrsp,
                        "cmdframeId");
}

/*
 * @brief handle a pib key entry request.
 * @param p - security get/set operational details.
 * See common_ApiMac_mlmeGetSetSecurityReqStruct() for details
 */
static void sec_pib_ApiMac_securityAttribute_keyEntry(struct secPibStruct *p)
{
    ApiMac_securityPibKeyEntry_t *pSecPibKeyEntry;

    pSecPibKeyEntry = (ApiMac_securityPibKeyEntry_t *)(p->pValue);

    MT_MSG_wrU8_DBG(p->pMsg, p->attr, "attr");
    /* index1 */
    MT_MSG_wrU16_DBG(p->pMsg, pSecPibKeyEntry->keyIndex, "keyIndex");
    MT_MSG_wrU8_DBG(p->pMsg, 0, "notused"); /* not used */

    if(p->is_set)
    {
        MT_MSG_wrBuf_DBG(p->pMsg,
                         pSecPibKeyEntry->keyEntry,
                         sizeof(pSecPibKeyEntry->keyEntry),
                         "keyEntry");
        MT_MSG_wrU32_DBG(p->pMsg,
                         pSecPibKeyEntry->frameCounter,
                         "frameCounter");
    }

    p->n_msgs = MT_MSG_txrx(p->pMsg);
    if(p->n_msgs != 2)
    {
        return;
    }

    p->result = MT_MSG_rdU8_DBG(p->pMsg->pSrsp, "status");
    if(p->is_set)
    {
        return;
    }

    pSecPibKeyEntry->keyIndex =
        MT_MSG_rdU16_DBG(p->pMsg->pSrsp, "keyIndex"); /* index1 */
    /* toss unused byte */
    (void)MT_MSG_rdU8_DBG(p->pMsg->pSrsp, "unused");

    MT_MSG_rdBuf_DBG(p->pMsg->pSrsp,
                     pSecPibKeyEntry->keyEntry,
                     sizeof(pSecPibKeyEntry->keyEntry),
                     "keyEntry");
    pSecPibKeyEntry->frameCounter =
        MT_MSG_rdU32_DBG(p->pMsg->pSrsp,
                         "frameCounter");
}

/*!
 * @brief handle a pib security key device entry
 * @param p - security get/set operational details.
 * See common_ApiMac_mlmeGetSetSecurityReqStruct() for details
 */
static void sec_pib_ApiMac_securityAttribute_deviceEntry(struct secPibStruct *p)
{
    int x;

    ApiMac_securityPibDeviceEntry_t *pSecPibDeviceEntry;

    pSecPibDeviceEntry = (ApiMac_securityPibDeviceEntry_t *)(p->pValue);

    MT_MSG_wrU8_DBG(p->pMsg,
                    p->attr,
                    "attr");
    MT_MSG_wrU8_DBG(p->pMsg,
                    pSecPibDeviceEntry->deviceIndex,
                    "deviceIndex"); /* index1 */
    MT_MSG_wrU8_DBG(p->pMsg,
                    0,
                    "not-used"); /* not used */

    if(p->is_set)
    {
        MT_MSG_wrU16_DBG(p->pMsg,
                         pSecPibDeviceEntry->deviceEntry.devInfo.panID,
                         "panID");
        MT_MSG_wrU16_DBG(p->pMsg,
                         pSecPibDeviceEntry->deviceEntry.devInfo.shortAddress,
                         "shortAddr");
        MT_MSG_wrBuf_DBG(p->pMsg,
                         pSecPibDeviceEntry->deviceEntry.devInfo.extAddress,
                         sizeof(pSecPibDeviceEntry->deviceEntry.devInfo.extAddress),
                         "extAddr");
        MT_MSG_wrU8_DBG(p->pMsg,
                        pSecPibDeviceEntry->deviceEntry.exempt,
                        "exempt");
        for(x = 0; x < API_MAX_NODE_KEY_ENTRIES; x++)
        {
            MT_MSG_wrU32_DBG(p->pMsg,
                             pSecPibDeviceEntry->deviceEntry.frameCntr[x].frameCounter,
                             "frameCounter");
            MT_MSG_wrU16_DBG(p->pMsg,
                             pSecPibDeviceEntry->deviceEntry.frameCntr[x].keyIdx,
                             "keyIdx");
        }
    }

    p->n_msgs = MT_MSG_txrx(p->pMsg);
    if(p->n_msgs != 2)
    {
        return;
    }

    p->result = MT_MSG_rdU8_DBG(p->pMsg->pSrsp, "status");
    if(p->is_set)
    {
        return;
    }

    pSecPibDeviceEntry->deviceIndex =
        MT_MSG_rdU8_DBG(p->pMsg->pSrsp, "deviceIndex"); /* index1 */
    /* toss */
    (void)MT_MSG_rdU8_DBG(p->pMsg->pSrsp, "notused"); /* not used */

    pSecPibDeviceEntry->deviceEntry.devInfo.panID =
        MT_MSG_rdU16_DBG(p->pMsg->pSrsp, "panID");
    pSecPibDeviceEntry->deviceEntry.devInfo.shortAddress =
        MT_MSG_rdU16_DBG(p->pMsg->pSrsp, "shortAddr");
    MT_MSG_rdBuf_DBG(p->pMsg->pSrsp,
                     pSecPibDeviceEntry->deviceEntry.devInfo.extAddress,
                     sizeof(pSecPibDeviceEntry->deviceEntry.devInfo.extAddress),
                     "extAddr");

    pSecPibDeviceEntry->deviceEntry.exempt =
        MT_MSG_rdU8_DBG(p->pMsg->pSrsp, "exempt");
    for(x = 0; x < API_MAX_NODE_KEY_ENTRIES; x++)
    {
        pSecPibDeviceEntry->deviceEntry.frameCntr[x].frameCounter =
            MT_MSG_rdU32_DBG(p->pMsg->pSrsp,
                             "frameCounter");
        pSecPibDeviceEntry->deviceEntry.frameCntr[x].keyIdx =
            MT_MSG_rdU16_DBG(p->pMsg->pSrsp,
                             "keyIdx");
    }
}

/*!
 * @brief handle a pib security level entry
 * See common_ApiMac_mlmeGetSetSecurityReqStruct() for details
 * @param p - security get/set structure with operational details.
 */
static void sec_pib_ApiMac_securityAttribute_securityLevelEntry(
    struct secPibStruct *p)
{
    ApiMac_securityPibSecurityLevelEntry_t *pSecLevelEntry;

    pSecLevelEntry = (ApiMac_securityPibSecurityLevelEntry_t *)(p->pValue);

    MT_MSG_wrU8_DBG(p->pMsg,
                    p->attr, "attr");
    MT_MSG_wrU8_DBG(p->pMsg,
                    pSecLevelEntry->levelIndex,
                    "levelIndex");
    MT_MSG_wrU8_DBG(p->pMsg,
                    0,
                    "notused");
    MT_MSG_wrU16_DBG(p->pMsg,
                    0,
                    "notused");
    if(p->is_set)
    {
        MT_MSG_wrU8_DBG(p->pMsg,
                        pSecLevelEntry->levelEntry.frameType,
                        "frameType");
        MT_MSG_wrU8_DBG(p->pMsg,
                        pSecLevelEntry->levelEntry.commandFrameIdentifier,
                        "frameIdentifier");
        MT_MSG_wrU8_DBG(p->pMsg,
                        pSecLevelEntry->levelEntry.securityMinimum,
                        "securityMinimum");
        MT_MSG_wrU8_DBG(p->pMsg,
                        pSecLevelEntry->levelEntry.securityOverrideSecurityMinimum,
                        "override-security");
    }

    p->n_msgs = MT_MSG_txrx(p->pMsg);
    if(p->n_msgs != 2)
    {
        return;
    }

    p->result = MT_MSG_rdU8_DBG(p->pMsg->pSrsp, "status");

    if(p->is_set)
    {
        return;
    }

    pSecLevelEntry->levelIndex = MT_MSG_rdU8_DBG(p->pMsg->pSrsp, "level-index");
    /* toss */
    (void)MT_MSG_rdU8_DBG(p->pMsg->pSrsp, "ignore");
    (void)MT_MSG_rdU16_DBG(p->pMsg->pSrsp, "ignore");

    pSecLevelEntry->levelEntry.frameType =
        MT_MSG_rdU8_DBG(p->pMsg->pSrsp, "frameType");
    pSecLevelEntry->levelEntry.commandFrameIdentifier =
        MT_MSG_rdU8_DBG(p->pMsg->pSrsp, "frameIdentifier");
    pSecLevelEntry->levelEntry.securityMinimum =
        MT_MSG_rdU8_DBG(p->pMsg->pSrsp, "securityMinimum");
    pSecLevelEntry->levelEntry.securityOverrideSecurityMinimum =
        MT_MSG_rdU8_DBG(p->pMsg->pSrsp, "override-security");
}

/*!
 * @brief Common code to handle security pib get/set for structures.
 *  specific items are handled via the lookup table [above]
 * @param is_set - true if set operation
 * @param pibAttribute - the attribute id
 * @param pValue - pointer to the value (to save or get)
 * @returns status of the get/set request from the device.
 */
static ApiMac_status_t common_ApiMac_mlmeGetSetSecurityReqStruct(
    int is_set,
    ApiMac_securityAttribute_struct_t pibAttribute, void *pValue)
{
    int x;
    struct secPibStruct pdata;

    /* dispatch table */
    static const struct secPibHandler sec_pib_handlers[] =
        {
            { .attr = ApiMac_securityAttribute_keyTable,
              .handler = sec_pib_ApiMac_securityAttribute_keyTable
            },
            { .attr = ApiMac_securityAttribute_keyIdLookupEntry,
              .handler = sec_pib_ApiMac_securityAttribute_keyIdLookupEntry
            },
            { .attr = ApiMac_securityAttribute_keyDeviceEntry,
              .handler = sec_pib_ApiMac_securityAttribute_keyDeviceEntry
            },
            { .attr = ApiMac_securityAttribute_keyUsageEntry,
              .handler = sec_pib_ApiMac_securityAttribute_keyUsageEntry
            },
            { .attr = ApiMac_securityAttribute_keyEntry,
              .handler = sec_pib_ApiMac_securityAttribute_keyEntry
            },
            { .attr = ApiMac_securityAttribute_deviceEntry,
              .handler = sec_pib_ApiMac_securityAttribute_deviceEntry
            },
            { .attr = ApiMac_securityAttribute_securityLevelEntry,
              .handler = sec_pib_ApiMac_securityAttribute_securityLevelEntry
            },

            /* terminate */
            {.attr = 0,.handler = NULL }
        };

    memset((void *)(&pdata), 0, sizeof(pdata));
    pdata.attr = (int)(pibAttribute);
    pdata.pValue = pValue;
    pdata.is_set = is_set;
    pdata.pMsg = api_new_msg(-1,
                             0x22,
                             is_set ? 0x31 : 0x30,
                             "mlmeGetSetSecurityReqStruct");

    if(pdata.pMsg == NULL)
    {
        pdata.result = ApiMac_status_noResources;
        goto err;
    }

    /* look up in the table. */
    for(x = 0; sec_pib_handlers[x].handler; x++)
    {
        if(pdata.attr == sec_pib_handlers[x].attr)
        {
            break;
        }
    }

    /* do we have a handler? */
    if(sec_pib_handlers[x].handler == NULL)
    {
        pdata.result = ApiMac_status_unsupportedAttribute;
        BUG_HERE("unknown atribute: 0x%02x", pdata.attr);
        goto err;
    }

    /* Assume something is wrong.. */
    pdata.result = ApiMac_status_invalidParameter;
    /* call the handler */
    (*(sec_pib_handlers[x].handler))(&pdata);

    /* in all get/set cases we should  have had 2 transfers. */
    if(pdata.n_msgs != 2)
    {
        /* we had a transfer error */
        pdata.is_error = true;
        pdata.result = ApiMac_status_badState;
        goto err;
    }
    /* we should have parsed the entire srsp message */
    MT_MSG_parseComplete(pdata.pMsg->pSrsp);

    /* if we had a tx error or a rx or r-xparse error */
    /* we are done.. */
    if(pdata.pMsg->is_error || pdata.pMsg->pSrsp->is_error)
    {
        /* some message had an error */
        pdata.is_error = true;
        pdata.result = ApiMac_status_badState;
    }

err:
    if(pdata.pMsg)
    {
        MT_MSG_free(pdata.pMsg);
        pdata.pMsg = NULL;
    }
    /* otherwise we return the status */
    if( pdata.result != ApiMac_status_success )
    {
        //LOG_printf(LOG_ERROR, "**ERROR** Set request failed code: 0x%02x\n", pdata.result);
    }
    return (pdata.result);
}

/*!
  This function gets an attribute value
  in the MAC Security PIB.

  Public function defined in api_mac.h
*/
ApiMac_status_t ApiMac_mlmeGetSecurityReqStruct(
    ApiMac_securityAttribute_struct_t pibAttribute, void *pValue)
{
    return (common_ApiMac_mlmeGetSetSecurityReqStruct(false,
                                                      pibAttribute,
                                                      pValue));
}

/*!
  This function gets an attribute value
  in the MAC PIB.

  Public function defined in api_mac.h
*/
ApiMac_status_t ApiMac_mlmeSetReqBool(ApiMac_attribute_bool_t pibAttribute,
                                      bool value)
{
    return (API_MAC_Set_Common(0x22, 0x09, pibAttribute, 1, value));
}

/*!
  This function gets an attribute value
  in the MAC PIB.

  Public function defined in api_mac.h
*/
ApiMac_status_t ApiMac_mlmeSetReqUint8(ApiMac_attribute_uint8_t pibAttribute,
                                       uint8_t value)
{
    return (API_MAC_Set_Common(0x22, 0x09, pibAttribute, 1, value));
}

/*!
  This function gets an attribute value
  in the MAC PIB.

  Public function defined in api_mac.h
*/
ApiMac_status_t ApiMac_mlmeSetReqUint16(
    ApiMac_attribute_uint16_t pibAttribute,
    uint16_t value)
{
    return (API_MAC_Set_Common(0x22, 0x09, pibAttribute, 2, value));
}

/*!
  This function gets an attribute value
  in the MAC PIB.

  Public function defined in api_mac.h
*/
ApiMac_status_t ApiMac_mlmeSetReqUint32(
    ApiMac_attribute_uint32_t pibAttribute,
    uint32_t value)
{
    return (API_MAC_Set_Common(0x22, 0x09, pibAttribute, 4, value));
}

static ApiMac_status_t API_MAC_SetSecurity_Common( int cmd0,
    int cmd1,
    int att_id,
    int wiresize,
    uint64_t value )
{
    struct mt_msg *pMsg;
    struct mt_msg *pSrsp;
    int l;
    int r;

    pMsg = api_new_msg(-1, cmd0, cmd1, "pib-getset-secure");
    if(!pMsg)
    {
        return (ApiMac_status_noResources);
    }

    /* some attributes are 16bit numbers */
    if(att_id > 0x100)
    {
        l = 2;
    }
    else
    {
        l = 1;
    }

    if(l == 1)
    {
        MT_MSG_wrU8_DBG(pMsg, att_id, "pib-id8");
    }
    else
    {
        MT_MSG_wrU16_DBG(pMsg, att_id, "pib-id16");
    }
    MT_MSG_wrU16_DBG(pMsg, 0, "idx1-not-used");
    MT_MSG_wrU16_DBG(pMsg, 0, "idx2-not-used");
    switch (wiresize) {
    case 1:
        MT_MSG_wrU8_DBG(pMsg, (uint8_t)value, "value8");
        break;
    case 2:
        MT_MSG_wrU16_DBG(pMsg, (uint16_t)value, "value16");
        break;
    case 4:
        MT_MSG_wrU32_DBG(pMsg, (uint32_t)value, "value32");
        break;
    case 8:
        MT_MSG_wrU64_DBG(pMsg, value, "value64");
        break;
    }
    /* do the transfer */
    r = MT_MSG_txrx(pMsg);

    /* Did we transfer 2 messages? */
    if(r != 2)
    {
        r = ApiMac_status_badState;
        goto fail;
    }

    pSrsp = pMsg->pSrsp;

    /* read the status byte */
    r = MT_MSG_rdU8_DBG(pSrsp, "status");
    MT_MSG_parseComplete(pSrsp);
    if(pMsg->is_error || pSrsp->is_error)
    {
        r = ApiMac_status_badState;
    }
    else
    {
        r = ApiMac_status_success;
    }
fail:
    if(pMsg)
    {
        MT_MSG_free(pMsg);
    }
    if( r != ApiMac_status_success )
    {
        //LOG_printf(LOG_ERROR, "**ERROR** Set/Operation failed with status code: 0x%02x\n", r);
    }
    return (r);
}

/*!
  This function sets an attribute value
  in the MAC Security PIB.

  Public function defined in api_mac.h
*/
ApiMac_status_t ApiMac_mlmeSetSecurityReqUint8(
    ApiMac_securityAttribute_uint8_t pibAttribute,
    uint8_t value)
{
    return (API_MAC_SetSecurity_Common(0x22, 0x31, pibAttribute, 1, value));
}

/*!
  This function sets an attribute value
  in the MAC Security PIB.

  Public function defined in api_mac.h
*/
ApiMac_status_t ApiMac_mlmeSetSecurityReqUint16(
    ApiMac_securityAttribute_uint16_t pibAttribute,
    uint16_t value)
{
    return (API_MAC_SetSecurity_Common(0x22, 0x31, pibAttribute, 2, value));
}


/*!
  This function sets an attribute value
  in the MAC Security PIB.

  Public function defined in api_mac.h
*/
ApiMac_status_t ApiMac_mlmeSetSecurityReqArray(
    ApiMac_securityAttribute_array_t pibAttribute, uint8_t *pValue)
{
    return (API_MAC_SetGetArray_Common(true,
                                       0x22,
                                       0x31,
                                       pibAttribute,
                                       (void *)(pValue)));
}

/*!
  This function sets an attribute value
  in the MAC Security PIB.

  Public function defined in api_mac.h
*/
ApiMac_status_t ApiMac_mlmeSetSecurityReqStruct(
    ApiMac_securityAttribute_struct_t pibAttribute, void *pValue)
{
    return (common_ApiMac_mlmeGetSetSecurityReqStruct(true,
                                                      pibAttribute,
                                                      pValue));
}

/*!
  @brief Sets a parameter in the FH PIB

  Public function defined in api_mac.h
*/
ApiMac_status_t ApiMac_mlmeSetFhReqUint8(
    ApiMac_FHAttribute_uint8_t pibAttribute, uint8_t value)
{
    return (API_MAC_Set_Common(0x22, 0x43, pibAttribute, 1, value));
}

/*!
  Sets a parameter in the FH PIB

  Public function defined in api_mac.h
*/
ApiMac_status_t ApiMac_mlmeGetFhReqUint8(
    ApiMac_FHAttribute_uint8_t pibAttribute, uint8_t *pValue)
{
    return (API_MAC_Get_Common(0x22,
                               0x42,
                               pibAttribute,
                               1,
                               sizeof(uint8_t),
                               (void *)pValue));
}

/*!
  Sets a parameter in the FH PIB

  Public function defined in api_mac.h
*/
ApiMac_status_t ApiMac_mlmeSetFhReqUint16(
    ApiMac_FHAttribute_uint16_t pibAttribute,
    uint16_t value)
{
    return (API_MAC_Set_Common(0x22, 0x43, pibAttribute, 2, value));
}

/*!
  Sets a parameter in the FH PIB

  Public function defined in api_mac.h
*/
ApiMac_status_t ApiMac_mlmeSetFhReqUint32(
    ApiMac_FHAttribute_uint32_t pibAttribute,
    uint32_t value)
{
    return (API_MAC_Set_Common(0x22, 0x43, pibAttribute, 4, value));
}

/*!
  This function is called in response to an orphan notification
  from a peer device.

  Public function defined in api_mac.h
*/
ApiMac_status_t ApiMac_mlmeOrphanRsp(ApiMac_mlmeOrphanRsp_t *pData)
{
    struct mt_msg *pMsg;

    pMsg = api_new_msg(0x16, 0x22, 0x51, "mlmeOrphanRsp");
    if(!pMsg)
    {
        return (ApiMac_status_noResources);
    }

    MT_MSG_wrBuf_DBG(pMsg,
                  (void *)(&pData->orphanAddress[0]),
                  APIMAC_SADDR_EXT_LEN, "ext-addr");
    MT_MSG_wrU16_DBG(pMsg, pData->shortAddress, "shortAddr");
    MT_MSG_wrU8_DBG(pMsg, pData->associatedMember, "assocatedMember");
    encode_Sec(pMsg, &(pData->sec));

    return (API_MAC_TxRx_Status(pMsg));
}

/*!
  This function is used to request pending data from the coordinator.

  Public function defined in api_mac.h
*/
ApiMac_status_t ApiMac_mlmePollReq(ApiMac_mlmePollReq_t *pData)
{
    struct mt_msg *pMsg;

    pMsg = api_new_msg(0x16, 0x22, 0x0d, "mlmePollReq");
    if(pMsg == NULL)
    {
        return (ApiMac_status_noResources);
    }
    encode_Addr(pMsg, &(pData->coordAddress));
    MT_MSG_wrU16_DBG(pMsg, pData->coordPanId, "panID");
    encode_Sec(pMsg, &(pData->sec));

    return (API_MAC_TxRx_Status(pMsg));
}

/*!
  This function must be called once at system startup before any other
  function in the management API is called.

  Public function defined in api_mac.h
*/
ApiMac_status_t ApiMac_mlmeResetReq(bool setDefaultPib)
{
    struct mt_msg *pMsg;

    pMsg = api_new_msg(0x01, 0x22, 0x01, "mlmeResetReq");
    if(pMsg == NULL)
    {
        return (ApiMac_status_noResources);
    }
    MT_MSG_wrU8_DBG(pMsg, setDefaultPib, "resetParam");

    return (API_MAC_TxRx_Status(pMsg));
}

/*!
  This function initiates an energy detect, active, passive, or
  orphan scan on one or more channels.

  Public function defined in api_mac.h
*/
ApiMac_status_t ApiMac_mlmeScanReq(ApiMac_mlmeScanReq_t *pData)
{
    struct mt_msg *pMsg;

    pMsg = api_new_msg(23+17, 0x22, 0x0c, "mlmeScanReq");
    if(!pMsg)
    {
        return (ApiMac_status_noResources);
    }

    MT_MSG_wrU8_DBG(pMsg, pData->scanType     , "scanType");
    MT_MSG_wrU8_DBG(pMsg, pData->scanDuration , "scanDuration");
    MT_MSG_wrU8_DBG(pMsg, pData->channelPage  , "channelPage");
    MT_MSG_wrU8_DBG(pMsg, pData->phyID        , "phyID");
    MT_MSG_wrU8_DBG(pMsg, pData->maxResults   , "maxResults");
    MT_MSG_wrU8_DBG(pMsg, pData->permitJoining, "permitJoining");
    MT_MSG_wrU8_DBG(pMsg, pData->linkQuality  , "linkQuality");
    MT_MSG_wrU8_DBG(pMsg, pData->percentFilter, "percentFilter");
    MT_MSG_wrU8_DBG(pMsg, pData->MPMScan      , "MPMScan");
    MT_MSG_wrU8_DBG(pMsg, pData->MPMScanType  , "MPMScantype");
    MT_MSG_wrU16_DBG(pMsg, pData->MPMScanDuration, "MPMScanDuration");
    encode_Sec(pMsg, &(pData->sec));

    MT_MSG_wrBuf_DBG(pMsg, pData->scanChannels, sizeof(pData->scanChannels), "scanChannels");

    return (API_MAC_TxRx_Status(pMsg));
}

/*!
  This function is called by a coordinator or PAN coordinator
  to start or reconfigure a network.

  Public function defined in api_mac.h
*/
ApiMac_status_t ApiMac_mlmeStartReq(ApiMac_mlmeStartReq_t *pData)
{
    struct mt_msg *pMsg;

    pMsg = api_new_msg(0x2a + pData->mpmParams.numIEs, 0x22, 0x03, "mlmeStartReq");
    if(pMsg == NULL)
    {
        return (ApiMac_status_noResources);
    }

    MT_MSG_wrU32_DBG(pMsg, pData->startTime, "startTime");
    MT_MSG_wrU16_DBG(pMsg, pData->panId, "panId");
    MT_MSG_wrU8_DBG(pMsg, pData->logicalChannel, "logicalChannel");
    MT_MSG_wrU8_DBG(pMsg, pData->channelPage, "channelPage");
    MT_MSG_wrU8_DBG(pMsg, pData->phyID, "phyID");
    MT_MSG_wrU8_DBG(pMsg, pData->beaconOrder, "beaconOrder");
    MT_MSG_wrU8_DBG(pMsg, pData->superframeOrder, "superframeOrder");
    MT_MSG_wrU8_DBG(pMsg, pData->panCoordinator, "panCoordinator");
    MT_MSG_wrU8_DBG(pMsg, pData->batteryLifeExt, "batteryLifeExt");
    MT_MSG_wrU8_DBG(pMsg, pData->coordRealignment , "coordRealignment");
    encode_Sec(pMsg, &(pData->realignSec));
    encode_Sec(pMsg, &(pData->beaconSec));
    MT_MSG_wrU8_DBG(pMsg, pData->startFH, "startFH");
    MT_MSG_wrU8_DBG(pMsg, pData->mpmParams.eBeaconOrder, "eBeaconOrder");
    MT_MSG_wrU8_DBG(pMsg, pData->mpmParams.offsetTimeSlot, "offsetTimeSlot");
    MT_MSG_wrU16_DBG(pMsg, pData->mpmParams.NBPANEBeaconOrder, "NBPANEBeaconOrder");
    MT_MSG_wrU8_DBG(pMsg, pData->mpmParams.numIEs, "numIEs");
    MT_MSG_wrBuf_DBG(pMsg, pData->mpmParams.pIEIDs, pData->mpmParams.numIEs, "ieids");

    return (API_MAC_TxRx_Status(pMsg));
}

/*!
  This function requests the MAC to synchronize with the
  coordinator by acquiring and optionally tracking its beacons.

  Public function defined in api_mac.h
*/
ApiMac_status_t ApiMac_mlmeSyncReq(ApiMac_mlmeSyncReq_t *pData)
{
    struct mt_msg *pMsg;

    pMsg = api_new_msg(0x04, 0x22, 0x04, "mlmeSyncReq");
    if(pMsg == NULL)
    {
        return (ApiMac_status_noResources);
    }

    MT_MSG_wrU8_DBG(pMsg, pData->logicalChannel, "logicalChannel");
    MT_MSG_wrU8_DBG(pMsg, pData->channelPage, "channelPage");
    MT_MSG_wrU8_DBG(pMsg, pData->trackBeacon, "trackBeacon");
    MT_MSG_wrU8_DBG(pMsg, pData->phyID, "phyID");

    return (API_MAC_TxRx_Status(pMsg));
}

/*!
  This function returns a random byte from the (internal) random number
  generator.

  Public function defined in api_mac.h
*/
uint8_t ApiMac_randomByte(void)
{
    return (RAND_DATA_nextByte(&rand_data_source));
}

/*!
  Update Device Table entry and PIB with new Pan Id.

  Public function defined in api_mac.h
*/
ApiMac_status_t ApiMac_updatePanId(uint16_t panId)
{
    struct mt_msg *pMsg;

    pMsg = api_new_msg(0x02, 0x22, 0x32, "updatePanId");
    if(pMsg == NULL)
    {
        return (ApiMac_status_noResources);
    }

    MT_MSG_wrU16_DBG(pMsg, panId, "panID");

    return (API_MAC_TxRx_Status(pMsg));
}

/*!
 Enable source match for auto ack and pending.

 Public function defined in api_mac.h
 */
ApiMac_status_t ApiMac_srcMatchEnable(void)
{
    struct mt_msg *pMsg;

    pMsg = api_new_msg(0, 0x22, 0x39, "srcMatchEnable");
    if(pMsg == NULL)
    {
        return (ApiMac_status_noResources);
    }
    return (API_MAC_TxRx_Status(pMsg));
}

/*!
  This functions handles the WiSUN async request.

  Public function defined in api_mac.h
*/
ApiMac_status_t ApiMac_mlmeWSAsyncReq(ApiMac_mlmeWSAsyncReq_t* pData)
{
    struct mt_msg *pMsg;

    pMsg = api_new_msg(13+17, 0x22, 0x44, "mlmeWSAsyncReq");
    if(pMsg == NULL)
    {
        return (ApiMac_status_noResources);
    }

    MT_MSG_wrU8_DBG(pMsg, pData->operation, "operation" );
    MT_MSG_wrU8_DBG(pMsg, pData->frameType, "frame-type");
    encode_Sec(pMsg, &(pData->sec));
    MT_MSG_wrBuf_DBG(pMsg,
                 (void *)(&(pData->channels[0])),
                 APIMAC_154G_CHANNEL_BITMAP_SIZ, "chnl-bitmap");

    return (API_MAC_TxRx_Status(pMsg));
}

/*!
  This function starts frequency hopping.

  Public function defined in api_mac.h
*/
ApiMac_status_t ApiMac_startFH(void)
{
    struct mt_msg *pMsg;

    pMsg = api_new_msg(0, 0x22, 0x41, "startFH");
    if(pMsg == NULL)
    {
        return (ApiMac_status_noResources);
    }
    return (API_MAC_TxRx_Status(pMsg));
}

/*!
 * @brief Common function to parse the payload information element.
 *
 * @param pPayload - pointer to the buffer with the payload IEs.
 * @param payloadLen - length of the buffer with the payload IEs.
 * @param pList - pointer to point of place to allocated the link list.
 * @param group - true to check for termination IE.
 *
 * @return      ApiMac_status_t
 */
static ApiMac_status_t parsePayloadIEs(uint8_t *pContent, uint16_t contentLen,
                                       ApiMac_payloadIeRec_t **pList,
                                       bool group)
{
    ApiMac_payloadIeRec_t* pIe = (ApiMac_payloadIeRec_t*) NULL;
    ApiMac_payloadIeRec_t* pTempIe;
    uint16_t lenContent = 0;
    ApiMac_status_t status = ApiMac_status_success;

    if((pContent == NULL) || (contentLen == 0))
    {
        return (ApiMac_status_noData);
    }

    /* Initialize the list pointer */
    *pList = (ApiMac_payloadIeRec_t*) NULL;

    while(lenContent < contentLen)
    {
        uint16_t hdr;
        bool typeLong;
        uint8_t ieId;

        hdr = MAKE_UINT16(pContent[0], pContent[1]);
        pContent += PAYLOAD_IE_HEADER_LEN; /* Move past the header */

        typeLong = GET_SUBIE_TYPE(hdr);
        if(typeLong)
        {
            ieId = GET_SUBIE_ID_LONG(hdr);
        }
        else
        {
            ieId = GET_SUBIE_ID_SHORT(hdr);
        }

        if(group)
        {
            if(!typeLong)
            {
                /* Only long IE types when parsing Group IEs */
                status = ApiMac_status_unsupported;
                break;
            }

            if(ApiMac_payloadIEGroup_term == ieId)
            {
                /* Termination IE found */
                break;
            }
        }

        pTempIe = (ApiMac_payloadIeRec_t *)malloc(
            sizeof(ApiMac_payloadIeRec_t));

        if(pTempIe)
        {
            memset(pTempIe, 0, sizeof(ApiMac_payloadIeRec_t));

            /* If nothing in the list, add the node first otherwise
               add it to the end of the list */
            if(*pList == NULL)
            {
                *pList = pTempIe;
            }
            else
            {
                /* pIe should point to the previous node,
                   since it was allocated in the previous iteration */
                pIe->pNext = pTempIe;
            }

            pIe = pTempIe;
            pTempIe = NULL;

            /* Fill in the IE information */
            pIe->item.ieTypeLong = typeLong;
            pIe->item.ieId = ieId;

            if(pIe->item.ieTypeLong)
            {
                pIe->item.ieContentLen = GET_SUBIE_LEN_LONG(hdr);
            }
            else
            {
                pIe->item.ieContentLen = GET_SUBIE_LEN_SHORT(hdr);
            }
            pIe->item.pIEContent = pContent;

            /* Update length and pointer */
            lenContent += PAYLOAD_IE_HEADER_LEN + pIe->item.ieContentLen;
            pContent += pIe->item.ieContentLen;
        }
        else
        {
            status = ApiMac_status_noResources;
            break;
        }
    }

    if((status != ApiMac_status_success) && (NULL != *pList))
    {
        /* not successful in parsing all header ie's, free the linked list */
        pIe = *pList;
        while(NULL != pIe)
        {
            pTempIe = pIe->pNext;
            api_mac_freeMem((void *)pIe);
            pIe = pTempIe;
        }
        *pList = NULL;
    }

    return (status);
}

/*!
  Parses the payload information elements.

  Public function defined in api_mac.h
*/
ApiMac_status_t ApiMac_parsePayloadGroupIEs(
    uint8_t *pPayload, uint16_t payloadLen,
    ApiMac_payloadIeRec_t **pList)
{
    return (parsePayloadIEs(pPayload, payloadLen, pList, true));
}

/*!
  Parses the payload Sub Information Elements.

  Public function defined in api_mac.h
*/
extern ApiMac_status_t ApiMac_parsePayloadSubIEs(
    uint8_t *pContent,
    uint16_t contentLen,
    ApiMac_payloadIeRec_t **pList)
{
    return (parsePayloadIEs(pContent, contentLen, pList, false));
}

/*!
  Free memory allocated by ApiMac.

  Public function defined in api_mac.h
*/
void ApiMac_freeIEList(ApiMac_payloadIeRec_t *pList)
{
    /* Loop through the list */
    while(pList)
    {
        ApiMac_payloadIeRec_t *pTmp = pList;

        /* Move to the next item in the list */
        pList = pTmp->pNext;

        /* free the current item */
        api_mac_freeMem((void *)pTmp);
    }
}

/*!
  Enables the Frequency hopping operation.

  Public function defined in api_mac.h
*/
ApiMac_status_t ApiMac_enableFH(void)
{
    struct mt_msg *pMsg;

    pMsg = api_new_msg(0, 0x22, 0x40, "enableFH");
    if(pMsg == NULL)
    {
        return (ApiMac_status_noResources);
    }
    return (API_MAC_TxRx_Status(pMsg));
}

/*!
  Sends the association response to the device

  Public function defined in api_mac.h
*/
ApiMac_status_t ApiMac_mlmeAssociateRsp(ApiMac_mlmeAssociateRsp_t *pData)
{
    struct mt_msg *pMsg;

    pMsg = api_new_msg(0x16, 0x22, 0x50, "mlmeAssociateRsp");
    if(pMsg == NULL)
    {
        return (ApiMac_status_noResources);
    }

    MT_MSG_wrBuf_DBG(pMsg, &(pData->deviceAddress[0]),
                      APIMAC_SADDR_EXT_LEN,
                      "deviceAddr");
    MT_MSG_wrU16_DBG(pMsg,
                      pData->assocShortAddress,
                      "shortAddr");
    MT_MSG_wrU8_DBG(pMsg,
                      pData->status,
                      "status");

    encode_Sec(pMsg, &(pData->sec));

    return (API_MAC_TxRx_Status(pMsg));
}

/*!
  Convert ApiMac_capabilityInfo_t data type to uint8_t capInfo

  Public function defined in api_mac.h
*/
uint8_t ApiMac_convertCapabilityInfo(ApiMac_capabilityInfo_t *pMsgcapInfo)
{
    uint8_t capInfo = 0;

    if(pMsgcapInfo->panCoord)
    {
        capInfo |= CAPABLE_PAN_COORD;
    }

    if(pMsgcapInfo->ffd)
    {
        capInfo |= CAPABLE_FFD;
    }

    if(pMsgcapInfo->mainsPower)
    {
        capInfo |= CAPABLE_MAINS_POWER;
    }

    if(pMsgcapInfo->rxOnWhenIdle)
    {
        capInfo |= CAPABLE_RX_ON_IDLE;
    }

    if(pMsgcapInfo->security)
    {
        capInfo |= CAPABLE_SECURITY;
    }

    if(pMsgcapInfo->allocAddr)
    {
        capInfo |= CAPABLE_ALLOC_ADDR;
    }

    return (capInfo);
}

/*!
  Convert from bitmask byte to API MAC capInfo

  Public function defined in api_mac.h
*/
void ApiMac_buildMsgCapInfo(uint8_t cInfo, ApiMac_capabilityInfo_t *pPBcapInfo)
{
    if(cInfo & CAPABLE_PAN_COORD)
    {
        pPBcapInfo->panCoord = 1;
    }

    if(cInfo & CAPABLE_FFD)
    {
        pPBcapInfo->ffd = 1;
    }

    if(cInfo & CAPABLE_MAINS_POWER)
    {
        pPBcapInfo->mainsPower = 1;
    }

    if(cInfo & CAPABLE_RX_ON_IDLE)
    {
        pPBcapInfo->rxOnWhenIdle = 1;
    }

    if(cInfo & CAPABLE_SECURITY)
    {
        pPBcapInfo->security = 1;
    }

    if(cInfo & CAPABLE_ALLOC_ADDR)
    {
        pPBcapInfo->allocAddr = 1;
    }
}

/*!
  Adds a new MAC device table entry.

  Public function defined in api_mac.h
*/
ApiMac_status_t ApiMac_secAddDevice(ApiMac_secAddDevice_t *pAddDev)
{
    struct mt_msg *pMsg;

    pMsg = api_new_msg(0x1d, 0x22, 0x33, "secAddDevice");
    if(pMsg == NULL)
    {
        return (ApiMac_status_noResources);
    }

    MT_MSG_wrU16_DBG(pMsg,
                      pAddDev->panID ,
                      "panId");
    MT_MSG_wrU16_DBG(pMsg,
                      pAddDev->shortAddr ,
                      "shortAddr");
    MT_MSG_wrBuf_DBG(pMsg,
                      pAddDev->extAddr, APIMAC_SADDR_EXT_LEN,
                      "extAddr");
    MT_MSG_wrU32_DBG(pMsg,
                      pAddDev->frameCounter,
                      "frameCounter");
    MT_MSG_wrU8_DBG(pMsg,
                      pAddDev->exempt,
                      "exempt");
    MT_MSG_wrU8_DBG(pMsg,
                      pAddDev->uniqueDevice,
                      "uniqueDevice");
    MT_MSG_wrU8_DBG(pMsg,
                      pAddDev->duplicateDevFlag,
                      "duplicateDevFlag");
    MT_MSG_wrU8_DBG(pMsg,
                      pAddDev->keyIdLookupDataSize,
                      "lookupSize");
    MT_MSG_wrBuf_DBG(pMsg,
                     pAddDev->keyIdLookupData, APIMAC_MAX_KEY_LOOKUP_LEN,
                     "lookupData");

    return (API_MAC_TxRx_Status(pMsg));
}

/*!
  Removes MAC device table entries.

  Public function defined in api_mac.h
*/
ApiMac_status_t ApiMac_secDeleteDevice(ApiMac_sAddrExt_t *pExtAddr)
{
    struct mt_msg *pMsg;

    pMsg = api_new_msg(0x08, 0x22, 0x34, "secDeleteDevice");
    if(pMsg == NULL)
    {
        return (ApiMac_status_noResources);
    }

    MT_MSG_wrBuf_DBG(pMsg, pExtAddr, APIMAC_SADDR_EXT_LEN, "extAddr");

    return (API_MAC_TxRx_Status(pMsg));
}

/*!
  Removes the key at the specified key Index and removes all MAC device table
  enteries associated with this key.

  Public function defined in api_mac.h
*/
ApiMac_status_t ApiMac_secDeleteKeyAndAssocDevices(uint8_t keyIndex)
{
    struct mt_msg *pMsg;

    pMsg = api_new_msg(0x01, 0x022, 0x36, "secDeleteKeyAndAssocDevices");
    if(pMsg == NULL)
    {
        return (ApiMac_status_noResources);
    }

    MT_MSG_wrU8_DBG(pMsg, keyIndex, "keyIndex");

    return (API_MAC_TxRx_Status(pMsg));
}

/*!
  Removes all MAC device table entries

  Public function defined in api_mac.h
*/
ApiMac_status_t ApiMac_secDeleteAllDevices(void)
{
    struct mt_msg *pMsg;

    pMsg = api_new_msg(0, 0x22, 0x35, "secDeleteAllDevices");
    if(pMsg == NULL)
    {
        return (ApiMac_status_noResources);
    }

    return (API_MAC_TxRx_Status(pMsg));
}

/*!
  Reads the frame counter value associated with a MAC security key indexed
  by the designated key identifier and the default key source

  Public function defined in api_mac.h
*/
ApiMac_status_t ApiMac_secGetDefaultSourceKey(uint8_t keyId,
                                              uint32_t *pFrameCounter)
{
    struct mt_msg *pMsg;
    int r;

    pMsg = api_new_msg(1, 0x22, 0x37, "secGetDefaultSourceKey");
    if(pMsg == NULL)
    {
        return (ApiMac_status_noResources);
    }

    MT_MSG_wrU8_DBG(pMsg, keyId, "key-id");

    r = MT_MSG_txrx(pMsg);
    if(r != 2)
    {
        r = ApiMac_status_badState;
        goto fail;
    }
    /* read the response */
    r = MT_MSG_rdU8_DBG(pMsg->pSrsp, "response");
    *pFrameCounter = MT_MSG_rdU32_DBG(pMsg->pSrsp, "framecounter");
    MT_MSG_parseComplete(pMsg->pSrsp);
    if(pMsg->is_error || pMsg->pSrsp->is_error)
    {
        r = ApiMac_status_invalidParameter;
    }
fail:
    MT_MSG_free(pMsg);
    return (r);
}

/*!
  Adds the MAC security key, adds the associated lookup list for the key,
  initializes the frame counter to the value provided

  Public function defined in api_mac.h
*/
ApiMac_status_t ApiMac_secAddKeyInitFrameCounter(
    ApiMac_secAddKeyInitFrameCounter_t *pInfo)
{
    struct mt_msg *pMsg;

    pMsg = api_new_msg(0x21, 0x22, 0x38, "secAddKeyInitFrameCounter");
    if(pMsg == NULL)
    {
        return (ApiMac_status_noResources);
    }

    MT_MSG_wrU8_DBG(pMsg,
                     pInfo->newKeyFlag ,
                     "newKeyFlag");
    MT_MSG_wrU16_DBG(pMsg,
                     pInfo->replaceKeyIndex,
                     "replaceKeyIndex");
    MT_MSG_wrBuf_DBG(pMsg,
                      pInfo->key,
                      sizeof(pInfo->key),
                      "key");
    MT_MSG_wrU32_DBG(pMsg,
                      pInfo->frameCounter,
                      "frameCounter");
    MT_MSG_wrU8_DBG(pMsg,
                      pInfo->lookupDataSize,
                      "lookupSize");
    MT_MSG_wrBuf_DBG(pMsg,
                      pInfo->lookupData,
                      sizeof(pInfo->lookupData) ,
                      "lookupData");

    return (API_MAC_TxRx_Status(pMsg));
}

/*
 *  ========================================
 *  Texas Instruments Micro Controller Style
 *  ========================================
 *  Local Variables:
 *  mode: c
 *  c-file-style: "bsd"
 *  tab-width: 4
 *  c-basic-offset: 4
 *  indent-tabs-mode: nil
 *  End:
 *  vim:set  filetype=c tabstop=4 shiftwidth=4 expandtab=true
 */
