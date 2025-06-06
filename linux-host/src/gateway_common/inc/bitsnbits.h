/******************************************************************************
 @file bitsnbits.h

 @brief TIMAC 2.0 API bitsnbits - bit numbers, K & M values, bit manipulation

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

#if !defined(bitsnbits_h)
#define bitsnbits_h

/*!
 * @file bitsnbits.h
 *
 * @brief - Various BIT definitions and power of 2 value definitions.
 */

#define _bitN(N)  (1ULL << (N))

#define _bit0  _bitN(0)
#define _bit1  _bitN(1)
#define _bit2  _bitN(2)
#define _bit3  _bitN(3)
#define _bit4  _bitN(4)
#define _bit5  _bitN(5)
#define _bit6  _bitN(6)
#define _bit7  _bitN(7)
#define _bit8  _bitN(8)
#define _bit9  _bitN(9)
#define _bit10  _bitN(10)
#define _bit11  _bitN(11)
#define _bit12  _bitN(12)
#define _bit13  _bitN(13)
#define _bit14  _bitN(14)
#define _bit15  _bitN(15)
#define _bit16  _bitN(16)
#define _bit17  _bitN(17)
#define _bit18  _bitN(18)
#define _bit19  _bitN(19)
#define _bit20  _bitN(20)
#define _bit21  _bitN(21)
#define _bit22  _bitN(22)
#define _bit23  _bitN(23)
#define _bit24  _bitN(24)
#define _bit25  _bitN(25)
#define _bit26  _bitN(26)
#define _bit27  _bitN(27)
#define _bit28  _bitN(28)
#define _bit29  _bitN(29)
#define _bit30  _bitN(30)
#define _bit31  _bitN(31)
#define _bit32  _bitN(32)
#define _bit33  _bitN(33)
#define _bit34  _bitN(34)
#define _bit35  _bitN(35)
#define _bit36  _bitN(36)
#define _bit37  _bitN(37)
#define _bit38  _bitN(38)
#define _bit39  _bitN(39)
#define _bit40  _bitN(40)
#define _bit41  _bitN(41)
#define _bit42  _bitN(42)
#define _bit43  _bitN(43)
#define _bit44  _bitN(44)
#define _bit45  _bitN(45)
#define _bit46  _bitN(46)
#define _bit47  _bitN(47)
#define _bit48  _bitN(48)
#define _bit49  _bitN(49)
#define _bit50  _bitN(50)
#define _bit51  _bitN(51)
#define _bit52  _bitN(52)
#define _bit53  _bitN(53)
#define _bit54  _bitN(54)
#define _bit55  _bitN(55)
#define _bit56  _bitN(56)
#define _bit57  _bitN(57)
#define _bit58  _bitN(58)
#define _bit59  _bitN(59)
#define _bit60  _bitN(60)
#define _bit61  _bitN(61)
#define _bit62  _bitN(62)
#define _bit63  _bitN(63)

#define __nK(n) ((n) * 1024)
#define __1K    __nK(1)
#define __2K    __nK(2)
#define __4K    __nK(4)
#define __8K    __nK(8)
#define __16K   __nK(16)
#define __32K   __nK(32)
#define __64K   __nK(64)
#define __128K  __nK(128)
#define __256K  __nK(256)
#define __512K  __nK(512)
#define __1024K __nK(1024)
#define __2048K __nK(2048)
#define __4096K __nK(4096)

#define __nM(n)  ((n) * __1K * __1K)
#define __1M    __nM(1)
#define __2M    __nM(2)
#define __4M    __nM(4)
#define __8M    __nM(8)
#define __16M   __nM(16)
#define __32M   __nM(32)
#define __64M   __nM(64)
#define __128M  __nM(128)
#define __256M  __nM(256)
#define __512M  __nM(512)
#define __1024M __nM(1024)
#define __2048M __nM(2048)
/* _4096M - skip, it is 4gig, bigger then 32bits */

#define __nG(n)  ((n) * __1M * __1K)
#define __1G     __nG(1)
#define __2G     __nG(2)
#define __3G     __nG(3)
/* we don't do 4G, because that is just beyond 32bits */

/* @brief Is bit N set in this VALUE */
#define _bit_IsSet(VALUE, N)  (!!((VALUE) & _bit(N)))

/* @brief Is bit N clear in this VALUE */
#define _bit_IsClr(VALUE, N) (!(_bit_IsSet(VALUE,N)))

/* @brief Set bit N in this VALUE */
#define _bit_Set(VALUE,N)      (VALUE) |= _bitN(N)

/* @brief Clear bit N in this VALUE */
#define _bit_Clr(VALUE,N)      (VALUE) &= (~_bitN(N))

/* @brief Extract bit N from this value */
#define _bitXof(VALUE,N)        (((VALUE) >> (N)) & 1)

/* @brief Extract the bit field from [MSB:LSB] inclusive from this VALUE */
#define _bitsXYof(VALUE,MSB,LSB)  \
    (((VALUE) >> (LSB)) &  ((1 << ((MSB)-(LSB)+1))-1))

/* @brief Is this value within the range (L =< VALUE < H) */
#define _inrange(V,L,HPLUS1) \
    (((V) >= (L)) && ((V) < (HPLUS1)))
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

