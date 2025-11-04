/******************************************************************************
 @file log.c

 @brief TIMAC 2.0 API Log file implimentation

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

#include "log.h"

#include "fatal.h"
#include "stream.h"
#include "timer.h"
#include "hexline.h"
#include "void_ptr.h"

#include <stdarg.h>
#include <errno.h>
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <stdint.h>
#include <stdatomic.h>
#include "hlos_specific.h"

/*
 * Global log configuration
 *
 * Public structure defined in log.h
 */
struct LOG_cfg log_cfg;

/* this 'FILE *' is for use by the *linux* fatal error code.  we
 * cannot use the normal "stream" code because we are crashing hard
 * ... and all data structures are assumed to be corrupt... this is an
 * attempt to help debug problems nothingmore.
 */
FILE  *__log_fp;

/*!
 * @var [private] column in the file, used to determine when to print time stamp
 */
static int      log_col;

/*!
 * @var [private] flag to print ERROR at start of line or not.
 */
static atomic_bool log_is_error = ATOMIC_VAR_INIT(false);

/*!
 * @var [private] log_mutex
 *
 * we do this with a private pthread mutex
 * and not use the generic MUTEX
 * Because we need to be able to debug..
 * and we might be debugging our "MUTEX" code
 * or code that is using the MUTEX code...
 */
static intptr_t log_mutex = 0;

/*!
 * @var [private] log_init_done
 *
 * Used to initialize the log only once.
 */
static int log_init_done;

/*!
 * @brief create a private os specific mutex for log code
 */

static void log_mutex_init(void)
{
    if(log_mutex == 0)
    {
        log_mutex = _ATOMIC_local_create();
    }
}

/*!
 * @brief [private] Lock the log mutex
 */
static void log_mutex_lock(void)
{
    log_mutex_init();
    _ATOMIC_local_lock(log_mutex,-1);
}

/*
 * Public function to lock the log output
 *
 * Public function defined in log.h
 */
void LOG_lock(void)
{
    log_mutex_lock();
}

/*!
 * @brief [private] Un-Lock the log mutex
 *
 * @returns void
 */
static void log_mutex_unlock(void)
{
    log_mutex_init();
    _ATOMIC_local_unlock(log_mutex);
}

/*
 * Public function to unlock the log output
 *
 * Public function defined in log.h
 */
void LOG_unLock(void)
{
    log_mutex_unlock();
}

static void log_putc_dup(int c)
{
    char buf[2];
    buf[0] = (char)(c);
    buf[1] = 0;
    if(log_cfg.log_stream)
    {
        STREAM_wrBytes(log_cfg.log_stream, (void *)(&buf[0]), 1,0);
    }
    if(log_cfg.dup_to_stderr)
    {
        if(STREAM_stderr)
            STREAM_wrBytes(STREAM_stderr, (void *)(&buf[0]), 1,0);
    }
}

static void log_puts_dup(const char *s)
{
    while(*s)
    {
        log_putc_dup(*s);
        s++;
    }
}

/*!
 * @brief Choke function to handle time stamp in column 0 of the log.
 *
 * @param c - the char to write to the log
 *
 * @return void
 *
 * This function tracks the current \var log_col (log column)
 *
 * By tracking the column, we can expand tabs and insert a time
 * stamp in column 0 as it is printed.
 */

static void log_putc(int c)
{
    /* are we at column 0 */
    if(log_col == 0)
    {

        /* then print the current exeuction time */
        char buf[20];
        int t;

        /* we print in Seconds & mSecs */
        t = TIMER_getNow();
        (void)snprintf(buf, sizeof(buf), "%4d.%03d: ",
            t / 1000, t % 1000);
        /* Example: "1234.567: " */
        log_puts_dup(buf);
        if(atomic_load(&log_is_error)){
            atomic_store(&log_is_error, false);
            log_puts_dup("ERROR: ");
        }
    }

    /* Expand tabs */
    if(c == '\t')
    {
        do
        {
            log_putc(' ');
            /* we expand tabs to 4 */
            /* based on the end of the timestamp string */
        }
        while(log_col % 4)
            ;
    }
    else
    {
        log_putc_dup(c);
    }

    /* did we just hit a CR? */
    if(c == '\n')
    {
        /* If so - we go back to colun 0 */
        log_col = 0;
        /* and flush so the debug log is usable */
        if(log_cfg.log_stream)
        {
            STREAM_flush(log_cfg.log_stream);
        }
        if(log_cfg.dup_to_stderr)
        {
            if(STREAM_stderr)
            {
                STREAM_flush(STREAM_stderr);
            }
        }
    }
    else
    {
        log_col++;
    }
}

/*!
 * @brief Write a null terminated strtng to the log file.
 *
 * @param s - the string to write
 *
 * Note: This is the *CHOKE* function.  *ALL* log printing goes
 * through this function hence, it is the place where we lock/unlock
 */

static void log_puts_no_nl(const char *s)
{
    log_mutex_lock();

    if(!log_init_done)
    {
        log_init_done = 1;
        /* default is to send it to stderr. */
        LOG_init("/dev/stderr");
    }

    /* write the string */
    while(*s)
    {
        log_putc(*s & 0x0ff);
        s++;
    }
    log_mutex_unlock();
}

/*
 * Initialize the log output to a filename of some sort.
 */
void LOG_init(const char *filename)
{
    log_mutex_init();
    log_col = 0;
    log_init_done = 1;

    if((filename == NULL) || (0 == strcmp(filename, "/dev/null")))
    {
        STREAM_close(log_cfg.log_stream);
        log_cfg.log_stream = 0;
        if(log_cfg.filename)
        {
            free_const((const void *)log_cfg.filename);
            log_cfg.filename = NULL;
        }
    }

    if(filename)
    {
        log_cfg.filename = strdup(filename);
        /* we ignore the error here */
        log_cfg.log_stream = STREAM_createWrFile(filename);
        __log_fp = STREAM_getFp(log_cfg.log_stream);
    }
}

/*
 * Print a message, followed by a unix error number and error message
 * See "man 3 perror" for more details about perror.
 *
 * Public function defined in log.h
 */
void LOG_perror(const char *msg)
{
    //LOG_printf(LOG_ERROR, "%s: (%d) %s\n", msg, errno, strerror(errno));
}

/*
 * Print 2 messages, along with errno and matching string.
 *
 * Public function defined in log.h
 */
void LOG_perror2(const char *msg1, const char *msg2)
{
    //LOG_printf(LOG_ERROR, "%s: %s (%d) %s\n",
            //    msg1, msg2, errno, strerror(errno));
}

/*
 * printf() to the current log output
 *
 * Public function defined in log.h
 */
void LOG_printf(logflags_t whybits, _Printf_format_string_ const char *fmt, ...)
{
    // va_list ap;

    // va_start(ap,fmt);
    // LOG_vprintf(whybits, fmt,ap);
    // va_end(ap);
}

/*
 * Determine if the "whybits" hold a value that means: "log this"
 *
 * Public function defined in log.h
 */
bool LOG_test(logflags_t whybits)
{
    /* Set log error using atomic store to prevent data race */
    atomic_store(&log_is_error, (whybits == LOG_ERROR));

    /* if there is no log stream.. */
    if((log_cfg.log_stream == 0) && (log_cfg.dup_to_stderr == false))
    {
        return (false);
    }

    if(whybits == LOG_NOTHING)
    {
        /* we do not log this */
        return (false);
    }

    if(whybits == LOG_ALWAYS)
    {
        /* explicit request to log */
        return (true);
    }

    /* Test the bit */
    if(whybits & log_cfg.log_flags)
    {
        return (true);
    }
    else
    {
        return (false);
    }
}

/*
 * Builing block for the //LOG_printf() function.
 *
 * Public function defined in log.h
 */
void LOG_vprintf(logflags_t whybits, const char *fmt, va_list ap)
{
    /* we are on linux, we can have a large stack variable
     * we are not going to do HUGE lines of text
     * in a single printf statement.
     */
    char workbuf[1024];

    /* Do we log? */
    if(!LOG_test(whybits))
    {
        /* Nope.. */
        return;
    }

    /* format the msg */
    vsnprintf(workbuf, sizeof(workbuf), fmt, ap);
    /* garentee null termination */
    workbuf[ sizeof(workbuf)-1 ] = 0;
    /* write text */
    log_puts_no_nl(workbuf);
}

/*
 * Hex dump a block of memory to the log file, see HEXLINE for more details.
 *
 * Public function defined in log.h
 */
void LOG_hexdump(logflags_t whybits,
                  uint64_t addr, const void *pBytes, size_t nbytes)
{
    struct hexline h;

    /* Do we log? */
    if(!LOG_test(whybits))
    {
        /* Nope - we leave */
        return;
    }

    /* setup */
    HEXLINE_init(&h, addr, pBytes, nbytes);

    /* Loop till done */
    while(h.ndone < h.nbytes)
    {
        HEXLINE_format(&h);
        //LOG_printf(LOG_ALWAYS, "%s\n", h.buf);
    }
}

/*
 * Close the log output
 *
 * Public function defined in log.h
 */
void LOG_close(void)
{
    STREAM_close(log_cfg.log_stream);
    log_cfg.log_stream = 0;
}

/*
 * Print an internal bug message including filename and line number.
 *
 * Public function defined in log.h
 */
void LOG_bug_here(const char *file_name,
                   const char *func_name,
                   int lineno,
                   const char *fmt, ...)
{
    va_list ap;

    //LOG_printf(LOG_ERROR, "%s:%s:%d: ", file_name, func_name, lineno);

    va_start(ap, fmt);
    LOG_vprintf(LOG_ERROR, fmt, ap);
    va_end(ap);
    FATAL_printf("Good Bye\n");
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

