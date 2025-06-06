/******************************************************************************
 @file hexline.c

 @brief TIMAC 2.0 API Implimentation for hexline debug dump

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
#include "hexline.h"

#include <stdio.h>
#include <string.h>

/*
 * Initialize a hexdump structure for use with HEXLINE_format()
 *
 * Public function defined in hexline.h
 */
void HEXLINE_init(struct hexline *pH,
           uint64_t addr,
           const void *pBytes,
           size_t nbytes)
{
    memset((void *)(pH), 0,sizeof(*pH));

    pH->addr   = addr;
    pH->pBytes = pBytes;
    pH->nbytes = nbytes;
}

/*!
 * @brief [private] hexline helper function to hexify a nibble
 *
 * @param integer to hexify the low 4 bits
 *
 * @return low 4 bits converted to ascii hex (lower case)
 */
static int _hexify(int v)
{
    v = (v & 0x0f) + '0';
    if(v > '9')
    {
        v = v - '0' - 10 + 'a';
    }
    return (v);
}

/*!
 * @brief [private] write n hex digits at buffer
 *
 * @param buf - where to put the text
 * @param n   - how many digits
 * @param v   - value to convert
 */
static void _hexdigits(char *buf, int n, uint64_t v)
{
    /* we write the data backwards
     * aka: Horners method... think of it sa a polynomial
     * we extract one constant at a time... by dividing it out */
    buf = buf + n - 1;

    while(n)
    {
        *buf = (char)_hexify((int)(v));
        n--;
        buf--;
        v = v >> 4;
    }
}

/*
 * Format a line of text as a memory dump for later printing.
 *
 * Public function defined in hexline.h
 */
void HEXLINE_format(struct hexline *pH)
{
    uint64_t a;
    int wr;
    int x;
    int v;

    /* clear the line with spaces */
    /* this simplifies things when we print partial lines. */
    memset((void *)(&pH->buf[0]), ' ', sizeof(pH->buf)-1);
    /* Garentee TERMINATION! */
    pH->buf[ sizeof(pH->buf)-1 ] = 0;

    /* Create a line that looks like this:
     *  01234567890123456789012345678901234567890123456789012345678901234567890123456789
     *  xxxxxxxx: xx xx xx xx xx xx xx xx-xx xx xx xx xx xx xx xx |0123456789abcdef|
     *
     * The address field might be +8 longer in case of 64bit addresses
     */

    /* print address */
    /* special case if address is a 64bit number */
    a = pH->addr;
    a = a + pH->ndone;
    a = a & (~((uint64_t)(0x0f)));
    if(a > 0x100000000)
    {
        /* print big wide address in giant form */
        wr = 16;
    }
    else
    {
        /* otherwise don't print lots of zeros */
        wr = 8;
    }

    /* print address field */
    _hexdigits(pH->buf, wr, a);
    /* these offsets come from the string above */

    /* decorate the ascii text printout */
    pH->buf[wr+ 8-8] = ':';
    pH->buf[wr+33-8] = '-';
    pH->buf[wr+58-8] = '|';
    pH->buf[wr+75-8] = '|';
    pH->buf[wr+76-8] = 0;

    /* choose start loc on the line. */
    x = (pH->addr + pH->ndone) & 0x0f;

    /* loop through parts on the line */
    for(/* above */ ; x < 16 ; x++)
    {
        /* get byte for hex data */
        v = ((const uint8_t *)(pH->pBytes))[pH->ndone];
        /* 8 for hex digits */
        /* 1 for colon */
        /* 1 for space */
        /* (x*3) for each byte value */
        _hexdigits(pH->buf + wr + 1 + 1 + (x * 3), 2, v);

        /* now the ascii portion */
        if((v < 0x20) || (v > 0x7e))
        {
            v = '.';
        }
        pH->buf[ wr + 59 - 8 + x ] = (char)v;

        /* Done? */
        pH->ndone += 1;
        if(pH->ndone >= pH->nbytes)
        {
            break;
        }
    }
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

