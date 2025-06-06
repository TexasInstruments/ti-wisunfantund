/******************************************************************************
 @file mutex.h

 @brief TIMAC 2.0 API generic abstract mutex implimentation

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

#if !defined(MUTEX_H)
#define MUTEX_H

#include <stdbool.h>
#include <stdint.h>

/*!
 * @brief Create a mutex
 * @param name - for debug purposes
 * @returns mutex handle for later use
 *
 * Implimentation note: this is not a named Linux semaphore
 */
intptr_t MUTEX_create(const char *name);
/*!
 * @brief release resources associated with a mutex
 * @param h - mutex handle from MUTEX_Create()
 */
void MUTEX_destroy(intptr_t h);

/*!
 * @brief Lock a mutex with timeout
 * @param h - mutex handle from MUTEX_create()
 * @param mSecTimeout - negative=forever, 0=non-blocking >0 timeout value
 *
 * @returns If timeout=0, then 1=success, 0=fail, -1=other error
 * @returns If timeout > 0, then 1 success, other failure
 */
int MUTEX_lock(intptr_t h, int mSecTimeout);

/*!
 * @brief Unlock a mutex
 * @param h - mutex handle from MUTEX_create()
 * @returns 0 success, negative if not a valid mutex handle
 */
int MUTEX_unLock(intptr_t h);

/*!
 * @brief test, determine if a mutex is locked or not
 *
 * @param h - mutex handle from MUTEX_create()
 * @return boolean, true if locked
 */

bool MUTEX_isLocked(intptr_t h);

/*!
 * @brief returns the name of the current locker
 *
 * Or if not locked, the string "none"
 */
const char *MUTEX_lockerName(intptr_t h);

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
