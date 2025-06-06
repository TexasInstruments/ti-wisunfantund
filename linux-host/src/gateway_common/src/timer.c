/******************************************************************************
 @file timer.c

 @brief TIMAC 2.0 API Generic Timer abstraction functions

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
#include "timer.h"
#include "threads.h"
#include "log.h"
#include "hlos_specific.h"

static uint64_t epoch_msecs = 0;

/*
 * Initialize the time keeping system
 */
static void _epoch_init(void)
{
    if(epoch_msecs == 0)
    {
        epoch_msecs = TIMER_getAbsNow();
    }
}

/*
 * Get the starting epoch in milliseconds
 *
 * Public function defined in timer.h
 */
uint64_t TIMER_getEpoch(void)
{
    if(epoch_msecs == 0)
    {
        _epoch_init();
    }

    return (epoch_msecs);
}

/*
 * Initialize the timer module as a whole
 *
 * Public function defined in timer.h
 */
void TIMER_init(void)
{
    TIMER_getEpoch();
}

/*
 * get runtime in milliseconds
 *
 * Public function defined in timer.h
 */
unsigned TIMER_getNow(void)
{
    uint64_t t;
    if(epoch_msecs == 0)
    {
        _epoch_init();
    }
    t = TIMER_getAbsNow();
    t = t - epoch_msecs;
    return ((unsigned)(t));
}

/*
 * Start a timeout timer for use with TIMER_timeoutIsExpired()
 *
 * Public function defined in timer.h
 */
timertoken_t TIMER_timeoutStart(void)
{
    return (TIMER_getNow());
}

/*
 * Determine if a timeout has expired
 *
 * Public function defined in timer.h
 */
int TIMER_timeoutIsExpired(timertoken_t tstart, int v)
{
    unsigned tend;
    unsigned tnow;
    int      diff; /* must be signed */

    if(v < 0)
    {
        return (false);
    }
    if(v == 0)
    {
        return (true);
    }

    tend = tstart + v;
    tnow = TIMER_getNow();

    diff = (int)(tend - tnow);
    /* we can do this, here's how
     * --------------------
     * MAJOR ASSUMPTION: Timeout period is never
     * more then 1/2 the max value of an usngined int
     * (This translates to (47days/2) = 23 days)
     *
     * Step 1:
     *    Just subtract as unsigned
     * Step 2:
     *    Convert result to *SIGNED*
     * Step 3:
     *    If timeout is never > (unsigned max / 2)
     *       Then ... the SIGN (+/-) of the result
     *       tells us if it has expired or not.
     *
     * consider if the numbers where 4 bit
     * Here's the result of the math
     *
     * 4bit example
     *  END    NOW -> result
     *  0x4    0x1  -> 0x3 (positive) not expired
     *  0x1    0x4  -> 0xd (negative) expired
     *
     *  0xa    0xb ->  0xf (negative) expired
     *  0xb    0xa ->  0x1 (positive) not expired
     *  0x6    0xa ->  0xc (negative) expired
     *  0xc    0x1 ->  0xb (negative) expired
     */
    if(diff < 0)
    {
        return (1);
    }
    else
    {
        return (0);
    }
}

uint64_t TIMER_getAbsNow(void)
{
    return (_TIMER_getAbsNow());
}

void TIMER_sleep(uint32_t mSecs)
{
    _TIMER_sleep(mSecs);
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

