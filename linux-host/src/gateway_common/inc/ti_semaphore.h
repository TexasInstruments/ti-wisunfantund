/******************************************************************************
 @file ti_semaphore.h

 @brief TIMAC 2.0 API Semaphore abstraction

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
 * Overview
 * ========
 *
 * QUESTION: Why is this file called: "ti_semaphore.h" instead of "semaphore.h"
 *
 * ANSWER: Linux defines a system header file called "semaphore.h"
 *         thus we must adapt, we cannot change Linux...
 */

#if !defined(TI_SEMAPHORE_H)
#define TI_SEMAPHORE_H

#include <stdint.h>

/*
 * @brief Create a semaphore
 * @param initial_value - initial value
 * @returns 0 on failure, non-zero semaphore handle
 */
intptr_t SEMAPHORE_create(const char *dbg_name, unsigned initial_value);

/*
 * @brief Create a semaphore
 * @param h - handle to destroy
 */
void SEMAPHORE_destroy(intptr_t h);

/*
 * @brief Add to the semaphore the value N.
 * @param h - the semaphore handle from SEMAPHORE_Init()
 * @param n - the value to add to the semaphore.
 * @returns 0 on success, negative error.
 */
int SEMAPHORE_putN(intptr_t h, unsigned n);

/*
 * @def SEMAPHORE_put
 * @brief This performs a put of 1 to the semaphore
 * @param H - the semaphore handle
 * @returns 0 on success, negative error.
 */
#define SEMAPHORE_put(H)  SEMAPHORE_putN((H), 1)

/*
 * @brief Wait for (N) from a semaphore with a timeout.
 * @param h - the semaphore handle
 * @param n - the number to geto from the semaphore
 * @param timeout_mSecs - 0=non-blocking, -1=forever, >0 blocking
 * @returns 1 upon success, 0 not aquired(ie:timeout), -1  other error.
 *
 * Note: If (timeout_mSec == 0) then, only (n=1) is a valid way to test
 */
int SEMAPHORE_waitNWithTimeout(intptr_t h, unsigned n, int timeout_mSecs);

/*
 * @brief Get 1 from a semaphore with a timeout.
 * @param h - the semaphore handle
 * @param timeout_mSecs - 0=non-blocking, -1=forever, >0 blocking
 * @returns 1 upon success, 0 if not successful and timeout was zero,
 *   negative on error or timeout
 */
#define SEMAPHORE_waitWithTimeout(h, timeout_mSecs) \
    SEMAPHORE_waitNWithTimeout((h), 1, (timeout_mSecs))

/*
 * @brief get the current value of the semaphore
 * @param h - the semaphore handle
 * @returns negative if h is invalid, otherwise 0..N current semaphore value
 */
int SEMAPHORE_inspect(intptr_t h);

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
