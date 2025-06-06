/******************************************************************************
 @file stream_common.c

 @brief TIMAC 2.0 API Common/shared code for all stream types

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
#include "stream.h"
#include "log.h"
#include "timer.h"
#include "void_ptr.h"

#define _STREAM_IMPLIMENTOR_ 1
#include "stream_private.h"

#include <string.h>
#include <stdarg.h>
#include <stdlib.h>

/*
 * Globals defined in stream.h
 */
intptr_t STREAM_stdout;
intptr_t STREAM_stderr;
intptr_t STREAM_stdin;
intptr_t STREAM_debug_stdin;
intptr_t STREAM_debug_stdout;

/* used to verify a stream pointer */
static const int stream_check = 'S' + 'C';

/*
 * Destroy a pseudo-private stream internal structure
 *
 * Pseudo-private to stream implimentations, see stream_private.h
 */
void STREAM_destroyPrivate(struct io_stream *pIO)
{
    if(pIO == NULL)
    {
        return;
    }
    /* we have nothing to release */
    memset((void *)(pIO), 0, sizeof(*pIO));
    free((void *)(pIO));
}

/*
 * Create a pseudo-private stream internal structure
 *
 * Pseudo-private to streams, see stream_private.h
 */
struct io_stream *STREAM_createPrivate(const struct io_stream_funcs *pFuncs,
                                        intptr_t opaque)
{
    struct io_stream *pIO;

    pIO = calloc(1, sizeof(*pIO));
    if(pIO)
    {
        pIO->check_ptr  = &stream_check;
        pIO->pFuncs     = pFuncs;
        pIO->opaque_ptr = opaque;
    }
    return (pIO);
}

/*
 * Determine if a stream is currently marked as "in-error"
 *
 * Public function defined in stream.h
 */
bool STREAM_isError(intptr_t h)
{
    bool b;
    struct io_stream *pIO;

    b = true;
    if(h)
    {
        pIO = STREAM_hToStruct(h);
        if(pIO)
        {
            b = pIO->is_error;
        }
    }
    return (b);
}

/*
 * Convert a stream structure into a stream handle
 *
 * Pseudo-private to stream implimentations, see stream_private.h
 */
intptr_t STREAM_structToH(struct io_stream *pIO)
{
    return (intptr_t)(pIO);
}

/*
 * Convert a stream handle into a stream structure
 *
 * Pseudo-private to stream implimentations, see stream_private.h
 */
struct io_stream *STREAM_hToStruct(intptr_t h)
{
    struct io_stream *pIO;

    pIO = (struct io_stream *)(h);
    if(pIO)
    {
        if(pIO->check_ptr != &stream_check)
        {
            pIO = NULL;
        }
    }
    if(pIO == NULL)
    {
        //LOG_printf(LOG_ERROR, "not-a-stream: %p\n", (void *)(h));
    }
    return (pIO);
}

/*
 * Initialize the stream module as a whole
 *
 * Public function defined in stream.h
 */
void STREAM_init(void)
{
    STREAM_FILE_init();
}

/*
 * Get the type name of a stream
 *
 * Public function defined in stream.h
 */
const char *STREAM_getTypeName(intptr_t s)
{
    const struct io_stream *pIO;

    pIO = STREAM_hToStruct(s);
    if(pIO == NULL)
    {
        return ("(unknown)");
    }

    return (pIO->pFuncs->name);
}

/*
 * printf() to a stream
 *
 * Public function defined in stream.h
 */
int STREAM_printf(intptr_t s, _Printf_format_string_  const char *fmt, ...)
{
    int r;
    va_list ap;

    va_start(ap,fmt);
    r = STREAM_vprintf(s, fmt, ap);
    va_end(ap);
    return (r);
}

/*
 * Building block for STREAM_printf()
 *
 * Public function defined in stream.h
 */
int STREAM_vprintf(intptr_t s, const char *fmt, va_list ap)
{
    int r;
    /* Depending upon the internal "printf()" implimentation
     * this function could be written many ways...
     * this is a simple and fast method that works
     * note we are on linux, we have plenty of stack space */
    char buf[1024];

    r = vsnprintf(buf, sizeof(buf), fmt, ap);
    /* forcably terminate */
    buf[ sizeof(buf)-1 ] = 0;

    /* something go wrong/ */
    if(r <= 0)
    {
        return (r);
    }

    /* in case users string is larger then expected */
    if(r > 1024)
    {
        /* truncate */
        r = 1024;
    }

    /* send it off */
    return (STREAM_wrBytes(s, buf, r, -1));
}

/*
 * Unix fputc() for a stream.
 *
 * Public function defined in stream.h
 */
int STREAM_fputc(int c, intptr_t s)
{
    uint8_t b;
    int r;

    b = (uint8_t)(c);

    r = STREAM_wrBytes(s, &b, 1, -1);
    if(r == 1)
    {
        c = c & 0x0ff;
    }
    else
    {
        c = EOF;
    }
    return (c);
}

/*
 * Unix ungetc() against a stream
 *
 * Public function defined in stream.h
 */
int STREAM_ungetc(int c, intptr_t s)
{
    struct io_stream *pIO;

    pIO = STREAM_hToStruct(s);
    if(pIO == NULL)
    {
        return (-1);
    }
    pIO->unget_buf = (c & 0x0ff) | 0x0100;
    return (0);
}

/*
 * Unix fgetc() against a stream
 *
 * Public function defined in stream.h
 */
int STREAM_fgetc(intptr_t s)
{
    struct io_stream *pIO;
    char c;
    int r;

    pIO = STREAM_hToStruct(s);
    if(pIO == NULL)
    {
        return (-1);
    }

    if(pIO->unget_buf)
    {
        c = (char)(pIO->unget_buf);
        pIO->unget_buf = 0;
        return ((int)(c) & 0x0ff);
    }
    r = STREAM_rdBytes(s, &c, 1, -1);
    if(r > 0)
    {
        r = c;
        r = r & 0x0ff;
    }
    else if(r == 0)
    {
        /* we read nothing, thus we return EOF */
        r = EOF;
    }
    else
    {
        pIO->is_error = true;
        r = EOF;
    }
    return (r);
}

/*
 * Unix fgets() against a stream
 *
 * Public function defined in stream.h
 */
char *STREAM_fgets(char *buf, int size, intptr_t h)
{
    /* read a line of ascii until a universal line ending is found. */
    /* universal means: UNIX, DOS, or MAC - or MIXED formats are ok. */
    int c;
    int n;

    /* for debug reasons */
    buf[0] = 0;
    /* always terminate */
    buf[size-1] = 0;

    /* always insure space for a null byte */
    size--;

    /* incase the string is zero length (can't really happen) */
    /* but visual studio warnings thinks it can happen.. */
    c = 0;

    /* read till terminator */
    for(n = 0 ; n < size ; )
    {
        c = STREAM_fgetc(h);
        if(c < 0)
        {
            /* EOF or err */
            break;
        }
        buf[n+1] = 0;
        buf[n+0] = (char)(c & 0x0ff);
        n++;
        /* any type of line ending? */
        if((c == '\n') || (c=='\r'))
        {
            /* Unix line endings */
            break;
        }
    }

    if(c == '\r')
    {
        /* we have 2 possible cases: */
        /* MAC line endings: text<CR>text */
        /* DOS line endings: text<CR><LF>text */
        /* ----- */
        /* Peek ahead look for the DOS <lf> */
        c = STREAM_fgetc(h);
        if(c < 0)
        {
            /* odd situation */
            /* could be EOF, or ERROR */
            /* we are not going to unget this. */
        }
        else if(c != '\n')
        {
            /* Undo! this is a MAC end of line */
            STREAM_ungetc(c, h);
        }
        else
        {
            /* we need to store the <lf> */
            if(n >= size)
            {
                /* ERROR: Edge condition, No room for the LF */
                /* so we silently throw it away */
            }
            else
            {
                /* we have room for the LF */
                buf[n+0] = ((char)(c));
                buf[n+1] = 0;
                n++;
            }
        }
    }
    if(n)
    {
        /* we got something */
        /* we return buf (below); */
    }
    else
    {
        /* We must have an EOF */
        buf = NULL;
    }
    return (buf);
}

/*
 * Unix fputs() against a stream
 *
 * Public function defined in stream.h
 */
int STREAM_fputs(const char *s, intptr_t h)
{
    int r;
    /* write an ascii string to the file */
    r = STREAM_wrBytes(h, s, strlen(s),-1);
    return (r);
}

/*
 * Write bytes into a stream
 *
 * Public function defined in stream.h
 */
int STREAM_wrBytes(intptr_t h,
                    const void *databytes,
                    size_t nbytes,
                    int timeout_mSecs)
{
    struct io_stream *pIO;

    /* write bytes (raw) to the file */
    pIO = STREAM_hToStruct(h);
    if(pIO == NULL)
    {
        return (-1);
    }

    return ((*(pIO->pFuncs->wr_fn))(pIO, databytes, nbytes, timeout_mSecs));
}

/*
 * Read bytes from a stream
 *
 * Public function defined in stream.h
 */
int STREAM_rdBytes(intptr_t h,
                    void *databytes,
                    size_t nbytes,
                    int timeout_mSecs)
{
    /* read (raw) from file and honor the ungetc case. */
    struct io_stream *pIO;
    int n;
    int r;

    if(nbytes == 0)
    {
        return (0);
    }

    pIO = STREAM_hToStruct(h);
    if(pIO == NULL)
    {
        return (-1);
    }

    n = 0;
    /* do we have an unget case? */
    if(pIO->unget_buf)
    {
        /* we have an unget byte! */
        ((char *)(databytes))[0]  = (char)(pIO->unget_buf & 0x0ff);
        pIO->unget_buf = 0;
        nbytes    -= 1;
        databytes = void_ptr_add(databytes, 1);
        n = 1;
        /* Do we have great success! */
        if(nbytes == 0)
        {
            return (1);
        }
    }

    /* call specific */
    r = (*(pIO->pFuncs->rd_fn))(pIO, databytes, nbytes, timeout_mSecs);

    /* if UNGET did not occur */
    /*  just return what we got. */
    if(n == 0)
    {
        return (r);
    }

    /* we did an UNGET */
    /*  But maybe the read call failed? */
    if(r >= 0)
    {
        /* no it did not, return succes */
        r += n;
        return (r);
    }

    /* we had a failure */
    /* But we got something from the undo buffer. */
    /* So... it is success (posix rules!) */
    return (1);
}

/*
 * Return positive number if bytes are available from a stream
 *
 * Note: it may return 1, when there are hundreds of bytes available.
 * Some streams cannot perform 'deep' inspection.
 *
 * Public function defined in stream.h
 */
int STREAM_rxAvail(intptr_t h, int timeout_mSec)
{
    /* do we have bytes available? */
    struct io_stream *pIO;

    pIO = STREAM_hToStruct(h);
    if(pIO == NULL)
    {
        /* we have nothing available. */
        return (0);
    }
    /* yes we do have at least 1 */
    if(pIO->unget_buf)
    {
        return (1);
    }

    /* call handler otherwise */
    return ((*(pIO->pFuncs->poll_fn))(pIO,timeout_mSec));
}

/*
 * Flush (write-commit) all data in a stream to the output device
 *
 * Public function defined in stream.h
 */
int STREAM_flush(intptr_t h)
{
    /* write/commit data */
    struct io_stream *pIO;

    pIO = STREAM_hToStruct(h);
    if(pIO == NULL)
    {
        return (-1);
    }

    return ((*(pIO->pFuncs->flush_fn))(pIO));
}

/*
 * Close a stream (does not always destroy the stream)
 * In some cases this requires additional steps that are
 * stream specific
 *
 * Public function defined in sream.h
 */
void STREAM_close(intptr_t h)
{
    /* close the stream */
    struct io_stream *pIO;

    pIO = STREAM_hToStruct(h);
    if(pIO)
    {
        (*(pIO->pFuncs->close_fn))(pIO);
    }
}

/*
 * Clear stream error flag
 *
 * Public function defined in sream.h
 */
void STREAM_clearErrors(intptr_t h)
{
    struct io_stream *pIO;

    pIO = STREAM_hToStruct(h);
    if(pIO)
    {
        (*(pIO->pFuncs->clear_fn))(pIO);
        pIO->is_error = false;
    }
}

/*
 * Dump (flush) all incoming data for a stream
 *
 * Public function defined in stream.h
 */
void STREAM_rdDump(intptr_t h, int timeout_mSecs)
{
    int r;
    timertoken_t tstart;
    uint8_t buf[256];
    int total;

    tstart = TIMER_timeoutStart();

    total = 0;
    for(;;)
    {
        r = STREAM_rdBytes(h, &buf, sizeof(buf), 0);
        if(r > 0)
        {
            total += r;
            if( total > __1K ){
                BUG_HERE("target has crashed, and is spewing bytes\n");
            }
            continue;
        }
        if(r < 0)
        {
            /* io error? */
            break;
        }
        if(TIMER_timeoutIsExpired(tstart, timeout_mSecs))
        {
            break;
        }
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
