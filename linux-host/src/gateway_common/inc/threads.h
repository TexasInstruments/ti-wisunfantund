/******************************************************************************
 @file threads.h

 @brief TIMAC 2.0 API generic thread abstraction header

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

#if !defined(THREADS_H)
#define THREADS_H

#include "bitsnbits.h"
#include <stdint.h>
#include <stdbool.h>

/*!
 * @typedef thread_func_t - thread function
 * @param cookie - a parameter for the thread function
 * @return a thread exit value can be integer or pointer
 */
typedef intptr_t threadfunc_t(intptr_t cookie);

#define THREAD_FLAGS_DEFAULT  0 /*! default flags when creating a thread */
#define THREAD_FLAGS_JOINABLE _bit0 /*! make the thread joinable */

/*!
 * @brief Create a thread
 *
 * @param name - the name of the thread
 * @param func - the thread function
 * @param cookie - parameter for the thread function
 * @param startflags - see THREAD_FLAGS_*
 *
 * @return a thread handle for use with other functions, 0 means failure
 *
 * Note: The thread may be running before this thread returns.
 */
intptr_t THREAD_create(const char *name, threadfunc_t *func, intptr_t cookie, int startflags);

/*
 * @brief Kill/Destroy this thread
 * @param h - thread handle
 */
void THREAD_destroy(intptr_t h);

/*!
 * @brief return the thread ID of the current thread
 * @returns thread ID of current thread
 */
intptr_t THREAD_self(void);

/*!
 * @brief Exit the current thread with specified code
 * @param exit_code - the code to exit with
 */
void     THREAD_exit(intptr_t exit_code);

/*!
 * @brief Is this thread alive (running) or has it exited?
 * @param - thread ID
 */
bool     THREAD_isAlive(intptr_t h);

/*!
 * @brief Get the exit code of a thread
 * @param - thread id to get exit code of
 * @return value - the thread exit code if the thread has exited
 */
intptr_t THREAD_getExitValue(intptr_t h);

/*!
 * @brief Get debug name of this thread
 * @param h - thread handle
 * @return a printable string for a thread name
 */
const char *THREAD_name(intptr_t h);

/*!
 * @brief Get debug name of current active thread
 * @return - name of currently active thread
 */
const char *THREAD_selfName(void);

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
