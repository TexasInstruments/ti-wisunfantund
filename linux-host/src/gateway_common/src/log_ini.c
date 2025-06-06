/******************************************************************************
 @file log_ini.c

 @brief TIMAC 2.0 API Parse log file settings from an INI file

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
#include "log.h"
#include "ini_file.h"

#include <string.h>

const struct ini_flag_name log_builtin_flag_names[] = {
    { .name = "everything"            , .value = LOG_EVERYTHING           },
    { .name = "warning"               , .value = LOG_WARN                 },
    { .name = "error"                 , .value = LOG_ERROR                },
    { .name = "fatal"                 , .value = LOG_FATAL                },
    { .name = "sys_dbg_mutex"         , .value = LOG_DBG_MUTEX            },
    { .name = "sys_dbg_thread"        , .value = LOG_DBG_THREAD           },
    { .name = "sys_dbg_fifo"          , .value = LOG_DBG_FIFO             },
    { .name = "sys_dbg_uart"          , .value = LOG_DBG_UART             },
    { .name = "sys_dbg_uart_raw"      , .value = LOG_DBG_UART_RAW         },
    { .name = "sys_dbg_sleep"         , .value = LOG_DBG_SLEEP            },
    { .name = "sys_dbg_socket"        , .value = LOG_DBG_SOCKET           },
    { .name = "sys_dbg_socket_raw"    , .value = LOG_DBG_SOCKET_RAW       },
    { .name = "sys_dbg_collector"     , .value = LOG_DBG_COLLECTOR        },
    { .name = "sys_dbg_collector_raw" , .value = LOG_DBG_COLLECTOR_RAW    },
    /* terminate list */
    { .name = NULL                                                        }
};

/*
 * Parse LOG file ini settings from an ini file in a standard way.
 *
 * see log.h
 */
int LOG_INI_settings(struct ini_parser *pINI, bool *handled)
{
    // const struct ini_flag_name * pF;
    // bool is_not;
    // int64_t v64;

    // if(pINI->item_name == NULL)
    // {
    //     /* this is the section name, we don't care about it. */
    //     return (0);
    // }

    // if(INI_itemMatches(pINI, "log", "filename"))
    // {
    //     LOG_init(pINI->item_value);
    //     *handled = true;
    //     return (0);
    // }

    // if(INI_itemMatches(pINI, "log", "dup2stderr"))
    // {
    //     log_cfg.dup_to_stderr = INI_valueAsBool(pINI);
    //     *handled = true;
    //     return (0);
    // }

    // if(!INI_itemMatches(pINI, "log", "flag"))
    // {
    //     /* nothing else matches */
    //     /* below is dealing with log flags. */
    //     return (0);
    // }

    // /* beyondhere it is a flag... and only a flag */
    // *handled = true;

    // /* if quoted, dequote it */
    // INI_dequote(pINI);

    // v64 = 0;
    // is_not = false;

    // /* if it is a number value ... then use the number */
    // if(INI_isValueS64(pINI, &v64))
    // {
    //     /* we use the number */
    // }
    // else
    // {
    //     /* otherwise, it could be a named value */
    //     int x;
    //     for(x = 0 ; (pF = log_flag_names[x]) != NULL ; x++)
    //     {
    //         pF = INI_flagLookup(pF, pINI->item_value, &is_not);
    //         if(pF != NULL)
    //         {
    //             break;
    //         }
    //     };

    //     if(pF == NULL)
    //     {
    //         pF = INI_flagLookup(log_builtin_flag_names,
    //                              pINI->item_value,
    //                              &is_not);
    //     }

    //     if(pF == NULL)
    //     {
    //         INI_syntaxError(pINI, "unknown-flag: %s\n", pINI->item_value);
    //         return (-1);
    //     }

    //     v64 = pF->value;
    // }

    // if(is_not)
    // {
    //     log_cfg.log_flags &= (~(v64));
    // }
    // else
    // {
    //     log_cfg.log_flags |= ((v64));
    // }

    // return (1);
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

