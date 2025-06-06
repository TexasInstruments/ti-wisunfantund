/******************************************************************************
 @file mt_msg_dbg_core.c

 @brief TIMAC 2.0 mt msg - debug decoder.

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

#include <stdarg.h>
#include <string.h>
#include <stdlib.h>

struct mt_msg_dbg *ALL_MT_MSG_DBG;

static void print_field(struct mt_msg_dbg_info *pV)
{
    uint32_t v, a, b, c, d;
    int n, x;

    /* handle ... array of bytes type */
    n = -1;
    if (IS_FIELDTYPE_BYTES_N(pV->m_pCurField->m_fieldtype))
    {
        n = pV->m_pCurField->m_fieldtype - FIELDTYPE_BYTES_N(0);
    }
    if (IS_FIELDTYPE_MAXBYTES(pV->m_pCurField->m_fieldtype))
    {
        n = pV->m_pCurField->m_fieldtype - FIELDTYPE_MAXBYTES(0);
        x = (pV->m_idx_end - pV->m_idx_cursor);
        if( n > x )
        {
            n = x;
        }
    }

    if( n >= 0 )
    {
        //LOG_printf(LOG_ALWAYS, "%s: DBG: %s Byte: %2d | %s = ",
            // pV->m_pIface->dbg_name,
            // pV->m_pDbg->m_pktName,
            // pV->m_idx_cursor,
            // pV->m_pCurField->m_name);
        for (a = 0; ((int)a) < n; a++ )
        {
            //LOG_printf(LOG_ALWAYS, "%02x ",
            //    (unsigned)(pV->m_pMsg->iobuf[pV->m_idx_cursor + a]));
        }
        //LOG_printf(LOG_ALWAYS, "\n");
        return;
    }

    a = b = c = d = v = 0;
    //LOG_printf(LOG_ALWAYS, "%s: DBG: %s Byte: %2d | %s = ",
        // pV->m_pIface->dbg_name,
        // pV->m_pDbg->m_pktName,
        // pV->m_idx_cursor,
        // pV->m_pCurField->m_name);

    switch( pV->m_pCurField->m_fieldtype ){
    default:
        BUG_HERE("unknown field type? %d\n", pV->m_pCurField->m_fieldtype);
        break;
    case FIELDTYPE_U8:
        a = pV->m_pMsg->iobuf[pV->m_idx_cursor + 0];
        //LOG_printf(LOG_ALWAYS, "% 3d (0x%02x)\n", (int)(a), (unsigned)(a));
        pV->m_idx_cursor += 1;
        break;
    case FIELDTYPE_U16:
        a = pV->m_pMsg->iobuf[pV->m_idx_cursor + 0];
        b = pV->m_pMsg->iobuf[pV->m_idx_cursor + 1];
        a = a + (b << 8);
        //LOG_printf(LOG_ALWAYS, "0x%04x\n", (unsigned)(a));
        pV->m_idx_cursor += 2;
        break;
    case FIELDTYPE_U32:
        a = pV->m_pMsg->iobuf[pV->m_idx_cursor + 0];
        b = pV->m_pMsg->iobuf[pV->m_idx_cursor + 1];
        c = pV->m_pMsg->iobuf[pV->m_idx_cursor + 2];
        d = pV->m_pMsg->iobuf[pV->m_idx_cursor + 3];
        a = a + (b << 8) + (c << 16) + (d << 24);
        //LOG_printf(LOG_ALWAYS, "0x%08x\n",
           // (unsigned)(a));
        pV->m_idx_cursor += 4;
        break;
    }
}

/*
  Decode & log a message for debug purposes

  Public function in mt_msg.h
 */
void MT_MSG_dbg_decode(struct mt_msg *pMsg,
    struct mt_msg_interface *pIface,
    struct mt_msg_dbg *pDbg)
{
    struct mt_msg_dbg_info v;
    int m;

    if( pDbg == NULL )
    {
        /* We have no dbg info... so leave */
        return;
    }
    /* if not enabled leave */
    if( !LOG_test(LOG_DBG_MT_MSG_decode) ){
        return;
    }


    memset((void *)(&v), 0, sizeof(v));
    v.m_pMsg = pMsg;
    v.m_pIface = pIface;

    /* where is the data portion? */
    v.m_idx_start = 0;
    /* go past header */
    if (v.m_pIface->frame_sync)
    {
        v.m_idx_start += 1;
    }

    if (v.m_pIface->len_2bytes)
    {
        v.m_idx_start += 2;
    }
    else
    {
        v.m_idx_start += 1;
    }
    /* cmd0/cmd1 */
    v.m_idx_start += 2;
    v.m_idx_end = v.m_idx_start + v.m_pMsg->expected_len;

    /* setup cur */
    v.m_idx_cursor = v.m_idx_start;

    v.m_pDbg= pDbg;
    while(v.m_pDbg)
    {
        m = 1;
        if ( v.m_pDbg->m_cmd0 == -1)
        {
            /* -1 = match all */
        } else if( v.m_pMsg->cmd0 != v.m_pDbg->m_cmd0 )
        {
            m = 0;
        }

        if (v.m_pDbg->m_cmd1 == -1)
        {
            /* -1 = match all */
        }
        else if (v.m_pMsg->cmd1 != v.m_pDbg->m_cmd1)
        {
            m = 0;
        }

        if( m )
        {
            break;
        }
        v.m_pDbg = v.m_pDbg->m_pNext;
    }

    if (v.m_pDbg == NULL)
    {
        //LOG_printf(LOG_ALWAYS,
            // "%s: DBG: Unknown msg: 0x%02x 0x%02x\n",
            // v.m_pIface->dbg_name,
            // v.m_pMsg->cmd0, v.m_pMsg->cmd1);
        return;
    }

    if (v.m_pDbg->m_pktName)
    {
        //LOG_printf(LOG_ALWAYS, "%s: DBG: %s\n",
        //           v.m_pIface->dbg_name, v.m_pDbg->m_pktName);
    }

    /* could be this msg has fields */
    v.m_pCurField = v.m_pDbg->m_pFields;
    if (v.m_pCurField == NULL)
    {
        /* no fields, no data */
        if (v.m_pMsg->expected_len)
        {
            //LOG_printf(LOG_ALWAYS, "%s: msg-len: %d no detail availabe\n",
            //    v.m_pIface->dbg_name, v.m_pMsg->expected_len);
        }
        return;
    }

    while (v.m_pCurField)
    {
        print_field(&v);
        v.m_pCurField = v.m_pCurField->m_pNext;
    }
    //LOG_printf(LOG_ALWAYS,"%s: DBG %s: end\n",
    //           v.m_pIface->dbg_name, v.m_pDbg->m_pktName);
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
