/******************************************************************************
 @file threads.c

 @brief TIMAC 2.0 API CC1310, CC1350

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
#include "threads.h"

#include "log.h"
#include "fatal.h"

#include <malloc.h>
#include <string.h>

#include "hlos_specific.h"

/*!
 * @struct thread - [private] details about a thread
 */

struct thread {
    /*! pointer to verify this is a thread or not */
    int          *checkvalue;
    /*! Name of this thread for debug purposes */
    const char   *dbg_name;

    /*! Has been requested to die */
    bool is_dead;

    /*! The os identfier for this thread */
    intptr_t os_id;

    /*! The thread function */
    threadfunc_t *func;

    /*! The parameter for this thread */
    intptr_t      cookie;

    /*! The startup flags for this thread */
    int           startflags;

    /*! Exit value of the thread if it has exited) */
    intptr_t      exit_value;

    /*! Flag indicating if the thread is alive or not (exited) */
    bool          is_alive;

    /*! Or did we kill this thread? */
    bool          killed;

    /* Next thread in list of known threads */
    struct thread *pNext;
};

/*!
 * @var all_threads
 * @brief [private] list head for all threads
 */
static struct thread *all_threads;
/*!
 * !var check value to determine if thread structure is a thread
 */
static int thread_checkvalue;

/*!
 * @var thread_mutex
 * @brief [private] Thread list mutex
 */

/*!
 * @brief [private] get debug name for this thread
 * @param internal pointer to the thread details
 * @returns printable string representing name of the thread
 */
static const char *_thread_name(struct thread *pT)
{
    const char *cp;
    /*
     * HERE THERE BE DRAGONS....
     * see thread destroy
     *
     * There is a race condition...
     *
     * Time(A)
     *
     * Some thread(FOO) - requests the name of *THIS* thread(bar)
     * Perhaps for logging purposes.
     *
     * Time(B)
     * However, thread(bar)  destroys it self, or dies
     * and the thread gets destroyed ..
     *
     * Time(C)
     * As a result of destruction(bar), the dbg name is destroyed
     * actually it is free() ...
     *
     * Time(D)
     * The actual log message occurs and references the name
     * that was fetched in condition (A)
     *
     * What this will do is cause a reference to memory that
     * has been already freed().
     *
     * BECAUSE: The debug names are *ONLY* used if and only if
     * an error has occured, or debug logging is turned on.
     *
     * It is not a runtime critical thing..
     *
     * Thus this is an extremely rare condition that we are not
     * going to solve.
     */

    if(pT == NULL)
    {
        return ("not-a-thread");
    }

    cp = pT->dbg_name;
    if(cp == NULL)
    {
        cp = "thread-no-name";
    }
    return (cp);
}

/*!
 * @brief [private] Convert a thread handle into an internal representation
 * @param h - the thread handle
 * @returns - if valid, a pointer to the thread details otherwise null
 */
static struct thread *h2p(intptr_t h)
{
    struct thread *pT;

    /* cast it */
    pT = (struct thread *)(h);

    /* And if it seems ok... keep checking */
    if(pT)
    {

        if(pT->checkvalue == &thread_checkvalue)
        {
            return (pT);
        }
    }
    /* Hmm... print an error message */
    //LOG_printf(LOG_ERROR, "%p: is not a thread\n", (void *)pT);
    return (NULL);
}

/*!
 * @brief [private] Lock our list of threads
 * @return void
 */
static void thread_list_lock(void)
{
    _ATOMIC_global_lock();
}

/*!
 * @brief [private] Unlock our list of threads
 * @return void
 */
static void thread_list_unlock(void)
{
    _ATOMIC_global_unlock();
}

/*!
 * @brief Wrapper to start a thread and handle return values
 */
static intptr_t thread_wrapper(intptr_t param)
{
    struct thread *pT;
    intptr_t r;

    /* recover our data structure from the pthread parameter */
    pT = (struct thread *)(param);

    /* Future we might do stuff here. */
    pT->is_alive = true;
    /* life begins.... */
    r = (*(pT->func))(pT->cookie);
    /* time to exit */
    pT->exit_value = r;
    pT->is_alive = false;
    return (r);
}

/*!
 * Create a thread
 *
 * Public function defined in threads.h
 */
intptr_t THREAD_create(const char *name,
                        threadfunc_t *func,
                        intptr_t cookie,
                        int startflags)
{
    struct thread *pT;

    /* dup the name */
    if(name == NULL)
    {
        name = "noname";
    }
    name = strdup(name);

    /* get space for details */
    pT = calloc(1,sizeof(*pT));
    if(pT == NULL)
    {
        free_const((const void *)(name));
        //LOG_printf(LOG_ERROR,"no memory for thread?\n");
        return (0);
    }

    /* fill in details struct */
    pT->dbg_name   = name;
    pT->checkvalue = &thread_checkvalue;
    pT->startflags = startflags;
    pT->cookie     = cookie;
    pT->func       = func;
    pT->is_alive = false;
    pT->is_dead = false;
    pT->exit_value = 0;

    /* we only support default now */
    if(pT->startflags != THREAD_FLAGS_DEFAULT)
    {
        BUG_HERE("THREAD_create() flag not supported\n");
    }
    //LOG_printf(LOG_DBG_THREAD, "%s: THREAD_create()\n", _thread_name(pT));

    /* add to the list */
    thread_list_lock();
    pT->pNext = all_threads;
    all_threads = pT;
    thread_list_unlock();

    /* create the thread */
    pT->os_id = _THREAD_create(pT->dbg_name, thread_wrapper, (intptr_t)(pT));
    if(pT->os_id == 0)
    {
        THREAD_destroy((intptr_t)(pT));
        pT = NULL;
    }

    return ((intptr_t)(pT));
}

/*
 * Destroy a thread
 *
 * Public function defined in treads.h
 */

void THREAD_destroy(intptr_t h)
{
    struct thread *pT;
    struct thread **ppT;

    pT = h2p(h);
    if(pT == NULL)
    {
        return;
    }

    if(pT->is_alive)
    {
        pT->killed = true;
        _THREAD_destroy(pT->os_id);
        pT->os_id = 0;
        /* nothing we can do.. */
    }
    /* remove from thread linked list */

    thread_list_lock();
    ppT = &(all_threads);
    while(*ppT)
    {
        if((*ppT) != pT)
        {
            ppT = &((*ppT)->pNext);
            continue;
        }
        else
        {
            break;
        }
    }

    if(*ppT)
    {
        /* Found, remove from list */
        (*ppT) = (*ppT)->pNext;
    }
    else
    {
        BUG_HERE("Thread (%s) @ %p not found in list of known threads\n",
                 pT->dbg_name, pT );
    }

    thread_list_unlock();

    if(pT->dbg_name)
    {
        /*
         * HERE THERE BE DRAGONS ...
         *   See the race condition described in the
         *   function:  _thread_name()
         *
         * If this truely is a problem during debug
         * the solution (workaround) is this:
         *
         * If you are debugging - do not free() the
         * thread name
         */
        free_const((const void *)(pT->dbg_name));
    }

    memset((void *)(pT), 0, sizeof(*pT));
    free((void *)(pT));
}

/*!
 * @brief [private] Get our own thread details pointer
 */
static struct thread *_thread_self(void)
{
    intptr_t whoami;
    struct thread *pT;

    whoami = _THREAD_self();
    /* find our self */
    thread_list_lock();
    pT = all_threads;
    while(pT)
    {
        if(pT->os_id == whoami)
        {
            break;
        }
        pT = pT->pNext;
    }
    thread_list_unlock();
    return (pT);
}

/*
 * Return the debug name of the current thread
 *
 * Public function defined in threads.h
 */
const char *THREAD_selfName(void)
{
    struct thread *pT;

    pT = _thread_self();

    return (_thread_name(pT));
}

/*
 * Return the debug name of a specific thread
 *
 * Public function defined in threads.h
 */
const char *THREAD_name(intptr_t h)
{
    struct thread *pT;

    pT = h2p(h);

    return (_thread_name(pT));
}

/*
 * Return the id of the current thread
 *
 * Public function defined in threads.h
 */
intptr_t THREAD_self(void)
{
    struct thread *pT;

    pT = _thread_self();

    return ((intptr_t)(pT));
}

/*
 * Return the exit value of a thread
 *
 * Public function defined in threads.h
 */
intptr_t THREAD_getExitValue(intptr_t h)
{
    struct thread *pT;

    pT = h2p(h);
    if(pT == NULL)
    {
        return (-1);
    }
    return (pT->exit_value);
}

/*
 * Called by threads to exit their execution.
 *
 * Public function defined in threads.h
 */
void THREAD_exit(intptr_t value)
{
    struct thread *pT;

    /* find our self */
    pT = _thread_self();
    //LOG_printf(LOG_DBG_THREAD,
                // "%s: THREAD_Exit(%d)\n",
                // _thread_name(pT),
                // (int)value);

    /* record our expiry value */
    pT->exit_value = value;
    /* we are dead jim.. */
    pT->is_alive = false;
    /* and die */
    _THREAD_exit();
}

/*
 * Return true if this thread is still alive (not exited)
 *
 * Public function defined in threads.h
 */
bool THREAD_isAlive(intptr_t h)
{
    struct thread *pT;

    pT = h2p(h);
    if(pT == NULL)
    {
        return (false);
    }
    return (pT->is_alive);
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
