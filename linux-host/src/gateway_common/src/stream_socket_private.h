/******************************************************************************
 @file stream_socket_private.h

 @brief TIMAC 2.0 [private] contains internal(shared) functions between
                  server & client socket abstraction layer.

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

#if !defined(STEAM_SOCKET_PRIVATE_H)
#define STEAM_SOCKET_PRIVATE_H

#define _STREAM_IMPLIMENTOR_ 1
#include "stream_private.h"

#if _STREAM_SOCKET_PRIVATE != 1450384394
/* this is not a public header do not use */
#error "This file is private to the stream socket implementation"
#endif

/*!
 * @struct linux_socket
 * @brief  [private] struct common to client & server sockets
 */

struct linux_socket {
    /*! used to verify the the contents of this structure */
    const int *test_ptr;

    /*! Back pointer to the parent IO stream owning this structure */
    struct io_stream *pParent;

    /*! error prefix [compile time constant string] used for error messages */
    const char *err_action;

    /*! Socket configuration as supplied by the user */
    struct socket_cfg cfg;

    /*! File descriptor associated with this socket */
    intptr_t  h;

    /*! True if this socket is currently connected */
    bool   is_connected;

    /*! Connection id */
    int    connection_id;

    /*! For accepted server sockets, the address/port of the "other" socket.
     *
     * Per: http://pubs.opengroup.org/onlinepubs/009695399/basedefs/sys/socket.h.html
     *
     * The <sys/socket.h> header shall define the sockaddr_storage structure.
     * This structure shall be: Large enough to accommodate all supported
     * protocol-specific address structures; Aligned .. [etc...]
     *
     * thus this works for both inet4 and inet6 sockets
     */
    struct sockaddr_storage other;
    /* for use with "other" above */
    socklen_t       other_len;
};

/*!
 * @brief Portable function for socket error num
 * @param returns os-specific error number as an integer.
 */
int _socket_errno(void);

/*! common socket initialization steps for a linux socket
 * @param pCFG - the socket configuration
 * @param pFUNC - callback functions to use in the socket.
 * @returns pointer to a 'linux socket' structure.
 */
struct linux_socket * _stream_socket_create(
    const struct socket_cfg *pCFG,
    const struct io_stream_funcs *pFuncs);

/*!
 * @brief release resources for this socket.
 */
void _stream_socket_destroy(struct linux_socket *pS);

/*!
 * @brief Log an appropriate error message
 * @param - the socket
 * @param - primary error message
 * @param - err number from system
 * @param - err msg specific to the error number.
 */
void _stream_socket_error(struct linux_socket *pS,
                           const char *msg1,
                           int errnum,
                           const char *msg2);

/*!
 * @brief convert opaque handle into a socket pointer
 * @param h - the opaque handle
 * @param code - the expected socket type
 * @returns NULL on error or if socket is not of correct type
 */
struct linux_socket *_stream_socket_h2ps(intptr_t h, int code);

/*!
 * @brief Convert io stream, of expected type 'code' to a linux socket pointer
 * @param pIO - the io stream
 * @param code - the expected type of socket
 * @returns NULL if the socket is not of the correct type, otherwise pointer
 */
struct linux_socket *_stream_socket_io2ps(struct io_stream *pIO, int code);

/*!
 * @brief Perform the common socket close operations for all socket types
 * @param pS - the socket to close
 */
void _stream_socket_close(struct linux_socket *pS);

/*!
 * @brief Poll a socket for readablity
 * @param pS - the socket
 * @param mSecs_timeout - how long to wait
 * @returns true if readable
 */
bool _stream_socket_poll(struct linux_socket *pS, int mSecs_timeout);

/*!
 * @brief bind this socket (server/client) to a specific interface.
 * @param pS - the socket information
 * @return 0 on sucess
 */
int _stream_socket_bind_to_device(struct linux_socket *pS);

/*!
 * @brief Mark socket as reusable
 * @param pS - the socket
 * @return 0 on sucess
 */
int _stream_socket_reuse(struct linux_socket *pS);

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

