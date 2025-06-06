/******************************************************************************
 @file unix_fdrw.h

 @brief TIMAC 2.0 API Unix style File descriptor read/write operations

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

#if !defined(UNIX_FDRW_H)
#define UNIX_FDRW_H

/*!
 * OVERVIEW
 * ========
 *
 * This file handles RD/WR operations for a Unix File Descriptor using rd/wr
 * and also handles any FIFO activty with respect to that FIFO
 *
 * Use cases:
 *
 * <ul>
 * <li> Case #1 - (No Fifo involved)
 *      No fifo is involved, rd/wr the file descriptor.
 *
 * <li> Case #2 - (Read with Fifo)
 *       - for reading, there is a "read thread"
 *       - This read thread is blocked waiting for data
 *         when it gets data, it wakes up and fills the fifo.
 *       - When the APP reads, it reads from the FIFO
 *
 * <li> Case #3 - (Write with Fifo)
 *        Same idea as read with fifo
 * </ul>
 *
 * Logic is as follows:
 * \code
 *   if(fifo_handle == 0){
 *         we read/write the file descriptor directly.
 *         return
 *   } else {
 *         if(v_bytes==NULL){
 *              device rd_thread is active
 *              transfer bytes from fd to fifo
 *              return;
 *         if(c_bytes==NULL){
 *              device wr_thread is active
 *              transfer bytes from fifo to fd
 *         } else {
 *              FD is not used
 *              app thread is active
 *              transfer bytes from buffer to fifo
 *         }
 *   }
 * \endcode
 */

#include <stdint.h>
#include <stdbool.h>
#include <stddef.h>

/*!
 * @struct Unix File Descriptor (fd) RW Parameters.
 */
struct unix_fdrw {
    /*! File descriptor */
    intptr_t   fd;  // could be HANDLE on windows

    /*! are we reading or writing with respect to the file descriptor? */
    int        rw;

    /*! Are we using a fifo? If so this is the handle */
    intptr_t    fifo_handle;

    /*! if we make logs, what prefix do we use */
    const char *log_prefix;

    /*! log flags for this operation */
    int64_t    log_why;
    int64_t    log_why_raw;

    /*! if not-null, this is the transfer buffer */
    const void *c_bytes;

    /*! if not null this is the transfer buffer */
    void       *v_bytes;

    /*! how many did we do? */
    size_t    n_done;

    /*! how many do we need to do? */
    size_t    n_todo;

    /*! what is the timeout value? */
    int         mSecs_timeout;

    /*! Did we have an error? */
    bool        is_error;

    /*! If socket, this is set when we detect a close */
    bool        is_connected;

    /*! Is this a socket? uart or other
     *  'f' file
     *  's' socket
     *  'u' uart
     *  'i' i2c
     *  'p' spi
     */
    int         type;

    const char *this_c_buf;
    char       *this_v_buf;
    size_t      this_len;
    int         this_actual;
};

/*!
 * @brief Process rd/wr requests against a unix file descriptor, or fifo
 * @param pRW  - the rw details.
 * @return negative on error, or number of bytes transfered
 */
int UNIX_fdRw(struct unix_fdrw *pRW);

/*
 * @brief Platform specific rd/wr operations at the "this" level
 * @param pRW  - the rw details.
 */
void UNIX_fdWrThis(struct unix_fdrw *pRW);

/*
* @brief Platform specific rd/wr operations at the "this" level
 * @param pRW  - the rw details.
*/
void UNIX_fdRdThis(struct unix_fdrw *pRW);

/*!
* @brief determine if a unix file descriptor is readable
*
* @param pURW - contains file descriptor, and timeout periods
*
* @returns positive if readable, 0 if not, negative for errors
*
*/
int POLL_readable(struct unix_fdrw *pURW);

/*!
* @brief Determine if a file descriptor is writeable
*
* @param pURW - contains file descriptor, and timeout periods
*
* @returns positive if writeable, 0 if not, negative for errors
*
*/
int POLL_writable(struct unix_fdrw *pURW);

#endif

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
