 /******************************************************************************
 @file fifo.c

 @brief TIMAC 2.0 API Generic FIFO implimentation

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
#include "fifo.h"
#include "log.h"
#include "mutex.h"
#include "ti_semaphore.h"
#include "void_ptr.h"

#include <stdio.h>
#include <stdint.h>
#include <string.h>
#include <malloc.h>

static const int fifo_check = 'F';

#define DEBUG_FIFO_DETAIL  0

/*! Private FIFO implimentation details */
struct fifo {
    /*! used to verify this is a fifo */
    const int  *test_ptr;

    /*! name of this fifo for debug purposes */
    const char *name;

    /*! memory buffer for this fifo */
    void *pBuf;

    /*! sizeof() of each item in the fifo */
    size_t item_size;

    /*! how deep is this fifo in items */
    size_t fifo_depth;

    /*! How many items are currently in the fifo */
    volatile size_t cnt;

    /*! Where the next index where data will be written within the fifo */
    volatile size_t wr_idx;
    /*! Where the next index where data to be read */
    volatile size_t rd_idx;

    /*! if non zero, this is the mutex handle */
    intptr_t mutex;

    /* if we have a mutex, we have insert/remove semaphores */
    intptr_t in_sem;
    intptr_t rm_sem;
};

/*!
 * @brief   [fifo private] get safe debug printf name for this fifo.
 *
 * @param   pF - the fifo details
 *
 * @return  safe printable string
 */
static const char *_fifo_name(struct fifo *pF)
{
    const char *cp;
    if(pF == NULL)
    {
        return ("not-a-fifo");
    }

    cp = pF->name;
    if(cp == NULL)
    {
        cp = ("fifo-no-name");
    }
    return (cp);
}

/*!
 * @brief   [fifo private] convert a fifo handle into a fifo and verify content
 *
 * @param   h - the fifo handle
 *
 * @return  pointer to fifo details, or null if invalid
 */
static struct fifo *h2f(intptr_t h)
{
    struct fifo *pF;

    if(h)
    {
        pF = (struct fifo *)h;
        if(pF->test_ptr == &fifo_check)
        {
            return (pF);
        }
    }
    return (NULL);
}

/*
 * Create a fifo, allocating resources
 *
 * Public function defined in fifo.h
 */
intptr_t FIFO_create(const char *name,
                      size_t item_size,
                      size_t fifo_depth,
                      bool use_mutex)
{
    struct fifo *pF;

    /* get space */
    pF = calloc(sizeof(*pF), 1);
    if(!pF)
    {
        return (0);
    }

    /* get a name... */
    if(name)
    {
        pF->name     = strdup(name);
        /* we ignore errors here */
    }
    else
    {
        /* safe name will handle NULL here. */
        pF->name = name;
    }
    pF->test_ptr = &fifo_check;
    pF->item_size  = item_size;
    pF->fifo_depth = fifo_depth;

    /* get buffer space */
    pF->pBuf = calloc(fifo_depth, item_size);
    if(NULL == pF->pBuf)
    {
        FIFO_destroy((intptr_t)(pF));
        return (0);
    }

    /* if we need a mutex, get the mutex */
    if(use_mutex)
    {
        pF->mutex = MUTEX_create(pF->name);
        pF->in_sem = SEMAPHORE_create(pF->name,0);
        pF->rm_sem = SEMAPHORE_create(pF->name,0);

        if((pF->mutex == 0) ||
            (pF->in_sem == 0) ||
            (pF->rm_sem == 0))
        {
            FIFO_destroy((intptr_t)(pF));
            pF = NULL;
            return (0);
        }
    }

    /* log... */
    //LOG_printf(LOG_DBG_FIFO, "FIFO_Create(%s)\n", _fifo_name(pF));
    /* Great success */
    return ((intptr_t)(pF));
}

/*
 * Destroy a fifo created by FIFO_create()
 *
 * Public function defined in fifo.h
 */
void FIFO_destroy(intptr_t h)
{
    struct fifo *pF;

    /* recover our pointer */
    pF = h2f(h);
    if(pF == NULL)
    {
        return;
    }

    /* release the name. */
    if(pF->name)
    {
        free_const((const void *)(pF->name));
        pF->name = NULL;
    }

    /* the mutex */
    if(pF->mutex)
    {
        MUTEX_destroy(pF->mutex);
        pF->mutex = 0;
    }

    if(pF->in_sem)
    {
        SEMAPHORE_destroy(pF->in_sem);
        pF->in_sem = 0;
    }

    if(pF->rm_sem)
    {
        SEMAPHORE_destroy(pF->rm_sem);
        pF->rm_sem = 0;
    }

    /* and finally the buffer */
    if(pF->pBuf)
    {
        memset(pF->pBuf, 0, pF->item_size * pF->fifo_depth);
        free((void *)(pF->pBuf));
    }

    /* clear the PF so we can't reuse it. */
    memset((void *)(pF), 0, sizeof(*pF));
}

/*
 * return how much space (in units of items) is available in the fifo.
 *
 * Public function defined in fifo.h
 */
int FIFO_getSpaceAvail(intptr_t h)
{
    struct fifo *pF;

    /* retrive the handle */
    pF = h2f(h);
    if(pF == NULL)
    {
        return (0);
    }
    /* no need to lock, we are reading atomic sized element once. */
    return (int)(pF->fifo_depth - pF->cnt);
}

/*
 * return how many items (in units of items) is available in the fifo.
 *
 * Public function defined in fifo.h
 */
int FIFO_getItemsAvail(intptr_t h)
{
    struct fifo *pF;

    /* retrive the handle */
    pF = h2f(h);
    if(pF == NULL)
    {
        return (0);
    }
    /* no need to lock, we are reading atomic sized element once. */
    return ((int)(pF->cnt));
}

/*
 * Insert items into the fifo, with no timeout
 *
 * Public function defined in fifo.h
 */
int FIFO_insert(intptr_t h, const void *pData, size_t n_todo)
{
    return (FIFO_insertWithTimeout(h,pData,n_todo,0));
}

/*
 * Insert items into the fifo, with timeout
 *
 * Public function defined in fifo.h
 */
int FIFO_insertWithTimeout(intptr_t h,
                            const void *pData,
                            size_t n_todo,
                            int timeout_mSecs)
{
    void *pMem;
    size_t n_done;
    size_t item_size;
    size_t n_bytes;
    size_t n_remain;
    size_t n_this;
    struct fifo *pF;
    int r;

    pF = h2f(h);
    if(pF == NULL)
    {
        return (-1);
    }

    /* loop till done */
    n_done = 0;
    for(;;)
    {

        /* how much is left to do */
        n_remain = n_todo - n_done;
        if(n_remain == 0)
        {
            break;
        }

        /* get transfer pointers */
        FIFO_insertDMA_setup(h, &pMem, &n_this, &item_size);

        /* no space, so maybe we are done */
        if(n_this == 0)
        {
            if(timeout_mSecs == 0)
            {
                /* we are done, we are asked to not block */
                break;
            }
            if(pF->rm_sem == 0)
            {
                /* we have no semaphore we are done */
                break;
            }

            /* wait for some data to be removed */
            r = SEMAPHORE_waitWithTimeout(pF->rm_sem, timeout_mSecs);
            if(r > 0)
            {
                /* somebody put data in */
                continue;
            }
            else
            {
                /* timeout or error */
                break;
            }
        }

        /* don't insert more then we have */
        if(n_this > n_remain)
        {
            n_this = n_remain;
        }

        n_bytes = item_size * n_this;
        /* copy data */
        if(n_bytes)
        {
            memcpy(pMem, pData, n_bytes);
        }

        /* update fifo details */
        FIFO_insertDMA_update(h, n_this);

        pData    = c_void_ptr_add(pData, n_bytes);
        n_done += n_this;
    }

    return ((int)n_done);
}

/*
 * Get direct (zero-copy) pointers into the fifo to perform an insert operation
 *
 * Public function defined in fifo.h
 */
int FIFO_insertDMA_setup(intptr_t h,
                          void **ppMem,
                          size_t *pItemCnt,
                          size_t *pItemSize)
{
    struct fifo *pF;
    size_t wr_offset;
    size_t cnt;
    size_t siz;
    void     *pMem;
    int      r;

    /* always clear */

    r    = 0;
    cnt  = 0;
    siz  = 0;
    pMem = NULL;

    /* get our pointer */
    pF = h2f(h);
    if(!pF)
    {
        r = -1;
        goto fail;
    }

    /* Lock? */
    if(pF->mutex)
    {
        MUTEX_lock(pF->mutex,-1);
    }

    /* handle special case: 100% full */
    if(pF->cnt == pF->fifo_depth)
    {
        /* There is *NO* SPACE */
        cnt = 0;
    }
    else
    {
        if(pF->wr_idx >= pF->rd_idx)
        {
            /* we can write to end of buffer */
            cnt = pF->fifo_depth - pF->wr_idx;
        }
        else
        {
            /* we can write upto the rd idx */
            cnt = pF->rd_idx - pF->wr_idx;
        }
    }

    /* calculate write location */
    wr_offset = pF->wr_idx * pF->item_size;
    pMem      = void_ptr_add(pF->pBuf, wr_offset);
    siz       = pF->item_size;

    if(pF->mutex)
    {
        MUTEX_unLock(pF->mutex);
    }
 fail:
    if(ppMem)
    {
        *ppMem = pMem;
    }
    if(pItemCnt)
    {
        *pItemCnt = cnt;
    }
    if(pItemSize)
    {
        *pItemSize = siz;
    }
    return (r);
}

/*
 * Remove data from the fifo, and do not block
 *
 * Public function defined in fifo.h
 */
int FIFO_remove(intptr_t h, void *pData, size_t n_todo)
{
    return (FIFO_removeWithTimeout(h, pData, n_todo, 0));
}

/*
 * Remove data from the fifo, with timeout
 *
 * Public function defined in fifo.h
 */
int FIFO_removeWithTimeout(intptr_t h,
                            void *pData,
                            size_t n_todo,
                            int timeout_mSecs)
{
    void     *pMem;
    size_t  n_avail;
    size_t  n_this;
    size_t  n_done;
    size_t  n_bytes;
    size_t  item_size;
    struct fifo *pF;
    int r;

    pF = h2f(h);
    if(!pF)
    {
        return (-1);
    }

    n_done = 0;
    for(;;)
    {

        /* how much do we have to insert? */
        n_this = n_todo - n_done;

        /* Done? */
        if(n_this == 0)
        {
            break;
        }

        /* Get removal pointers */
        FIFO_removeDMA_setup(h, &pMem, &n_avail, &item_size);

        /* is fifo empty? */
        if(n_avail == 0)
        {
            if(timeout_mSecs == 0)
            {
                /* we are not asked to wait */
                break;
            }
            if(pF->in_sem == 0)
            {
                /* we have no semaphore, we are done */
                break;
            }
            /* wait the requested time */
            r = SEMAPHORE_waitWithTimeout(pF->in_sem, timeout_mSecs);
            if(r > 0)
            {
                /* somebody removed stuff */
                continue;
            }
            else
            {
                /* timeout or error */
                break;
            }
        }

        /* cannot remove more then we have */
        if(n_this > n_avail)
        {
            n_this = n_avail;
        }

        n_bytes = item_size * n_this;
        /* copy the data */
        if(n_bytes)
        {
            memcpy(pData, pMem, n_bytes);
        }

        /* update the fifo */
        FIFO_removeDMA_update(h, n_this);

        pData   = void_ptr_add(pData, n_bytes);
        n_done += n_this;
    }

    return ((int)n_done);
}

/*
 * Complete an DMA based insert operation for a fifo
 *
 * Public function defined in fifo.h
 */
void FIFO_insertDMA_update(intptr_t h, size_t n_items)
{
    struct fifo *pF;

    pF = h2f(h);
    if(pF == NULL)
    {
        return;
    }

    if(pF->mutex)
    {
        MUTEX_lock(pF->mutex,-1);
    }

    pF->cnt    += n_items;
    pF->wr_idx  = (pF->wr_idx + n_items) % pF->fifo_depth;

    if(pF->in_sem)
    {
        SEMAPHORE_put(pF->in_sem);
    }

    if(pF->mutex)
    {
        MUTEX_unLock(pF->mutex);
    }
}

/*
 * Get direct (zero-copy) pointers into the fifo to perform a remove operation
 *
 * Public function defined in fifo.h
 */
int FIFO_removeDMA_setup(intptr_t h,
                          void **ppMem,
                          size_t *pItemCnt,
                          size_t *pItemSize)
{
    size_t rd_offset;
    struct fifo *pF;
    size_t cnt;
    void *pMem;
    size_t siz;
    int r;

    r    = 0;
    cnt  = 0;
    siz  = 0;
    pMem = NULL;

    /* recover our pointer */
    pF = h2f(h);
    if(pF == NULL)
    {
        r = -1;
        goto fail;
    }

    if(pF->mutex)
    {
        MUTEX_lock(pF->mutex, -1);
    }

    /* Does the fifo have data? */
    if(pF->cnt)
    {
        /* how much can we read */
        if(pF->rd_idx < pF->wr_idx)
        {
            /* not wrapped, we can read until the wr index */
            cnt = pF->wr_idx - pF->rd_idx;
        }
        else
        {
            /* wrapped, we can read till end of buffer */
            cnt = pF->fifo_depth - pF->rd_idx;
        }
    }

    /* determine read offset */
    rd_offset = pF->rd_idx * pF->item_size;
    pMem      = void_ptr_add(pF->pBuf, rd_offset);
    siz       = pF->item_size;

    if(pF->mutex)
    {
        MUTEX_unLock(pF->mutex);
    }

 fail:
    if(ppMem)
    {
        *ppMem = pMem;
    }
    if(pItemCnt)
    {
        *pItemCnt = cnt;
    }
    if(pItemSize)
    {
        *pItemSize = siz;
    }
    return (r);

}

/*
 * Complete a DMA based remove operation for the fifo
 *
 * Public function defined in fifo.h
 */
void FIFO_removeDMA_update(intptr_t h, size_t actual)
{
    struct fifo *pF;

    pF = h2f(h);
    if(!pF)
    {
        return;
    }

    /* Lock */
    if(pF->mutex)
    {
        MUTEX_lock(pF->mutex, -1);
    }
    /* bump fifo parameters */
    pF->rd_idx = (pF->rd_idx + actual) % pF->fifo_depth;
    pF->cnt   -= actual;

    /* we do this inside the lock! */
    if(pF->rm_sem)
    {
        SEMAPHORE_put(pF->rm_sem);
    }

    /* done, so release the mutex */
    if(pF->mutex)
    {
        MUTEX_unLock(pF->mutex);
    }
}

/*
 * Unix fputc() operation against a fifo, non-blocking
 *
 * Public function defined in fifo.h
 */
int FIFO_fputc(int c, intptr_t h)
{
    char b;
    int r;

    b = (char)(c);
    r = FIFO_insert(h, &b, 1);
    if(r != 1)
    {
        return (-1);
    }
    else
    {
        c = (int)b;
        return (c & 0x0ff); /* remove sign extension */
    }
}

/*
 * Unix fgetc() operation against a fifo, non-blocking
 *
 * Public function defined in fifo.h
 */
int FIFO_fgetc(intptr_t h)
{
    char b;
    int c;

    c = FIFO_remove(h, (void *)(&b), 1);
    if(c == 1)
    {
        c = b;
        c = c & 0x0ff; /* remove sign extension */
        return (c);
    }
    else
    {
        /* nothing here or error */
        return (EOF);
    }
}

/*
 * Unix wait for an insert to occur on the fifo, with timeout
 *
 * Public function defined in fifo.h
 */
int FIFO_waitForInsert(intptr_t h, int timeout_mSecs)
{
    struct fifo *pF;
    int r;

    pF = h2f(h);
    if(!pF)
    {
        return (-1);
    }

    if(pF->in_sem == 0)
    {
        /* there is no semaphore, so just return check *NOW* */
        return (1);
    }

    r = SEMAPHORE_waitWithTimeout(pF->in_sem, timeout_mSecs);
    return (r);
}

/*
 * Unix wait for a remove to occur on the fifo, with timeout
 *
 * Public function defined in fifo.h
 */
int FIFO_waitForRemove(intptr_t h, int timeout_mSecs)
{
    struct fifo *pF;
    int r;

    pF = h2f(h);
    if(!pF)
    {
        return (-1);
    }

    if(pF->rm_sem == 0)
    {
        /* there is no semaphore, so just return check *NOW* */
        return (1);
    }

    r = SEMAPHORE_waitWithTimeout(pF->rm_sem, timeout_mSecs);
    return (r);
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
