/******************************************************************************
 @file timer_cb.c

 @brief TIMAC 2.0 API Callback timer abstraction

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
#include "compiler.h"
#include "log.h"
#include "mutex.h"
#include "threads.h"
#include "ti_semaphore.h"

#include <malloc.h>
#include <string.h>

/*
 * @var timer_sem_id
 * @brief Timer thread sleeps on this
 */
static intptr_t timer_sem_id;

/*
 * @var timer_mutex_id
 * @brief Controls access to the timer linked list
 */
static intptr_t timer_mutex_id;

/*
 * @var timer_thread_id
 * @brief Timer thread id
 */
static intptr_t timer_thread_id;

/*
 * @var timer_check
 * @brief used to verify the timer_cb_structure is valid or not
 */
static const int timer_check = 'T';

/*
 * @struct timer_cb_details
 * @brief Details about a timer with a callback.
 */
struct timer_cb_details {
    /*! points to timer_check if this is a valid timer */
    const int *check_ptr;

    /*! debug name, could be null */
    const char *dbg_name;

    /*! time when this expires */
    uint32_t expire_time;

    /*! Is this timer periodic? */
    bool     periodic;

    /*! what is this timer period? */
    uint32_t period_mSec;

    /*! callback for timer */
    timer_callback_fn *callback;

    /*! parameter for the timer */
    intptr_t           cookie;

    /* next timer in the list */
    struct timer_cb_details *pNext;
};

/*
 * @var pTMR_InService
 * @brief This is the current active timer being serviced.
 *
 */
static  struct timer_cb_details *  pTMR_InService;;

/*
 * @var pTMR_List
 * @brief The list of all active timers
 */
static struct timer_cb_details *pTMR_ActiveList;

/*
 * @var timer_done_once
 * @brief  Initialize the timer callback code once
 */
static int timer_done_once = 0;

/*!
 * @var timer_cb_h2tmr
 * @param h - possible timer pointer to convert
 * @returns pointer, or NULL on error
 */
static struct timer_cb_details *timer_cb_h2tmr(intptr_t h)
{
    struct timer_cb_details *pTMR;

    pTMR = (struct timer_cb_details *)(h);
    if(pTMR)
    {
        if(pTMR->check_ptr != &(timer_check))
        {
            //LOG_printf(LOG_ERROR, "not a timer: %p\n", (void *)(pTMR));
            pTMR = NULL;
        }
    }
    return (pTMR);
}

/*!
 * @brief Lock the timer list
 */
static void timer_list_lock(void)
{
    MUTEX_lock(timer_mutex_id, -1);
}

/*!
 * @brief UnLock the timer list
 */
static void timer_list_unlock(void)
{
    MUTEX_unLock(timer_mutex_id);
}

/*!
 * @brief Insert this timer into the list at the proper location
 */
static void _timer_insert(struct timer_cb_details *pTMR)
{
    struct timer_cb_details **ppTMR;
    int tval;

    /* determine when this timer will expire
     * NOTE:
     *  This code has a limitation :-(
     *  It will slowly skew perodic timers
     *  in real hardware we might choose
     *  to do this a differnet way that
     *  will not skew ...
     *
     * -------
     *  Example:
     *   PEROID = 10
     *   Actual 1st service occurs at 11
     *   Resceduled at 12 mSec
     *   Next schedule will occur at 22mSec
     *   And the next.. might be off by a few mSecs
     * -------

     * Determine when this will expire
    */
    pTMR->expire_time = TIMER_getNow() + pTMR->period_mSec;

    /* hunt the list for its insertion position */
    ppTMR = &(pTMR_ActiveList);

    /* While we have a list.. */
    while(*ppTMR)
    {

        /* where does it go? */
        tval = (int)(pTMR->expire_time - (*ppTMR)->expire_time);

        if(tval <= 0)
        {
            /* it goes here (before) this one */
            break;
        }
        /* Try the next one */
        ppTMR = &((*ppTMR)->pNext);
    }

    /* insert here, before the next one */
    pTMR->pNext = (*ppTMR);
    *ppTMR = pTMR;
}

/*
 * @brief This is the timer thread (we don't use signals)
 * @param cookie - not used in this code
 * @return not really used
 *
 * This implimentation is based on a semaphore timeout
 * We choose this implimentation so as to avoid
 */
static void real_timer_thread_func(void)
{
    uint32_t tnow;
    int timeout_mSecs;
    struct timer_cb_details *pTMR;

    timer_list_lock();

    for(;;)
    {
        pTMR = pTMR_ActiveList;
        /* Do we have a timer list? */
        if(pTMR)
        {
            /* Check the head item */
            tnow = TIMER_getNow();
            tnow = pTMR->expire_time - tnow;
            timeout_mSecs = (int)(tnow);
        }
        else
        {
            /* no list, so sleep for a minute */
            timeout_mSecs = 60 * 1000;
        }

        /* Should we sleep? */
        if(timeout_mSecs > 0)
        {
            timer_list_unlock();
            SEMAPHORE_waitWithTimeout(timer_sem_id, timeout_mSecs);
            timer_list_lock();
            /* Try again */
            continue;
        }

        /* Timer at head has expired */
        /* head item is now the timer "in-service" */

        /* Remove head item from list.. */
        pTMR_ActiveList = pTMR->pNext;
        pTMR->pNext = NULL;

        /* NOTE the currently active timer */
        pTMR_InService = pTMR;

        /* call the expired timer */
        /* we unlock it during this process */
        timer_list_unlock();
        (*(pTMR->callback))((intptr_t)(pTMR), pTMR->cookie);
        timer_list_lock();

        /*
         * This can happen during the callback:
         *
         * Option 1:
         *   Nothing happens
         *   If it is perodic, below we will reschedule
         *   otherwise the app will delete it when it is not needed again
         *
         * Option 2: (this is the problem)
         *   The app decides to delete it.
         *   If this happens, we will have NULLed
         *   the pTMR_InService variable
        */

        /* Reclaim our pointer */
        pTMR = pTMR_InService;
        pTMR_InService = NULL;

        /* Determine: Was it deleted? */
        if(pTMR)
        {
            /* No it was not.. */
            if(pTMR->periodic)
            {
                _timer_insert(pTMR);
            }
        }
        /* continue around */
    } /* for(;;) loop */
}

/* this function exists to remove a Visual Studio C4702 warning ... */
static intptr_t timer_thread_func(intptr_t cookie)
{
    (void)cookie;
    real_timer_thread_func();
    return (0);
}

/*
 * @brief Code to initialize the timer module
 * @return void
 */
static void timer_once_routine(void)
{
    if(timer_done_once)
    {
        return;
    }
    timer_done_once = 1;

    timer_mutex_id = MUTEX_create("timer-mutex");
    /* Lock asap ... */
    timer_list_lock();

    /* create our semaphore, preloaded */
    /* we initalize the semaphore with 1 so it runs */
    /* when the thread starts */
    timer_sem_id = SEMAPHORE_create("timer-semaphore", 1);
    /* we create the thread *LAST* */
    timer_thread_id = THREAD_create("timer-thread",
                                     timer_thread_func,
                                     0,
                                     THREAD_FLAGS_DEFAULT);
    /* Then release once everything is done */
    timer_list_unlock();
}

/*
 * Create a callback timer
 *
 * Public function defined in timer.h
 */
intptr_t TIMER_CB_create(const char *dbg_name,
                          timer_callback_fn *pCbFunc,
                          intptr_t cookie,
                          uint32_t period_mSec,
                          bool periodic)
{
    struct timer_cb_details *pTMR;

    timer_once_routine();

    /* Create our new timer */
    pTMR = (struct timer_cb_details *)calloc(1, sizeof(*pTMR));
    if(pTMR == NULL)
    {
        //LOG_printf(LOG_ERROR, "no memory for timer!\n");
        return (0);
    }

    memset((void *)(pTMR), 0, sizeof(*pTMR));
    if(dbg_name == NULL)
    {
        dbg_name = "tmr-no-name";
    }
    pTMR->dbg_name = strdup(dbg_name);
    /* we don't do anything about errors here */

    pTMR->check_ptr   = &timer_check;
    pTMR->callback    = pCbFunc;
    pTMR->cookie      = cookie;
    pTMR->periodic    = periodic;
    /* Disallow 0 [continous] timers */
    if(period_mSec == 0)
    {
        period_mSec = 1;
    }
    pTMR->period_mSec = period_mSec;

    timer_list_lock();
    _timer_insert(pTMR);
    timer_list_unlock();

    /* wake up the timer thread
     * so it will check the list */
    SEMAPHORE_put(timer_sem_id);

    return ((intptr_t)(pTMR));
}

/*
 * Given a callback timer handle, destroy it
 *
 * Public function defined in timer.h
 */
void TIMER_CB_destroy(intptr_t h)
{
    struct timer_cb_details *pTMR;
    struct timer_cb_details **ppTMR;

    pTMR = timer_cb_h2tmr(h);
    if(pTMR == NULL)
    {
        return;
    }

    /* Be safe, lock down */
    timer_list_lock();

    /* are we deleting the timer that is in the callback? */
    if(pTMR == pTMR_InService)
    {
        /* yes .. so zap this */
        /* otherwise we might try */
        /* to reschedule it when */
        /* the callback returns */
        pTMR_InService = NULL;
    }

    /* Search the timer list for this one */
    ppTMR = &(pTMR_ActiveList);

    /* while we have items in the active list */
    while(*ppTMR)
    {
        /* If this is the matching timer? */
        if((*ppTMR) == pTMR)
        {
            /* YES! */
            /* remove this from the list */
            *ppTMR = pTMR->pNext;
            pTMR->pNext = NULL;
            /* and stop looking */
            break;
        }
        else
        {
            /* try next one in the list */
            ppTMR = &((*ppTMR)->pNext);
        }
    }
    timer_list_unlock();

    if(pTMR->dbg_name)
    {
        free_const((const void *)(pTMR->dbg_name));
    }
    memset(((void *)(pTMR)), 0, sizeof(*pTMR));
    free((void *)(pTMR));

}

/*
 * Given a callback timer handle, determine if the handle is still valid or not
 *
 * Public function defined in timer.h
 */
bool TIMER_CB_isValid(intptr_t h)
{
    return (!!(timer_cb_h2tmr(h) != NULL));
}

/*
 * Given a callback timer handle, return how much time remains before it expires
 *
 * Public function defined in timer.h
 */
int TIMER_CB_getRemain(intptr_t h)
{
    uint32_t tnow;
    struct timer_cb_details *pTMR;

    pTMR = timer_cb_h2tmr(h);
    if(pTMR)
    {
        tnow = TIMER_getNow();
        tnow = pTMR->expire_time - tnow;
        return ((int)(tnow));
    }
    else
    {
        return (-1);
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
