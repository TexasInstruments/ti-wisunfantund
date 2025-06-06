/******************************************************************************
 @file stream_uart_ini.c

 @brief TIMAC 2.0 API Parse INI files to configure uart interfaces

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
#include "stream.h"
#include "ini_file.h"
#include "stream_uart.h"

struct uart_cfg ALL_INI_UARTS[INI_MAX_UARTS];

#include <string.h>

/*
 * Rd/Parse UART configuration data from an INI file
 *
 * Public function defined in stream_uart.h
 */
int UART_INI_settingsNth(struct ini_parser *pINI, bool *handled)
{

    unsigned nth;

    if(pINI->item_name == NULL)
    {
        /* this is the section name, we don't care about it. */
        return (0);
    }

    /* is this a UART section? */
    if(!INI_isNth(pINI, "uart-", &nth))
    {
        /* Nope, then leave */
        return (0);
    }
    if( nth >= INI_MAX_UARTS )
    {
        INI_syntaxError( pINI, "invalid uart index %u\n", nth );
        return -1;
    }
    return (UART_INI_settingsOne(pINI, handled, &(ALL_INI_UARTS[nth])));
}

/*
 * Public function defined in stream_uart.h
 */
int UART_INI_settingsOne(struct ini_parser *pINI,
                          bool *handled,
                          struct uart_cfg *pCFG)
{
static const struct ini_flag_name uart_ini_cfg_flags[] = {
    { .name = "rd_thread", .value = STREAM_UART_FLAG_rd_thread },
    { .name = "hw_handshake", .value = STREAM_UART_FLAG_hw_handshake },
    { .name = "default", .value = STREAM_UART_FLAG_default },
    { .name = NULL }
};

    int r;
    bool is_not;
    const struct ini_flag_name *pF;

    if(pINI->item_name == NULL)
    {
        return (0);
    }

    r = -1;

    /* match name? */
    if(INI_itemMatches(pINI, NULL, "devname"))
    {
        INI_dequote(pINI);
        pCFG->devname = INI_itemValue_strdup(pINI);
        r = 0;
    }

    /* baudrate? */
    if(INI_itemMatches(pINI, NULL, "baudrate"))
    {
        pCFG->baudrate = INI_valueAsInt(pINI);
        r = 0;
    }

    /* Flags? */
    if(INI_itemMatches(pINI, NULL, "flag"))
    {
        is_not = false;
        r = 0;
        pF = INI_flagLookup(uart_ini_cfg_flags, pINI->item_value, &is_not);
        if(pF == NULL)
        {
            INI_syntaxError(pINI, "unknown flag: %s\n" , pINI->item_value);
        }
        else
        {
            if(is_not)
            {
                pCFG->open_flags &= (~(pF->value));
            }
            else
            {
                pCFG->open_flags |= ((pF->value));
            }
        }
    }

    if(r == 0)
    {
        /* we handle it here */
        *handled = true;
    }
    else
    {
        INI_syntaxError(pINI, "Unknown\n");
    }
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
