/******************************************************************************
 @file stream_file.c

 @brief TIMAC 2.0 API Treat a file as a stream.

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
#include "unix_fdrw.h"
#include "log.h"

#define _STREAM_IMPLIMENTOR_ 1
#include "stream_private.h"

#include <string.h>

/*!
 * @brief [private] recover our file pointer
 * @param pIO - the io stream to extract from
 * @return FILE pointer
 */
static FILE *get_fp(struct io_stream *pIO)
{
    return ((FILE *)(pIO->opaque_ptr));
}

/*
 * See stream.h
 */
void STREAM_FILE_init(void)
{
    STREAM_stdout = STREAM_createFpFile(stdout);
    STREAM_stderr = STREAM_createFpFile(stderr);
    STREAM_stdin  = STREAM_createFpFile(stdin);
    /* Give default values for these */
    STREAM_debug_stdin = STREAM_stdin;
    STREAM_debug_stdout = STREAM_stdout;
}

/*!
 * @brief close a file based stream
 * @param pIO - stream to close
 */
static void _file_close_fn(struct io_stream *pIO)
{
    FILE *fp;

    fp = get_fp(pIO);
    if(fp)
    {
        fclose(fp);
        pIO->opaque_ptr = 0;
    }
    /* make it unusable */
    if (pIO != NULL) {
        STREAM_destroyPrivate(pIO);
    }
}

/*!
 * @brief [private] Write to a FILE based stream
 * @param pIO - io stream
 * @param pData - buffer holding data
 * @param n - number of bytes to write
 * @param timeout_mSecs - standard timeout scheme
 *
 * @return actual number of bytes written, or negative on error
 */
static int _file_wr_fn(struct io_stream *pIO,
                              const void *pData,
                              size_t n,
                              int timeout_mSecs)
{
    int r;
    size_t _r;
    FILE *fp;

    /* not used */
    (void)(timeout_mSecs);

    fp = get_fp(pIO);
    if(fp)
    {
        _r = fwrite(pData, sizeof(char), n,fp);
        if(_r != n)
        {
            r = -1;
        }
        else
        {
            r = (int)(n);
        }
    }
    else
    {
        r = -1;
    }
    return (r);
}

/*!
 * @brief [private] Read from a FILE based stream
 * @param pIO - io stream
 * @param pData - buffer to put data into
 * @param n - number of bytes to read
 * @param timeout_mSecs - standard timeout scheme
 *
 * @return actual number of bytes read, or negative on error
 */
static int _file_rd_fn(struct io_stream *pIO,
                              void *pData,
                              size_t n,
                              int timeout_mSecs)
{
    FILE *fp;
    int r;
    size_t _r;
    /* not used */
    (void)(timeout_mSecs);

    fp = get_fp(pIO);
    if(fp)
    {
        _r = fread(pData, sizeof(char), n,fp);
        if(_r == n)
        {
            r = (int)(n);
        }
        else
        {
            r = -1;
        }
    }
    else
    {
        r = -1;
    }
    return (r);
}

/*!
 * @brief [private] Determine if the file stream is readable
 * @param pIO - io stream
 * @param timeout_mSec - standard timeout scheme
 * @returns true if readable
 */
static bool _file_poll_rx_avail(struct io_stream *pIO, int timeout_mSec)
{
    FILE *fp;
    struct unix_fdrw rw;

    /* not used for files */
    (void)(timeout_mSec);

    fp = get_fp(pIO);
    if(fp == NULL)
    {
        return (false);
    }

    if(feof(fp) || ferror(fp))
    {
        return (false);
    }

    memset((void *)(&rw), 0, sizeof(rw));

    rw.fd = fileno(fp);
    rw.rw = 'r';
    rw.log_prefix = "fileio";
    rw.log_why = LOG_NOTHING;
    rw.log_why_raw = LOG_NOTHING;
    rw.mSecs_timeout = timeout_mSec;
    rw.type = 'f';

    if(POLL_readable(&rw))
    {
        return (true);
    }
    else
    {
        return (false);
    }
}

/*!
 * @brief [private] file flush function
 * @param pIO - the io stream to flush
 *
 * @return 0 success, negative error
 */
static int _file_flush_fn(struct io_stream *pIO)
{
    FILE *fp;

    /* recover our file pointer */
    fp = get_fp(pIO);

    /* bad? */
    if(!fp)
    {
        return (-1);
    }

    /* flush */
    fflush(fp);
    /* return error or not */
    if(ferror(fp))
    {
        return (-1);
    }
    else
    {
        return (0);
    }
}

/*!
 * \var _file_funcs
 *
 * \brief [private] to file implimentation, io functions for FILES
 */
static const struct io_stream_funcs _file_funcs =
{
    .name     = "file",
    .wr_fn    = _file_wr_fn,
    .rd_fn    = _file_rd_fn,
    .close_fn = _file_close_fn,
    .flush_fn = _file_flush_fn,
    .poll_fn  = _file_poll_rx_avail
};

static FILE *is_dev_std(const char *fn)
{
    /* required because Windows does not */
    /* support these names like linux */
    if(0 == strcmp(fn, "/dev/stdout"))
    {
        return (stdout);
    }
    if(0 == strcmp(fn, "/dev/stdin"))
    {
        return (stdin);
    }
    if(0 == strcmp(fn, "/dev/stderr"))
    {
        return (stderr);
    }
    return (NULL);
}

/*
 * See stream_file.h
 */
intptr_t STREAM_createWrFile(const char *filename)
{
    intptr_t r;
    FILE *fp;
    struct io_stream *pIO;
    bool must_close;

    must_close = false;
    fp = is_dev_std(filename);
    if(fp)
    {
        if(fp == stdin)
        {
            fp = NULL;
        }
    }
    if(fp == NULL)
    {
        must_close = true;
        fp = fopen(filename, "w");
        if(fp == NULL)
        {
            LOG_perror(filename);
            return (0);
        }
    }
    r = STREAM_createFpFile(fp);
    if( r == 0 )
    {
        if( must_close )
        {
            fclose(fp);
            pIO = STREAM_hToStruct(r);
            if (pIO != NULL) {
                STREAM_destroyPrivate(pIO);
            }
        }
        LOG_perror(filename);
    }
    return (r);
}

/*
 * See stream_file.h
 */
intptr_t STREAM_createRdFile(const char *filename)
{
    intptr_t r;
    FILE *fp;
    struct io_stream *pIO;
    bool must_close;

    must_close = false;
    fp = is_dev_std(filename);
    if(fp)
    {
        if(fp != stdin)
        {
            fp = NULL;
        }
    }
    if(fp == NULL)
    {
        must_close = true;
        fp = fopen(filename, "r");
        if(fp == NULL)
        {
            LOG_perror(filename);
            return (0);
        }
    }
    r = STREAM_createFpFile(fp);
    if(r == 0)
    {
        if( must_close )
        {
            fclose(fp);
            pIO = STREAM_hToStruct(r);
            if (pIO != NULL) {
                STREAM_destroyPrivate(pIO);
            }
        }
        LOG_perror(filename);
    }
    return (r);
}

/*
 * See stream_file.h
 */
intptr_t STREAM_createFpFile(FILE *fp)
{
    struct io_stream *pIO;

    if(fp == NULL)
    {
        return (0);
    }

    pIO = STREAM_createPrivate(&_file_funcs, (intptr_t)(fp));
    return (STREAM_structToH(pIO));
}

FILE *STREAM_getFp(intptr_t h)
{
    struct io_stream *pIO;
    pIO = STREAM_hToStruct(h);
    if( pIO == NULL )
    {
        return NULL;
    }
    if(pIO->pFuncs != &_file_funcs)
    {
        return (NULL);
    }
    return (get_fp(pIO));
}

/*
 * See stream_file.h
 */
bool STREAM_isFile(intptr_t h)
{
    struct io_stream *pIO;

    pIO = STREAM_hToStruct(h);
    if(pIO==NULL)
    {
        return (false);
    }
    if(pIO->pFuncs == &_file_funcs)
    {
        return (true);
    }
    else
    {
        return (false);
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
