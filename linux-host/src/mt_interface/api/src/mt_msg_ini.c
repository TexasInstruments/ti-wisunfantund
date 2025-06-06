/******************************************************************************
 @file mt_msg_ini.c

 @brief TIMAC 2.0 API parse interface config from ini file

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
#include "ini_file.h"

#include "log.h"

#include <stdarg.h>
#include <string.h>
#include <stdlib.h>

/******************************************************************************
 Functions
*****************************************************************************/

/*
  Parse elements from an INI file for a message interface.

  Public function defined in mt_msg.h
*/
int MT_MSG_INI_settings(struct ini_parser *pINI,
                         bool *handled,
                         struct mt_msg_interface *pMI)
{
    int *iptr;
    bool *bptr;

    iptr = NULL;
    bptr = NULL;

    if(pINI->item_name == NULL)
    {
        return (0);
    }

    if(INI_itemMatches(pINI, NULL, "include-chksum"))
    {
        bptr = &(pMI->include_chksum);
    bgood:
        *bptr = INI_valueAsBool(pINI);
        *handled = true;
        return (0);
    }

    if( INI_itemMatches(pINI, NULL, "startup-flush") ){
        bptr = &(pMI->startup_flush);
        goto bgood;
    }

    if(INI_itemMatches(pINI, NULL, "frame-sync"))
    {
        bptr = &(pMI->frame_sync);
        goto bgood;
    }

    if(INI_itemMatches(pINI, NULL, "fragmentation-size"))
    {
        iptr = &(pMI->tx_frag_size);
    igood:
        *iptr = INI_valueAsInt(pINI);
        *handled = true;
        return (0);
    }

    if(INI_itemMatches(pINI, NULL, "retry-max"))
    {
        iptr = &(pMI->retry_max);
        goto igood;
    }

    if(INI_itemMatches(pINI, NULL, "fragmentation-timeout-msecs"))
    {
        iptr = &(pMI->frag_timeout_mSecs);
        goto igood;
    }

    if(INI_itemMatches(pINI, NULL, "intersymbol-timeout-msecs"))
    {
        iptr = &(pMI->intersymbol_timeout_mSecs);
        goto igood;
    }

    if(INI_itemMatches(pINI, NULL, "srsp-timeout-msecs"))
    {
        iptr = &(pMI->srsp_timeout_mSecs);
        goto igood;
    }

    if(INI_itemMatches(pINI, NULL, "intermsg-timeout-msecs"))
    {
        iptr = &(pMI->intermsg_timeout_mSecs);
        goto igood;
    }

    if(INI_itemMatches(pINI, NULL, "flush-timeout-msecs"))
    {
        iptr = &(pMI->flush_timeout_mSecs);
        goto igood;
    }

    if(INI_itemMatches(pINI, NULL, "len-2bytes"))
    {
        bptr = &pMI->len_2bytes;
        goto bgood;
    }

    if(INI_itemMatches(pINI, NULL, "tx-lock-timeout"))
    {
        iptr = &(pMI->tx_lock_timeout);
        goto igood;
    }
    return (0);
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
