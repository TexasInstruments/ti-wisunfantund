/******************************************************************************
 @file mt_msg.h

 @brief TIMAC 2.0 API mt msg layer, linux implementation

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

/*!
 * @mainpage MT_MSG
 *
 * Overview
 * ========
 * This document describes the interface to the MT protocol layer.
 *
 * The API_MAC layer calls the MT_MSG layer, which in turn
 * transmits bytes over either a serial port, or a TCP/IP stream socket.
 *
 * The protocol is quite simple, and has a few geometry parameters.
 *
 * On the wire, the message consists of:
 *
 *  - An optional frame sync byte 0xfe
 *  - Either a 1 or 2 byte (lsb first) payload length (LEN)
 *  - A command 0 byte
 *  - A command 1 byte
 *  - Zero to LEN bytes of payload
 *  - An optional XOR Checkvalue.
 *
 * The optional components are specified in the mt_msg_interface structure.
 *
 * General Flow
 * ============
 *
 *  - Call MT_MSG_init()
 *  - For each interface ...
 *     - fill in the mt_msg_interface structure
 *     - Selecting options, ie: 1 or 2byte length.
 *     - Various timeout lengths, etc
 *     - [NOTE: See the function MT_MSG_INI_settings()]
 *     - Call MT_MSG_interfaceCreate()
 *  - The message interface is ready.
 *  - Your application can call MT_MSG_LIST_remove() to get the next message
 *
 *  - To send a message, do the following
 *     - Call MT_MSG_alloc()
 *     - Supply payload values to the message via MT_MSG_wrU8() and friends.
 *     - Set the pMsg->pTo interface pointer.
 *     - To send an asyncronous message call MT_MSG_tx()
 *     - To send a command/response message call MT_MSG_txrx()
 *         - The response can be found at pMsg->pSrsp;
 *     - Call MT_MSG_free() to release the message.
 *   - Eventually you can call MT_MSG_interfaceDestroy()
 * See the api_mac.c implementation file for numerous examples.
 */

#if !defined(MT_MSG_H)
#define MT_MSG_H

#include "bitsnbits.h"
#include <stdint.h>
#include <stddef.h>
#include <stdbool.h>

/* forward declarations */
struct mt_msg;
struct mt_msg_list;
struct ini_parser;

/*
 * @brief Fragmentation, and Extended status values
 */

#define MT_MSG_FRAG_STATUS_success             0
#define MT_MSG_FRAG_STATUS_resend_last         1
#define MT_MSG_FRAG_STATUS_unsupported_stackid 2
#define MT_MSG_FRAG_STATUS_block_out_of_order  3
#define MT_MSG_FRAG_STATUS_block_len_changed   4
#define MT_MSG_FRAG_STATUS_mem_alloc_error     5 /* malloc failed */
#define MT_MSG_FRAG_STATUS_frag_complete       6

#define MT_MSG_EXT_STATUS_mem_alloc_error      5 /* same as non-exted */
#define MT_MSG_EXT_STATUS_frag_complete        6
#define MT_MSG_EXT_STATUS_frag_aborted         7
#define MT_MSG_EXT_STATUS_unsupported_ack      8

/*
 * @brief MT SYS interface command values
 */
#define SYS_RESET_REQ_cmd0          0x41
#define SYS_RESET_REQ_cmd1          0x00

#define SYS_RESET_IND_cmd0          0x41
#define SYS_RESET_IND_cmd1          0x80

#define MT_UTIL_GET_EXT_ADDR_cmd0   0x27
#define MT_UTIL_GET_EXT_ADDR_cmd1   0xee

#define SYS_VERSION_REQ_cmd0        0x21
#define SYS_VERSION_REQ_cmd1        0x02

#define MT_UTIL_LOOPBACK_cmd0       0x27
#define MT_UTIL_LOOPBACK_cmd1       0x10

/*
 * @def LOG_DBG_MT_MSG_traffic - Log debug messages associated with messages
 */
#define LOG_DBG_MT_MSG_traffic  _bitN(LOG_DBG_MT_bitnum_first + 0)
/*
 * @def LOG_DBG_MT_MSG_raw - Log very verbose (every byte) of a message
 */
#define LOG_DBG_MT_MSG_raw      _bitN(LOG_DBG_MT_bitnum_first + 1)
/*
 * @def LOG_DBG_MT_MSG_raw - Log items associated with async messages.
 */
#define LOG_DBG_MT_MSG_areq     _bitN(LOG_DBG_MT_bitnum_first + 2)

#define LOG_DBG_MT_MSG_fields   _bitN(LOG_DBG_MT_bitnum_first + 3)

#define LOG_DBG_MT_MSG_decode   _bitN(LOG_DBG_MT_bitnum_first + 4)

/*
 * @struct mt_msg_list
 * @brief Manage a list of messages
 *
 * Always insert at end, remove from head
 */
struct mt_msg_list {
    const char *dbg_name;
    intptr_t sem;
    struct mt_msg *pList;
};

/*!
 * @struct msg_interface
 * @brief Messages come from and go to a message interface.
 *
 */
struct mt_msg_interface {
    /*! name for debug purposes */
    const char *dbg_name;

    /*! True if this is an NPI socket interface inside the npi server */
    bool is_NPI;

    /*! Should the transmission include the starting frame byte? */
    bool frame_sync;

    /*! Should the transmission include the trailing chksum */
    bool include_chksum;

    /*! flush RX on startup */
    bool startup_flush;

    /*! device handle */
    intptr_t hndl;

    /*! non-null if interface is a socket */
    struct socket_cfg *s_cfg;

    /*! non-null if interface is a uart */
    struct uart_cfg *u_cfg;

    /*! Rx thread reading on this interface */
    intptr_t rx_thread;

    /*! what is the fragment size we should use? */
    int tx_frag_size;

    /*! How many retries should we have? */
    int retry_max;

    /*! how long to wait for a fragment response on this interface */
    int frag_timeout_mSecs;

    /*! how long to wait for a message to start.. */
    int intermsg_timeout_mSecs;

    /*! how long between bytes inside a message to wait? */
    int intersymbol_timeout_mSecs;

    /*! A SREQ should respond within this many mSecs */
    int srsp_timeout_mSecs;

    /*! Stack ID for this interface */
    int stack_id;

    /*! true if this interface uses a 2byte length */
    bool len_2bytes;

    /*! for use by the rx handler */
    intptr_t rx_handler_cookie;

    /* in comming messages are put here. */
    struct mt_msg_list rx_list;

    /* current sreq is here, the srsp will be attached here */
    struct mt_msg *pCurSreq;
    /* sreq sender waits for srsp here. */
    intptr_t srsp_semaphore;

    /*! Is this interface dead? should the rx thread exit? */
    bool is_dead;

    /*! points to the current message we are trying to receive */
    struct mt_msg *pCurRxMsg;

    /*! When performing a flush operation how long do we stall? */
    int flush_timeout_mSecs;

    /*! Used to lock all lists within this interface */
    intptr_t list_lock;

    /* Used to lock the interface during a transmission */
    intptr_t tx_lock;

    /*!
     * Before transmitting the "tx_lock" is aquired.
     * How many milliseconds should the timeout be for this lock?
     * Suggestion: 2 seconds.
     */
    int      tx_lock_timeout;
    /*
     * Used when transfering a fragmented packet.
     */
    struct mt_msg_iface_frag_info {
        /* set once an error occurs */
        bool is_error;
        /* the message we are fragmenting (or de-fragmenting) */
        struct mt_msg *pMsg;
        /* on tx side, reused for each  for each fragment. */
        struct mt_msg *pTxFragData;
        /* what block are we on? */
        int block_cur;
        /* how many blocks to send? */
        int block_count;
        /* total size of transfer */
        int total_size;
        /* how large is each packet in this frag sequence? */
        int this_frag_size;

        /*! When tx-ing, the ack from the remote is put here */
        struct mt_msg *pTxFragAck;
        /*! When tx-ing, after an ACK is received, this semaphore is pushed */
        intptr_t       tx_ack_semaphore;

        /* two seperate frags, one for TX and one for RX */
    } tx_frag, rx_frag;
};

/*
 * @brief Message types
 * @enum mt_msg_type
 */
enum mt_msg_type {
    MT_MSG_TYPE_unknown,
    MT_MSG_TYPE_sreq,
    MT_MSG_TYPE_srsp,
    MT_MSG_TYPE_poll,
    MT_MSG_TYPE_areq,

    /* Extended */
    MT_MSG_TYPE_sreq_stack,
    MT_MSG_TYPE_srsp_stack,
    MT_MSG_TYPE_poll_stack,
    MT_MSG_TYPE_areq_stack,

    /* Extended */
    MT_MSG_TYPE_sreq_frag_data,
    MT_MSG_TYPE_sreq_frag_ack,
    MT_MSG_TYPE_sreq_ext_status,

    /* Extended */
    MT_MSG_TYPE_srsp_frag_data,
    MT_MSG_TYPE_srsp_frag_ack,
    MT_MSG_TYPE_srsp_ext_status,

    /* Extended */
    MT_MSG_TYPE_areq_frag_data,
    MT_MSG_TYPE_areq_frag_ack,
    MT_MSG_TYPE_areq_ext_status
};

/*!
 * @struct msg
 * @brief Internal representation of a message.
 */
struct mt_msg {
    /*! used to verify this is a message structure. */
    const int *check_ptr;

    /*! message sequence number, always increasing until it wraps */
    uint32_t   sequence_id;

    /*! what interface did this message come from? */
    struct mt_msg_interface *pSrcIface;

    /*! what interface does this message go to? */
    struct mt_msg_interface *pDestIface;

    /*! type of message */
    enum mt_msg_type m_type;

    bool was_formatted;

    /*! Length in header, negative if unknown */
    int expected_len;

    /*! command 0 byte, contains cmd & subsystem value, negative if unknown */
    int cmd0;

    /*! command 1 byte, negative if unknown */
    int cmd1;

    /*! The xor checkvalue */
    int chksum;

    /*! Did we over/under flow the io buffer? */
    bool is_error;

    /*! When rd/wr the io buffer, this is our rdwr index */
    int iobuf_idx;

    /*! This is how many valid bytes are in the io buffer */
    int iobuf_nvalid;

    /* This (current) implementation, iobuf is fixed Future this might
     * change to an allocated buf this holds the sizeof() the iobuf.
     */
    int  iobuf_idx_max;

    /*! io buffer for the message */
    uint8_t iobuf[ __4K ];

    /*! Synchronous messages have responses here, otherwise this is null */
    struct mt_msg *pSrsp;

    /*! Next msg in a specific msg list */
    struct mt_msg *pListNext;

    /* If not-null, this will be included in the MT_MSG_log() output */
    /* This must be a constant string during the life of the message */
    /* HINT: use a compile time constant string here. */
    const char *pLogPrefix;
};

/*
 * @struct mt_version_info
 * @brief represents data transmitted in the SYS_VERSION_INFO request.
 */
struct mt_version_info {
    int transport;
    int product;
    int major;
    int minor;
    int maint;
};

/*
 * @brief Log this message
 * @param why - log reason/why bits, see log.h
 * @param pMsg - the message to log
 * @param fmt - printf format message to print
 * @returns void.
 */
//void MT_MSG_log(int64_t why, struct mt_msg *pMsg, _Printf_format_string_ const char *fmt, ...) __attribute__((format (printf,3,4)));

/*
 * @brief Set/Determine msg type (mt_msg::m_type)
 * @param pMsg - the message
 * @param pMI - the interface associated with this message.
 */

void MT_MSG_set_type(struct mt_msg *pMsg, struct mt_msg_interface *pMI);

/*
 * @brief Set the message destination interface
 */
void MT_MSG_setDestIface(struct mt_msg *pMsg, struct mt_msg_interface *pIface);

/*
 * @brief Set the message source interface
 */
void MT_MSG_setSrcIface(struct mt_msg *pMsg, struct mt_msg_interface *pIface);

/*
 * @brief Write an N-bit value to the msg payload
 * @param pMsg - the message
 * @param value - value being written
 * @param nbits - 8, 16, 32, or 64
 * @returns void
 *
 * Doing it this way handles endian (lsb|msb) order issues.
 */

void MT_MSG_wrUX_DBG(struct mt_msg *pMsg, uint64_t value, int nbits, const char *name);
#define MT_MSG_wrUX(PMSG, VALUE, NBYTES)  MT_MSG_wrUX((PMSG), (VALUE), (NBYTES), NULL)

/*
 * @brief Write an 8bit value to the message payload
 * @param pMsg - the message
 * @param value - value being written
 */
void MT_MSG_wrU8_DBG(struct mt_msg *pMsg, uint32_t value, const char *name);
#define MT_MSG_wrU8(PMSG, VALUE) MT_MSG_wrU8_DBG((PMSG),(VALUE), NULL)

/*
 * @brief Write a 16bit value to the message payload
 * @param pMsg - the message
 * @param value - value being written
 */
void MT_MSG_wrU16_DBG(struct mt_msg *pMsg, uint32_t value, const char *name);
#define MT_MSG_wrU16(PMSG, VALUE) MT_MSG_wrU16_DBG((PMSG),(VALUE), NULL)

/* @brief Write a 32bit value to the message payload
 * @param pMsg - the message
 * @param value - value being written
 */
void MT_MSG_wrU32_DBG(struct mt_msg *pMsg, uint32_t value, const char *name);
#define MT_MSG_wrU32(PMSG, VALUE) MT_MSG_wrU32_DBG((PMSG), (VALUE), NULL)

/*
 * @brief Write a 64bit value to the message payload
 * @param pMsg - the message
 * @param value - value being written
 */
void MT_MSG_wrU64_DBG(struct mt_msg *pMsg, uint64_t value, const char *name);
#define MT_MSG_wrU64(PMSG, VALUE) MT_MSG_wrU64_DBG((PMSG), (VALUE), NULL)

/*
 * @brief Write a buffer of bytes to the message payload
 * @param pMsg - the message
 * @param pData - bytes to write
 * @param nbytes - how many bytes to write
 * @returns void
 *
 * Note: pData can be NULL to do a dummy write.
 */
void MT_MSG_wrBuf_DBG(struct mt_msg *pMsg, const void *pData, size_t nbytes, const char *name);
#define MT_MSG_wrBuf(PMSG, BUF, NBYTES) MT_MSG_wrBuf_DBG((PMSG), (BUF), (NBYTES), NULL)

/*
 * @brief Read an N-Bit value from the message payload
 * @param pMsg - the message
 * @param value - value being written
 *
 * Doing it this way handles endian (lsb|msb) order issues.
 */
uint64_t MT_MSG_rdUX_DBG(struct mt_msg *pMsg, int nbits, const char *name);
#define MT_MSG_rdUX(PMSG,NBITS,NAME) MT_MSG_rdUX_DBG((PMSG), (NBITS), NULL)

/*
 * @brief peek into the message at the read index and fetch a byte
 * @param pMsg - the message to peek into
 * @param ofset - any additional ofset to the existing idx
 * @returns EOF - if error, otherwise the byte.
 */
int MT_MSG_Peek_u8_DBG(struct mt_msg *pMsg, int ofset, const char *name);
#define MT_MSG_Peek_u8(PMSG, OFSET) MT_MSG_Peek_u8_DBG((PMSG), (OFSET), NULL)

/*
 * @brief Read an 8bit value from the msg payload
 * @param pmsg - the message
 * @returns the value read
 */
uint8_t MT_MSG_rdU8_DBG(struct mt_msg *pMsg, const char *name);
#define MT_MSG_rdU8(PMSG) MT_MSG_rdU8_DBG((PMSG), NULL)

/*
 * @brief Read a 16bit value from the msg payload
 * @param pmsg - the message
 * @returns the value read
 */
uint16_t MT_MSG_rdU16_DBG(struct mt_msg *pMsg, const char *name);
#define MT_MSG_rdU16(PMSG) MT_MSG_rdU16_DBG((PMSG), NULL)

/*
 * @brief Read a 32bit value from the msg payload
 * @param pmsg - the message
 * @returns the value read
 */
uint32_t MT_MSG_rdU32_DBG(struct mt_msg *pMsg, const char *name);
#define MT_MSG_rdU32(PMSG) MT_MSG_rdU32_DBG((PMSG), NULL)

/*
 * @brief Read an 32bit value from the msg payload
 * @param pmsg - the message
 * @returns the value read
 */
uint64_t MT_MSG_rdU64_DBG(struct mt_msg *pMsg, const char *name);
#define MT_MSG_rdU64(PMSG)  MT_MSG_rdU64_DBG((PMSG), NULL)

/*
 * @brief read a buffer of bytes from the msg payload
 * @param pMsg - the message
 * @param pData - where to put the data
 * @param nbytes - how many
 * @returns void
 *
 * Note: pData can be NULL to do a dummy read.
 */
void MT_MSG_rdBuf_DBG(struct mt_msg *pMsg, void *pData, size_t nbytes, const char *name);
#define MT_MSG_rdBuf(PMSG, PDATA, LEN) MT_MSG_rdBuf_DBG((PMSG), (PDATA), (LEN), NULL)

/*
 * @brief Release/Free a message and all related resources.
 * @param pMsg - the message to release/free
 *
 */
void MT_MSG_free(struct mt_msg *pMsg);

/*
 * @brief clone/duplicate a message
 * @param pMsg - the message to clone
 * @returns new message, or NULL on error
 *
 * This is used in the npi server when there are more then 1 client.
 * Example: 1 uart - and 2 socket connections.
 * An AREQ is received from the uart, for each connection the message
 * is cloned and transmitted to that specific client
 */
struct mt_msg *MT_MSG_clone(struct mt_msg *pMsg);

/*
 * @brief Allocate or find space for a new message
 * @param len - expected length, or -1 if unknown
 * @param cmd0 - from protocol, or -1 if unknown
 * @param cmd1 - from protocol, or -1 if unknown
 *
 * @returns NULL on error, or pointer
 *
 */
struct mt_msg *MT_MSG_alloc(int len, int cmd0, int cmd1);

/*
 * @brief Transmit (fragment if needed) and wait for a reply if applicable.
 * @param pMsg - the message to transmit
 * @returns 2 on success (tx + rx = 2 total messages)
 *
 * Notes:
 *  - returns 1 if the message was transmitted
 *  - returns 2 if a message was transmitted and received
 *  - Caller must also check mt_msg::is_error
 *  - For an SREQ, see mt_msg::pSrsp for the SRSP message.
 */
int MT_MSG_txrx(struct mt_msg *pMsg);

/*
 * @brief Initialize the MT_MSG module
 * @returns void
 */
void MT_MSG_init(void);

/*
 * @brief Verify that we have parsed all incoming data.
 * @param pMsg - the message we just finished parsing.
 * @returns void
 *
 * This should be called when processing of the payload
 * is complete, it varifies that the entire payload has
 * been parsed.
 *
 */
void MT_MSG_parseComplete(struct mt_msg *pMsg);

/*
 * @brief Create/Initialize this message interface
 * @param pMI - Pointer to the msg interface to initialize
 * @returns negative on error
 */
int MT_MSG_interfaceCreate(struct mt_msg_interface *pMI);

/*
 * @brief Destroy this interface
 * @param pMI - pointer to the msg interface to destroy
 * @returns void
 */
void MT_MSG_interfaceDestroy(struct mt_msg_interface *pMI);

/*
 * @brief Create a message list.
 * @param pML - the message list to init/create
 * @param dbg_name - name to create
 * @returns negative error, zero success
 */
int MT_MSG_LIST_create(struct mt_msg_list *pML, const char *dbg_name, const char *dbg_name2);

/*
 * @brief Insert a message into the list
 * @param pMI - Owning interface
 * @param pML - msg list
 * @param pMsg - the message
 * @returns void
 */
void MT_MSG_LIST_insert(struct mt_msg_interface *pMI,
                        struct mt_msg_list *pML, struct mt_msg *pMsg);

/*
 * @brief Insert a message into the list
 * @param pMI - Owning interface
 * @param pML - msg list
 * @param timeout_mSecs - how long to wait
 * @returns NULL, or the message
 */
struct mt_msg *MT_MSG_LIST_remove(struct mt_msg_interface *pMI,
                                  struct mt_msg_list *pML, int timeout_mSecs);

/*
 * @brief Destroy a message list
 * @param pML - the message list to destroy
 * @returns void
 *
 */
void MT_MSG_LIST_destroy(struct mt_msg_list *pML);

/*
 * @brief mark this cmd0 byte as an AREQ.
 * @param cmd0 - value to mark
 * @returns - modified cmd0
 */
uint8_t MT_MSG_cmd0_areq(int cmd0);

/*
 * @brief mark this cmd0 byte as an AREQ.
 * @param cmd0 - value to mark
 * @returns - modified cmd0
 */
uint8_t MT_MSG_cmd0_sreq(int cmd0);

/*
 * @brief mark this cmd0 byte as an AREQ.
 * @param cmd0 - value to mark
 * @returns - modified cmd0
 */
uint8_t MT_MSG_cmd0_srsp(int cmd0);

/*
 * @brief mark this cmd0 byte as an AREQ.
 * @param cmd0 - value to mark
 * @returns - modified cmd0
 */
uint8_t MT_MSG_cmd0_poll(int cmd0);

/*
 * @brief Reformat a message for a new interface
 * @param pMsg - the message to be reformatted
 *
 * This is used when forwarding a message from one interface to another.
 * See the mt_msg::pSrcIface and mt_msg::pDestIface
 *
 * Example: The NPI server has two interfaces, the UART and the SOCKET.
 * Each interface has different parameters (ie: the UART might require
 * a frame sync byte, but the socket does not, as a result the data
 * in the packet needs to 'shift' over a few bytes.
 *
 * This function does that shift operation.
 */
void MT_MSG_reformat(struct mt_msg *pMsg);

/*
 * @brief Handle INI file configuration parameters for a message interface.
 * @param pINI - the ini file parser information
 * @param pIface - the message interface structure to populate
 *
 * As the INI file is being parsed, this callback function can be used
 * to translate various message interface settings into changes within
 * the message interface structure.
 */
int MT_MSG_INI_settings(struct ini_parser *pINI,
                        bool *handled,
                        struct mt_msg_interface *pIface);

/*
 * @brief Send a loopback message
 * @param pIface - where to send the message
 * @param repeatCount - how many many times to repeat (0=none, 0xff=forever)
 * @param mSec_rate - how often (mSecs) to repeat
 * @param length - how many bytes to send
 * @param pPayload - the data bytes to send
 */
int MT_MSG_loopback(struct mt_msg_interface *pIface, int repeatCount,
                    uint32_t mSec_rate, size_t length, const uint8_t *pPayload);

/*
 * @brief Get Ext Address
 * @param pIface - destination interface
 * @param pib - if not null, request the pib value (active)
 * @param primary - if not null, request the factory value
 * @param usr_cfg - if not null, request the user configured value
 * @returns success = (2 * number_of_requests)
 *
 * A single request requires 2 transfers (tx and rx) a
 * A successful single transfer request returns 2.
 * A request for 2 items return 4 upon success.
 * .. and so forth ..
 *
 * if multiple items are requested, there is no indication of which item failed.
 * Note if the MAC address was: 12:34:56:78:9a:bc:de:f0,
 * Then the result would be: 0x123456789abcdef0
 */
int MT_MSG_getExtAddress(struct mt_msg_interface *pIface,
                         uint8_t *pib,
                         uint8_t *primary,
                         uint8_t *usr_cfg);

/*
 * @brief Send a SYS_VERSION_REQ, and get the reply
 * @param pIface - interface to send to
 * @param pInfo  - where to put the result
 * @returns success = 2 (tx msg + rx msg), all others are failure.
 */
int MT_MSG_getVersion(struct mt_msg_interface *pDest,
                      struct mt_version_info *pInfo);

/*
 * @brief Send a SYS_RESET_REQ to the interface
 * @param pIface - where to send the message to
 * @param reset_type - type of reset (0=hard, 1=soft)
 *
 * NOTE: After sending the device will reset and send a reset indication.
 */
void MT_MSG_reset(struct mt_msg_interface *pIface, int reset_type);

#endif

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
