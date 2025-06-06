/******************************************************************************
 @file mutex.c

 @brief TIMAC 2.0 API Mutex abstraction

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
#include "mutex.h"
#include "timer.h"
#include "log.h"
#include "threads.h"

#include <stdio.h>
#include <malloc.h>
#include <string.h>
#include <errno.h>
#include "hlos_specific.h"

static const int is_mutex = 'm';

/*
 * @struct mutex - internal representation of a mutex
 */
struct mutex {
    /*! for debug purposes */
    const char *dbg_name;

    /*! for structure pointing checks */
    const int *check_val;

    /*! Underlying implimentation is a linux semaphore */
    intptr_t    m;

    /*! Who owns this, requird for recursive mutexes */
    intptr_t  owner;

    /*! non-zero recursive lock depth counter */
    int        recursive_lock;
};

/* get a safe debug name for this mutex */
static const char *_mutex_name(struct mutex *pM)
{
    const char *cp;

    cp = pM->dbg_name;
    if(cp == NULL)
    {
        cp = "mutex-no-name";
    }
    return (cp);
}

/* convert the mutex handle to a mutex structure */
static struct mutex * h2m(intptr_t h)
{
    struct mutex *pM;
    pM = NULL;
    if(h)
    {
        pM = (struct mutex *)(h);
        if(pM->check_val != &is_mutex)
        {
            pM = NULL;
        }
    }
    if(pM == NULL)
    {
        BUG_HERE("%s not a mutex (%p)\n",
                    THREAD_selfName(), (void *)(h));
    }
    return (pM);
}

/*
 * Create a mutex
 *
 * Public function defined in mutex.h
 */
intptr_t MUTEX_create(const char *name)
{
    struct mutex *pM;

    /* get space. */
    pM = calloc(1, sizeof(struct mutex));
    if(!pM)
    {
        if(name == NULL)
        {
            name = "mutex-no-name";
        }
        //LOG_printf(LOG_ERROR,
                //    "%s:(%s) MUTEX_Create() no memory\n",
                //    THREAD_selfName(), name);
        return (0);
    }
    /* set the checkvalue so we can verify the handle is a mutex later */
    pM->check_val = &is_mutex;
    pM->recursive_lock = 0;

    pM->m = _ATOMIC_local_create();
    if(pM->m == 0)
    {
        /* cannot create the semaphore? */
        BUG_HERE("cannot create mutex\n");
    }

    if(name == NULL)
    {
        name = "mutex-no-name";
    }
    pM->dbg_name = strdup(name);
    if(pM->dbg_name == NULL)
    {
        BUG_HERE("no memory\n");
    }

    /*//LOG_printf(LOG_ALWAYS, "Create mutex: %s @ %p\n", pM->dbg_name, (void *)(pM)); */
    return ((intptr_t)(pM));
}

/*
 * Destroy a mutex
 *
 * Public function defined in mutex.h
 */
void MUTEX_destroy(intptr_t h)
{
    struct mutex *pM;

    if(h)
    {
        /*//LOG_printf(LOG_ALWAYS, "Destroy mutex: @ %p\n", (void *)(h)); */
    }

    /* recover our handle */
    pM = h2m(h);
    if(!pM)
    {
        return;
    }

    //LOG_printf(LOG_DBG_MUTEX,
                // "%s(%s) MUTEX_Destroy()\n",
                // THREAD_selfName(), _mutex_name(pM));
    /* destroy... destroy... */
    if(pM->dbg_name)
    {
        free_const((const void *)(pM->dbg_name));
        pM->dbg_name = NULL;
    }
    _ATOMIC_local_destroy(pM->m);
    pM->m = 0;
    memset((void *)(pM), 0, sizeof(*pM));
    free((void *)(pM));
}

/*
 * Lock a mutex
 *
 * Public function defined in mutex.h
 */
int MUTEX_lock(intptr_t h, int timeout_mSecs)
{
    struct mutex *pM;
    int r;
    bool need_lock;
    intptr_t whoami;
    uint32_t tstart, tend;

    /* recover our mutex pointer */
    pM = h2m(h);
    if(pM == NULL)
    {
        return (-1);
    }

    /* inspect.. */
    whoami = THREAD_self();
    need_lock = true;
    _ATOMIC_global_lock();
    if(pM->recursive_lock)
    {
        if(pM->owner == whoami)
        {
            need_lock = false;
        }
    }
    _ATOMIC_global_unlock();
    tstart = TIMER_getNow();
    r = 0;
    if(need_lock)
    {
        r = _ATOMIC_local_lock(pM->m, timeout_mSecs);
    }
    if(r == 0)
    {
        /* success */
        /* so we can detect recursive locks */
        pM->owner = THREAD_self();
        pM->recursive_lock += 1;
        //LOG_printf(LOG_DBG_MUTEX,
            //        "%s: MUTEX_lock(%s) success (recursion=%d)\n",
            //        THREAD_selfName(),
            //         _mutex_name(pM),
            // pM->recursive_lock);
    }
    else
    {
        tend = TIMER_getNow();
        //LOG_printf(LOG_DBG_MUTEX, "%s: MUTEX_lock(%s) failed (timeout=%d), s=%d e=%d\n",
            // THREAD_selfName(),
            //        _mutex_name(pM), timeout_mSecs, (int)tstart, (int)tend);
    }
    return (r);
}

/*
 * Unlock a mutex
 *
 * Public function defined in mutex.h
 */
int MUTEX_unLock(intptr_t h)
{
    struct mutex *pM;
    int r;
    /* recover handle */
    pM = h2m(h);
    if(pM == NULL)
    {
        return (-1);
    }

    _ATOMIC_global_lock();
    r = pM->recursive_lock;
    if(r == 0)
    {
        BUG_HERE("mutex negative unlock!\n");
    }
    r--;
    pM->recursive_lock = r;
    if(r == 0)
    {
        pM->owner = 0; /* nobody owns this */
        _ATOMIC_local_unlock(pM->m);
    }
    _ATOMIC_global_unlock();
    if(r)
    {
        //LOG_printf(LOG_DBG_MUTEX,
            // "%s: MUTEX_unLock(%s) still locked(%d)\n",
            // THREAD_selfName(), _mutex_name(pM), r);
    }
    else
    {
        //LOG_printf(LOG_DBG_MUTEX,
            // "%s: MUTEX_unlock(%s) unlocked\n",
            // THREAD_selfName(), _mutex_name(pM));
    }
    return (0);
}

const char *MUTEX_lockerName(intptr_t h)
{
    const char *cp;
    struct mutex *pM;

    pM = h2m(h);

    cp = "none";
    if(pM != NULL)
    {
        /* return the name of the locking thread */
        cp = THREAD_name(pM->owner);
    }
    return (cp);
}

/*
 * Determine if a mutex s locked
 *
 * Public function defined in mutex.h
 */
bool MUTEX_isLocked(intptr_t h)
{
    bool answer;
    struct mutex *pM;

    /* recover our handle */
    pM = h2m(h);
    if(pM == NULL)
    {
        return (false);
    }

    answer = (pM->recursive_lock != 0);
    //LOG_printf(LOG_DBG_MUTEX, "%s(%s) MUTEX_IsLocked() = %s\n",
     //           THREAD_selfName(), _mutex_name(pM), answer ? "true" : "false");
    return (answer);
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

