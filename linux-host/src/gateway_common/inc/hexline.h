/******************************************************************************
 @file hexline.h

 @brief TIMAC 2.0 API Debug hex dump helper functions

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

#if !defined(HEXLINE_H)
#define HEXLINE_H

#include <stddef.h>
#include <stdint.h>

/*!
 * @brief HEXLINE_working variables
 */
struct hexline {
    /*! Address to be printed */
    uint64_t    addr;

    /*! Pointer to the data to be printed */
    const void *pBytes;

    /*! How many bytes to print */
    size_t      nbytes;

    /*! How many are complete */
    size_t      ndone;

    /* ! Working buffer (your text will be put here) */
    char buf[90];
};

/*!
 * @brief Initialize a HEXLINE Working buffer
 *
 * @param pH - pointer to the hexline structure
 * @param addr - address field initializer
 * @param pBytes - pointer to the data bytes to dump
 * @param nbytes - count of bytes to dump
 *
 */
void HEXLINE_init(struct hexline *pH,
                   uint64_t addr,
                   const void *pBytes,
                   size_t nbytes);

/*!
 * @brief Format one line (up to 16 bytes) of hex dump data.
 *
 * @param pHexLine - structure initalized by HEXLINE_Init()
 *
 * Example
 * \code
 *
 *    HEXLINE_Init(&h, 0x1234000, buffer, 1000);
 *
 *    while(h.ndone < h.nbyes){
 *        HEXLINE_format(&h);
 *        printf("%s\n", h.buf);
 *   }
 * \endcode
 */
void HEXLINE_format(struct hexline *pHexLine);

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

