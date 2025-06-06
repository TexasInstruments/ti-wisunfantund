/******************************************************************************
 @file stream_socket_private.c

 @brief TIMAC 2.0 API Socket abstraction shared code (server & client)

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
#include "hlos_specific.h"

int _socket_errno(void)
{
    int e;
#if defined(__linux__)
    e = errno;
#endif
#if defined(_MSC_VER)
    e = WSAGetLastError();
#endif
    return (e);
}

/*!
 * @var socket_test
 * @brief [private] Used to verify a linux socket pointer
 * Also answer to live, universe, and everything..
 */
static const int socket_test = 42;

/*!
 * @brief Release memory in the 'cfg' structure.
 */
static void _stream_socket_cfg_free(struct linux_socket *pS)
{
    /* release what we got */
    if(pS->cfg.host)
    {
        free_const((const void *)(pS->cfg.host));
    }
    if(pS->cfg.service)
    {
        free_const((const void *)(pS->cfg.service));
    }
    if(pS->cfg.device_binding)
    {
        free_const((const void *)(pS->cfg.device_binding));
    }

    /* clear pointers */
    pS->cfg.host           = NULL;
    pS->cfg.service        = NULL;
    pS->cfg.device_binding = NULL;
}

/*!
 * @brief Copy (and reallocate as needed) a socket configuration structure.
 */
static int _stream_socket_cfg_copy(struct linux_socket *pS,
                                    const struct socket_cfg *pCFG)
{
    int r;

    /* assume success */
    r = 0;

    /* Bulk copy */
    pS->cfg = *pCFG;

    /* If host was specified, make our own copy */
    if(pS->cfg.host)
    {
        pS->cfg.host = strdup(pS->cfg.host);
        if(pS->cfg.host == NULL)
        {
            r = -1;
        }
    }

    /* same for service */
    if(pS->cfg.service)
    {
        pS->cfg.service = strdup(pS->cfg.service);
        if(pS->cfg.service == NULL)
        {
            r = -1;
        }
    }

    /* same for finding */
    if(pS->cfg.device_binding)
    {
        pS->cfg.device_binding = strdup(pS->cfg.device_binding);
        if(pS->cfg.device_binding == NULL)
        {
            r = -1;
        }
    }

    /* if something went wrong... cleanup allocation */
    if(r < 0)
    {
        /* something is wrong... something failed */
        //LOG_printf(LOG_ERROR, "socket-cfg-copy no memory\n");

        _stream_socket_cfg_free(pS);
    }
    /* return Great Success */
    return (r);
}

/*
 * pseudo-private function to create a linux socket structure
 * Used by both client and server sockets.
 *
 * Pseudo-private function defined in stream_socket_private.h
 */
struct linux_socket *_stream_socket_create(const struct socket_cfg *pCFG,
                                            const struct io_stream_funcs *pFuncs)
{
    /* this is the source of our connection ids it must be static. */
    static int connection_counter;

    struct linux_socket *pS;
    int r;

    switch (pCFG->inet_4or6)
    {
    case 0: /* pick randomly */
    case 4: /* specifically inet4 */
    case 6: /* specifically inet6 */
        break;
    default:
        //LOG_printf(LOG_ERROR, "invalid inet_4or6\n");
        return (0);
    }

    pS = calloc(1, sizeof(*pS));
    if(pS == NULL)
    {
        //LOG_printf(LOG_ERROR, "socket-client no memory\n");
        return (pS);
    }

    _ATOMIC_global_lock();
    connection_counter++;
    pS->connection_id = connection_counter;
    _ATOMIC_global_unlock();

    pS->test_ptr     = &(socket_test);
    pS->pParent      = STREAM_createPrivate(pFuncs, (intptr_t)(pS));
    if(pS->pParent == NULL)
    {
        memset((void *)(pS), 0, sizeof(*pS));
        return (NULL);
    }

    pS->h            = -1;
    r = _stream_socket_cfg_copy(pS, pCFG);
    if(r < 0)
    {
        STREAM_destroyPrivate(pS->pParent);
        free((void *)(pS));
        pS = NULL;
    }
    else
    {
        /* UPDATE internal pointers */
        pS->is_connected = false;
        pS->err_action   = "client-create";
    }

    return (pS);
}

/*
 * Determine if a socket is connected or not.
 *
 * Public function defined in stream_socket.h
 */
bool STREAM_SOCKET_isConnected(intptr_t h)
{
    struct linux_socket *pS;
    bool answer;

    answer = false;
    pS = _stream_socket_h2ps(h,0);
    if(pS)
    {
        answer = pS->is_connected;
    }
    return (answer);
}

/*
 * Destroy a socket created by various SOCKET_<name>_create() calls
 *
 * Public function defined in stream_socket.h
 */
void SOCKET_destroy(intptr_t h)
{
    if(h)
    {
        _stream_socket_destroy(_stream_socket_h2ps(h,0));
    }
}

/*
 * Pseudo-private destroy function for sockets
 * Shared by both client and server socket code.
 *
 * Pseudo-private function defined in stream_socket_private.h
 */
void _stream_socket_destroy(struct linux_socket *pS)
{
    if(pS == NULL)
    {
        return;
    }
    if(pS->h > 0)
    {
        _stream_socket_close(pS);
    }
    if(pS->pParent)
    {
        STREAM_destroyPrivate(pS->pParent);
        pS->pParent = NULL;
    }
    _stream_socket_cfg_free(pS);

    memset((void *)(pS), 0, sizeof(*pS));
}

/*
 * Mark a socket as a reusable socket  (avoids address in use errors)
 * Pseudo-private function shared across socket types
 *
 * Pseudo-private function defined in stream_socket_private
 */
int _stream_socket_reuse(struct linux_socket *pS)
{
    int r,f,v;

    /* Mark as reuseable, avoid EADDRINUSE errors */
    /* http://linux.die.net/man/7/socket */
    /* http://linux.die.net/man/2/setsockopt */
    f = SO_REUSEADDR;
#if defined(SO_REUSEPORT)
    /* http://stackoverflow.com/questions/14388706/socket-options-so-reuseaddr-and-so-reuseport-how-do-they-differ-do-they-mean-t */
    /* post Linux 3.9 */
    f |= SO_REUSEPORT;
#endif
    v = 1;
    r = setsockopt(pS->h, SOL_SOCKET, f, (const void *)(&v), sizeof(v));
    if(r < 0)
    {
        _stream_socket_error(pS, "setsocketopt(SO_REUSEADDR)", errno, NULL);
    }
    return (r);
}

/*
 * Bind this socket to a specific device, ie: 'eth0' vrs 'eth1'
 * Pseudo-private to socket implimentations.
 *
 * Pseudo-private function defined in stream_socket_private
 */
int _stream_socket_bind_to_device(struct linux_socket *pS)
{
    size_t l;
    int r;

    /* accept *NO* binding */
    if(pS->cfg.device_binding == NULL)
    {
        return (0);
    }
    /* or blank binding */
    l = strlen(pS->cfg.device_binding);
    if(l == 0)
    {
        return (0);
    }
#if defined(_MSC_VER)
    /* not supported on windows */
    r = 0;
#else
    /* http://linux.die.net/man/7/socket */
    /* http://linux.die.net/man/2/setsockopt */
    r = setsockopt(pS->h,
                    SOL_SOCKET,
                    SO_BINDTODEVICE,
                    ((const void *)(pS->cfg.device_binding)),
                    strlen(pS->cfg.device_binding));
#endif
    if(r < 0)
    {
        _stream_socket_error(pS, "bind()", _socket_errno(),NULL);
    }
    return (r);
}

/*
 * Print an error message with this socket and mark the stream as in error
 *
 * Pseudo-private function defined in stream_socket_private.h
 */
void _stream_socket_error(struct linux_socket *pS,
                          const char *msg1,
                          int errnum,
                          const char *msg2)
{
    const char *host;

    host = pS->cfg.host;
    if(host == NULL)
    {
        host = "(null-host)";
    }
    pS->pParent->is_error = true;
    if(msg2 == NULL)
    {
        msg2 = "";
        if(errnum != 0)
        {
#if defined(__linux__)
            msg2 = strerror(errnum);
#endif
#if defined(_MSC_VER)
            msg2 = gai_strerrorA(errnum);
#endif
        }
    }
    //LOG_printf(LOG_ERROR, "socket(%c,%s:%s) %s %s %d %s\n",
                // pS->cfg.ascp,
                // host,
                // pS->cfg.service,
                // pS->err_action,
                // msg1,
                // errnum,
                // msg2);
}

/*
 * Pseudo-private socket function that converts a stream handle
 * into a socket structure pointer
 *
 * Pseudo-private function defined in stream_socket_private.h
 */
struct linux_socket *_stream_socket_io2ps(struct io_stream *pIO, int typecode)
{
    struct linux_socket *pS;
    pS = (struct linux_socket *)(pIO->opaque_ptr);

    if(pS == NULL)
    {
    bad:
        //LOG_printf(LOG_ERROR, "not a socket handle: %p (it is a: %s)\n",
                    //(void *)(pIO), pIO->pFuncs->name );
        return (NULL);
    }

    if(pS->test_ptr != &(socket_test))
    {
        goto bad;
    }

    if(typecode)
    {
        if(pS->cfg.ascp != typecode)
        {
            pS->err_action = "get-type";
            _stream_socket_error(pS, "wrong-socket-type", 0, "");
            /* return failure */
            pS = NULL;
        }
    }
    return (pS);
}

/*
 * convert a handle into a linux socket pointer
 * Shared by both client and server socket code
 *
 * Pseudo-private function defined in stream_socket_private.h
 */
struct linux_socket *_stream_socket_h2ps(intptr_t h, int typecode)
{
    struct io_stream *pIO;

    pIO = STREAM_hToStruct(h);
    if(pIO == NULL)
    {
        return (NULL);
    }

    return (_stream_socket_io2ps(pIO, typecode));
}

/*
 * Return true if this handle is a socket handle
 *
 * Public function defined in stream_socket.h
 */
bool STREAM_isSocket(intptr_t h)
{
    struct io_stream *pIO;
    struct linux_socket *pS;

    pIO = STREAM_hToStruct(h);
    if(pIO == NULL)
    {
        return (false);
    }
    pS = (struct linux_socket *)(pIO->opaque_ptr);

    if(pS->test_ptr == &(socket_test))
    {
        return (true);
    }
    else
    {
        return (false);
    }
}

/*
 * Psuedo-private function to close a socket.
 * Shared between client and server sockets
 *
 * Pseudo-private function defined in stream_socket_private.h
 */
void _stream_socket_close(struct linux_socket *pS)
{
    pS->is_connected = false;
    /* clear the error because we closed the connection */
    pS->pParent->is_error = false;

    /* close it */
    if(pS->h >= 0)
    {
        //LOG_printf(LOG_DBG_SOCKET, "socket_close(%c,%s:%s)\n",
                    // pS->cfg.ascp,
                    // pS->cfg.host ? pS->cfg.host : "server",
                    // pS->cfg.service);
#if defined(_MSC_VER)
        closesocket(pS->h);
#endif
#if defined(__linux__)
        close(pS->h);
#endif
        pS->h = -1;
        if(pS->h != -1)
        {
            BUG_HERE("need to close this\n");
        }
    }
}

/*
 * Pseudo private function to poll (read) a socket
 * Shared between client and server sockets.
 *
 * Pseudo-private function defined in stream_socket_private.h
 */
bool _stream_socket_poll(struct linux_socket *pS, int mSecs_timeout)
{
    int r;

    /* assume ok to poll */
    r = 0;

    pS->err_action = "poll";
    switch(pS->cfg.ascp)
    {
    default:
        _stream_socket_error(pS, "not-valid-poll-state", 0, "");
        r = -1;
        break;
    case 'c':
        if(!(pS->is_connected))
        {
            r = -1;
            _stream_socket_error(pS, "not connected", 0, "");
        }
        break;
    case 's':
        _stream_socket_error(pS, "not-listen-state", 0, "");
        r = -1;
        break;
    case 'l':
        /* we can poll */
        break;
    case 'a':
        /* yes we can poll! */
        break;
    }
    if(r < 0)
    {
        _stream_socket_error(pS, "poll bad socket type", 0, "");
        r = -1;
    }
    if(r >= 0)
    {
        struct unix_fdrw rw;
        memset(&rw, 0, sizeof(rw));
        rw.is_connected  = true;
        rw.fd            = pS->h;
        rw.rw            = 'r';
        rw.log_prefix    = "socket-poll";
        rw.log_why       = LOG_DBG_SOCKET;
        rw.mSecs_timeout = mSecs_timeout;
        rw.type          = 's';
        r = POLL_readable(&rw);
        if(r < 0)
        {
            _stream_socket_error(pS,"poll error", 0, "");
        }
    }

    if(r > 0)
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

