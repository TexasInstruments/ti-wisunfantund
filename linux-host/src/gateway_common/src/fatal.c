/******************************************************************************
 @file fatal.c

 @brief TIMAC 2.0 API Handle fatal exit conditions

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

#include <compiler.h>

#include "fatal.h"
#include "log.h"

#include <stdio.h>
#include <string.h>
#include <errno.h>
#include <stdarg.h>
#include <stdlib.h>
#include "hlos_specific.h"

/*
 * printf() a fatal message and exit.
 *
 * Public function defined in fatal.h
 */
void FATAL_printf(_Printf_format_string_ const char *fmt, ...)
{
    va_list ap;
    va_start(ap,fmt);
    FATAL_vprintf(fmt, ap);
    /* UNREACHABLE: va_end(ap); */
}

/*
 * building block for FATAL_printf()
 *
 * Public function defined in fatal.h
 */
void FATAL_vprintf(const char *fmt, va_list ap)
{
    va_list ap_copy;
    va_copy(ap_copy, ap);

    LOG_vprintf(LOG_FATAL, fmt, ap);
    vfprintf(stderr, fmt, ap_copy);
    _FATAL_exit(1);
}

/*
 * print a message followed by a unix error number and message
 *
 * Public function defined in fatal.h
 * see fatal.h
 */
void FATAL_perror(const char *msg)
{
    const char *cp;
    cp = strerror(errno);
    if(cp == NULL)
    {
        cp = "";
    }
    FATAL_printf("%s: (%d) %s\n", msg, errno, cp);
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

