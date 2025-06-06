/*
 *    Copyright (c) 2017, The OpenThread Authors.
 *    All rights reserved.
 *
 *    Redistribution and use in source and binary forms, with or without
 *    modification, are permitted provided that the following conditions are met:
 *    1. Redistributions of source code must retain the above copyright
 *       notice, this list of conditions and the following disclaimer.
 *    2. Redistributions in binary form must reproduce the above copyright
 *       notice, this list of conditions and the following disclaimer in the
 *       documentation and/or other materials provided with the distribution.
 *    3. Neither the name of the copyright holder nor the
 *       names of its contributors may be used to endorse or promote products
 *       derived from this software without specific prior written permission.
 *
 *    THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 *    ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 *    WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 *    DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY
 *    DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 *    (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 *    LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 *    ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 *    (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 *    SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <stdbool.h>
#include <string.h>

#ifndef NPI_HDLC_H
#define NPI_HDLC_H

#ifdef __cplusplus
extern "C"
{
#endif
/*!
 * @brief - Encode an input buffer with HDLC and return a new buffer
 * @param isSpinel If true, skip first byte for NLI when decoding inputBuf
 * @param inputBuf Raw data to be encoded with HDLC
 * @param inputFrameLen Length of raw data
 * @param outputBufLen Length of outbufBuf 
 * @returns NULL if HDLC encoding failed, pointer to HDLC encoded buffer otherwise
 */
uint8_t *hdlc_encode(bool isSpinel, const uint8_t *inputBuf, uint16_t inputFrameLen, uint16_t *outputBufLen);
/*!
 * @brief - Decode an input buffer with HDLC and return a new buffer
 * @param inputBuf HDLC encoded data to be decoded
 * @param inputFrameLen Length of raw data
 * @param outputBufLen Length of outbufBuf 
 * @returns NULL if no HDLC encoding failed, pointer to HDLC encoded buffer otherwise
 */
uint8_t *hdlc_decode(const uint8_t *inputBuf, uint16_t inputFrameLen, uint16_t *outputBufLen);

/*!
 * @brief - Helper function to add a NLI byte header to an input buffer
 * @param inputBuf Raw data to add an NLI byte to
 * @param inputFrameLen Length of raw data
 * @param nli NLI index to add
 * @param outputBufLen Length of outbufBuf 
 * @returns NULL if allocation failed, pointer to NLI appended buffer otherwise
 */
uint8_t *add_NLI_byte(const uint8_t *inputBuf, uint16_t inputFrameLen, uint8_t nli, uint16_t *outputBufLen);

/*!
 * @brief - Function to read from inputFd until a full valid HDLC frame is captured and decoded
 * @param inputFd File descriptor to read from
 * @param outputBufLen Length of outbufBuf 
 * @returns NULL if allocation failed or HDLC decoding failed, pointer to HDLC decoded buffer otherwise
 */
uint8_t *pull_hdlc(int inputFd, int *outputBufLen);

#ifdef __cplusplus
}
#endif

#endif /* NPI_HDLC_H */
