/******************************************************************************
 @file fatal.h

 @brief TIMAC 2.0 API handle fatal errors

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

#if !defined(FATAL_H)
#define FATAL_H

#include "compiler.h"

/*
 * OVERVIEW
 * =========
 *
 * These functions print (log) a message and exit the application
 */
#include <stdarg.h>

/*!
 * @brief print a message like the unix perror() function and exit
 * @param msg - the message to print
 * @returns - this function does not return it exits the application
 *
 * See: "man 3 perror" for more details behind the name "perror"
 */
void MSVC_NO_RETURN FATAL_perror(const char *msg) GCC_NO_RETURN;

/*!
 * @brief printf() a fatal error message and exit.
 * @param fmt - the printf() format message
 * @returns - this function does not return it exits the application
 */
void MSVC_NO_RETURN FATAL_printf(_Printf_format_string_ const char *fmt, ... )
    GCC_NO_RETURN __attribute__((format (printf,1,2)));

/*!
 * @brief FATAL_printf() building block function.
 * @param fmt - the printf() format message
 * @returns - this function does not return it exits the application
 */
void MSVC_NO_RETURN FATAL_vprintf(const char *fmt, va_list ap) GCC_NO_RETURN;

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
