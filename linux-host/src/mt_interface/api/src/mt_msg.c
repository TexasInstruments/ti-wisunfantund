/******************************************************************************
 @file mt_msg.c

 @brief TIMAC 2.0 API mt layer implimentation.

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

#include "compiler.h"
#include "mt_msg.h"
#include "mt_msg_dbg.h"
#include "log.h"
#include "mutex.h"
#include "threads.h"
#include "stream.h"
#include "stream_socket.h"
#include "stream_uart.h"
#include "timer.h"
#include "ti_semaphore.h"
#include "fatal.h"
#include "rcp_types.h"

#include <stdarg.h>
#include <string.h>
#include <stdlib.h>
#include <unistd.h>
#include <stdatomic.h>

#include "ns_trace.h"

#define TRACE_GROUP "MTMG"

/******************************************************************************
 Variables, globals & locals
 *****************************************************************************/

/* These are INI file log flag names, this array is used by "app_main"
  for the specific application (ie: npi_server, or appsrv/gateway)
  See the LOG.H file for details about log flags.
*/
const struct ini_flag_name mt_msg_log_flags[] = {
    { .name = "mt-msg-traffic" , .value = LOG_DBG_MT_MSG_traffic },
    { .name = "mt-msg-raw"     , .value = LOG_DBG_MT_MSG_raw },
    { .name = "mt-msg-areq"    , .value = LOG_DBG_MT_MSG_areq },
    { .name = "mt-msg-fields"  , .value = LOG_DBG_MT_MSG_fields },
    { .name = "mt-msg-decode"  , .value = LOG_DBG_MT_MSG_decode },
    /* terminate */
    { .name = NULL }
};

/*! used to track the order of messages. */
static atomic_uint msg_sequence_counter = ATOMIC_VAR_INIT(0);

/* Used to verify a msg pointer is a message pointer. */
static const int msg_check_value = 'm';

/* Used to identify an incoming msg */
static const char _incoming_msg[] = "incoming-msg";

extern MT_rcp_Host_dbg_t MT_rcp_Host_dbg;

extern struct mt_version_info MT_DEVICE_version_info;

extern void platformRcpAReqRxedSignal(uintptr_t arg);

typedef struct MT_MSG_DBG_tag
{
    uint32_t    num_tx_pkt;
    uint32_t    num_rx_pkt;
    uint32_t    num_rx_err_no_frame_sync;
    uint32_t    num_rx_err_checksum;
    uint32_t    num_rx_err_packet_len;
} MT_MSG_DBG_s;

MT_MSG_DBG_s mt_msg_Dbg;
/******************************************************************************
 Functions
 *****************************************************************************/

/*
   Public funnction in mt_msg.h - see mt_msg.h
 */
void MT_MSG_init(void)
{
    /* nothing todo, everything is done inside the */
    /* MT_MSG_IFaceInit() call */
}

/*!
 * @brief calculate the checksum of the message
 * @param tf, ascii f specifies src interface
 * @param len - how long is the data payload
 * @returns xor checksum.
 */
static int MT_MSG_calc_chksum(struct mt_msg *pMsg, int tf, int len)
{
    bool b;
    int x;
    int chksum;

    /* start at 1, just past the frame sync byte. */
    chksum = 0;
    /* ASSUME: there is no frame sync byte */
    x = 0;

    if(tf == 'f') /* which interface do we use? */
    {
        b = pMsg->pSrcIface->frame_sync;
    }
    else
    {
        b = pMsg->pDestIface->frame_sync;
    }
    if(b)
    {
        /* start after the frame sync byte */
        x++;
    }
    for(/* above */ ; x < len ; x++)
    {
        chksum  ^= ((int)pMsg->iobuf[x]);
    }
    return (chksum & 0x0ff);
}

/*
  Sets the message type in mt_msg::m_type
  see mt_msg.h
*/
void MT_MSG_set_type(struct mt_msg *pMsg, struct mt_msg_interface *pMI)
{
    int major;
    int minor;
    const int *iPtr;
    int x;

    static const int lut_major[] = {
        MT_MSG_TYPE_poll,
        MT_MSG_TYPE_sreq,
        MT_MSG_TYPE_areq,
        MT_MSG_TYPE_srsp
    };

    /* assume... */
    pMsg->m_type = MT_MSG_TYPE_unknown;

    if((pMsg->cmd0 < 0) || (pMsg->cmd0 > 255))
    {
        return;
    }
    major = _bitsXYof(pMsg->cmd0, 7, 5);
    if((major >= 0) && (major <= 3))
    {
        pMsg->m_type = lut_major[major];
        return;
    }

    /* to continue, we need the extended byte... */

    /* need to know the associated interface */
    if(pMI == NULL)
    {
        return;
    }

    /* Where does the payload start in the message? */
    x = (pMI->frame_sync ? 1 : 0) +
        (pMI->len_2bytes ? 2 : 1) +
        1 +
        1;

    /* do we have the extension byte yet? */
    if(pMsg->iobuf_nvalid < x)
    {
        return; /* no */
    }

    /* fetch the extension byte */
    minor = pMsg->iobuf[x];

    /* extract the "minor" type */
    minor = _bitsXYof(minor, 7, 3);

    /* assume it is not found */
    iPtr = NULL;
    switch (minor)
    {
    default:
        /* unknown */
        break;
    case 0: /* not used */
        break;
    case 1:
        /* stack specific  */
        {
            static const int stack_lut[] = {
                MT_MSG_TYPE_unknown,
                MT_MSG_TYPE_sreq_stack,
                MT_MSG_TYPE_areq_stack,
                MT_MSG_TYPE_srsp_stack
            };
            iPtr = stack_lut;
        }
        break;
    case 2:
        {
            /* fragmentation data */
            static const int frag_data_lut[] = {
                MT_MSG_TYPE_unknown,
                MT_MSG_TYPE_sreq_frag_data,
                MT_MSG_TYPE_areq_frag_data,
                MT_MSG_TYPE_srsp_frag_data
            };
            iPtr = frag_data_lut;
            break;
        }
    case 3:
        {
            /* Fragmentation ACK */
            static const int frag_ack_lut[] = {
                MT_MSG_TYPE_unknown,
                MT_MSG_TYPE_sreq_frag_ack,
                MT_MSG_TYPE_areq_frag_ack,
                MT_MSG_TYPE_srsp_frag_ack
            };
            iPtr = frag_ack_lut;
            break;
        }
    case 4:
        {
            /* Extended status */
            static const int ext_status_lut[] = {
                MT_MSG_TYPE_unknown,
                MT_MSG_TYPE_sreq_ext_status,
                MT_MSG_TYPE_areq_ext_status,
                MT_MSG_TYPE_srsp_ext_status
            };
            iPtr = ext_status_lut;
            break;
        }
    }

    if(iPtr)
    {
        /* clear the extension bit */
        /* and get the major type.. */
        major = major & 0x03;
        if(iPtr[major] >= 0)
        {
            pMsg->m_type = iPtr[major];
        }
    }
}

/*!
 * @brief Format a message for transmission.
 * @param pMsg
 *
 *  This inserts the correct byte sequence into
 *  the mt_msg::io_buf, including any frame sync
 *  and/or any checksums.
 */
static void MT_MSG_format_msg(struct mt_msg *pMsg)
{
    int n;

    /* where does the payload start? */
    n = ((pMsg->pDestIface->frame_sync ? 1 : 0) +
         (pMsg->pDestIface->len_2bytes ? 2 : 1) +
         1 + /* cmd0 */
         1); /* cmd1 */

    if(pMsg->iobuf_idx < 0)
    {
        /* no payload was ever written */
        pMsg->iobuf_idx = n;
    }

    /* update the length if needed */
    if(pMsg->expected_len < 0)
    {
        pMsg->expected_len = pMsg->iobuf_idx - n;
    }

    if( (pMsg->expected_len + n) != pMsg->iobuf_idx )
    {
        BUG_HERE("Expected len: %d, actual len: %d\n",
            (pMsg->expected_len + n), pMsg->iobuf_idx);
    }

    /* reset io buffer so we can insert header */
    pMsg->iobuf_idx = 0;

    /* frame sync */
    if(pMsg->pDestIface->frame_sync)
    {
        MT_MSG_wrU8(pMsg, 0xfe);
    }

    /* Length */
    if(pMsg->pDestIface->len_2bytes)
    {
        MT_MSG_wrU16(pMsg, pMsg->expected_len);
    }
    else
    {
        MT_MSG_wrU8(pMsg, pMsg->expected_len);
    }


    /* cmd0/cmd1 */
    MT_MSG_wrU8(pMsg, pMsg->cmd0);
    MT_MSG_wrU8(pMsg, pMsg->cmd1);

    /* skip over the data/payload */
    MT_MSG_wrBuf(pMsg, NULL, pMsg->expected_len);

    /* and capture the number of valid bytes */
    pMsg->iobuf_nvalid = pMsg->iobuf_idx;

    /* if needed, the checksum */
    if(pMsg->pDestIface->include_chksum)
    {
        /* calculate the checksum */
        pMsg->chksum = MT_MSG_calc_chksum(pMsg, 't', pMsg->iobuf_nvalid);
        /* go back to the checksum location and write it */
        MT_MSG_wrU8(pMsg, pMsg->chksum);
    }
}

/*
  Log a message
  see mt_msg.h
*/
void MT_MSG_log(int64_t why, struct mt_msg *pMsg, const char *fmt, ...)
{
    va_list ap;
    int x;

    /* auto flag errors */
    if(why == LOG_ERROR)
    {
        pMsg->is_error = true;
    }

    /* if we do not log ... leave */
    if(!LOG_test(why))
    {
        return;
    }

    /* we do multiple things here so we lock/unlock */
    LOG_lock();

    /* print the message */
    va_start(ap, fmt);
    LOG_vprintf(why, fmt, ap);
    va_end(ap);

    /* if we have an error make this clear! */
    if(pMsg->is_error)
    {
        //LOG_printf(why, "ERROR: ");
    }

    /* do we have a prefix for this message? */
    if(pMsg->pLogPrefix)
    {
        //LOG_printf(why, "%s ", pMsg->pLogPrefix);
    }

    //LOG_printf(why, "msg(%04x) nbytes=%d len=%d [",
                // (unsigned)(pMsg->sequence_id),
                // pMsg->iobuf_nvalid,
                // pMsg->expected_len);
    /* we print some bytes not all of the bytes */
    for(x = 0 ; (x < pMsg->iobuf_nvalid) && (x < 8) ; x++)
    {
        //LOG_printf(why, " 0x%02x", pMsg->iobuf[x]);
    }
    //LOG_printf(why, "]\n");

    LOG_unLock();
}

/*
  This function reformats a message (the payload) within a message
  it us used when forwarding a message from one interface to another

  See mt_msg.h for more discussion.
*/
void MT_MSG_reformat(struct mt_msg *pMsg)
{
    int F_start;
    int T_start;

    /* on the from side ... where does our payload begin? */
    F_start = (
        (pMsg->pSrcIface->frame_sync ? 1 : 0) +
        (pMsg->pSrcIface->len_2bytes ? 2 : 1) +
        1 + /* cmd0 */
        1); /* cmd1 */

    /* on the to side ... where does our payload begin? */
    T_start = (
        (pMsg->pDestIface->frame_sync ? 1 : 0) +
        (pMsg->pDestIface->len_2bytes ? 2 : 1) +
        1 + /* cmd0 */
        1); /* cmd1 */

    /* If we have payload... */
    if(pMsg->expected_len)
    {
        /* And it needs to move/shift */
        if(F_start != T_start)
        {
            /* then shift it */
            memmove(
                (void *)(&(pMsg->iobuf[T_start])),
                (void *)(&(pMsg->iobuf[F_start])),
                pMsg->expected_len);
        }
    }
    pMsg->iobuf_nvalid = T_start + pMsg->expected_len;

    /* adjust the write pointer */
    pMsg->iobuf_idx = T_start + pMsg->expected_len;

#ifdef MT_MSG_DEBUG_TRACE
    tr_debug("Reformatted msg from: %s to %s (fstart=%d, tstart=%d, len=%d)\n",
            pMsg->pSrcIface->dbg_name, pMsg->pDestIface->dbg_name,
            F_start, T_start, pMsg->iobuf_idx);
#endif
}

/*!
 * @brief If the write index was not set, do that now.
 * @param pMsg - the message
 */
static void init_wr_idx(struct mt_msg *pMsg)
{
    /* if not set yet */
    if(pMsg->iobuf_idx >= 0)
    {
        return;
    }

    /* set to payload */
    /* BECAUSE - we write payloads */
    pMsg->iobuf_idx = (
        (pMsg->pDestIface->frame_sync ? 1 : 0) + /* frame sync */
        /* if needed, 2nd len byte */
        (pMsg->pDestIface->len_2bytes ? 2 : 1) +
        1 + /* cmd 0 */
        1); /* cmd 1 */
}

/*!
  Write an N-BIT value to the io stream
  see mt_msg.h
*/
void MT_MSG_wrUX_DBG(struct mt_msg *pMsg, uint64_t value,
                      int nbits, const char *name)
{
    int x;

    if(pMsg->is_error)
    {
        return;
    }
    if(name)
    {
        //LOG_printf(LOG_DBG_MT_MSG_fields, "%s: wr_u%d: %*s: %lld, 0x%llx\n",
                // pMsg->pLogPrefix,
                // nbits,
                // 20,
                // name,
                // (long long)value,
                // (unsigned long long)value);
    }

    /* set the write index */
    init_wr_idx(pMsg);

    /* write data in little endian form */
    while(nbits)
    {
        x = pMsg->iobuf_idx;
        if(!_inrange(x, 0, pMsg->iobuf_idx_max))
        {
            pMsg->is_error = true;
            BUG_HERE("wr buf overflow\n");
            return;
        }

        pMsg->iobuf[x] = (uint8_t)(value);
        x++;
        value = value >> 8;
        pMsg->iobuf_idx = x;
        pMsg->iobuf_nvalid = x;
        nbits -= 8;

    }
}

/*
  Write a U8 value to the mt_msg::io_buf
  see mt_msg.h
*/
void MT_MSG_wrU8_DBG(struct mt_msg *pMsg, uint32_t value, const char *name)
{
    MT_MSG_wrUX_DBG(pMsg, value, 8, name);
}

/*
  Write a U16 value to the mt_msg::io_buf
  see mt_msg.h
*/
void MT_MSG_wrU16_DBG(struct mt_msg *pMsg, uint32_t value, const char *name)
{
    MT_MSG_wrUX_DBG(pMsg, value, 16, name);
}

/*
  Write a U32 value to the mt_msg::io_buf
  see mt_msg.h
*/
void MT_MSG_wrU32_DBG(struct mt_msg *pMsg, uint32_t value, const char *name)
{
    MT_MSG_wrUX_DBG(pMsg, value, 32, name);
}

/*
  Write a U64 value to the mt_msg::io_buf
  see mt_msg.h
*/
void MT_MSG_wrU64_DBG(struct mt_msg *pMsg, uint64_t value, const char *name)
{
    MT_MSG_wrUX_DBG(pMsg, value, 64, name);
}

/*
  Write a byte buffer to the mt_msg::io_buf
  see mt_msg.h
*/
void MT_MSG_wrBuf_DBG(struct mt_msg *pMsg, const void *pData,
                       size_t nbytes, const char *name)
{
    if(pMsg->is_error)
    {
        return;
    }

    /* init the index */
    init_wr_idx(pMsg);

    /* are we done? */
    if(nbytes == 0)
    {
        return;
    }

    /* do we go to far? */
    if((pMsg->iobuf_idx + ((int)nbytes)) > pMsg->iobuf_idx_max)
    {
        pMsg->is_error = true;
        BUG_HERE("msg wr overflow\n");
        return;
    }

    if(name)
    {
        //LOG_printf(LOG_DBG_MT_MSG_fields, "%s: wrBuf: %*s, len: %d\n",
                    //pMsg->pLogPrefix, 20, name, (int)nbytes);
    }
    /* is this a dummy or real write? */
    if(pData)
    {
        /* we might be doing a dummy write */
        memcpy((void *)(&(pMsg->iobuf[pMsg->iobuf_idx])), pData, nbytes);
    }
    pMsg->iobuf_idx += (int)nbytes;
    pMsg->iobuf_nvalid += (int)nbytes;
}

/*
  Peek (ahead) into the message at a specific byte offset.
  see mt_msg.h
*/
int MT_MSG_Peek_u8_DBG(struct mt_msg *pMsg, int ofset, const char *name)
{
    int x;

    /* if not set yet */
    if(pMsg->iobuf_idx < 0)
    {
        /* set to start of message */
        /* Because we parse messages */
        pMsg->iobuf_idx = 0;
    }

    x = pMsg->iobuf_idx + ofset;
    if(!_inrange(x, 0, pMsg->iobuf_nvalid))
    {
        return (EOF);
    }
    x = pMsg->iobuf[x] & 0x0ff;

    //LOG_printf(LOG_DBG_MT_MSG_fields, "%s: peek_u8: %s: %d, 0x%02x\n",
                // pMsg->pLogPrefix,
                // name,
                // (int)x,
                // (int)x);

    return (x);
}

/*
  Read an N-bit value from the mt_msg::io_buf
  see mt_msg.h
*/
uint64_t MT_MSG_rdUX_DBG(struct mt_msg *pMsg, int nbits, const char *name)
{
    int x;
    int y;
    uint64_t v;
    uint64_t v2;

    if(pMsg->is_error)
    {
        return (0);
    }

    /* if not set yet */
    if(pMsg->iobuf_idx < 0)
    {
        /* set to start of message */
        /* because we parse messages */
        pMsg->iobuf_idx = 0;
    }

    v = 0;

    /* Data is transmitted LSB first */
    for(x = 0 ; x < nbits ; x += 8)
    {
        y = pMsg->iobuf_idx;
        if(!_inrange(y, 0, pMsg->iobuf_nvalid))
        {
            v = (uint64_t)-1;
            BUG_HERE("msg rd underflow\n");
            break;
        }
        v2 = pMsg->iobuf[y];
        y++;
        pMsg->iobuf_idx = y;

        v2 = v2 << x;
        v = v | v2;
    }

    if(name)
    {
        //LOG_printf(LOG_DBG_MT_MSG_fields, "%s: rd_u%d: %*s: %5lld, 0x%0*llx\n",
                    // pMsg->pLogPrefix,
                    // nbits,
                    // 12,
                    // name,
                    // (long long)v,
                    // (nbits / 4),
                    // (unsigned long long)v);
    }
    return (v);
}

/*
  Read a U8 value from the mt_msg::io_buf
  see mt_msg.h
 */
uint8_t MT_MSG_rdU8_DBG(struct mt_msg *pMsg, const char *name)
{
    return ((uint8_t)MT_MSG_rdUX_DBG(pMsg, 8, name));
}

/*
 Read a U16 value from the mt_msg::io_buf
 see mt_msg.h
*/
uint16_t MT_MSG_rdU16_DBG(struct mt_msg *pMsg, const char *name)
{
    return ((uint16_t)MT_MSG_rdUX_DBG(pMsg, 16, name));
}

/*
 Read a U32 value from the mt_msg::io_buf
 see mt_msg.h
*/
uint32_t MT_MSG_rdU32_DBG(struct mt_msg *pMsg, const char *name)
{
    return ((uint32_t)MT_MSG_rdUX_DBG(pMsg, 32, name));
}

/*
 Read a U64 value from the mt_msg::io_buf
 see mt_msg.h
*/
uint64_t MT_MSG_rdU64_DBG(struct mt_msg *pMsg, const char *name)
{
    return (MT_MSG_rdUX_DBG(pMsg, 64, name));
}

/*
 Parsing is complete, is everything ok?
 See mt_msg.h
*/
void MT_MSG_parseComplete(struct mt_msg *pMsg)
{
    int n;

    /* where should the iobuf_idx be? */
    n = (pMsg->pSrcIface->frame_sync ? 1 : 0) +  /* sync byte */
        (pMsg->pSrcIface->len_2bytes ? 2 : 1) +
        1 + /* cmd0 */
        1 + /* cmd1 */
        /* finally the payload */
        pMsg->expected_len;

    /* hmm is it wrong? */
    if(pMsg->iobuf_idx != n)
    {
        /* then we have an error */
        pMsg->is_error = true;
        tr_err("%s: incomplete parse\n",
                    pMsg->pSrcIface->dbg_name);
        BUG_HERE("incomplete parse");
    }
}

/*
  Read a chunk of bytes from the mt_msg::io_buf
  see mt_msg.h
*/
void MT_MSG_rdBuf_DBG(struct mt_msg *pMsg,
                      void *pData,
                      size_t nbytes,
                      const char *name)
{
    /* we don't read any more if we hit an error */
    if(pMsg->is_error)
    {
        return;
    }

    /* if not set yet */
    if(pMsg->iobuf_idx < 0)
    {
        /* set to start of message */
        /* because we parse complete messages */
        pMsg->iobuf_idx = 0;
    }

    if(nbytes == 0)
    {
        return;
    }

    /* are we reading past the end? */
    if((pMsg->iobuf_idx + ((int)nbytes)) > pMsg->iobuf_idx_max)
    {
        pMsg->is_error = true;
        BUG_HERE("msg rd underflow\n");
        return;
    }

    if(name)
    {
        //LOG_printf(LOG_DBG_MT_MSG_fields, "%s: rdBuf: %*s, len: %d\n",
                   // pMsg->pLogPrefix, 20, name, (int)nbytes);
    }

    /* pData might be NULL if we are doing a "dummy read" */
    /* meaning: Sometimes we need to skip over payload bytes */
    if(pData)
    {
        memcpy(pData, (void *)(&(pMsg->iobuf[pMsg->iobuf_idx])), nbytes);
    }
    pMsg->iobuf_idx += (int)nbytes;
}

/*
  Release this message back into the heap
  see mt_msg.h
*/
void MT_MSG_free(struct mt_msg *pMsg)
{
    if(pMsg == NULL)
    {
        return;
    }

    if(pMsg->check_ptr != &(msg_check_value))
    {
        BUG_HERE("not a message ptr: %p\n", (void *)(pMsg));
        return;
    }

    /* release everything in this list */
    if(pMsg->pListNext)
    {
        MT_MSG_free(pMsg->pListNext);
        pMsg->pListNext = NULL;
    }

    /* and the srsp for this message */
    if(pMsg->pSrsp)
    {
        MT_MSG_free(pMsg->pSrsp);
        pMsg->pSrsp = NULL;
    }

    /* make it unusable. */
    memset((void *)(pMsg), 0, sizeof(*pMsg));
    free((void *)pMsg);
}

/*!
 * @brief Local function to reset a message so we can reuse it.
 * @param pMsg - the message
 * @param len  - expected length
 * @param cmd0 - value for command 0
 * @param cmd1 - value for command 1
 *
 * Also see MT_MSG_alloc()
 */
static void MT_MSG_resetMsg(struct mt_msg *pMsg, int len, int cmd0, int cmd1)
{
    pMsg->is_error = false;
    pMsg->cmd0 = cmd0;
    pMsg->cmd1 = cmd1;

    /* set length unknown */
    /* will be set upon first rd/wr of message */
    pMsg->iobuf_idx = -1;
    pMsg->iobuf_nvalid = 0;

    MT_MSG_set_type(pMsg, NULL);

    /* Set the length */
    pMsg->expected_len = len;
    if(len < 0)
    {
        /*----------------------------------------
          NOTE: LEN might be negative.
                Why? Because the size is not known yet.
         ---------------------------------------- */
    }
    else
    {
        /* sanity check Total size
            1 = sync byte
            2 = len byte (worse case)
            1 = cmd0
            1 = cmd1
           *len* = provided
            1 = checksum
          ======
            5 + len
        */
        if((len + 5) > sizeof(pMsg->iobuf))
        {
            BUG_HERE("msg too big\n");
        }
    }

}

/*
  Allocate (from heap) a message, initialize as required
  see mt_msg.h
*/
struct mt_msg *MT_MSG_alloc(int len, int cmd0, int cmd1)
{
    struct mt_msg *pMsg;

    /* get memory */
    pMsg = calloc(1, sizeof(*pMsg));
    if(pMsg == NULL)
    {
        BUG_HERE("no memory\n");
    }

    /* initialize it */
    if(pMsg)
    {
        pMsg->sequence_id = atomic_fetch_add(&msg_sequence_counter, 1);
        pMsg->check_ptr = &(msg_check_value);
        /* current implimentation is a u8 array local to the struct */
        pMsg->iobuf_idx_max = sizeof(pMsg->iobuf);

        MT_MSG_resetMsg(pMsg, len, cmd0, cmd1);
    }
    return (pMsg);
}

/*
  Clone (copy) a message

  Public function defined in mt_msg
*/
struct mt_msg *MT_MSG_clone(struct mt_msg *pOrig)
{
    struct mt_msg_interface *pMI;;
    struct mt_msg *pClone;
    int save_id;

    pClone = MT_MSG_alloc(pOrig->expected_len, pOrig->cmd0, pOrig->cmd1);
    if(pClone == NULL)
    {
        tr_err("clone failed no memory\n");
        return (NULL);
    }

    /* save this */
    save_id = pClone->sequence_id;

    /* make sure it has an interface of some type */
    pMI = pOrig->pSrcIface;
    if(pMI == NULL)
    {
        pMI = pOrig->pDestIface;
    }
    if(pMI == NULL)
    {
        FATAL_printf("this message has no interface\n");
    }

    //LOG_printf(LOG_DBG_MT_MSG_traffic,
        // "MT_MSG: clone(%s, id: %d) to: id: %d\n",
        // pMI->dbg_name,
        // pOrig->sequence_id,
        // save_id);

    *pClone = *pOrig;
    pClone->sequence_id = save_id;

    if(pClone->pSrsp)
    {
        pClone->pSrsp = MT_MSG_clone(pClone->pSrsp);
    }

    /* The clone is not in a list it is new. */
    pClone->pListNext = NULL;

    pClone->was_formatted = false;
    /* Done */
    return (pClone);
}

/*
 * @brief Transmit a message
 * @param pMsg - the message t transmit
 * @returns number of messages transmitteed (1=success)
 */
static int MT_MSG_tx_raw(struct mt_msg *pMsg)
{
    int r;

    /* insert frame sync, cmd0/1 and checksum */
    MT_MSG_format_msg(pMsg);
    /* Check for valid length */
    if (pMsg->iobuf_nvalid > 2176) {
        MT_rcp_Host_dbg.num_err_bad_tx_len++;
        return 0;
    }

    LOG_lock();
    MT_MSG_dbg_decode(pMsg, pMsg->pDestIface, ALL_MT_MSG_DBG);

#ifdef MT_MSG_DEBUG_TRACE
    tr_debug("%s: TX Msg (start) [%s]\n",
               pMsg->pDestIface->dbg_name,
               pMsg->pLogPrefix);
#endif

    if(LOG_test(LOG_DBG_MT_MSG_raw))
    {
        //LOG_printf(LOG_DBG_MT_MSG_raw, "%s: TX %d bytes\n",
                //    pMsg->pDestIface->dbg_name,
                //    pMsg->iobuf_nvalid);
        LOG_hexdump(LOG_DBG_MT_MSG_raw, 0, pMsg->iobuf, pMsg->iobuf_nvalid);
    }
    LOG_unLock();

    /* send the bytes */
    r = STREAM_wrBytes(pMsg->pDestIface->hndl,
                        (void *)(pMsg->iobuf),
                        pMsg->iobuf_nvalid, -1);

    //LOG_printf(LOG_DBG_MT_MSG_traffic,
                // "%s: TX Msg (Complete) r=%d [%s]\n",
                // pMsg->pDestIface->dbg_name, r,
                // pMsg->pLogPrefix);
    /* great success? */
    if(r == pMsg->iobuf_nvalid)
    {
        MT_rcp_Host_dbg.num_uart_bytes_txed += r;
        /* we transmitted 1 message */
        return (1);
    }

    tr_err("%s: cannot transmit r=%d\n",
        pMsg->pDestIface->dbg_name,
        r);
    /* we transmitted 0 messages */
    return (0);
}

/*
 * @brief common code to send an extended status packet.
 * @param pMI - the message interface
 * @param pFI - the fragmentation info to use (tx or rx)
 * @param blocktype - either 3(frag ack) or 4(extended status)
 * @param statuscode - value to send.
 */
static void common_send_status(struct mt_msg_interface *pMI,
                                struct mt_msg_iface_frag_info *pFI,
                                int blocktype, int statuscode)
{
    struct mt_msg *pStatus;

    /* get a message to send */
    pStatus = MT_MSG_alloc(3, pFI->pMsg->cmd0 | _bit7, pFI->pMsg->cmd1);
    if(pStatus == NULL)
    {
        pFI->is_error = true;
        return;
    }

    /* fill in the message */
    pStatus->pLogPrefix = "frag-status";

    MT_MSG_setDestIface(pStatus, pMI);

    MT_MSG_wrU8(pStatus, (blocktype << 3) | pMI->stack_id);
    MT_MSG_wrU8(pStatus, pFI->block_cur);
    MT_MSG_wrU8(pStatus, statuscode);
    /* and send it */
    MT_MSG_tx_raw(pStatus);

    /* and release it */
    MT_MSG_free(pStatus);
    pStatus = NULL;
}

/*!
 * @brief Send an extended status packet.
 * @param pMI - the interface
 * @param pFI - the fragment info (tx or rx)
 * @param statuscode - what status to send
 */
static void send_extended_status(struct mt_msg_interface *pMI,
                                 struct mt_msg_iface_frag_info *pFI,
                                 int statuscode)
{
    // 4 is the extended status message
    common_send_status(pMI, pFI, 4, statuscode);
}

/*!
 * @brief send a normal frag_ack packet
 * @param pMI - the interface
 * @param pFI - the fragment info (tx or rx)
 * @param statuscode - what status to send
 */
static void send_frag_ack_packet(struct mt_msg_interface *pMI,
                                 struct mt_msg_iface_frag_info *pFI,
                                 int statuscode)
{
    // 3 is the "frag-ack" message
    common_send_status(pMI, pFI, 3, statuscode);
}

/*!
 * @brief Abort with an out of order message
 * @param pMI - the interface
 * @param pFI - the fragment info (tx or rx)
 */
static void send_frag_abort_outoforder(struct mt_msg_interface *pMI,
                                       struct mt_msg_iface_frag_info *pFI)
{
    send_frag_ack_packet(pMI, pFI, MT_MSG_FRAG_STATUS_block_out_of_order);
}

/*!
 * @brief Wait for the fragment ack to occur (or a timeout, or an error)
 * @param pMI - the interface in use
 * @return 0 on succes
 */
static int wait_for_frag_ack(struct mt_msg_interface *pMI)
{
    int r;
    struct mt_msg *pAck;
    int ack_block;
    int ack_status;

    /* Fragments are like sreq/srsp... */
    /* so we use the srsp timeout here */
    //LOG_printf(LOG_DBG_MT_MSG_traffic, "Waiting for frag-ack\n");
try_again:
    SEMAPHORE_waitWithTimeout(pMI->tx_frag.tx_ack_semaphore,
                              pMI->srsp_timeout_mSecs);

    MUTEX_lock(pMI->list_lock,-1);
    pAck = pMI->tx_frag.pTxFragAck;
    if(pAck)
    {
        pMI->tx_frag.pTxFragAck = pAck->pListNext;
    }
    MUTEX_unLock(pMI->list_lock);

    if(pAck == NULL)
    {
        //LOG_printf(LOG_DBG_MT_MSG_traffic, "timeout: frag-ack\n");
        /* no response */
        /* we send the current block again. */
        /* do not advance */
        r = 0;
        goto done;
    }

    /* ignore the extended version byte */
    MT_MSG_rdU8(pAck);
    /* read blocknumber */
    ack_block = MT_MSG_rdU8(pAck);
    ack_status = MT_MSG_rdU8(pAck);
    MT_MSG_parseComplete(pAck);
    if(pAck->is_error)
    {
        /* we are toast.. */
        /* out of sequence abort */
        send_frag_abort_outoforder(pMI,&(pMI->tx_frag));
        /* we are dead */
        pMI->tx_frag.is_error = true;
        /* do not advance */
        r = 0;
        goto done;
    }
    if(ack_block != pMI->tx_frag.block_cur)
    {
	/* we are one ahead. Hold back once */
	//LOG_printf(LOG_DBG_MT_MSG_traffic, "Received ack for block %d, expecting %d\n",
		//ack_block, pMI->tx_frag.block_cur);
	goto try_again;
    }
    /* resend last block? */
    if(ack_status == MT_MSG_FRAG_STATUS_resend_last)
    {
        r = 0; /* do not advance */
        goto done;
    }
    /* success? */
    if(ack_status == MT_MSG_FRAG_STATUS_success)
    {
        /* send next block */
        if(ack_block == pMI->tx_frag.block_cur)
        {
            /* yea, we advance */
            r = 1;
            goto done;
        }
    }
    if(ack_status == MT_MSG_FRAG_STATUS_frag_complete)
    {
	if(ack_block +1 == pMI->tx_frag.block_count)
	{
	    r = 1;
	    goto done;
	}
	//LOG_printf(LOG_DBG_MT_MSG_traffic, "ERROR: Fragment complete status received with "\
		"wrong block number\n");
    }

    pMI->tx_frag.is_error = true;
    tr_err("block:%d, bad ack status: %d\n",
               ack_block, ack_status);
    /* we don't understand the status.. */
    send_frag_abort_outoforder(pMI, &(pMI->tx_frag));
    /* do not advance */
    r = 0;
done:
    if(pAck)
    {
        MT_MSG_free(pAck);
        pAck = NULL;
    }
    return (r);
}

/*!
 * @brief Send a fragment chunk..
 * @param pMI - the interface in use.
 * Also see wait_for_frag_ack()
 */
static void frag_tx_one_block(struct mt_msg_interface *pMI)
{
    int rd_offset;
    int n;

    /* housekeeping.. */
    pMI->tx_frag.pTxFragData->pLogPrefix = "frag-data";
    //LOG_printf(LOG_DBG_MT_MSG_traffic, "TX: %s:(frag) block: %d of %d\n",
        //pMI->dbg_name, pMI->tx_frag.block_cur+1, pMI->tx_frag.block_count);

    /* reset the data packet. */
    MT_MSG_resetMsg(pMI->tx_frag.pTxFragData, -1,
                    pMI->tx_frag.pMsg->cmd0 | _bit7, pMI->tx_frag.pMsg->cmd1);

    /* set interfaces */

    /* it has no source */
    MT_MSG_setSrcIface(pMI->tx_frag.pTxFragData, NULL);
    /* it has an interface */
    MT_MSG_setDestIface(pMI->tx_frag.pTxFragData, pMI);

    /* insert the extended header */
    MT_MSG_wrU8(pMI->tx_frag.pTxFragData, (2 << 3) | pMI->stack_id);

    MT_MSG_wrU8(pMI->tx_frag.pTxFragData, pMI->tx_frag.block_cur);
    MT_MSG_wrU16(pMI->tx_frag.pTxFragData, pMI->tx_frag.total_size);

    /* where do we get our data? */
    rd_offset = (pMI->tx_frag.block_cur * pMI->tx_frag.this_frag_size);

    /* do not send more then the fragment size */
    n = pMI->tx_frag.pMsg->expected_len - rd_offset;
    if(n > pMI->tx_frag.this_frag_size)
    {
        n = pMI->tx_frag.this_frag_size;
    }

    /* Adjust rd offset to just after the packet header */
    rd_offset +=
        (pMI->frame_sync ? 1 : 0) +
        (pMI->len_2bytes ? 2 : 1) +
        1 + /* cmd0 */
        1; /* cmd1 */

    /* now insert data */
    MT_MSG_wrBuf(pMI->tx_frag.pTxFragData,
                  pMI->tx_frag.pMsg->iobuf + rd_offset, n);
    MT_MSG_set_type(pMI->tx_frag.pTxFragData, pMI);
    MT_MSG_tx_raw(pMI->tx_frag.pTxFragData);
}

/*!
 * @brief  transmit a fragment block and recevie the ack
 * @param pMI - interface to handle the fragment block
 * @returns number of frag blocks sent (success=1)
 *  Return 1 to advance to the block
 *  Return 0 to retransmit the current block
 *  set "is_error" if we should abandon
 */
static int frag_txrx_one_block(struct mt_msg_interface *pMI)
{
    int trynum;
    int r;

    r = 0;
    for(trynum = 0; trynum < pMI->retry_max; trynum++)
    {
        //LOG_printf(LOG_DBG_MT_MSG_traffic,
            // "TX: Block: %d of %d, Try: %d of %d\n",
            // pMI->tx_frag.block_cur+1, pMI->tx_frag.block_count,
            // trynum, pMI->retry_max);

        frag_tx_one_block(pMI);
        if(pMI->tx_frag.is_error)
        {
            break;
        }

        r = wait_for_frag_ack(pMI);
        /* if success or error, we are done */
        if((r > 0) || (pMI->tx_frag.is_error))
        {
            break;
        }
    }
    return (r);
}

/*!
 * @brief Chop up, loop over, and transmit a message via fragmentation
 * @param pMsg - msg to transmit
 * @return 1 - on success 1 [big] message was transmitted.
 */
static int MT_MSG_tx_fragment(struct mt_msg *pMsg)
{
    int r;
    struct mt_msg_interface *pMI;

    pMI = pMsg->pDestIface;

    pMI->tx_frag.pMsg = pMsg;
    pMI->tx_frag.is_error = false;

    pMI->tx_frag.total_size = pMsg->expected_len;
    pMI->tx_frag.this_frag_size = pMsg->pDestIface->tx_frag_size;
    pMI->tx_frag.block_cur = 0;
    pMI->tx_frag.block_count =
        (pMsg->expected_len + pMI->tx_frag.this_frag_size - 1) /
        pMI->tx_frag.this_frag_size;

    pMI->tx_frag.pTxFragData = MT_MSG_alloc(-1,
                                             pMsg->cmd0 | _bit7,
                                             pMsg->cmd1);
    if(pMI->tx_frag.pTxFragData == NULL)
    {
        tr_err("no memory to fragment\n");
        pMI->tx_frag.is_error = true;
    }
    else
    {
        /* for each block.. */
        r = 0;
        for(pMI->tx_frag.block_cur = 0;
            pMI->tx_frag.block_cur < pMI->tx_frag.block_count;
                pMI->tx_frag.block_cur += r)
        {

            if(pMI->tx_frag.is_error)
            {
                break;
            }

            /* transfer the block */
            r = frag_txrx_one_block(pMI);
            /* this returns: */
            /* 0 - resend current block */
            /* or +1 to send the next block */
        }
    }

    /* what is our result? */
    if(pMI->tx_frag.is_error)
    {
        send_extended_status(pMI, &(pMI->tx_frag),
                              MT_MSG_EXT_STATUS_frag_aborted);
        /* we transmitted 0 packets */
        r = 0;
    }
    else
    {
        /* we send the last block *NUMBER* not the *COUNT*
           Due to the for() loop above
           "block_cur == block_count"
           We must send the last block number
           not the *block*count* in the extended status.
        */
        pMI->tx_frag.block_cur--;
        send_extended_status(pMI, &(pMI->tx_frag),
                              MT_MSG_EXT_STATUS_frag_complete);
        /* we transmitted 1 packet */
        r = 1;
    }

    /* cleanup */
    pMI->tx_frag.pMsg = NULL;
    pMI->tx_frag.pTxFragAck = NULL;

    if(pMI->tx_frag.pTxFragData)
    {
        MT_MSG_free(pMI->tx_frag.pTxFragData);
        pMI->tx_frag.pTxFragData = NULL;
    }

    return (r);
}

/*!
 * @brief Transmit a message [this is not rx, see MT_MSG_txrx()]
 * @param pMsg - the message to transmit
 * @return 1 upon success [1 msg transmitted]
 */
static int MT_MSG_tx(struct mt_msg *pMsg)
{
    int r;
    /* Set the message type */
    MT_MSG_set_type(pMsg, pMsg->pDestIface);

    mt_msg_Dbg.num_tx_pkt++;

    /* if there was an error, we don't tx */
    if(pMsg->is_error || (pMsg->m_type == MT_MSG_TYPE_unknown))
    {
        /* we transmitted ZERO packets. */
        r = 0;
        goto done;
    }

    /* Do we fragment? */
    if(pMsg->pDestIface->len_2bytes)
    {
        /* we don't need to check for fragmentation */
    }
    else
    {
        if((pMsg->iobuf_nvalid > 256) ||
            (pMsg->iobuf_nvalid >= pMsg->pDestIface->tx_frag_size))
        {
            /* yes, we fragment */
            r = MT_MSG_tx_fragment(pMsg);
            goto done;
        }
    }

    r = MT_MSG_tx_raw(pMsg);
done:
    return (r);
}

/*
  release resources for this message interface
  see mt_msg.h
*/
void MT_MSG_interfaceDestroy(struct mt_msg_interface *pMI)
{
    if(pMI == NULL)
    {
        return;
    }

    //LOG_printf(LOG_DBG_MT_MSG_traffic,
               //"%s: Destroy interface\n", pMI->dbg_name);
    pMI->is_dead = true;

    /* kill off any messages we have in process */
    if(pMI->pCurRxMsg)
    {
        MT_MSG_free(pMI->pCurRxMsg);
        pMI->pCurRxMsg = NULL;
    }

    /* close our connection */
    if(pMI->hndl)
    {
        STREAM_close(pMI->hndl);
        /* is this a socket connection? */
        if(pMI->s_cfg)
        {
            if(pMI->s_cfg->ascp == 'c')
            {
                SOCKET_CLIENT_destroy(pMI->hndl);
            }
            else
            {
                SOCKET_SERVER_destroy(pMI->hndl);
            }
        }
        pMI->hndl = 0;
    }

    /* and our rx thread */
    if(pMI->rx_thread)
    {
        THREAD_destroy(pMI->rx_thread);
        pMI->rx_thread = 0;
    }

    /* any pending message are tossed */
    MT_MSG_LIST_destroy(&(pMI->rx_list));

    /* our lock */
    if(pMI->list_lock)
    {
        MUTEX_destroy(pMI->list_lock);
        pMI->list_lock = 0;
    }

    /* our SREQ/SRSP semaphore */
    if(pMI->srsp_semaphore)
    {
        SEMAPHORE_destroy(pMI->srsp_semaphore);
        pMI->srsp_semaphore = 0;
    }

    /* our fragmentation semaphore */
    if(pMI->tx_frag.tx_ack_semaphore)
    {
        SEMAPHORE_destroy(pMI->tx_frag.tx_ack_semaphore);
        pMI->tx_frag.tx_ack_semaphore = 0;
    }

    if(pMI->tx_lock)
    {
        MUTEX_destroy(pMI->tx_lock);
        pMI->tx_lock = 0;
    }

    /* Any pending sreq is dead */
    MT_MSG_free(pMI->pCurSreq);
    pMI->pCurSreq = NULL;

    /* we do *NOT* zap (zero) the interface. */
    /* The caller may need to release destroy the handle. */
}

/*!
 * @brief Read N bytes from the interface and insert into the message
 * @param pMsg - the message to insert into
 * @param n - how many bytes we need
 * @param timeout_mSecs - how long to wait
 * @returns nbytes valid in the rx buffer (total)
 */
static int mt_msg_rx_bytes(struct mt_msg_interface *pMI,
                            int n, int timeout_mSecs)
{
    struct mt_msg *pMsg;
    int r;
    int nneed;

    pMsg = pMI->pCurRxMsg;

    /* do we already have enough? */
    if(pMsg->iobuf_nvalid >= n)
    {
        return (n);
    }
    /* how many *MORE* do we need? */
    nneed = n - pMsg->iobuf_nvalid;

    /* go read */
#ifndef NPI_USE_NLI
    r = STREAM_rdBytes(pMI->hndl,
                       pMsg->iobuf + pMsg->iobuf_nvalid,
                       nneed,
                       timeout_mSecs);
#else
    r = STREAM_rdBytes(pMI->hndl,
                       pMsg->iobuf,
                       nneed,
                       timeout_mSecs);
#endif

    if(r > 0)
    {
        /* great success? */
        pMsg->iobuf_nvalid += r;
        MT_rcp_Host_dbg.num_uart_bytes_rxed += r;
    }
    if(r <= 0)
    {
        if(STREAM_isSocket(pMI->hndl))
        {
            /* did we get a tcpip disconnect? */
            if(!STREAM_SOCKET_isConnected(pMI->hndl))
            {
                //LOG_printf(LOG_DBG_MT_MSG_traffic,
                        //    "%s: Socket is dead\n",
                        //    pMI->dbg_name);
                pMI->is_dead = true;
            }
        }
        else
        {
            if(r < 0)
            {
                /* USB uarts die if they are disconnected */
                pMI->is_dead = true;
            }
        }
    }
    /* log ... */
    if(pMsg->iobuf_nvalid)
    {
        if(LOG_test(LOG_DBG_MT_MSG_raw))
        {
            //LOG_printf(LOG_DBG_MT_MSG_raw,
                    //    "%s: nbytes-avail: %d\n",
                    //    pMI->dbg_name,
                    //    pMsg->iobuf_nvalid);
            LOG_hexdump(LOG_DBG_MT_MSG_raw,
                        0,
                        pMI->pCurRxMsg->iobuf,
                        pMI->pCurRxMsg->iobuf_nvalid);
        }
    }

    return (pMsg->iobuf_nvalid);
}

/*!
 * @brief - read a message from the interface.
 * @param pMI - msg interface
 * @returns NULL if no message received, otherwise a valid msg
 */
static struct mt_msg *mt_msg_rx(struct mt_msg_interface *pMI)
{
    int r;
    int nneed;
    struct mt_msg *pMsg;

    /* do we allocate a new message? */
    if(pMI->pCurRxMsg == NULL)
    {
        pMI->pCurRxMsg = MT_MSG_alloc(-1, -1, -1);
        /* allocation error :-(*/
        if(pMI->pCurRxMsg == NULL)
        {
            return (NULL);
        }
        pMI->pCurRxMsg->pLogPrefix = _incoming_msg;
        MT_MSG_setSrcIface(pMI->pCurRxMsg, pMI);
    }
    else
    {
        MT_MSG_resetMsg(pMI->pCurRxMsg, -1, -1, -1);
    }

    pMsg = pMI->pCurRxMsg;

    //LOG_printf(LOG_DBG_MT_MSG_traffic,
            //    "%s: rx-msg looking for start\n",
            //    pMI->dbg_name);

try_again:
    /* zap what we have */
    pMsg->iobuf_nvalid = 0;
    /* zap the existing buffer for debug reasons */
    memset((void *)(&(pMsg->iobuf[0])), 0, pMsg->iobuf_idx_max);

    /* how many bytes should we get? */
    nneed = (
        (pMI->frame_sync ? 1 : 0) + /* sync */
        (pMI->len_2bytes ? 2 : 1) + /* len */
        1 + /* cmd0 */
        1 + /* cmd1 */
        0 + /* unknown length yet */
        (pMI->include_chksum ? 1 : 0)); /* checksum */

read_more:
    r = mt_msg_rx_bytes(pMI, nneed, pMI->intermsg_timeout_mSecs);
    if(r == 0)
    {
        //LOG_printf(LOG_DBG_MT_MSG_traffic, "%s: rx-silent\n", pMI->dbg_name);
        return (NULL);
    }

    if(r < 0)
    {
        /* something is wrong */
        //LOG_printf(LOG_DBG_MT_MSG_traffic, "%s: Io error?\n", pMI->dbg_name);
        return (NULL);
    }

    /* we start reading at byte 0 in the message */
    pMsg->iobuf_idx = 0;

    /* should we find a frame sync? */
    if(pMI->frame_sync)
    {
        /* hunt for the sync byte */
        /* and move the sync byte to byte 0 in the buffer */
        uint8_t *p8;

        p8 = (uint8_t *)memchr((void *)(&pMsg->iobuf[0]),
                               0xfe,
                               pMsg->iobuf_nvalid);
        if(p8 == NULL)
        {
            /* not found */
#ifdef MT_MSG_DEBUG_TRACE
            tr_debug("Garbage data...\n");
#endif
            tr_err("RX packet frame Sync not found");
            goto try_again;
        }
#ifndef NPI_USE_NLI
        /* frame sync must start at zero. */
        if(p8 != pMsg->iobuf)
        {
            /* need to shift data over some */

            /* how many bytes to shift? */
            int n;
            n = (int)(&(pMsg->iobuf[pMsg->iobuf_nvalid]) - p8);
            /* shift */
            memmove((void *)(&pMsg->iobuf[0]), (void *)p8, n);
            /* zero what we deleted */
            memset((void *)(&(pMsg->iobuf[n])), 0, pMsg->iobuf_nvalid - n);
            pMsg->iobuf_nvalid = n;
            /* Do we have enough bytes? */
            if(nneed > pMsg->iobuf_nvalid)
            {
                /* No - we need more, go get more */
                goto read_more;
            }
        }
#else
        if(p8 != pMsg->iobuf)
        {   // the first byte should be sync word (0xFE)
            // if the sync word is not found, drop the whole packet
            // goto try_again;
            mt_msg_Dbg.num_rx_err_no_frame_sync++;
            tr_err("RX packet frame Sync not at beginning");
            return NULL;
        }
#endif
        /* DUMMY read of the sync byte */
        MT_MSG_rdU8(pMsg);
    }

    /* Found start */
    /* how big is our length? */
    if(pMI->len_2bytes)
    {
        pMsg->expected_len = MT_MSG_rdU16(pMsg);
    }
    else
    {
        pMsg->expected_len = MT_MSG_rdU8(pMsg);
    }

    pMsg->cmd0 = MT_MSG_rdU8(pMsg);
    pMsg->cmd1 = MT_MSG_rdU8(pMsg);

    nneed += pMsg->expected_len;
#ifndef NPI_USE_NLI
    /* read the data component */
    r = mt_msg_rx_bytes(pMI, nneed, pMI->intersymbol_timeout_mSecs);
    if(r != nneed)
    {
        /* something is wrong? */
        if(r > 0)
        {
            /* we got some ... but not enough .. */
            //LOG_printf(LOG_DBG_MT_MSG_raw,
                // "Short read ... got: %d, want: %d, try again...\n",
                // nneed, r);
            goto read_more;
        }
        tr_err("%s: expected: %d, got: %d\n",
            pMI->dbg_name, nneed, r);
    dump_recover:
        //LOG_printf(LOG_DBG_MT_MSG_traffic, "Flushing RX stream\n");
        /* Dump all incoming data until we find a sync byte */
        STREAM_rdDump(pMI->hndl, pMI->flush_timeout_mSecs);
        goto try_again;
    }
#else
    // in HDLC, whole packet is received, just make sure we have enough data
    if (r < nneed)
    {   //drop this packet
        mt_msg_Dbg.num_rx_err_packet_len++;

        tr_err("RX packet too short (packet-len=%d): need: %d\n",r, nneed);
        //goto try_again;
        return NULL;
    }
#endif

    /* Dummy read to the end of the data. */
    /* this puts us at the checksum byte (if present) */
    MT_MSG_rdBuf(pMsg, NULL, pMsg->expected_len);

    /* do the checksum */
    if(pMI->include_chksum)
    {
        r = MT_MSG_calc_chksum(pMsg, 'f', pMsg->iobuf_nvalid);
        if(r != 0)
        {
            tr_err("%s: chksum error\n",
                pMI->dbg_name);
            LOG_hexdump(!LOG_ERROR, 0, pMsg->iobuf, pMsg->iobuf_nvalid);
#ifndef NPI_USE_NLI
			goto dump_recover;
#else
            //LOG_printf(LOG_DBG_MT_MSG_traffic, "Flushing RX stream\n");
           /* Dump all incoming data until we find a sync byte */

           mt_msg_Dbg.num_rx_err_checksum++;

           tr_err("%s: chksum error\n",pMI->dbg_name);
           return NULL;
#endif
        }
    }
    /* We have a message */
    MT_MSG_set_type(pMsg, pMsg->pSrcIface);
    /* Set the iobuf_idx to the start of the payload */

    /* since we will be parsing the message... */
    /* Set the iobuf_idx to the start of the payload */
    pMsg->iobuf_idx = (
        (pMI->frame_sync ? 1 : 0) +
        (pMI->len_2bytes ? 2 : 1) +
        1 + /* cmd0 */
        1 /* cmd1 */
       );
    /* next time we need to allocate a new message */
    pMI->pCurRxMsg = NULL;

    mt_msg_Dbg.num_rx_pkt++;

    /* return our message */
    return (pMsg);
}

/*!
 * @brief We have received an extended status message handle it
 * @param pMsg - the message
 * @return NULL if we are not done with the fragmentation
 */
static struct mt_msg *handle_ext_status(struct mt_msg *pMsg)
{
    int block_num;
    int status;
    const char *cp;

    /* ignore the version byte */
    MT_MSG_rdU8(pMsg);
    block_num = MT_MSG_rdU8(pMsg);
    status = MT_MSG_rdU8(pMsg);

    switch (status)
    {
    default:
        cp = "unknown";
        break;
    case MT_MSG_EXT_STATUS_mem_alloc_error:
        cp = "alloc-error";
        break;
    case MT_MSG_EXT_STATUS_frag_complete:
        cp = "frag-complete";
        break;
    case MT_MSG_EXT_STATUS_frag_aborted:
        cp = "aborted";
        break;
    case MT_MSG_EXT_STATUS_unsupported_ack:
        cp = "unsupported-ack";
        break;
    }
#ifdef MT_MSG_DEBUG_TRACE
    tr_debug("extended status: block: %d, %s\n",
        block_num, cp);
#endif
    MT_MSG_free(pMsg);
    pMsg = NULL;
    return (NULL);
}

/*!
 * @brief Send the fragmentation ack for blocknum.
 * @param pMI - where to send it
 * @param pFI - fragmentation info
 */
static void send_frag_ack(struct mt_msg_interface *pMI,
                          struct mt_msg_iface_frag_info *pFI)
{
    struct mt_msg *pAck;

    /* create our extended packet */
    pAck = MT_MSG_alloc(3, pFI->pMsg->cmd0 | _bit7, pFI->pMsg->cmd1);
    if(pAck == NULL)
    {
        /* nothing we can do.. */
        return;
    }
    pAck->pLogPrefix = "frag-ack";
    MT_MSG_setDestIface(pAck, pMI);
    MT_MSG_wrU8(pAck, (3 << 3) | pMI->stack_id);
    MT_MSG_wrU8(pAck, pFI->block_cur);

    if((pFI->block_cur+ 1) == pFI->block_count)
    {
        MT_MSG_wrU8(pAck, MT_MSG_FRAG_STATUS_frag_complete);
    }
    else
    {
        MT_MSG_wrU8(pAck, MT_MSG_FRAG_STATUS_success);
    }
    MT_MSG_tx_raw(pAck);
    MT_MSG_free(pAck);
}

/*!
 * @brief handle first packet of a fragmented message
 * @param pRxmsg - the fragment we just received.
 * @return 0 success
 */
static int rx_first_frag_block(struct mt_msg *pRxMsg)
{
    struct mt_msg_interface *pMI;
    int rd_loc;
    int wr_loc;

    pMI = pRxMsg->pSrcIface;

    /* we don't use these */
    pMI->rx_frag.pTxFragAck = NULL;
    pMI->rx_frag.pTxFragData = NULL;

    /* we have no error (YET!) */
    pMI->rx_frag.is_error = false;

    /* we'll keep this here. */
    pMI->rx_frag.pMsg = pRxMsg;

    /* skip the version byte */
    MT_MSG_rdU8(pMI->rx_frag.pMsg);

    /* read the block number */
    /* must start with block 0 */
    pMI->rx_frag.block_cur = MT_MSG_rdU8(pMI->rx_frag.pMsg);

    pMI->rx_frag.total_size = MT_MSG_rdU16(pMI->rx_frag.pMsg);

    /* "-4" is because the size of *this* extended header is 4 bytes. */
    pMI->rx_frag.this_frag_size = pMI->rx_frag.pMsg->expected_len - 4;

    /* determine how many blocks we should receive */
    pMI->rx_frag.block_count =
        (pMI->rx_frag.total_size + pMI->rx_frag.this_frag_size - 1) /
        pMI->rx_frag.this_frag_size;

#ifdef MT_MSG_DEBUG_TRACE
    tr_debug("RX Frag: Block %d of %d, frag size: %d\n",
        pMI->rx_frag.block_cur + 1,
        pMI->rx_frag.block_count,
        pMI->rx_frag.this_frag_size);
#endif

    /* sanity check, did we get block 0? */
    if(pMI->rx_frag.block_cur != 0)
    {
        tr_err("RX-non-first-block\n");

        /* abort */
        send_frag_abort_outoforder(pMI, &(pMI->rx_frag));

        /* toss the message we just received */
        MT_MSG_free(pMI->rx_frag.pMsg);
        pMI->rx_frag.pMsg = NULL;
        /* we handled ZERO messages */
        return (0);
    }

    /* Now, move the data in the message to the front */
    /* we are going to throw away the extended header */

    /* this is where the payload should be when done */
    wr_loc =
        (pMI->frame_sync ? 1 : 0) +
        (pMI->len_2bytes ? 2 : 1) +
        1 + /* cmd0 */
        1; /* cmd1 */

    /* the payload currently is after the header */
    rd_loc = wr_loc + 4;

    /* now move the data */
    memmove((void *)(&(pMI->rx_frag.pMsg->iobuf[wr_loc])),
        (void *)(&(pMI->rx_frag.pMsg->iobuf[rd_loc])),
        pMI->rx_frag.this_frag_size);

    /* update the expected size */
    pMI->rx_frag.pMsg->expected_len = pMI->rx_frag.total_size;
    /* clear the extended bit */
    pMI->rx_frag.pMsg->cmd0 &= 0x7f;

    /* send our ack. */
    send_frag_ack(pMI, &(pMI->rx_frag));
    /* we successfully handled 1 message */
    return (1);
}

/*!
 * @brief We have received an extended packet of type fragment data.
 * @param pMI - where it came from
 * @param pRxFrag - what we received.
 */
static struct mt_msg *handle_data_fragment(struct mt_msg *pRxFrag)
{
    struct mt_msg_interface *pMI;
    int this_block;
    int this_len;
    int rd_loc;
    int wr_loc;
    bool last_block;
    bool bad;

    /* recover the interface */
    pMI = pRxFrag->pSrcIface;

    /* first packet is special. */
    if(pMI->rx_frag.pMsg == NULL)
    {
        rx_first_frag_block(pRxFrag);
        return (NULL);
    }

    /* all others are handled here. */

    /* throw away the 1st byte */
    MT_MSG_rdU8(pRxFrag);
    this_block = MT_MSG_rdU8(pRxFrag);
    this_len   = MT_MSG_rdU16(pRxFrag);

    /* detect errors and cleanup */
    if(pMI->rx_frag.block_cur == this_block)
    {
#ifdef MT_MSG_DEBUG_TRACE
        tr_debug("RX Frag: Duplicate block %d\n",
                   this_block);
#endif
    abort_clean_up:
        if(pMI->rx_frag.pMsg)
        {
            MT_MSG_free(pMI->rx_frag.pMsg);
            pMI->rx_frag.pMsg = NULL;
        }
        if(pRxFrag)
        {
            MT_MSG_free(pRxFrag);
            pRxFrag = NULL;
        }
        return (NULL);
    }

    if(pMI->rx_frag.total_size != this_len)
    {
        tr_err("RX Frag: total size change (was: %d, now: %d)\n",
                   pMI->rx_frag.total_size, this_len);
        send_frag_abort_outoforder(pMI, &(pMI->rx_frag));
        goto abort_clean_up;
    }

    /* is this the last block? */
    last_block = false;
    if((this_block + 1) == pMI->rx_frag.block_count)
    {
        last_block = true;
    }

    /* block order wrong? */
    if((pMI->rx_frag.block_cur + 1) != this_block)
    {
        tr_err("RX Frag: out of order, expect %d, got %d\n",
                   (pMI->rx_frag.block_cur + 1), this_block);
        send_frag_abort_outoforder(pMI, &(pMI->rx_frag));
        goto abort_clean_up;
    }

    /* how big is this specific fragment? */
    this_len = pRxFrag->expected_len - 4;

    /* size must not change */
    bad = false;
    if(last_block)
    {
        /* last block can be smaller, but not larger */
        bad = (this_len > pMI->rx_frag.this_frag_size);
    }
    else
    {
        /* internal blocks must be same size */
        bad = (this_len != pMI->rx_frag.this_frag_size);
    }

    if(bad)
    {
        /* it changed, this is wrong, so abort */
        tr_err("RX Frag: block len change new: %d, old: %d\n",
                this_len, pMI->rx_frag.this_frag_size);
        send_frag_ack_packet(pMI,
                             &(pMI->rx_frag),
                             MT_MSG_FRAG_STATUS_block_len_changed);
        goto abort_clean_up;
    }

    /* update the block number. */
    pMI->rx_frag.block_cur = this_block;

#ifdef MT_MSG_DEBUG_TRACE
    tr_debug("RX-Frag: Block %d of %d\n",
        this_block + 1,
        pMI->rx_frag.block_count);
#endif
    /* otherwise we are good, copy the data */
    rd_loc =
        4 + /* go past the extended header */
        (pMI->frame_sync ? 1 : 0) +
        (pMI->len_2bytes ? 2 : 1) +
        1 + /* cmd0 */
        1; /* cmd1; */

    /* where do we put it? */
    wr_loc = pMI->rx_frag.block_cur * pMI->rx_frag.this_frag_size;
    /* go past the header in the 'whole' packet. */
    wr_loc +=
        (pMI->frame_sync ? 1 : 0) +
        (pMI->len_2bytes ? 2 : 1) +
        1 + /* cmd0 */
        1; /* cmd1 */

    /* copy the data. */
    memcpy((void *)(&(pMI->rx_frag.pMsg->iobuf[wr_loc])),
        (void *)(&(pRxFrag->iobuf[rd_loc])),
        this_len);

    /* send our ack */
    send_frag_ack(pMI, &(pMI->rx_frag));

    /* we no longer need the fragment */
    MT_MSG_free(pRxFrag);
    pRxFrag = NULL;

    struct mt_msg *pWhole;
    pWhole = NULL;
    if(last_block)
    {
        /* send COMPLETE */
        send_extended_status(pMI,
                             &(pMI->rx_frag),
                             MT_MSG_EXT_STATUS_frag_complete);

        pWhole = pMI->rx_frag.pMsg;
        pMI->rx_frag.pMsg = NULL;

        /* set the parse point. */
        pWhole->iobuf_idx =
            (pMI->frame_sync ? 1 : 0) +
            (pMI->len_2bytes ? 2 : 1) +
            1 + /* cmd0 */
            1; /* cmd1 */

    }
    return (pWhole);
}

/*!
 * @brief We have received an extended packet, handle it
 * @param pMsg- the packet we received.
 */
static struct mt_msg *handle_extend_packet(struct mt_msg *pMsg)
{
    struct mt_msg_interface *pMI;
    const char *cp;
    /* recover where it came from */

    pMI = pMsg->pSrcIface;

    cp = NULL;
    switch (pMsg->m_type)
    {
    default:
        pMsg = NULL;
        BUG_HERE("invalid msg type\n");
        break;
    case MT_MSG_TYPE_sreq_frag_ack:
        if(cp == NULL) cp = "sreq_frag_ack";
        /* fallthru; */
    case MT_MSG_TYPE_areq_frag_ack:
        if(cp == NULL) cp = "areq_frag_ack";
        /* fallthru; */
    case MT_MSG_TYPE_srsp_frag_ack:
        if(cp == NULL) cp = "srsp_frag_ack";
        /* let sender deal with this. */
        pMsg->pLogPrefix = cp;
#ifdef MT_MSG_DEBUG_TRACE
        tr_debug("RX frag-ack\n");
#endif
        MUTEX_lock(pMI->list_lock, -1);
        pMsg->pListNext = pMI->tx_frag.pTxFragAck;
        pMI->tx_frag.pTxFragAck = pMsg;
        pMsg = NULL;
        MUTEX_unLock(pMI->list_lock);
        SEMAPHORE_put(pMI->tx_frag.tx_ack_semaphore);
        break;
    case MT_MSG_TYPE_sreq_frag_data:
        if(cp == NULL) cp = "sreq_frag_data";
        /* fallthrugh */
    case MT_MSG_TYPE_areq_frag_data:
        if(cp == NULL) cp = "areq_frag_data";
        /* fallthrugh */
    case MT_MSG_TYPE_srsp_frag_data:
        if(cp == NULL) cp = "srsp_frag_data";
        pMsg->pLogPrefix = cp;
        pMsg = handle_data_fragment(pMsg);
        break;
    case MT_MSG_TYPE_sreq_ext_status:
        if(cp == NULL) cp = "sreq_ext_status";
        /* fallthru; */
    case MT_MSG_TYPE_areq_ext_status:
        if(cp == NULL) cp = "areq_ext_status";
        /* fallthru; */
    case MT_MSG_TYPE_srsp_ext_status:
        if(cp == NULL) cp = "srsp_ext_status";
        pMsg->pLogPrefix = cp;
        pMsg = handle_ext_status(pMsg);
        break;
    }
    return (pMsg);
}

/*!
 * @brief rx thread that handles all incoming messages.
 * @param cookie - the message interface in disguise
 * @return nothing important.
 */
static intptr_t mt_msg_rx_thread(intptr_t cookie)
{
    int a;
    int b;
    struct mt_msg_interface *pMI;
    struct mt_msg *pRxMsg;

    /* recover our message */
    pMI = (struct mt_msg_interface *)(cookie);
    /* run till we die */
    for(;;)
    {
#ifndef NPI_USE_NLI
        usleep(100000); // 100ms sleep
#endif
        if(pMI->is_dead)
        {
            break;
        }

        if(STREAM_isError(pMI->hndl))
        {
            //LOG_printf(LOG_ERROR, "%s: Dead\n", pMI->dbg_name);
            break;
        }

        /* rx a message (this is a blocking call) */
        pRxMsg = mt_msg_rx(pMI);
        if(pRxMsg == NULL)
        {
            continue;
        }
        /* Debug dump if requested */
        MT_MSG_dbg_decode(pRxMsg, pRxMsg->pSrcIface, ALL_MT_MSG_DBG);

        /* if this message has the extension bit.. */
        if(pRxMsg->cmd0 & _bit7)
        {
            pRxMsg = handle_extend_packet(pRxMsg);
        }

        /* did we complete the decoding of a the extended packet? */
        /* or if we got a normall packet... */
        if(pRxMsg == NULL)
        {
            /* nothing left to do... */
            continue;
        }

        if(pRxMsg->m_type == MT_MSG_TYPE_areq)
        {
        areq_msg:
#ifdef MT_MSG_DEBUG_TRACE
            tr_debug("rx areq\n");
#endif
            /* async request */
            MT_MSG_LIST_insert(pMI, &(pMI->rx_list), pRxMsg);
            pRxMsg = NULL;
            continue;
        }

        if(pRxMsg->m_type == MT_MSG_TYPE_poll)
        {
            /* polls are handled as an areq */
            goto areq_msg;
        }

        if(pRxMsg->m_type == MT_MSG_TYPE_sreq)
        {
            /* polls are handled as an areq */
            goto areq_msg;
        }

        //ignore processing of srsps for now

        /* it should match our current Sreq */
        /* and it might not match our Sreq */
        // if(pMI->pCurSreq == NULL)
        // {
        //     /* But there is no current sreq? */
        //     MT_MSG_log(LOG_DBG_MT_MSG_traffic, pRxMsg, "no pending sreq?\n");
        //     /* treat as an areq */
        //     goto areq_msg;
        // }

        /* Does this match? */

        /* Upper bits[7:5] = message type */
        /* Lower bits[4:0] = subsystem number */
        /* We only care about the subsystem number */
        // a = _bitsXYof(pMI->pCurSreq->cmd0, 4, 0);
        // b = _bitsXYof(pRxMsg->cmd0, 4, 0);
        // if((a == b) && (pMI->pCurSreq->cmd1 == pRxMsg->cmd1))
        // {
        //     /* All is well */
        // }
        // else
        // {
        //     /* does not match.. */
        //     MT_MSG_log(LOG_DBG_MT_MSG_traffic,
        //         pRxMsg,
        //         "sreq(cmd0=0x%02x, cmd1=0x%02x) does not match\n",
        //         pMI->pCurSreq->cmd0,
        //         pMI->pCurSreq->cmd1);
        //     /* treat as areq */
        //     goto areq_msg;
        // }

        /* attach it to the request */
        //pMI->pCurSreq->pSrsp = pRxMsg;
        //pMI->pCurSreq = NULL;

        // free message
        MT_MSG_free(pRxMsg);

        /* wake up the waiter */
        //SEMAPHORE_put(pMI->srsp_semaphore);
    }
    //LOG_printf(LOG_ERROR, "%s: rx-thread dead\n", pMI->dbg_name);
    /* we die */
    return (0);
}

/*
  Initialize a message interface.
  see mt_msg.h
*/
int MT_MSG_interfaceCreate(struct mt_msg_interface *pMI)
{
    int r;

    pMI->is_dead = false;

    /*
     The handle may come in pre-populated.
     or we may need to create our socket interface
    */
    if(pMI->s_cfg)
    {
        if(pMI->s_cfg->ascp == 's')
        {
            /*
              you really need to do this instead:
               (A) create the socket.
               (B) set socket to listen mode.
               (C) then accept socket connections
               (D) For each accepted socket...
                     Possibly create new threads for each socket.
                     That is not something we do here.
            */
            BUG_HERE("server socket is not supported here\n");
        }
        else
        {
            /* create our socket */
            pMI->hndl = SOCKET_CLIENT_create(pMI->s_cfg);
            if(pMI->hndl)
            {
                /* then connect */
                r = SOCKET_CLIENT_connect(pMI->hndl);
                if(r < 0)
                {
                    /* destroy if we could not connect */
                    SOCKET_CLIENT_destroy(pMI->hndl);
                    pMI->hndl = 0;
                }
            }
        }
    }
    else if(pMI->u_cfg)
    {
        pMI->hndl = STREAM_createUart(pMI->u_cfg);
        if(pMI->hndl)
        {
            /* go flush all incoming data */
            if( pMI->startup_flush )
                STREAM_rdDump(pMI->hndl, pMI->flush_timeout_mSecs);
        }
    }
    else
    {
        /* Connection is a *SOCKET* */
        /* Verify we have a socket handle! */
        if(pMI->hndl == 0)
        {
            BUG_HERE("no interface pointer\n");
        }
    }

    if(pMI->hndl == 0)
    {
        goto bad;
    }

    r= MT_MSG_LIST_create(&(pMI->rx_list), pMI->dbg_name, "rx-msgs");
    if(r != 0)
    {
        goto bad;
    }

    pMI->tx_lock = MUTEX_create("mi-tx-lock");
    pMI->srsp_semaphore = SEMAPHORE_create("srsp-semaphore", 0);
    pMI->tx_frag.tx_ack_semaphore = SEMAPHORE_create("frag-semaphore", 0);
    pMI->list_lock = MUTEX_create("mi-lock");

    if((pMI->tx_lock == 0) ||
        (pMI->srsp_semaphore == 0) ||
        (pMI->tx_frag.tx_ack_semaphore == 0) ||
        (pMI->list_lock == 0))
    {
        goto bad;
    }

    /* attempt to choose reasonable defaults */
    if(pMI->tx_frag_size == 0)
    {
        /*
            1 byte frame sync [optional]
            1 byte len
            1 byte cmd0
            1 byte cmd1
            ext: 1 byte version
            ext: 2 byte total length
            ext: 1 byte block number
             *variable* data
            1 byte checksum [optional]
           =======
            9 bytes allocated, worse case
           256 - 9 = 247
        */
        pMI->tx_frag_size = 247;
    }

    if(pMI->retry_max == 0)
    {
        pMI->retry_max = 3;
    }

    if(pMI->frag_timeout_mSecs == 0)
    {
        pMI->frag_timeout_mSecs = 2000;
    }

    if(pMI->intersymbol_timeout_mSecs == 0)
    {
        pMI->intersymbol_timeout_mSecs = 100;
    }

    if(pMI->srsp_timeout_mSecs == 0)
    {
        pMI->srsp_timeout_mSecs = 3000;
    }

    if(pMI->flush_timeout_mSecs == 0)
    {
        pMI->flush_timeout_mSecs = 50;
    }

    if(pMI->intermsg_timeout_mSecs == 0)
    {
        pMI->intermsg_timeout_mSecs = 3000;
    }

    if(pMI->tx_lock_timeout == 0)
    {
        pMI->tx_lock_timeout = 3000;
    }

    /* create the thread last... because it is going to run */
    pMI->rx_thread = THREAD_create(pMI->dbg_name,
                                    mt_msg_rx_thread,
                                    (intptr_t)(pMI),
                                    THREAD_FLAGS_DEFAULT);

    if((pMI->hndl == 0) || (pMI->rx_thread == 0))
    {
    bad:
        /* problem? */
        MT_MSG_interfaceDestroy(pMI);
        return (-1);
    }
    else
    {
        return (0);
    }
}

/*
  Create a message list
  see mt_msg.h
*/
int MT_MSG_LIST_create(struct mt_msg_list *pML,
                        const char *dbg_name,
                        const char *name2)
{
    size_t len;
    char *cp;

    memset((void *)(pML), 0, sizeof(*pML));

    /* +1 - for null byte
     * +1 - for "-" in %s-%s" below
     * total 2
     */
    len = 2 + strlen(dbg_name);
    if(name2)
    {
        len += strlen(name2);
    }
    else
    {
        /* nothing to add */
    }
    cp = calloc(1, len);
    if(cp)
    {
        if(name2)
        {
            (void)snprintf(cp, len, "%s-%s", dbg_name, name2);
        }
        else
        {
            strcpy(cp, dbg_name);
        }
        pML->dbg_name = cp;
    }
    pML->sem = SEMAPHORE_create(dbg_name, 0);
    pML->pList = NULL;

    if((pML->dbg_name == NULL) ||
        (pML->sem == 0))
    {
        MT_MSG_LIST_destroy(pML);
        return (-1);
    }
    else
    {
        return (0);
    }
}

/*
  Insert a message into this message list.
  see mt_msg.h
*/
void MT_MSG_LIST_insert(struct mt_msg_interface *pMI,
                         struct mt_msg_list *pML,
                         struct mt_msg *pMsg)
{
    struct mt_msg **ppMsg;

    MUTEX_lock(pMI->list_lock,-1);
    ppMsg = &(pML->pList);

    /* nothing follows this guy */
    pMsg->pListNext = NULL;

    /* goto end of the list */
    while(*ppMsg)
    {
        ppMsg = &((*ppMsg)->pListNext);
    }

    /* add to end */
    *ppMsg = pMsg;

    MUTEX_unLock(pMI->list_lock);

    //SEMAPHORE_put(pML->sem);
    //signal Nanostack RCP interface tasklet to process the areq received
    platformRcpAReqRxedSignal(0);
}

/*
  Remove a message from this message list.
  see mt_msg.h
*/
struct mt_msg *MT_MSG_LIST_remove(struct mt_msg_interface *pMI,
                            struct mt_msg_list *pML, int timeout_mSecs)
{
    struct mt_msg *pMsg;

    /* did data arrive? */
    //SEMAPHORE_waitWithTimeout(pML->sem, timeout_mSecs);

    /* remove */
    MUTEX_lock(pMI->list_lock, -1);

    pMsg = pML->pList;
    if(pMsg)
    {
        pML->pList = pMsg->pListNext;
        pMsg->pListNext = NULL;
    }

    MUTEX_unLock(pMI->list_lock);

    return (pMsg);
}

/*
  Destroy a message list
  see mt_msg.h
*/
void MT_MSG_LIST_destroy(struct mt_msg_list *pML)
{
    struct mt_msg *pMsg;

    /* the list might be in a strange state */
    /* not fully initialized */
    /* do this carefully */

    while(pML->pList)
    {
        pMsg = pML->pList;
        pML->pList = pMsg->pListNext;
        pMsg->pListNext = NULL;

        MT_MSG_free(pMsg);
    }

    if(pML->sem)
    {
        SEMAPHORE_destroy(pML->sem);
        pML->sem = 0;
    }

    if(pML->dbg_name)
    {
        free_const((const void *)(pML->dbg_name));
        pML->dbg_name = NULL;
    }

    memset((void *)(pML), 0, sizeof(*pML));

}

/*
 Transmit this message, and if needed receive the srsp reply
  see mt_msg.h
*/
int MT_MSG_txrx(struct mt_msg *pMsg)
{
    int r;
    struct mt_msg_interface *pMI;

    /* get our destination interface */
    pMI = pMsg->pDestIface;

    /* do not transmit 2 messages at the same time */
    r = MUTEX_lock(pMI->tx_lock, pMI->tx_lock_timeout);
    if(r != 0)
    {
        //LOG_printf(LOG_ERROR, "%s: Interface lock timeout\n", pMI->dbg_name);
        tr_err("Interface lock timeout\n");
        /* we transmitted zero messages */
        return (0);
    }

    /* We have no response yet */
    pMsg->pSrsp = NULL;

    MT_MSG_set_type(pMsg, pMI);

    if(pMsg->m_type == MT_MSG_TYPE_unknown)
    {
        BUG_HERE("unknown msg type\n");
    }

    /* we are about to send an SREQ */
    if(pMI->pCurSreq)
    {
        // Note: Since SRSP is not handled, this error is expected. Ignore.
        // BUG_HERE("interface: %s, has a pending SREQ!\n", pMI->dbg_name);
    }

    /* this is our pending SREQ... */
    pMI->pCurSreq = pMsg;
    /* send our message */
    r = MT_MSG_tx(pMsg);

    /* could we send it? */
    if(r != 1)
    {
        tr_err("Cannot transmit, result: %d (expected: 1)\n", r);

        /* No, ... cleanup */
        /* we have nothing pending any more. */
        pMI->pCurSreq = NULL;
        pMsg->is_error = true;
        /* did not transmit and did not receive */
        r = 0;
        goto done;
    }

    /* we transmitted, so our result so far is 1. */
    r = 1;
    /* is this a command expecting a response? */
    // if(pMsg->m_type != MT_MSG_TYPE_sreq)
    // {
    //     /* we have nothing pending any more. */
    //     pMI->pCurSreq = NULL;
    // }
    // else
    // {
    //     /* wait for the response... */
    //     SEMAPHORE_waitWithTimeout(pMI->srsp_semaphore, pMI->srsp_timeout_mSecs);
    //     /* clear the SREQ  */
    //     pMI->pCurSreq = NULL;
    //     /* Did we get our answer?  */
    //     if(pMsg->pSrsp)
    //     {
    //         /* Yea!! Success! */
    //         /* we received +1 */
    //         r = r + 1;
    //         /* --- Total =2 */
    //     }
    // }
done:
    MUTEX_unLock(pMI->tx_lock);
    return (r);
}

/*
  mark this cmd0 byte as a poll.
  Public function mt_msg.h
*/
uint8_t MT_MSG_cmd0_poll(int cmd0)
{
    return ((0 << 5) | _bitsXYof(cmd0, 4, 0));
}

/*
  mark this cmd0 byte as sreq
  Public function mt_msg.h
*/
uint8_t MT_MSG_cmd0_sreq(int cmd0)
{
    return ((1 << 5) | _bitsXYof(cmd0, 4, 0));
}

/*
  mark this cmd0 byte as an areq
  Public function mt_msg.h
*/
uint8_t MT_MSG_cmd0_areq(int cmd0)
{
    return ((2 << 5) | _bitsXYof(cmd0, 4, 0));
}

/*
  mark this cmd0 byte as an srsp
  Public function mt_msg.h
*/
uint8_t MT_MSG_cmd0_srsp(int cmd0)
{
    return ((3 << 5) | _bitsXYof(cmd0, 4, 0));
}

/*
 Set the destination interface
 Public function in mt_msg.h
*/
void MT_MSG_setDestIface(struct mt_msg *pMsg, struct mt_msg_interface *pIface)
{
    pMsg->pDestIface = pIface;
    /* once the destination interface is known */
    /* we can initialize the write index.      */
    init_wr_idx(pMsg);
}

/*
 Set the source interface
 Public function in mt_msg.h
*/
void MT_MSG_setSrcIface(struct mt_msg *pMsg, struct mt_msg_interface *pIface)
{
    pMsg->pSrcIface = pIface;
}

/*
  Reset so we can reuse the message
  Public function mt_msg.h
*/
void MT_MSG_reset(struct mt_msg_interface *pIface, int type)
{
    struct mt_msg *pMsg;
    int r;

    /* allocate the SYS_RESET_REQ message */
    pMsg = MT_MSG_alloc(1, SYS_RESET_REQ_cmd0, SYS_RESET_REQ_cmd1);
    if(pMsg == NULL)
    {
        return;
    }

    pMsg->pLogPrefix = "reset-cmd";

    MT_MSG_setDestIface(pMsg, pIface);
    /* set type */
    MT_MSG_wrU8(pMsg, (uint8_t)(type));

    /* send & receive */
    r = MT_MSG_txrx(pMsg);
    (void)r;
    /* done */
    MT_MSG_free(pMsg);
}

/*!
 * @brief internal function to get an address from the device.
 * @param pMI - the interface
 * @param typecode - the type of address to get
 * @param result - where to put it
 *
 * @return 2 (txmsg + rxmsg = 2 total msgs) on success
 */
static int get_extAddr(struct mt_msg_interface *pMI,
                       int typecode,
                       uint8_t *result)
{
    struct mt_msg *pMsg;
    struct mt_msg *pReply;
    int r;
    int x;
    int v;

    /* not requested so we are done */
    if(result == NULL)
    {
        return (0);
    }

    *result = 0;

    /* allocate MT_UTIL_GET_EXT_ADDR message */
    pMsg = MT_MSG_alloc(1, MT_UTIL_GET_EXT_ADDR_cmd0, MT_UTIL_GET_EXT_ADDR_cmd1);
    if(!pMsg)
    {
        return (0);
    }
    pMsg->pLogPrefix = "get-ext-addr";
    MT_MSG_setDestIface(pMsg, pMI);

    pMsg->pLogPrefix = "get-ext-addr";
    /* specify what we want */
    MT_MSG_wrU8(pMsg, (uint8_t)(typecode));

    /* get the result */
    r = MT_MSG_txrx(pMsg);

    /* did we transfer 2 messages? */
    if(r == 2)
    {
        pReply = pMsg->pSrsp;
        /* Good, decode result */
        /* get type */
        v = MT_MSG_rdU8(pReply);
        if(v != typecode)
        {
            /* something is wrong */
            tr_err("Invalid ext-addr type code: 0x%02x\n",
                       (unsigned)(v));
        }
        for( x = 0 ; x < 8 ; x++){
            result[x] = MT_MSG_rdU8(pReply);
        }

        /* check at end */
        MT_MSG_parseComplete(pReply);
        if(pReply->is_error)
        {
            tr_err("Get ExtFailed\n");
            r = 0;
        }
        else
        {
            /* success! */
        }
    }
    MT_MSG_free(pMsg);
    return (r);
}

/*
  Get an any number of addresses from the device
  Public function in mt_msg.h
*/
int MT_MSG_getExtAddress(struct mt_msg_interface *pIface,
                         uint8_t *pib,
                         uint8_t *primary,
                         uint8_t *usr_cfg)
{
    int r;
    r = 0;
    r += get_extAddr(pIface, 0, pib);
    r += get_extAddr(pIface, 1, primary);
    r += get_extAddr(pIface, 2, usr_cfg);
    return (r);
}

/*
  Request software version of the device
  Public function in mt_msg.h
*/
int MT_MSG_getVersion(struct mt_msg_interface *pIface,
                      struct mt_version_info *pInfo)
{
    struct mt_msg *pMsg;
    int r;

    if(pInfo)
    {
        memset((void *)(pInfo), 0, sizeof(*pInfo));
    }
    pMsg = MT_MSG_alloc(0, SYS_VERSION_REQ_cmd0, SYS_VERSION_REQ_cmd1);
    if(!pMsg)
    {
        return (0);
    }
    pMsg->pLogPrefix = "get-version";
    MT_MSG_setDestIface(pMsg, pIface);
    pMsg->pLogPrefix = "get-version";
    /* no data */
    if(pInfo)
    {
        memset((void *)(pInfo), 0, sizeof(*pInfo));
    }
    r = MT_MSG_txrx(pMsg);
    if(r != 2)
    {
        MT_MSG_free(pMsg);
        pMsg = NULL;
        return (r);
    }

    if(pInfo)
    {
        pInfo->transport = MT_MSG_rdU8(pMsg->pSrsp);
        pInfo->product = MT_MSG_rdU8(pMsg->pSrsp);
        pInfo->major = MT_MSG_rdU8(pMsg->pSrsp);
        pInfo->minor = MT_MSG_rdU8(pMsg->pSrsp);
        pInfo->maint = MT_MSG_rdU8(pMsg->pSrsp);
        MT_MSG_parseComplete(pMsg->pSrsp);

        if(pMsg->pSrsp->is_error)
        {
            /* we did not properly transfer 2 messages */
            r = 0;
            memset((void *)(pInfo), 0, sizeof(*pInfo));
        }
    }
    MT_MSG_free(pMsg);
    return (r);
}

/*
  Perform a loop back test with the device
  Public function defined in mt_msg.h
*/
int MT_MSG_loopback(struct mt_msg_interface *pIface, int repeatCount,
    uint32_t mSec_rate, size_t length, const uint8_t *pPayload)

{
    const uint8_t *pReply;
    struct mt_msg *pMsg;
    int r;
    int x;

    pMsg = MT_MSG_alloc(1 + 4 + ((int)length),
                        MT_UTIL_LOOPBACK_cmd0,
                        MT_UTIL_LOOPBACK_cmd1);
    if(pMsg == NULL)
    {
        return (0);
    }
    pMsg->pLogPrefix = "loopback";
    MT_MSG_setDestIface(pMsg, pIface);
    MT_MSG_wrU8(pMsg, repeatCount);
    MT_MSG_wrU32(pMsg, mSec_rate);
    MT_MSG_wrBuf(pMsg, pPayload, length);

    r = MT_MSG_txrx(pMsg);
    if(r == 2)
    {
        /* we got our reply! */
        /* we don't care about the N repeats */
        MT_MSG_rdU8(pMsg->pSrsp);
        /* we don't care about the time  */
        MT_MSG_rdU32(pMsg->pSrsp);
        pReply = &(pMsg->pSrsp->iobuf[pMsg->pSrsp->iobuf_idx]);
        MT_MSG_rdBuf(pMsg->pSrsp, NULL, length);
        MT_MSG_parseComplete(pMsg->pSrsp);

        if(pMsg->is_error)
        {
            /* no sense in comparing the data, something is wrong */
            r = 0; /* fail */
        }
        else
        {
            /* compare the data */
            x = memcmp(pReply, pPayload, length);
            if(x != 0)
            {
                tr_err("loop back data does not match\n");
                r = 0; /* fail */
            }
        }
    }
    MT_MSG_free(pMsg);
    return (r);
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
