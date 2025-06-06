/******************************************************************************
 @file compiler_gcc.h

 @brief TIMAC 2.0 API gcc compiler specific items.

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
 * @def _Printf_format_string_
 * See compiler_microsoft.h
 *
 * This macro is used to identify a printf()
 * format string, when compiling for GCC
 * this macro becomes nothing and we use
 * the __attribute__ instead.
 *
 * Syntatically Microsoft tools want the 'decoration'
 * in a different place then GCC so there
 * is no means to have a single macro
 */
#define _Printf_format_string_

/*
 * @def MSVC_NO_RETURN
 * see compiler_microsoft.h
 *
 * This macro when compiling for GCC
 * becomes nothing, and we use the other
 * macro GCC_NO_RETURN
 *
 * Syntatically Microsoft tools want the 'decoration'
 * in a different place then GCC so there
 * is no means to have a single macro
 */
#define MSVC_NO_RETURN

/*
 * @def GCC_NO_RETURN
 *
 * Mark the function as no return for GCC
 * This is GCC's way of doing this
 * Microsoft has another way...
 */
#define GCC_NO_RETURN __attribute((noreturn))

/*
 * @def COMPILER_isBigEndian
 * @brief Evaluates to true (non-zero) if the compiler target is big-endian.
 */
#define COMPILER_isBigEndian   (__BYTE_ORDER__ == __ORDER_BIG_ENDIAN__)
#define COMPILER_isLittleEndian (!COMPILER_isBigEndian)

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
