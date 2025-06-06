/******************************************************************************
 @file linux_specific.c

 @brief TIMAC 2.0 API Linux specific HLOS implimentation functions

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


#define __USE_GNU 1  /* enable recursive mutexes */
#define _GNU_SOURCE 1
#include "compiler.h"
#include <stdio.h>
#include <stdint.h>
#include <string.h>
#include <errno.h>
#include <stdlib.h>
#include <malloc.h>
#include "log.h"
#include "unix_fdrw.h"
#include "execinfo.h"
#include <time.h>
#include "hlos_specific.h"
#include "stream.h"
#include "stream_socket.h"
#include "fatal.h"
#include <semaphore.h>
#include <pthread.h>
#include <sys/types.h>
#include <sys/socket.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <fcntl.h>
#include <unistd.h>
#include "debug_helpers.h"
#include "timer.h"
#include "termios.h"

#include "sys/syscall.h" /* required for SYS_gettid() */

/* this is here so we can log things in *VERY* special cases
** For example, when the system crashes horribly and locks are held
** we want to be able to log the crash... regardless of the lock state
*/
extern FILE *__log_fp;

/*!
 * Global/Common atomic mutex handle for global locks.
 */
static intptr_t atomic_global = 0;

/*!
 * safty/pointer check variables
 * See: p_thread::check_ptr
 * See: p_atomic::check_ptr
 * See: p_sem   ::check_ptr
 */
static const int is_atomic = 'A';
static const int is_sem = 's';
static const int thread_check = 'T';

/*!
 * Linux specific thread info.
 */
struct p_thread {
    /*! used to verify if this is a thread pointer */
    const int *check_ptr;
    /*! pthread thread id */
    pthread_t t;
    pid_t tid;
    pid_t pid;
    /*! for use by the thread function */
    intptr_t cookie;
    /*! indicates the thread is alive/dead/exited */
    int is_alive;
    /*! the thread function to call, the pthread wrapper calls this */
    intptr_t(*thread_func)(intptr_t cookie);
    /*! Next thread in the list of threads */
    struct p_thread *pNext;
};

/*! All known threads in the system. */
static struct p_thread *all_p_threads;

/*
 * Holds Linux specific atomic (mutex) structures.
 */
struct p_atomic {
    /*! used to verify if this is an atomic (mutex) structure */
    const int *check_ptr;
    /*! what thread owns this mutex */
    pthread_t owner;
    /*! is this thread locked or not? */
    int lock_depth;

    /* The condition variable */
    pthread_cond_t cond;

    /*! the pthread mutex */
    pthread_mutex_t mtx;
};

/*
 * Holds Linux specific semaphore (counting) structures.
 */
struct p_sem {
    /*! used to veriify if this is a semaphore structure */
    const int *check_ptr;
    /*! the linux semaphore */
    sem_t s;
};

/*
 * private Convert a handle to a Linux specific mutex (atomic) wrapper.
 *
 * @param h - the opaque handle
 * @returns - pointer to the atomic struct
 */
static struct p_atomic *h2pA(intptr_t h)
{
    struct p_atomic *pA;

    pA = (struct p_atomic *)h;
    if(pA)
    {
        if(pA->check_ptr != &is_atomic)
        {
            pA = NULL;
            /* DO NOT use log code here. */
            /* why? Because we might be in the log code */
            /* and then things get really messy */
        }
    }
    return (pA);
}

/*
 * private Convert a handle to an Linux specific semaphore wrapper.
 *
 * @param h - the opaque handle
 * @returns - pointer to the semaphore struct
 */
static struct p_sem *h2pS(intptr_t h)
{
    struct p_sem *pS;

    pS = (struct p_sem *)h;
    if(pS)
    {
        if(pS->check_ptr != &is_sem)
        {
            pS = NULL;
            /* DO NOT use log code here. */
            /* why? Because we might be in the log code */
            /* and then things get really messy */
        }
    }
    return (pS);
}

/* our comon fatal handler */
static void _atomic_fatal(const char *msg)
{
    fprintf(stderr, "%s\n", msg);
    if( __log_fp )
    {
        fprintf(__log_fp, "%s\n", msg );
    }
    _FATAL_exit(1);
}

/*
 * Private Linux specific code to exit non-gracefully
 *
 * Determine if we are being debugged..
 *
 * This is helpful so that you can get a stack backtrace.
 */
static int IsDebuggerPresent(void)
{
    /* we are in a death spiral here.. */
    /* do not use our library code! */
    /* do not use things that require memory management */
    /* ie: fopen() */

    int r;
    int h;
    char buf[4096];
    char *cp;
    char *ep;

    h = open("/proc/self/status", O_RDONLY);

    if(h < 0)
    {
        return (0);
    }

    r = read(h, buf, sizeof(buf));

    /* done with file */
    close(h);

    if(r <= 0)
    {
        return (0);
    }
    /* force termination of string */
    if(r >= sizeof(buf))
    {
        r = sizeof(buf)-1;
    }
    buf[r] = 0;

    /* go find this string */
    cp = strstr(buf, "TracerPid:");
    if(!cp)
    {
        return (0);
    }
    /* goto end of string */
    cp = cp + 10;

    /* get the process id of our tracer ... */
    /* if non-zero, then we are under a debugger. */
    long n;
    n = strtol(cp, &ep, 0);
    if(cp == ep)
    {
        return (0);
    }

    switch(*ep)
    {
    default:
        /* assume something is wrong. */
        /* and we are not under a debugger */
        n = 0;
        break;
    case 0:
    case ' ':
    case '\n':
    case '\t':
        /* good termination */
        break;
    }

    /* is the process id non-zero? */
    if(n)
    {
        /* then GDB is here... */
        return (1);
    }
    else
    {
        /* otherwise it is not */
        return (0);
    }
}

static void dump_backtrace(void)
{
    int n;
    int x;
    void *buf[100];
    char **syms;

    /* see: http://linux.die.net/man/3/backtrace_symbols */
    n = backtrace(buf,100);
    syms = backtrace_symbols(buf, n);
    if(syms == NULL)
    {
        fprintf(stderr, "No backtrace symbols, sorry\n");
        fprintf(__log_fp, "No backtrace symbols, sorry\n");
    }
    else
    {
        for(x = 0; x < n; x++)
        {
            fprintf(stderr,"%2d) %s\n", x, syms[x]);
            fprintf(__log_fp,"%2d) %s\n", x, syms[x]);
        }
    }
    /* flush *FIRST* because the heap may be toast.. */
    fflush(stderr);
    fflush(__log_fp);
    free(syms);
}

/*
 * Linux specific code to exit non-gracefully
 *
 * And .. if if possible - halt inside of GDB ungracefully.
 *
 * This is helpful so that you can get a stack backtrace.
 */
void _FATAL_exit(int code)
{
    dump_backtrace();
    if(IsDebuggerPresent())
    {
        dump_backtrace();
        abort();
    }
    exit(code);
}

/*
 * Private code to create (if needed) the single common global mutex.
 */
static void _atomic_init(void)
{
    if(atomic_global == 0)
    {
        atomic_global = _ATOMIC_local_create();
    }
}

/*
 * Linux specific function to lock a single common global mutex
 *
 * Defined in hlos_specific.h
 */
void _ATOMIC_global_lock(void)
{
    _atomic_init();
    _ATOMIC_local_lock(atomic_global, -1);
}

/*
 * Linux specific function to unlock a single common global mutex
 *
 * Defined in hlos_specific.h
 */
void _ATOMIC_global_unlock(void)
{
    _atomic_init();
    _ATOMIC_local_unlock(atomic_global);
}

/*
 * Linux specific function to create a mutex local to some structure
 *
 * Defined in hlos_specific.h
 */
intptr_t _ATOMIC_local_create(void)
{
    struct p_atomic*pA;

    pA = calloc(1, sizeof(*pA));
    if(pA == NULL)
    {
        _atomic_fatal("no memory for atomic\n");
    }

    pA->check_ptr = &is_atomic;

    pA->lock_depth = 0;
    pthread_cond_init( &(pA->cond), NULL );
    pthread_mutex_init(&(pA->mtx), NULL);
    return ((intptr_t)(pA));
}

/*
 * Linux specific function to destroy a mutex local to some structure
 *
 * Defined in hlos_specific.h
 */
void _ATOMIC_local_destroy(intptr_t h)
{
    struct p_atomic *pA;

    pA = h2pA(h);
    if(pA)
    {
        pthread_cond_destroy( &(pA->cond) );
        pthread_mutex_destroy(&(pA->mtx));
        memset((void *)(pA), 0, sizeof(*pA));
    }
}

/*
 * Linux specific function to unlock a mutex local to some structure
 *
 * Defined in hlos_specific.h
 */
void _ATOMIC_local_unlock(intptr_t h)
{
    struct p_atomic *pA;

    pA = h2pA(h);
    if(pA == NULL)
    {
        return;
    }

    pthread_mutex_lock( &(pA->mtx) );

    if(!pthread_equal(pA->owner, pthread_self()))
    {
        /* we choose not to allow this.
         * there are cases when this is valid.
         * But we choose not to support this [for now]
         * our view may change in the future. */
        _atomic_fatal("unlock by non-owning thread\n");
    }

    if( pA->lock_depth <= 0 )
    {
        _atomic_fatal("unlock underflow\n");
    }

    pA->lock_depth -= 1;
    if( pA->lock_depth == 0 )
    {
        /* first clear ownership */
        memset(&(pA->owner), 0, sizeof(pA->owner));
    }
    pthread_cond_signal( &(pA->cond) );

    pthread_mutex_unlock( &(pA->mtx) );
}

/*
 * private common code to create a timespec for the purposes of a timeout.
 */
static void make_timespec(struct timespec *tv, int timeout_mSecs)
{
    int r;

    clock_gettime(CLOCK_REALTIME, tv);
    tv->tv_sec += (timeout_mSecs / 1000);
    /* get just the mSecs portion */
    r = timeout_mSecs % 1000;
    /* convert to nSecs */
    r = r * 1000 * 1000;
    tv->tv_nsec += r;
    while(tv->tv_nsec > (1000 * 1000 * 1000))
    {
            tv->tv_sec += 1;
            tv->tv_nsec -= (1000 * 1000 * 1000);
    }
}

/*
 * Linux specific code to lock a mutex local to a structure.
 *
 * Defined in hlos_specific.h
 */
int _ATOMIC_local_lock(intptr_t h, int timeout_mSecs)
{
    struct p_atomic *pA;
    struct timespec tv;
    unsigned tstart;
    unsigned tnow;
    unsigned twaited;
    int tremain;

    int r;

    pA = h2pA(h);
    if(pA == NULL)
    {
        return (-1);
    }

    if( timeout_mSecs > 0 )
    {
        tstart = TIMER_getNow();
    }
    else
    {
        tstart = 0;
    }

    pthread_mutex_lock( &(pA->mtx) );
    /* assume fail */
    r = -1;

    if(pthread_equal(pA->owner, pthread_self()))
    {
        /* recursive lock */
        /* success */
        r = 0;
        goto done;
    }

    for(;;){
        if( pA->lock_depth == 0 )
        {
            r = 0;
            break;
        }

        if( timeout_mSecs == 0 ){
            /* locked, so we fail */
            r = -1;
            break;
        }
        if( timeout_mSecs < 0 )
        {
            /* forever */
            pthread_cond_wait( &(pA->cond), &(pA->mtx) );
            /* check again */
            continue;
        }

        /* Wait timeout period */
        tnow = TIMER_getNow();
        /* how long have we waited already? */
        twaited = tnow - tstart;

        tremain = timeout_mSecs - ((int)(twaited));
        if( tremain <= 0 ){
            /* ran out of time */
            r = -1;
            break;
        }
        make_timespec( &tv, tremain );

        pthread_cond_timedwait( &(pA->cond), &(pA->mtx), &tv );
        continue;
    }
done:
    if( r == 0 )
    {
        /* success */
        pA->lock_depth += 1;
        if( pA->lock_depth == 1 )
        {
            pA->owner = pthread_self();
        }
    }
    pthread_mutex_unlock( &(pA->mtx) );
    return r;
}

/*
 * Linux specific code to create a semaphore.
 *
 * Defined in hlos_specific.h
 */
intptr_t _ATOMIC_sem_create(void)
{
    struct p_sem *pS;

    pS = calloc(1, sizeof(*pS));
    if(pS == NULL)
    {
        _atomic_fatal("no mem for sem\n");
    }
    pS->check_ptr = &is_sem;
    sem_init(&(pS->s), 0, 0);
    return ((intptr_t)(pS));
}

/*
 * Linux specific code to destroy a semaphore.
 *
 * Defined in hlos_specific.h
 */
void _ATOMIC_sem_destroy(intptr_t h)
{
    struct p_sem *pS;

    pS = h2pS(h);
    if(pS)
    {
        sem_destroy(&(pS->s));
        memset((void *)(pS), 0, sizeof(*pS));
        free((void*)(pS));
    }
}

/*
 * Linux specific code to put (increment) on a semaphore
 *
 * Defined in hlos_specific.h
 */
void _ATOMIC_sem_put(intptr_t h)
{
    struct p_sem *pS;

    pS = h2pS(h);
    if(pS == NULL)
    {
        _atomic_fatal("not a semaphore\n");
        return;
    }

    sem_post(&(pS->s));
}

/*
 * Linux specific code to get (wait,decrement) on a semaphore
 *
 * Defined in hlos_specific.h
 */
int _ATOMIC_sem_get(intptr_t h, int timeout_mSecs)
{
    struct timespec tv;
    struct p_sem *pS;
    int r;

    pS = h2pS(h);
    if(pS == NULL)
    {
        _atomic_fatal("not a semaphore\n");
    }

    if(timeout_mSecs < 0)
    {
        r = sem_wait(&(pS->s));
    }
    else if(timeout_mSecs == 0)
    {
        r = sem_trywait(&(pS->s));
    }
    else
    {
        make_timespec(&tv, timeout_mSecs);
        r = sem_timedwait(&(pS->s), &tv);
    }

    if(r == 0)
    {
        /* we have success */
        r = 1;
    }
    else
    {
        r = 0;
    }
    return (r);
}

/*
 * Linux specific code to retrieve the semaphore count value
 *
 * Defined in hlos_specific.h
 */
int _ATOMIC_sem_cnt(intptr_t h)
{
    struct p_sem *pS;
    int r,v;

    pS = h2pS(h);
    if(pS == NULL)
    {
        _atomic_fatal("not a semaphore\n");
    }

    r = sem_getvalue(&(pS->s), &v);
    (void)(r); /* ignored */
    return (v);
}

/*
 * Linux specific get abs (wall clock) time in milliseconds function
 *
 * Defined in hlos_specific.h
 */
uint64_t _TIMER_getAbsNow(void)
{
    struct timespec tv;
    uint64_t r;

    clock_gettime(CLOCK_REALTIME, &tv);

    /* convert nano seconds to milliseconds */
    r = tv.tv_nsec / (1000 * 1000);
    /* convert secs to mSecs and add */
    r = r + (tv.tv_sec * 1000);

    return (r);
}

/*
 * Linux specific sleep function
 *
 * Defined in hlos_specific.h
 */
void _TIMER_sleep(uint32_t mSecs)
{
    struct timespec ts;
    struct timespec rem;
    int r;

    make_timespec(&ts, mSecs);

    for(;;)
    {
        r = clock_nanosleep(CLOCK_REALTIME, TIMER_ABSTIME, &ts, &rem);
        if(r == 0)
        {
            break;
        }
        else
        {
            /* most likely cause: EINTR... */
        }
    }
}


/*
 * Linux specific thread startup wrapper function
 *
 * Defined in hlos_specific.h
 */
static void * p_thread_wrapper(void *pParm)
{
    struct p_thread *pT;
    pT = (struct p_thread *)pParm;

    pT->is_alive = true;
    pT->pid = getpid();
    pT->tid = syscall(SYS_gettid);
    _ATOMIC_global_lock();
    /* We do this to ensure the create() function is complete */
    _ATOMIC_global_unlock();
    (*(pT->thread_func))(pT->cookie);
    /* Do not reference pT because */
    /* it may have been destroyed... */
    pT = NULL;
    return (0);
}

/*
 * Linux specific thread create  function
 *
 * Defined in hlos_specific.h
 */
intptr_t _THREAD_create(const char *dbg_name,
                        intptr_t(*thread_func)(intptr_t param),
                        intptr_t cookie)
{
    struct p_thread *pT;
    int r;
    /* http://man7.org/linux/man-pages/man3/pthread_setname_np.3.html */
    /* Names are limited to 16bytes */
    char smallbuf[17];

    pT = calloc(1, sizeof(*pT));
    if(pT == NULL)
    {
        _atomic_fatal("no memory for thread\n");
    }
    pT->check_ptr = &thread_check;
    pT->cookie = cookie;
    pT->thread_func = thread_func;

    /* add to list */
    _ATOMIC_global_lock();
    pT->pNext = all_p_threads;
    all_p_threads = pT;
    pT->is_alive = false;

    /* create.. */
    r = pthread_create(&(pT->t), NULL, p_thread_wrapper, (void *)(pT));
    if(r != 0)
    {
        _atomic_fatal("cannot create thread\n");
    }

    strncpy(smallbuf, dbg_name, sizeof(smallbuf)-1);
    smallbuf[sizeof(smallbuf)-1] = 0;

    pthread_setname_np(pT->t, smallbuf);
    _ATOMIC_global_unlock();
    return ((intptr_t)(pT));
}

/*
 * Linux specific thread id  function
 *
 * Defined in hlos_specific.h
 */
intptr_t _THREAD_self(void)
{
    struct p_thread *pT;
    pthread_t whoami;

    whoami = pthread_self();
    _ATOMIC_global_lock();

    pT = all_p_threads;
    while(pT)
    {
        if(pthread_equal(whoami, pT->t))
        {
            break;
        }
        pT = pT->pNext;
    }
    _ATOMIC_global_unlock();
    return ((intptr_t)(pT));
}

/*
 * Linux specific thread exit function
 *
 * Defined in hlos_specific.h
 */
void _THREAD_exit(void)
{
    pthread_exit(0);
}

/*
 * Linux specific thread destroy function
 *
 * Defined in hlos_specific.h
 */
void _THREAD_destroy(intptr_t t)
{
    struct p_thread *pT;
    struct p_thread **ppT;

    pT = (struct p_thread *)(t);
    ppT = &(all_p_threads);

    _ATOMIC_global_lock();
    while(*ppT)
    {
        if(pT == *ppT)
        {
            break;
        }
        ppT = &((*ppT) ->pNext);
    }
    /* remove from list */
    if(ppT)
    {
        /* found so de-link */
        *ppT = pT->pNext;
    }
    pT->pNext = NULL;
    _ATOMIC_global_unlock();
    pthread_cancel(pT->t);
    pT->is_alive = false;
    memset((void *)pT, 0, sizeof(*pT));
    free((void*)(pT));
}

/*!
 * @brief [private] common polling function.
 * @param fd - file descriptor
 * @param mSecs - standard timeout functionality
 *
 * @return postive action is possible, 0 not possible, negative error
 */
static int poll_common(struct unix_fdrw *pRW)
{
    fd_set rw_set;
    fd_set err_set;
    int r;
    struct timeval tv;
    struct timeval *pTV;

    r = 0;

    /* valid FD? */
    if(pRW->fd < 0)
    {
        r = -1; /* invalid */
    }
    else if(pRW->fd > 0)
    {
        r = 0; /* valid */
    }
    if(pRW->fd == 0)
    {
        r = -1; /* assume this is invalid */
        if(pRW->type == 'f')
        {
            /* it is a file, it is valid, this is stdin */
            r = 0;
        }
    }
    if(r < 0)
    {
        //LOG_printf(LOG_ERROR, "%s: poll(fd=%d) fd is not valid\n",
                //    pRW->log_prefix,
                //    (int)(pRW->fd));
        return (-1);
    }

    FD_ZERO(&rw_set);
    FD_ZERO(&err_set);

    FD_SET(pRW->fd, &rw_set);
    FD_SET(pRW->fd, &err_set);

    memset((void *)(&tv), 0, sizeof(tv));
    pTV = &tv;
    if(pRW->mSecs_timeout < 0)
    {
        pTV = NULL;
    }
    else
    {
        r = pRW->mSecs_timeout % 1000;
        tv.tv_usec = r * 1000;
        r = pRW->mSecs_timeout / 1000;
        tv.tv_sec = r;
    }

    r = -1;
    switch (pRW->type)
    {
    default:
        BUG_HERE("not supported\n");
        break;
    case 'f': /* files, ie: stdin console */
    case 's': /* sockets */
    case 'u': /* uarts */
        /* sockets & uarts are the same on linux */
        /* they are *different* on windows.. */
        if(pRW->rw == 'r')
        {
            r = select(pRW->fd+1, &rw_set, NULL, &err_set, pTV);
        }
        else
        {
            r = select(pRW->fd+1, NULL, &rw_set, &err_set, pTV);
        }
        break;
    }
    if((r < 0) || FD_ISSET(pRW->fd, &err_set))
    {
        //LOG_printf(LOG_ERROR, "%s: poll(fd=%d,rw=%c) error: %d, %s",
                //    pRW->log_prefix,
                //    (int)(pRW->fd),
                //    pRW->rw,
                //    errno, strerror(errno));
        pRW->is_error = true;
        return (-1);
    }
    r = FD_ISSET(pRW->fd, &rw_set);
    return (r);
}

/*
 * Linux specific - poll handle determine if readable
 *
 * Public function defined in hlos_specific.h
 */
int POLL_readable(struct unix_fdrw *pRW)
{
    if(pRW->rw != 'r')
    {
        BUG_HERE("not reading?\n");
    }
    return (poll_common(pRW));
}

/*
 * Linux specific - poll handle determine if writeable.
 *
 * Public function defined in hlos_specific.h
 */
int POLL_writable(struct unix_fdrw *pRW)
{
    if(pRW->rw != 'w')
    {
        BUG_HERE("not writing?\n");
    }
    return (poll_common(pRW));
}

/*
 * For socket connects, determine if it is closed.
 */
static int is_handle_dead(struct unix_fdrw *pRW)
{
    int r;

    r = 0;
    switch(pRW->type)
    {
    case 's':
    case 'u':
        /* this works on linux for both usb serial */
        /* and sockets. */
        break;
    default:
        r = -1;
        break;
    }

    if(r != 0)
    {
        /* does not apply */
        return (0);
    }

    /* need to determine if there was a socket disconnect
     * Reference:
     * http://beej.us/guide/bgnet/output/html/singlepage/bgnet.html
     *
     * If the socket is (1) readable, and (2) read returns 0
     * Then the socket has been disconnected
     *
     * NOTE: USB SERIAL PORTS works this way also.
     *
     * modify the RW request (clear the timeout) */
    struct unix_fdrw tmp = *pRW;
    /* set time to zero */
    tmp.mSecs_timeout = 0;

    /* TEST #1 - is it readable */
    if(!POLL_readable(&tmp))
    {
        /* not readable so it does not apply */
        return (0);
    }

    /* TEST #2 - try to read it. */
    r = read(pRW->fd, pRW->this_v_buf, pRW->this_len);
    if(r > 0)
    {
        /* hmm data must have shown up */
        pRW->this_actual = r;
        return (0);
    }
    if(r == 0)
    {
        /* confirmed it is closed */
        /* or the USB interface is dead */
        //LOG_printf( LOG_ERROR, "%s: Interface dead, rawhandle: %d\n",
                    //pRW->log_prefix, (int)(pRW->fd) );
        return (1);
    }
    else
    {
        return (0);
    }
}

/*
 * Linux specific, internal "read()" step
 *
 * Public function defined in hlos_specific.h
 */
void UNIX_fdRdThis(struct unix_fdrw *pRW)
{
    int r;

 again:
    pRW->this_actual = 0;
    r = read(pRW->fd, pRW->this_v_buf, pRW->this_len);
    //LOG_printf(pRW->log_why, "%s: read(%d bytes) = %d\n",
                //pRW->log_prefix, (int)(pRW->this_len), r);

    if(r > 0)
    {
        pRW->this_actual = r;
        return;
    }

    if(r == 0)
    {
        if(is_handle_dead(pRW))
        {
            pRW->is_connected = false;
        }
        return;
    }
    else
    {
        /* r is less then 0 */
        /* we have an error. */
    }

    switch(errno)
    {
    default:
        if( is_handle_dead(pRW) ){
            pRW->is_connected = false;
        }
        /* it is an error */
        pRW->is_error = true;
        //LOG_printf(LOG_ERROR, "%s(%d) errno: %d %s\n",
                    //pRW->log_prefix,
                    //(int)(pRW->fd), errno, strerror(errno));
        break;
    case EAGAIN:
    case EINTR:
        /* retry */
        goto again;
        break;
    }
}

/*
 * Linux specific, internal "write()" step
 *
 * Public function defined in hlos_specific.h
 */
void UNIX_fdWrThis(struct unix_fdrw *pRW)
{
    int r;

    pRW->this_actual = 0;
 again:
    if( pRW->type == 's' )
    {
        r = send(pRW->fd, pRW->this_c_buf, pRW->this_len, MSG_NOSIGNAL );
    }
    else
    {
        r = write(pRW->fd, pRW->this_c_buf, pRW->this_len);
    }
    //LOG_printf(pRW->log_why, "%s: write(%d bytes) = %d\n",
                //pRW->log_prefix, (int)(pRW->this_len), r);
    if(r > 0)
    {
        pRW->this_actual = r;
        return;
    }

    if(r == 0)
    {
        if(is_handle_dead(pRW))
        {
            pRW->is_connected = false;
        }
        return;
    }

    switch(errno)
    {
    default:
        /* it is an error */
        pRW->is_error = true;
        //LOG_printf(LOG_ERROR, "%s(%d) errno: %d %s\n",
                   // pRW->log_prefix,
                    //(int)(pRW->fd), errno, strerror(errno));
        break;
    case EAGAIN:
    case EINTR:
        /* retry */
        goto again;
        break;
    }
}

/*
  Linux specific function to initalize the socket interface

  Defined in hlos_specific.h
 */
void SOCKET_init(void)
{
    /* nothing here .. only windows */
}

/*
   free a constant void pointer in the compiler specific way
   This is here to remove warnings from static code analisys.
   Public function in compiler.h
 */
void free_const(const void *vp)
{
#if defined(__GNUC__)
#pragma GCC diagnostic push
#pragma GCC diagnostic ignored "-Wcast-qual"
#endif
    free((void *)(vp));
#if defined(__GNUC__)
#pragma GCC diagnostic pop
#endif
}

/*
   Ask the HLOS the size of a file in bytes
   See hlos_specific.h for details
 */
int64_t STREAM_FS_getSize(const char *filename)
{
    struct stat s;
    int r;

    r = stat(filename, &s);
    if(r != 0)
    {
        return (-1);
    }

    if(!S_ISREG(s.st_mode))
    {
        /* not a regular file? */
        return (-1);
    }

    return ((int64_t)(s.st_size));
}

/*
   Ask the HLOS if this filename exists.
   If it does return true.
   See hlos_specific.h for details
 */
bool STREAM_FS_fileExists(const char *filename)
{
    struct stat s;
    int r;

    r = stat(filename, &s);
    if(r != 0)
    {
        return (false);
    }

    if(!S_ISREG(s.st_mode))
    {
        /* not a regular file? */
        return (false);
    }

    return (true);
}

/*
 * In case the user double clicks ... and we die ...
 * do not make the window go away ... wait for a key
 * See HLOS_specific.h for details. */
void _EXIT_pause(int code)
{
    fprintf(stdout, "\n");
    fprintf(stdout,"===========================\n");
    fprintf(stdout, "Press any key to continue..\n");
    fprintf(stdout, "===========================\n");

    getchar();
    exit(code);
}

/* Make console beep on the HLOS */
void _DEBUG_beep(void)
{
    DEBUG_printf("%c", 0x07);
}

/* unget buffer for keyget incase escape sequence is not known */
static char unget_buf[ 30 ];
static int  unget_len;

/* map table entry for escape sequence mapping */
struct keymap {
    int v;
    const char *s;
};

static const struct keymap keymap[] = {

    { .v = DEBUG_KEY_u_arrow, .s = "\x1b[A" },
    { .v = DEBUG_KEY_d_arrow, .s = "\x1b[B" },
    { .v = DEBUG_KEY_l_arrow, .s = "\x1b[D" },
    { .v = DEBUG_KEY_r_arrow, .s = "\x1b[C" },

    { .v = DEBUG_KEY_pgup,    .s = "\x1b[5~" },
    { .v = DEBUG_KEY_pgup,    .s = "\x1b[6~" },
    { .v = DEBUG_KEY_home,    .s = "\x1bOH" },
    { .v = DEBUG_KEY_home,    .s = "\x1bOF" },

    { .v = DEBUG_KEY_f1,      .s = "\x1bOP" },
    { .v = DEBUG_KEY_f2,      .s = "\x1bOQ" },
    { .v = DEBUG_KEY_f3,      .s = "\x1bOR" },
    { .v = DEBUG_KEY_f4,      .s = "\x1bOS" },
    { .v = DEBUG_KEY_f5,      .s = "\x1b[15~" },
    { .v = DEBUG_KEY_f6,      .s = "\x1b[17~" },
    { .v = DEBUG_KEY_f7,      .s = "\x1b[18~" },
    { .v = DEBUG_KEY_f8,      .s = "\x1b[19~" },
    { .v = DEBUG_KEY_f9,      .s = "\x1b[20~" },
    { .v = DEBUG_KEY_f1,      .s = "\x1b[[21~" },
    { .v = DEBUG_KEY_f1,      .s = "\x1b[[23~" },
    { .v = DEBUG_KEY_f1,      .s = "\x1b[[24~" },

    /*--------------------
     * See below if you want to add more items
     * the //LOG_printf()
     *--------------------
     * terminate
     * note V must be EOF here.
     */
    { .v = EOF, .s = NULL }
};

/* Lookup an escape key sequence (linux) and return decoded key. */
static int debug_lookup_key(void)
{
    const struct keymap *pK;

    pK = keymap;
    while(pK->v != EOF)
    {
        if(0 == strcmp(pK->s, unget_buf))
        {
            break;
        }
        pK++;
    }
    /* If you want to add keys to the table
       uncomment the below and examine the output
     */

    /*
    //LOG_printf(LOG_ALWAYS, "keys result: 0x%04x\n", pK->v);
    LOG_hexdump(LOG_ALWAYS, 0, (const void *)(unget_buf), unget_len);
    */
    /*  note the terminal item is EOF! */
    return (pK->v);
}

/* HLOS specific keyboard routines, returns a decoded key
 *
 * See hlos_specific.h for details
 */
int _DEBUG_getkey(void)
{
    int c;
    int r;
    int try;

    /* do we have something from before? */
    if(unget_len)
    {
        /* we return the first char */
        c = unget_buf[0];
        /* then move all others down one */
        unget_len--;
        if(unget_len)
        {
            memmove((void *)(&unget_buf[0]),
                     (void *)(&unget_buf[1]),
                     unget_len);
        }
        c = c & 0x0ff;
        return (c);
    }

    /* Nothing in the unget buffer.. see if have bytes to read */
    if(!STREAM_rxAvail(STREAM_debug_stdin, 0))
    {
        /* nothing.. we are done */
        return (EOF);
    }

    /* Get the byte */
    c = STREAM_fgetc(STREAM_debug_stdin);

    /* Is it a fancy key? (ie: arrow, Function, etc) */
    if(c != 0x01b)
    {
        return (c);
    }

    /* Function keys start with an escape (0x1b)
     * they generally do not stop, we have a continous
     * stream of bytes because they are sent by
     * a computer ...
     *
     * For example <ESC>[A is an arrow key.
     * The human can type those keys but not that fast.
     * SPEED is the key here!
     */
    unget_buf[0] = c;
    unget_buf[1] = 0;
    unget_len = 1;

    /* read more bytes! */
    for(try = 0 ; try < 2 ; try++)
    {

        /* 2 tries, at 25mSec times... is 50 mSecs */
        /* we should have all the bytes within that period. */

        /* Go read bytes if we can */
        while(STREAM_rxAvail(STREAM_debug_stdin, 25))
        {
            if(unget_len >= (sizeof(unget_buf)-2))
            {
                break;
            }
            unget_buf[unget_len+0] = STREAM_fgetc(STREAM_debug_stdin);
            unget_buf[unget_len+1] = 0;
            unget_len++;
        }

        r = debug_lookup_key();
        if(r != EOF)
        {
            /* yea we found a key! */
            /* zap the unget key */
            unget_len = 0;
            return (r);
        }
    }

    /* we either never found it */
    /* or we gave up in time... */
    /* so we will return keys in the buffer */
    return (_DEBUG_getkey());
}

/* flags used by the echo on/off code. */
static bool echo_off = false;
static struct termios old_dbg, new_dbg;

/*
  HLOS specific function to turn the echo on/off

  See: hlos_specific.h for details.
 */
void _DEBUG_echo_off(void)
{
    if(echo_off)
    {
        return;
    }
    /* do not repeat. */
    echo_off = true;

    /* We set stdin to have *NO* buffering */
    setbuf(stdin, NULL);
    /* We leave stdout as buffered IO */

    /* Set NO_ECHO and make incoming RAW */
    /* we leave outgoing as is.. */
    /* get current */
    tcgetattr(fileno(stdin), &old_dbg);
    /* Copy so we can restore later */
    new_dbg = old_dbg;
    /* clear the echo flag, canonaization and newline flag */
    new_dbg.c_lflag &= (~(ECHO|ICANON|ECHONL));
    /* set our changes */
    tcsetattr(fileno(stdin), TCSANOW,  &new_dbg);
    /* arrange to restore stuff on a graceful exit. */
    atexit(_DEBUG_echo_on);
}

/* HLOS specific function to turn the echo on/off */
/* See: hlos_specific.h for details. */
void _DEBUG_echo_on(void)
{
    if(!echo_off)
    {
        return;
    }
    echo_off = false;
    tcsetattr(fileno(stdin), TCSANOW,  &old_dbg);
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
