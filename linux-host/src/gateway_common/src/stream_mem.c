/******************************************************************************
 @file stream_mem.c

 @brief TIMAC 2.0 API Treat a chunk of memory as a stream

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
#include "void_ptr.h"
#define _STREAM_IMPLIMENTOR_ 1
#include "stream_private.h"

#include <string.h>
#include <malloc.h>

/*!
 * @var mem_check
 * @brief [private] Used to verify the details pointe is valid
 */
static const int mem_check = 'M';

/*!
 * @struct mem_stream_details
 * @brief Details about the memory buffer for the stream.
 */

struct mem_stream_details
{
    /*! Used to verify the structure is valid */
    const int *check_ptr;

    /*! Owning parent stream */
    struct io_stream *pParent;

    /* True if this buffer can be written */
    bool is_wr;

    /* True if this buffer can be read */
    bool is_rd;

    /* points to the buffer */
    void *pBytes;

    /* True if the buffer was allocated */
    bool alloc;

    /* Rd/Wr cursor (index) within buffer where IO will occur */
    size_t cursor;

    /* Size in bytes of the buffer. */
    size_t bufsiz;
};

/*!
 * @brief extract & validate the memory stream details from this stream.
 * @param pIO - the io stream
 * @returns NULL on error, or a details pointer.
 */
static struct mem_stream_details *getM(struct io_stream *pIO)
{
    struct mem_stream_details *pM;

    /* cast it */
    pM = (struct mem_stream_details *)(pIO->opaque_ptr);

    /* perform our checks */
    if(pM)
    {
        if(pM->check_ptr != &mem_check)
        {
            pM = NULL;
        }
    }
    return (pM);
}

/*!
 * @brief [private] Method function for the memory buffer stream to close
 * @param pIO - the io stream we are closing.
 * @returns NULL
 */
static void mem_close(struct io_stream *pIO)
{
    struct mem_stream_details *pM;

    /* Extract */
    pM = getM(pIO);

    /* and zap */
    if(pM)
    {
        if(pM->alloc)
        {
            if(pM->pBytes)
            {
                memset((void *)(pM->pBytes), 0, pM->bufsiz);
                free((void *)(pM->pBytes));
                pM->pBytes = NULL;
            }
            memset((void*)(pM), 0, sizeof(*pM));
        }
        memset((void *)(pIO), 0, sizeof(*pIO));
    }
}

/*!
 * @brief [private] Method function for the memory buffer stream to write
 * @param pIO - the io stream we are writing
 * @param pBytes - pointer to the transfer buffer
 * @param nbytes - count in bytes we are transfering
 * @param timeout_mSecs - timeout [not used in this implmentation]
 * @returns negative on error, or 0..actual bytes written.
 */
static int mem_wr(struct io_stream *pIO,
                   const void *pBytes,
                   size_t nbytes,
                   int timeout_mSecs)
{
    struct mem_stream_details *pM;

    (void)(timeout_mSecs);

    /* extract */
    pM = getM(pIO);
    if(pM == NULL)
    {
        return (-1);
    }

    /* is this legal? */
    if(!(pM->is_wr))
    {
        return (-1);
    }

    /* check space */
    size_t space;
    /* bufsiz is fixed at startup, cursor will not go beyond */
    space = pM->bufsiz - pM->cursor;

    /* don't go beyond our buffer */
    if(nbytes > space)
    {
        nbytes = space;
    }

    /* if so, write */
    if(nbytes)
    {
        memcpy(void_ptr_add(pM->pBytes, pM->cursor), pBytes, nbytes);
        pM->cursor += nbytes;
    }

    /* return actual */
    return ((int)nbytes);
}

/*!
 * @brief [privatge] Method function for the memory buffer stream to reading
 * @param pIO - the io stream we are reading
 * @param pBytes - pointer to the transfer buffer
 * @param nbytes - count in bytes we are transfering
 * @param timeout_mSecs - timeout [not used in this implmentation]
 * @returns negative on error, or 0..actual bytes read
 */
static int mem_rd(struct io_stream *pIO,
                   void *pBytes,
                   size_t nbytes,
                   int timeout_mSecs)
{
    struct mem_stream_details *pM;

    (void)(timeout_mSecs);

    /* extract */
    pM = getM(pIO);
    if(pM == NULL)
    {
        return (-1);
    }

    /* sanity check */
    if(!(pM->is_rd))
    {
        return (-1);
    }

    /* don't go beyond our buffer */
    size_t avail;
    /* bufsiz is fixed at startup, cursor will not go beyond */
    avail = pM->bufsiz - pM->cursor;

    if(nbytes > avail)
    {
        nbytes = avail;
    }

    /* transfer */
    if(nbytes)
    {
        memcpy(pBytes, void_ptr_add(pM->pBytes, pM->cursor), nbytes);
        pM->cursor += nbytes;
    }

    /* return actual */
    return ((int)nbytes);
}

/*!
 * @brief [private] determine if we can poll (rd) this memory buffer
 * @param pIO - the io stream
 * @param timeout_mSec - not used in this implimentation.
 * @returns true if no error and not at the end of the buffer space
 */
static bool mem_poll(struct io_stream *pIO, int timeout_mSec)
{
    struct mem_stream_details *pM;

    (void)(timeout_mSec);

    /* extract */
    pM = getM(pIO);
    if(pM == NULL)
    {
        return (-1);
    }

    /* is it readable, and are we not at the end? */
    if(pM->is_rd && (pM->cursor < pM->bufsiz))
    {
        /* then we can read */
        return (true);
    }
    else
    {
        return (false);
    }
}

/*!
 * @brief [private] method to flush, we have no buffer.. this is not a FILE
 * @param pIO - the io stream
 */
static int mem_flush(struct io_stream *pIO)
{
    (void)(pIO);
    /* nothing to flush */
    return (0);
}

/*!
 * @var mem_funcs
 * @brief Method function table for the memory IO routines
 */
static const struct io_stream_funcs mem_funcs = {
    .name = "string",
    .close_fn = mem_close,
    .wr_fn = mem_wr,
    .rd_fn = mem_rd,
    .poll_fn = mem_poll,
    .flush_fn = mem_flush
};

/*!
 * @brief [private] Common routine to create a memory buffer stream
 * @param pBytes - the io buffer
 * @param nBytes - the size in bytes of the io buffer
 * @param is_wr - boolean true if this is writeable
 * @param is_rd - boolean true if this is readable
 * @param Returns non-zero handle on success
 */
static intptr_t _mem_create(void *pBytes,
                             size_t nbytes,
                             bool is_wr,
                             bool is_rd)
{
    struct mem_stream_details *pM;

    pM = calloc(1, sizeof(*pM));
    if(!pM)
    {
        return (0);
    }

    pM->check_ptr   = &mem_check;
    pM->is_wr       = is_wr;
    pM->is_rd       = is_rd;
    pM->pBytes      = pBytes;
    if(pM->pBytes == NULL)
    {
        pM->alloc = true;
        pM->pBytes = calloc(1, nbytes+1);
        if(pM->pBytes == NULL)
        {
            goto fail;
        }
    }

    pM->cursor      = 0;
    pM->bufsiz      = nbytes;

    pM->pParent = STREAM_createPrivate(&mem_funcs, (intptr_t)(pM));
    if(pM->pParent != NULL)
    {
        return (STREAM_structToH(pM->pParent));
    }
 fail:
    if(pM->alloc)
    {
        free((void *)(pM->pBytes));
        pM->pBytes = NULL;
    }
    memset((void*)(pM), 0, sizeof(*pM));
    free((void *)(pM));
    return (0);
}

/*
 * Create a stream from a null terminated string
 *
 * Public function defined in stream.h
 */
intptr_t STREAM_stringCreate(const char *s)
{
#if defined(__GNUC__)
#pragma GCC diagnostic push
#pragma GCC diagnostic ignored "-Wcast-qual"
#endif
    return (_mem_create((void *)s, strlen(s), 0, 1));
#if defined(__GNUC__)
#pragma GCC diagnostic pop
#endif
}

/*
 * Create a stream from a chunk of memory
 *
 * Public function defined in stream.h
 */
intptr_t STREAM_memCreate(void *pBytes, size_t nbytes)
{
    return (_mem_create(pBytes, nbytes, 1, 1));
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
