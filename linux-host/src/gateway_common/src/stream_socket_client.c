/******************************************************************************
 @file stream_socket_client.c

 @brief TIMAC 2.0 API Socket client abstraction API

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
#include "stream_socket.h"
#include "log.h"
#include "timer.h"
#include "void_ptr.h"
#include "unix_fdrw.h"

#include <sys/types.h>
#include <sys/types.h>
#if defined(__linux__)
#include <sys/socket.h>
#include <netdb.h>
#include <unistd.h>
#include <arpa/inet.h>
#include <unistd.h>
#endif
#if defined(_MSC_VER)
#include "winsock2.h"
#include "ws2tcpip.h"
#endif

#define _STREAM_SOCKET_PRIVATE 1450384394
#include "stream_socket_private.h"

#include "errno.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#if defined(_MSC_VER)
#undef gai_strerror /* we want only the ascii version here */
#define gai_strerror gai_strerrorA
#endif

/*!
 * @brief [private] method handler for STREAM_WrBytes() for the client socket.
 * @param pIO - the io stream
 * @param pBytes - data buffer
 * @param nbytes - number of bytes to transfer
 * @param mSecs_timeout - timeout period in milliseconds for the operation
 *
 * @return negative on error, otherwise 0..actual transfered
 */
static int socket_client_wr(struct io_stream *pIO,
                             const void *pBytes,
                             size_t nbytes,
                             int mSecs_timeout)
{
    struct linux_socket *pS;
    struct unix_fdrw rw;

    /* get our internal form */
    pS = _stream_socket_h2ps((intptr_t)(pIO), 'c');
    if(pS == NULL)
    {
        return (-1);
    }

    /* setup for error messages */
    pS->err_action = "write()";

    /* house keeping */
    if(!(pS->is_connected))
    {
        _stream_socket_error(pS, "not connected", 0, "");
        return (-1);
    }

    /* use the common code */
    memset(&(rw), 0, sizeof(rw));

    rw.is_connected  = true;
    rw.rw            = 'w';
    rw.fd            = pS->h;
    rw.fifo_handle   = 0;
    rw.log_prefix    = "client-wr";
    rw.type          = 's';
    rw.log_why       = LOG_DBG_SOCKET;
    rw.c_bytes       = pBytes;
    rw.v_bytes       = NULL;
    rw.n_done        = 0;
    rw.n_todo        = nbytes;
    rw.mSecs_timeout = mSecs_timeout;

    return (UNIX_fdRw(&rw));
}

/*!
 * @brief [private] method handler for STREAM_RdBytes() for the client socket.
 * @param pIO - the io stream
 * @param pBytes - data buffer
 * @param nbytes - number of bytes to transfer
 * @param mSecs_timeout - timeout period in milliseconds for the operation
 *
 * @return negative on error, otherwise 0..actual transfered
 */
static int socket_client_rd(struct io_stream *pIO,
                             void *pBytes,
                             size_t nbytes,
                             int mSecs_timeout)
{
    int r;
    struct unix_fdrw rw;
    struct linux_socket *pS;

    /* get our internal representation */
    pS = _stream_socket_h2ps((intptr_t)(pIO), 'c');
    if(pS == NULL)
    {
        return (-1);
    }

    /* for error messages */
    pS->err_action = "read()";

    /* house keeping */
    if(!(pS->is_connected))
    {
        _stream_socket_error(pS, "not connected", 0, "");
        return (-1);
    }

    /* use the common code */
    memset(&(rw), 0, sizeof(rw));

    rw.is_connected  = true;
    rw.rw            = 'r';
    rw.fd            = pS->h;
    rw.fifo_handle   = 0;
    rw.log_prefix    = "client-rd";
    rw.log_why       = LOG_DBG_SOCKET;
    rw.type          = 's';
    rw.c_bytes       = NULL;
    rw.v_bytes       = pBytes;
    rw.n_done        = 0;
    rw.n_todo        = nbytes;
    rw.mSecs_timeout = mSecs_timeout;

    r = (UNIX_fdRw(&rw));
    pS->is_connected = rw.is_connected;
    return r;
}

/*!
 * @brief [private] method handler for STREAM_RxAvail() for the client socket.
 * @param pIO - the io stream
 *
 * @return boolean true if data is readable
 */
static bool socket_client_poll(struct io_stream *pIO, int mSec_timeout)
{
    struct linux_socket *pS;

    pS = _stream_socket_io2ps(pIO, 'c');
    if(pS == NULL)
    {
        return (false);
    }
    return (_stream_socket_poll(pS, mSec_timeout));
}

/*!
 * @brief [private] method handler for the STREAM_Flush() for the client socket
 * @param pIO - the io stream
 * @return In this case, the function always returns 0.
 */
static void socket_client_close(struct io_stream *pIO)
{
    struct linux_socket *pS;

    pS = _stream_socket_io2ps(pIO, 'c');
    if(pS)
    {
        _stream_socket_close(pS);
    }
}

/*!
 * @brief [private] method handler for the STREAM_Flush() for the client socket
 * @param pIO - the io stream
 * @return In this case, the function always returns 0.
 */
static int socket_client_flush(struct io_stream *pIO)
{
    /* nothing we can do */
    (void)(pIO);
    return (0);
}

/*!
 * @var socket_client_funcs
 * @brief [private] Method table for the client sockets.
 */
static const struct io_stream_funcs socket_client_funcs = {
    .name = "socket-client",
    .wr_fn = socket_client_wr,
    .rd_fn = socket_client_rd,
    .close_fn = socket_client_close,
    .poll_fn  = socket_client_poll,
    .flush_fn = socket_client_flush
};

/*
 * Create a client socket.
 *
 * Public function defined in stream_socket.h
 */
intptr_t SOCKET_CLIENT_create(struct socket_cfg *pCFG)
{
    struct linux_socket *pS;

    /* sanity checks */
    /* these are required for client */
    if((pCFG->host == NULL) || (pCFG->service == NULL))
    {
        //LOG_printf(LOG_ERROR, "socket_client: create bad host/service\n");
        return (0);
    }
    if(pCFG->ascp != 'c')
    {
        //LOG_printf(LOG_ERROR, "socket_client: incorrect cfg type\n");
        return (0);
    }

    /* common initialization code */
    pS = _stream_socket_create(pCFG, &socket_client_funcs);
    if(pS == NULL)
    {
        return (0);
    }
    else
    {
        return ((intptr_t)(pS->pParent));
    }
}

/*
 * Connect a stream socket
 *
 * Public function defined in stream_socket.h
 */
int SOCKET_CLIENT_connect(intptr_t h)
{
    struct linux_socket *pS;
    struct addrinfo hints;
    struct addrinfo *result;
    struct addrinfo *rp;
    int r;

    pS = _stream_socket_h2ps(h,'c');
    if(pS == NULL)
    {
        return (-1);
    }

    /* close if already open & ignore failures */
    _stream_socket_close(pS);

    /* reset error & connection state. */
    pS->pParent->is_error = false;
    pS->is_connected      = false;
    pS->err_action        = "connect()";

    /* setup for getaddrinfo() */
    memset((void *)(&hints), 0, sizeof(hints));
    hints.ai_family   = AF_UNSPEC;    /* Allow IPv4 or IPv6 */
    hints.ai_socktype = SOCK_STREAM;  /* simple streaming socket */
    hints.ai_flags    = 0;
    hints.ai_protocol = 0;            /* Any protocol */

    /* Parse the address info */
    r = getaddrinfo(pS->cfg.host, pS->cfg.service, &(hints), &result);
    if(r != 0)
    {
        _stream_socket_error(pS, "getaddrinfo()", r,gai_strerror(r));
        return (-1);
    }

    /* try each address result */
    rp = result;
    for(rp = result ; rp != NULL ; rp = rp->ai_next)
    {
        /* what INET should we use? */
#define _support_inet4 _bit0
#define _support_inet6 _bit1
        switch (pS->cfg.inet_4or6)
        {
        case 0:
            r = (_support_inet4 | _support_inet6);
            break;
        case 4:
            r = (_support_inet4);
            break;
        case 6:
            r = (_support_inet6);
            break;
        }

        if(rp->ai_family == AF_INET6)
        {
            if(0 == (r & _support_inet6))
            {
                /* disallowed */
                continue;
            }
        }

        if(rp->ai_family == AF_INET)
        {
            if(0 == (r & _support_inet4))
            {
                /* disallowed */
                continue;
            }
        }
#undef _support_inet4
#undef _support_inet6

        /* reset incase changed below */
        pS->pParent->is_error = false;
        pS->h = socket(rp->ai_family, rp->ai_socktype, rp->ai_protocol);
        if(pS->h < 0)
        {
            /* skip */
            _stream_socket_error(pS, "socket()", _socket_errno(), NULL);
            continue;
        }

        /* mark the socket as reusable. */
        r = _stream_socket_reuse(pS);
        if(r < 0)
        {
        next_socket:
            _stream_socket_close(pS);
            continue;
        }

        /* bind to specific interface if requested */
        r = _stream_socket_bind_to_device(pS);
        if(r < 0)
        {
            goto next_socket;
        }

        /* go for it! */
        r = connect(pS->h, rp->ai_addr, (socklen_t)(rp->ai_addrlen));
        if(r == -1)
        {
            _stream_socket_error(pS, "connect()", _socket_errno(), NULL);
            goto next_socket;
        }
        /* Great Success :-) */
        break;
    }

    /* release the addresses we have */
    freeaddrinfo(result);
    result = NULL;

    /* did anything work/ */
    if(pS->h < 0)
    {
        _stream_socket_error(pS, "client-nomore", 0, "");
        return (-1);
    }
    /* Great Success :-) */
    pS->is_connected = true;
    //LOG_printf(LOG_DBG_SOCKET,
                // "client: (connection=%d) Connect success\n",
                // pS->connection_id);
    return (0);
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
