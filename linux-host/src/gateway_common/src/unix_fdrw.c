/******************************************************************************
 @file unix_fdrw.c

 @brief TIMAC 2.0 API Unix File Descriptor RD/WR implimentation

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
#include "unix_fdrw.h"
#include "fifo.h"
#include "void_ptr.h"
#include "log.h"
#include "timer.h"

#include <string.h>

/*!
 * @brief [private] helper function for app side reading/writing a FIFO.
 *
 * @param pRW - read write parameters.
 *
 * Generally the construct is this:
 * <pre>
 *     (application) --[thiscode]-- (fifo) --- (unix file descriptor)
 * </pre>
 *
 * This code handles the app & fifo side
 */
static int _app_fifo_rw(struct unix_fdrw *pRW)
{
    size_t n_remain;
    int r;
    const char *cp;

    r = 0;
    /* loop till done */
    for(pRW->n_done = 0 ; pRW->n_done < pRW->n_todo ;)
    {

        /* how much remains to be transfered */
        n_remain = (pRW->n_todo - pRW->n_done);
        if(n_remain == 0)
        {
            break;
        }

        /* transfer data/to from the fifo */
        if(pRW->c_bytes)
        {
            cp = "insert";
            r = FIFO_insertWithTimeout(pRW->fifo_handle,
                              c_void_ptr_add(pRW->c_bytes, pRW->n_done),
                              n_remain,
                              pRW->mSecs_timeout);
        }
        else
        {
            cp = "remove";
            r = FIFO_removeWithTimeout(pRW->fifo_handle,
                              void_ptr_add(pRW->v_bytes, pRW->n_done),
                              n_remain,
                              pRW->mSecs_timeout);
        }
        if(r == 0)
        {
            /* there is no more data or */
            /* time timeout has expired */
            break;
        }

        //LOG_printf(pRW->log_why_raw, "%s: app-fifo(%s) %d bytes\n",
                    // pRW->log_prefix,
                    // cp,
                    // r);
        /* all ok? */
        if(r < 0)
        {
            /* there was a problem */
            break;
        }

        /* update */
        pRW->n_done += r;
    }

    if(pRW->n_done)
    {
        /* posix rules, we had some success */
        return ((int)(pRW->n_done));
    }
    /* got nothing */
    /* so maybe this is an error? */
    if(r < 0)
    {
        pRW->is_error = true;
        return (-1);
    }
    else
    {
        /* no error */
        return (0);
    }
}

/*!
 * @brief [private] helper function for thread side writing to the FD
 *
 * @param pRW - read write parameters.
 *
 * Generally the construct is this:
 * <pre>
 *     (application) ---- (fifo) --[thiscode]-- (unix file descriptor)
 * </pre>
 *
 * This handles the thread side that reads/writes the actual file descriptor
 * and places the data into a fifo for the app to inspect at will
 */
static int _fifo_to_fd(struct unix_fdrw *pRW)
{
    void *pmem;
    size_t item_size;
    size_t item_cnt;
    int r;

    /* transfer everything we can to the fd. */
    for(;;)
    {

        /* get our transfer information */
        FIFO_removeDMA_setup(pRW->fifo_handle, &pmem, &item_cnt, &item_size);
        /* nothing to transfer? */
        if(item_cnt == 0)
        {
            break;
        }

        /* write to the file descriptor */
        pRW->this_actual = 0;
        pRW->this_c_buf = pmem;
        pRW->this_len = item_cnt * item_size;
        UNIX_fdWrThis(pRW);

        if(!(pRW->is_connected))
        {
            break;
        }
        if(pRW->is_error)
        {
            break;
        }

        r = pRW->this_actual;

        /* blocked, none, or error we are done */
        if(r <= 0)
        {
            break;
        }

        item_cnt = r / item_size;

        /* highly unlikely */
        /* and most of the time, item_size = 1 */
        if((pRW->this_actual % item_size) != 0)
        {
            pRW->is_error = true;
            //LOG_printf(LOG_ERROR, "%s: non-integer write size failure\n",
                    //    pRW->log_prefix);
            /* nothing we can do about this.. :-( */
            break;
        }

        /* Update our Fifo details */
        FIFO_removeDMA_update(pRW->fifo_handle, item_cnt);
    }

    /* did we fail? */
    if(pRW->is_error)
    {
        /* posix rules: We some success is not a failure */
        if(pRW->n_done == 0)
        {
            return (-1);
        }
    }

    /* we had some success */
    return ((int)(pRW->n_done));
}

/*!
 * @brief [private] helper function for thread side reading from the FD
 *
 * @param pRW - read write parameters.
 *
 * Generally the construct is this:
 * <pre>
 *     (application) ---- (fifo) --[thiscode]-- (unix file descriptor)
 * </pre>
 *
 * This handles the thread side that reads/writes the actual file descriptor
 * and places the data into a fifo for the app to inspect at will
 */
static int _fd_to_fifo(struct unix_fdrw *pRW)
{
    void *pmem;
    size_t item_cnt;
    size_t item_size;
    int r;

    /* transfer everything we can from the fd to the fifo */

    for(;;)
    {
        FIFO_insertDMA_setup(pRW->fifo_handle, &pmem, &item_cnt, &item_size);

        if(item_cnt == 0)
        {
            /* no room, we are done */
            break;
        }

        /* how many bytes can we read? */
        pRW->this_v_buf = pmem;
        pRW->this_len = item_cnt * item_size;
        pRW->this_actual = 0;
        UNIX_fdRdThis(pRW);

        if(!(pRW->is_connected))
        {
            break;
        }
        if(pRW->is_error)
        {
            break;
        }

        /* r is in units of bytes */
        r = pRW->this_actual;

        /* error or blocked.. we are done */
        if(r <= 0)
        {
            break;
        }

        /* convert to item size units */
        item_cnt = r / item_size;
        /* partials are a problem! */
        if(r % item_size)
        {
            /* this is not likely
             * because we normally read bytes
             * from a file descriptor not big
             * things, this is truely a future thing
             * but we we need to treat this as
             * catastrophic at this point
             */
            pRW->is_error = true;
            //LOG_printf(LOG_ERROR, "%s: non-integer read size failure\n",
              //         pRW->log_prefix);
            break;
        }

        /* update the fifo */
        FIFO_insertDMA_update(pRW->fifo_handle, item_cnt);
    }

    /* success? */
    if(pRW->is_error)
    {
        /* posix rules, if any success it is not an error */
        if(pRW->n_done == 0)
        {
            /* Since we have no succes (read zero bytes) we return error */
            return (-1);
        } else {
            /* otherwise [below]
               some sucess (we read bytes) do not return error
             */
        }
    }

    return ((int)(pRW->n_done));
}

/*!
 * @brief [private] helper function for case when *no* fifo is present
 *
 * @param pRW - read write parameters.
 *
 * Generally the construct is this:
 * <pre>
 *     (application) -- [thiscode] -- (unix file descriptor)
 * </pre>
 *
 * This code handles the app & fifo side
 */

static int _simple_rw(struct unix_fdrw *pRW)
{
    size_t n_this;
    int r;
    timertoken_t tstart;

    tstart = TIMER_timeoutStart();

    r = 0;
    /* loop for all data */
    for(pRW->n_done = 0 ; pRW->n_done < pRW->n_todo ;)
    {

        /* how much can we do this time? */
        n_this = (pRW->n_todo - pRW->n_done);

        /* are we done? */
        if(n_this == 0)
        {
            break;
        }

        /* do the rd/wr operation */
        if(pRW->rw == 'w')
        {
            pRW->this_c_buf = c_void_ptr_add(pRW->c_bytes, pRW->n_done);
            pRW->this_len = n_this;
            UNIX_fdWrThis(pRW);
            r = pRW->this_actual;
        }
        else
        {
            if(pRW->mSecs_timeout > 0)
            {
                r = POLL_readable(pRW);
                if(r < 1)
                    break;
            }

            pRW->this_v_buf = void_ptr_add(pRW->v_bytes, pRW->n_done);
            pRW->this_len = n_this;
            UNIX_fdRdThis(pRW);
            r = pRW->this_actual;
        }

        if(!(pRW->is_connected))
        {
            break;
        }
        if(pRW->is_error)
        {
            break;
        }

        /* update our done count */
        pRW->n_done += r;

        if(pRW->mSecs_timeout < 0)
        {
            continue;
        }
        else
        {
            /* if we got nothing.. */
            if(r == 0)
            {
                /* and the timeout has expired.. */
                if(TIMER_timeoutIsExpired(tstart, pRW->mSecs_timeout))
                {
                    /* we are done */
                    break;
                }
            }
        }
    }

    if(pRW->is_error)
    {
        if(pRW->n_done == 0)
        {
            return (-1);
        }
    }
    /* no failure */
    return ((int)(pRW->n_done));
}

/*
 * Pseudo private function for unix file desctiptors to rd/write them
 * in a standard/unified way
 *
 * Pseudo-private function defined in unix_fdrw.h
 */
int UNIX_fdRw(struct unix_fdrw *pRW)
{
    /* if no fifo is involved... */
    if(pRW->fifo_handle == 0)
    {
        return (_simple_rw(pRW));
    }

    /* are we doing the apps side? */
    /* We have a transfer buffer? */
    if((pRW->c_bytes != NULL) || (pRW->v_bytes != NULL))
    {
        return (_app_fifo_rw(pRW));
    }

    /* this is the thread code */
    if(pRW->rw == 'w')
    {
        /* write data from fifo to the fd */
        return (_fifo_to_fd(pRW));
    }
    else
    {
        /* read data from the fd to the fifo */
        return (_fd_to_fifo(pRW));
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
