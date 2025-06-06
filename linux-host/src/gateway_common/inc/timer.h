/******************************************************************************
 @file timer.h

 @brief TIMAC 2.0 API timer implimentation

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

#if !defined(TIMER_H)
#define TIMER_H

#include "compiler.h"

/*!
 * OVERVIEW
 * ========================================
 *
 * <b>IMPORTANT:</b>
 *      ABS = Wall Clock time.
 *   nonABS = Time since the application started.
 *
 * Unless otherwise specified (ie: uSecs), time values are in milliseconds
 * and will wrap after 47days of continous operation
 * meaning: 2^32 milliseconds = 47 days.
 *
 * Pseudo timeout timers longer then (47days/2) = about 23 days are not
 * supported. This code does not have a problem executing for over 47 days
 *
 * It does not have this famous bug:
 *    https://support.microsoft.com/en-us/kb/216641
 *
 *========================================
 *
 */

#include <stdint.h>
#include <stdbool.h>

/*!
 * @brief Initialize the timer module
 */
void     TIMER_init(void);

/*!
 * @brief retrieve the application epoch.
 *
 * The epoch is the time the application started in milliseconds
 *
 * For example:
 *    - Fri Dec 18 16:18:39 PST 2015
 *    - Is 1450484319000
 *
 * reference:
 *   http://www.merriam-webster.com/dictionary/epoch
 *
 * @returns the epoch
 */
uint64_t TIMER_getEpoch(void);

/*!
 * @brief Get the run time in mSecs from the epoch
 *
 * See note above about integer rollover.
 * The main purpose of this function is to debug-print the current time
 *
 * @returns runtime in mSecs since the epoch
 */
uint32_t TIMER_getNow(void);

/*!
 * @brief Get wall-clocktime, as reported by the system
 *
 * @returns wallclock time in milliseconds as reported by the system.
 */
uint64_t TIMER_getAbsNow(void);

/*!
 * @brief A timer token.
 *
 * Timer tokens is a low cost way of creating a timeout timer
 * this type of timer is good for polling timeouts
 *
 * If you require a timer with a callback, then use TIMER_CB_create()
 *
 * The return value does not need to be destroyed or released.
 */
typedef uint32_t timertoken_t;

/*!
 * @brief Get a timer token
 *
 * @return timer token.
 *
 * Example usage:
 *
 * \code
 *
 *     token = TIMER_TimeoutStart()
 *
 *     for(;;){
 *         r = poll_something();
 *         if(r == success){
 *               break;
 *         }
 *         if(TIMER_TimeoutIsExpired(token, 1000)){
 *              printf("One second timeout has expired\n");
 *              r = failure;
 *         }
 *     }
 *
 * \endcode
 */
timertoken_t TIMER_timeoutStart(void);

/*!
 * @brief Sleep for n-milliseconds
 *
 * @param number of milliseconds to sleep
 *
 * Notes:
 *   - 32bit machines cannot sleep more then (47days/2)
 *   - 16bit machines cannot sleep more then (16 seconds)
 */
void TIMER_sleep(uint32_t nMsecs);

/*!
 * @brief Determine if a timeout has expired
 *
 * @param token - from TIMER_TimeoutStart()
 * @param n_msecs - how many milliseconds to test against.
 *
 * Note: if msecs == 0, the timeout is immediate
 *       if msecs == -1, the timeout is never
 *       if msecs > 0, timeout depends
 */
int     TIMER_timeoutIsExpired(timertoken_t token, int n_msecs);

/*!
 * @typedef timer_callback
 *
 * @brief Timers done via a callback.
 * @param h - the handle for this timer
 * @param cookie - parameter for the timer callback.
 * @return void
 */
typedef void timer_callback_fn(intptr_t tmr_h, intptr_t cookie);

/*
 * @brief Create a callback timer that occurs every n_mSecs
 *
 * @param pCbFunc - callback functions pointer
 * @param dbg_name - name for debug purposes
 * @param cookie  - parameter for the callback function
 * @param mSec_period - delay between callbacks measured in mSecs
 * @param periodic - true if the timer should self-reschedule it self.
 *
 * As with the non-callback timer, the period ranges from
 * 0 .. (UINT32_MAX/2) in milliseconds.
 * This amounts to approximately 22 days on a 32bit machine.
 *
 * @return non-zero handle upon success, 0 on failure.
 */
intptr_t  TIMER_CB_create(const char *dbg_name,
                           timer_callback_fn *pCbFunc,
                           intptr_t cookie,
                           uint32_t mSec_Period,
                           bool periodic);

/*
 * @brief cancel and release resources associate with this callback timer
 *
 * @param h - return handle from timer_cb_create()
 */
void TIMER_CB_destroy(intptr_t h);

/*
 * @brief Is this timer handle?
 *
 * @param h - return handle from timer_cb_create()
 *
 * @returns true if the handle is valid
 */
bool TIMER_CB_isValid(intptr_t h);

/*
 * @brief Is this timer handle?
 *
 * @param h - return handle from timer_cb_create()
 *
 * @returns negative if timer has expired, 0..N milliseconds remaining
 *
 */
int TIMER_CB_getRemain(intptr_t h);

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

