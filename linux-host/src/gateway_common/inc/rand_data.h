/******************************************************************************
 @file rand_data.h

 @brief TIMAC 2.0 API Pseudo-random number generator

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

#if !defined(RAND_DATA_H)
#define RAND_DATA_H

#include <stdint.h>
#include <stddef.h>

/*
 * Overview
 * ========
 *
 * This is a data generator it is used to create random-ish
 * data for the purpose of testing a communcations channel.
 * it is not cryptographically strong, and it is not intended
 * to be used for that purpose.
 *
 * Rules
 * =====
 * <pre>
 * Rule #1   Both sides must start with the same *SEED* value.
 * Rule #2   The seed value is an integer, of any value.
 *
 * Rule #3 To transmit, call RANDDATA_Get() (n-times) for (n-bytes)
 * Rule #4 transmit and receive your data
 * Rule #5 Call RAND_DATA_Verify() to verify the data is correct.
 * </pre>
 * NOTE: you can have two seperate programs on two seperate computers
 *       on opposite sides of the world... they do not need to
 *       share this specific data structure to make it work.
 *
 * how does this work?
 * -------------------
 * Mathmatically it is a Linear congruential generator
 * https://en.wikipedia.org/wiki/Linear_congruential_generator
 * http://stackoverflow.com/questions/8569113/why-1103515245-is-used-in-rand
 */

/*!
 * @struct rand_data_one
 *
 * @brief a single random stream generator
 */
struct rand_data_one {
    /*! number of random values read */
    uint32_t cnt;
    /*! next seed value */
    uint32_t next;
};

/*!
 * @struct a pair of random stream generators, typically used as a tx/rx pair
 */
struct rand_data_pair {
    /*! transmiter generator */
    struct rand_data_one tx;
    /*! receiver generator */
    struct rand_data_one rx;
};

/*!
 * @brief Initialize a pair of data generator
 * @param pRDP - the pair to initialize
 * @param seed - used for both tx and rx
 */
void RAND_DATA_initPair(struct rand_data_pair *pRDP, uint32_t seed);

/*!
 * @brief Initialize a single data generator
 * @param pRDP - the generator to initialize
 * @param seed - seed value for the generator
 */
void RAND_DATA_initOne(struct rand_data_one *pRD1, uint32_t seed);

/*!
 * @brief Generate the next byte
 * @param pRD1 - a single random number generator
 *
 * @returns next byte from the generator.
 */

uint8_t RAND_DATA_nextByte(struct rand_data_one *pRD1);

/*!
 * @brief in a pair, return the next tx byte
 * @param pRDP - pointer to the pair to use
 * @returns byte value from the generator.
 */
uint8_t RAND_DATA_nextTx(struct rand_data_pair *pRDP);

/*!
 * @brief in a pair, return the next rx byte
 * @param pRDP - pointer to the pair to use
 * @returns byte value from the generator.
 */
uint8_t RAND_DATA_nextRx(struct rand_data_pair *pRDP);

/*!
 * @brief Generate a buffer full of data
 * @param pRD1 - a single generator to use
 * @param pBuf - the buffer to use to write
 * @param n - the number of bytes to generate
 */
void    RAND_DATA_generateBuf(struct rand_data_one *pRD1,
                               uint8_t *pBuf, size_t n);

/*!
 * @brief Generate a buffer full of data
 * @param pRD1 - a single generator to use
 * @param pBuf - the buffer to use to write
 * @param n - the number of bytes to verify
 */
int     RAND_DATA_verifyBuf(struct rand_data_one *pRD1,
                             const uint8_t *pBuf, size_t n);

/*!
 * @brief Generate (from a pair) the transmit stream to a bufer
 * @param pRDP - the pair to use
 * @param pbuf - the buffer to generate into
 * @param n - the number of bytes to generate
 *
 */
void RAND_DATA_txGenerate(struct rand_data_pair *pRDP,
                           uint8_t *pBuf, size_t n);

/*!
 * @brief Generate (from a pair) the receive stream to verify
 * @param pRDP - the pair to use
 * @param pbuf - the buffer to verify
 * @param n - the number of bytes to verify
 *
 */
int  RAND_DATA_rxVerify(struct rand_data_pair *pRDP, uint8_t *pBuf, size_t n);

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

