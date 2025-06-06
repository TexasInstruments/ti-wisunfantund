/******************************************************************************
 @file stream_private.h

 @brief TIMAC 2.0 API Internal "stream" implimentation details

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

/*
 * OVERVIEW
 * ========
 *
 * The STREAM implimentations share a number of "common" features
 * This header file describes the common items shared across all
 * streams, it is not intended for use by general code
 * it should only be used by code that is implimenting a stream.
 */

#if !defined(STREAM_PRIVATE_H)
#define STREAM_PRIVATE_H


#if !defined(_STREAM_IMPLIMENTOR_)
#error This file should only be included by stream implimentation code.
#endif

/* forward decloration */
struct io_stream_funcs;

/*!
 * @struct io_stream - represents byte stream, emulates the stdio FILE
 *
 * To create a stream, call one of the STREAM_CREATE_foobar() functions
 * where foobar is the type of interface you wish to access.
 */
struct io_stream {
    /*! check value, used to verify this is an io-stream */
    const int *check_ptr;

    /*! stream specific funcs (method functions, specific to stream type)*/
    const struct io_stream_funcs *pFuncs;

    /*! for use internal by stream specific funcs */
    intptr_t opaque_ptr;

    /*! for use internal by the io stream to handle unget operations */
    int      unget_buf;

    /* set to true when an error occurs. */
    bool     is_error;

    /*! for use by the rd callback */
    intptr_t rd_rdy_cookie;

    /*!  this callback is called when data is put into the rx fifo */
    void (*rd_rdy_cb)(struct io_stream *pIO, int nAvail);
};

/*!
 * @struct io_stream_funcs
 *
 * @brief Functions (methods) that backend various streams
 */
struct io_stream_funcs {
    /*! Name for debug purposes */
    const char *name;

    /*! close the stream, does not always release resources */
    void (*close_fn)(struct io_stream *pIO);

    /*!
     * @brief write bytes to the stream
     * @param pIO stream - the io stream to use
     * @param pData - data buffer holding the data
     * @param nbytes - number of bytes to write
     * @param timeout_mSecs - timeout in milliseconds (see timeout mSec rule)
     *
     * @return -1 on error, 0..actual number of bytes written
     */
    int  (*wr_fn)(struct io_stream *pIO, const void *pData, size_t n, int timeout_mSecs);

    /*!
     * @brief read bytes from the stream
     * @param pIO stream - the io stream to use
     * @param pData - data buffer to put data into
     * @param nbytes - number of bytes to read
     * @param timeout_mSecs - timeout in milliseconds (see timeout mSec rule)
     *
     * @return -1 on error, 0..actual number of bytes read
     */
    int  (*rd_fn)(struct io_stream *pIO, void *pData, size_t n, int timeout_mSecs);

    /*!
     * @brief Determine if the io stream is readable
     *
     * @param pIO - the io stream
     * @param timeout_mSec - the timeout for the poll operation
     * @return true if it is, false if not
     */
    bool  (*poll_fn)(struct io_stream *pIO, int timeout_mSec);

    /*!
     * @brief Flush all buffered IO to the device
     *
     * @param pIO - the io stream
     *
     * @return negative error, 0 success
     */
    int  (*flush_fn)(struct io_stream *pIO);

    /*!
     * @brief clear underlying errors.
     *
     * @param pIO - the io stream
     */
    void (*clear_fn)(struct io_stream *pIO);
};

/*!
 * @brief Create & Initialize a io_stream properly
 * @param pFuncs - set of method functions for this stream.
 * @param opaque - the opaque parameter for the method functions
 *
 * @returns NULL on error, or an initialized io stream
 *
 * To return the "handle" to the caller, cast the "io_stream" pointer
 * to an intptr_t.
 */
struct io_stream *STREAM_createPrivate(const struct io_stream_funcs *pFuncs, intptr_t opaque);

/*!
 * @brief Release resources (memory) in the io_stream structure
 * @param pIO - io stream from STREAM_CreatePrivate()
 */
void STREAM_destroyPrivate(struct io_stream *pIO);

/*!
 * @brief convert an handle into an io_stream structure pointer.
 * @param h - public version (handle) of an IO stream
 * @returns NULL if h is invalid, or a proper structure pointer.
 */
struct io_stream *STREAM_hToStruct(intptr_t h);

/*
 * @brief convert an io_stream structure pointer into a public handle
 * @param pIO - the io stream to convert.
 * @returns proper value for the IO stream
 */
intptr_t STREAM_structToH(struct io_stream *pIO);

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

