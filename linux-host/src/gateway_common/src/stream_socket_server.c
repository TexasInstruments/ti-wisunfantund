/******************************************************************************
 @file stream_socket_server.c

 @brief TIMAC 2.0 API STREAM implimentation file for a server socket.

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
#endif
#if defined(_MSC_VER)
#include "winsock2.h"
#include "ws2tcpip.h"
#endif

#define _STREAM_SOCKET_PRIVATE 1450384394
#include "stream_socket_private.h"

#include <string.h>
#include <errno.h>

#if defined(_MSC_VER)
#undef gai_strerror
#define gai_strerror gai_strerrorA
#endif

/*
 * @brief code to check for disconnects
 * @param pS - the socket to check
 * @param pRW - the read write structure we are using.
 *
 * Goal is to set pS->is_connected and is_error
 */
static void disconnect_check(struct linux_socket *pS, struct unix_fdrw *pRW)
{
    if(pRW->is_error)
    {
        pS->pParent->is_error = true;
        //LOG_printf(LOG_ERROR, "socket: (connection=%d) reporting error up\n",
                    //pS->connection_id);
        return;
    }

    if(pRW->is_connected)
    {
        return;
    }

    pS->pParent->is_error = true;
    pS->is_connected = false;

    //LOG_printf(LOG_DBG_SOCKET,
                //"socket: (connection=%d) disconnect\n",
                //pS->connection_id);
}

/*!
 * @brief [private] method handler for STREAM_WrBytes() for the server socket.
 * @param pIO - the io stream
 * @param pBytes - data buffer
 * @param nbytes - number of bytes to transfer
 * @param mSecs_timeout - timeout period in milliseconds for the operation
 *
 * @return negative on error, otherwise 0..actual transfered
 */
static int socket_server_wr(struct io_stream *pIO,
                             const void *pBytes,
                             size_t nbytes, int mSecs_timeout)
{
    struct linux_socket *pS;
    struct unix_fdrw rw;
    int r;

    /* socket must be in the accepted state */
    pS = _stream_socket_io2ps(pIO, 'a');
    if(pS == NULL)
    {
        return (-1);
    }

    pS->err_action = "write()";

    if(!(pS->is_connected))
    {
        _stream_socket_error(pS, "not-connected", 0, "");
        return (-1);
    }

    /* use the common unix handle write code */
    memset(&(rw), 0, sizeof(rw));

    rw.is_connected  = true;
    rw.type          = 's';
    rw.rw            = 'w';
    rw.fd            = pS->h;
    rw.fifo_handle   = 0;
    rw.log_prefix    = "server-wr";
    rw.log_why       = LOG_DBG_SOCKET;
    rw.c_bytes       = pBytes;
    rw.v_bytes       = NULL;
    rw.n_done        = 0;
    rw.n_todo        = nbytes;
    rw.mSecs_timeout = mSecs_timeout;

    r = UNIX_fdRw(&rw);

    disconnect_check(pS,&rw);

    return (r);
}

/*!
 * @brief [private] method handler for STREAM_RdBytes() for the server socket.
 * @param pIO - the io stream
 * @param pBytes - data buffer
 * @param nbytes - number of bytes to transfer
 * @param mSecs_timeout - timeout period in milliseconds for the operation
 *
 * @return negative on error, otherwise 0..actual transfered
 */
static int socket_server_rd(struct io_stream *pIO,
                             void *pBytes,
                             size_t nbytes,
                             int mSecs_timeout)
{
    struct linux_socket *pS;
    struct unix_fdrw rw;
    int r;

    /* socket must be in the accepted state */
    pS = _stream_socket_io2ps(pIO, 'a');
    if(pS == NULL)
    {
        return (-1);
    }
    pS->err_action = "read()";

    if(!(pS->is_connected))
    {
        _stream_socket_error(pS, "not-connected", 0, "");
        return (-1);
    }

    memset(&(rw), 0, sizeof(rw));

    rw.type          = 's';
    rw.is_connected  = true;
    rw.rw            = 'r';
    rw.fd            = pS->h;
    rw.fifo_handle   = 0;
    rw.log_prefix    = "server-rd";
    rw.log_why       = LOG_DBG_SOCKET;
    rw.c_bytes       = NULL;
    rw.v_bytes       = pBytes;
    rw.n_done        = 0;
    rw.n_todo        = nbytes;
    rw.mSecs_timeout = mSecs_timeout;

    r = UNIX_fdRw(&rw);

    disconnect_check(pS,&rw);

    return (r);
}

/*!
 * @brief [private] method handler for STREAM_RxAvail() for the server socket.
 * @param pIO - the io stream
 *
 * @return boolean true if data is readable
 */
static bool socket_server_poll(struct io_stream *pIO, int mSec_timeout)
{
    struct linux_socket *pS;

    pS = _stream_socket_io2ps(pIO, 's');
    if(pS == NULL)
    {
        return (false);
    }
    return (_stream_socket_poll(pS, mSec_timeout ));
}

/*!
 * @brief [private] method handler for the STREAM_Flush() for the server socket
 * @param pIO - the io stream
 * @return In this case, the function always returns 0.
 */
static int socket_server_flush(struct io_stream *pIO)
{
    /* nothing we can do */
    (void)(pIO);
    return (0);
}

/*!
 * @brief [private] method handler for the STREAM_Close() for the server socket
 * @param pIO - the io stream
 * @returns void
 */
static void socket_server_close(struct io_stream *pIO)
{
    struct linux_socket *pS;
    /* this could be an accepted socket */
    /* or it could be the socket we are listening on */
    /* THUS: Type code = don't care */
    pS = _stream_socket_io2ps(pIO, 0);
    if(pS)
    {
        _stream_socket_close(pS);
    }
}

/*!
 * @var socket_server_funcs
 * @brief [private] Method table for the server sockets.
 */
static const struct io_stream_funcs socket_server_funcs = {
    .name = "socket-server",
    .wr_fn = socket_server_wr,
    .rd_fn = socket_server_rd,
    .close_fn = socket_server_close,
    .poll_fn  = socket_server_poll,
    .flush_fn = socket_server_flush
};

/*
 * Create a server socket
 *
 * Public function defined in stream_socket.h
 */
intptr_t SOCKET_SERVER_create(struct socket_cfg *pCFG)
{
    struct addrinfo hints;
    struct addrinfo *results;
    struct addrinfo *rp;
    struct linux_socket *pS;
    const char *host;
    int r;

    /* the HOST setting is optional */
    /*  If it is BLANK or NULL, we bind to anything */
    /*  otherwise we bind to a specific IP address */
    /*  (in case the host has more then 1 IP address) */

    /* The host setting is "optional" for the server */
    /* The service (port number) is manditory */
    if((pCFG->service == NULL))
    {
        //LOG_printf(LOG_ERROR, "socket-server: create() bad service\n");
        return (0);
    }

    /* sanity check */
    if(pCFG->ascp != 's')
    {
        //LOG_printf(LOG_ERROR, "socket_server: incorrect cfg type\n");
        return (0);
    }

    /* basic configuration */
    pS = _stream_socket_create(pCFG, &socket_server_funcs);
    if(pS == NULL)
    {
      return (0);
    }

    /* house keeping for errors */
    pS->err_action = "server-create";

    /* we are binding to a specific ip address? */
    host = pS->cfg.host;
    if(host)
    {
        if(0 == strlen(host))
        {
            /* allow user to specify "" as blank. */
            host = NULL;
        }
    }

    /* do our lookup */
    memset(&hints, 0, sizeof(hints));
    switch (pS->cfg.inet_4or6)
    {
    default:
        BUG_HERE("Unsupported\n");
        break;
    case 0:
        hints.ai_family = AF_UNSPEC;    /* Allow IPv4 or IPv6 */
        break;
    case 4:
        hints.ai_family = AF_INET;      /* only IPv4 */
        break;
    case 6:
        hints.ai_family = AF_INET;      /* only IPv6 */
        break;
    }
    hints.ai_socktype = SOCK_STREAM;  /* simple streaming socket */

    /* are we binding to a specific interface/address? */
    if(host)
    {
        hints.ai_flags    = 0;
    }
    else
    {
        /* See the discussion about "bind()" here */
        /* and the use of the AI_PASSIVE flag */
        /* http://beej.us/guide/bgnet/output/html/singlepage/bgnet.html#bind */
        hints.ai_flags    = AI_PASSIVE;
    }

    /* lookup the stuff */
    r = getaddrinfo(host, pS->cfg.service, &hints, &results);
    if(r != 0)
    {
        _stream_socket_error(pS, "getaddrinfo()", r, gai_strerror(r));
        _stream_socket_destroy(pS);
        return (0);
    }

    /* go through our results until we are successful.. */
    pS->h = -1;
    for(rp = results ; rp != NULL ; rp = rp->ai_next)
    {
        /* what INET should we use? */
        switch (pS->cfg.inet_4or6)
        {
        case 0:
            r = 3;
            break;
        case 4:
            r = 1;
            break;
        case 6:
            r = 2;
            break;
        }

        if(rp->ai_family == AF_INET6)
        {
            if(0 == (r & 2))
            {
                /* disallowed */
                continue;
            }
        }

        if(rp->ai_family == AF_INET)
        {
            if(0 == (r & 1))
            {
                /* disallowed */
                continue;
            }
        }

        pS->pParent->is_error = false;
        pS->h = socket(rp->ai_family, rp->ai_socktype, rp->ai_protocol);
        if(pS->h < 0)
        {
            /* skip */
            _stream_socket_error(pS, "socket()", _socket_errno(), NULL);
            continue;
        }

        r = _stream_socket_reuse(pS);
        if(r < 0)
        {
            /* Hmm it did not work? clean up and try next */
        next_socket:
            _stream_socket_close(pS);
            pS->h = -1;
            continue;
        }

        /* bind to specific interface if requested */
        r = _stream_socket_bind_to_device(pS);
        if(r < 0)
        {
            goto next_socket;
        }

        /* Bind to the address/port we desire */
        r = bind(pS->h, rp->ai_addr,  (socklen_t)(rp->ai_addrlen));
        if(r != 0)
        {
            _stream_socket_error(pS, "bind()", _socket_errno(), NULL);
            goto next_socket;
        }
        /* great success! */
        break;
    }

    /* release the results list */
    freeaddrinfo(results);

    /* success? */
    if(pS->h < 0)
    {
        _stream_socket_error(pS, "server-nomore", 0, "");
        _stream_socket_destroy(pS);
        return (0);
    }

    /* Indicate our success */
    //LOG_printf(LOG_DBG_SOCKET,
               // "socket(server:%s) ready to accept\n",
                // pS->cfg.service);

    return (STREAM_structToH(pS->pParent));

}

/*
 * Public function to set a server socket to listen mode
 *
 * Public function defined in stream_socket.h
 */
int SOCKET_SERVER_listen(intptr_t h)
{
    struct linux_socket *pS;
    int r;

    /* Find our internal representation */
    pS = _stream_socket_h2ps(h,'s');
    if(pS == NULL)
    {
        return (-1);
    }

    /* tell the socket to listen */
    r = listen(pS->h, pS->cfg.server_backlog);
    if(r != 0)
    {
        pS->err_action = "listen()";
        _stream_socket_error(pS, "listen-fail", _socket_errno(), NULL);
        r = -1;
    }
    /* we are now a listening socket. */
    pS->cfg.ascp = 'l';
    return (r);
}

/* Convert a struct sockaddr address to a string, IPv4 and IPv6: */
static const char *get_ip_str(const struct sockaddr *sa, char *s, size_t maxlen)
{
#if defined(__linux__)
    const struct sockaddr_in *SA4 = (((const struct sockaddr_in *)sa));
    const struct sockaddr_in6 *SA6 = (((const struct sockaddr_in6 *)sa));

#endif
#if defined(_MSC_VER)
    struct sockaddr_in *SA4 =  (((struct sockaddr_in *)sa));
    struct sockaddr_in6 *SA6 = (((struct sockaddr_in6 *)sa));
#endif

    switch(sa->sa_family)
    {
    case AF_INET:
        inet_ntop(AF_INET, &(SA4->sin_addr), s, maxlen);
        break;

    case AF_INET6:
        inet_ntop(AF_INET6, &(SA6->sin6_addr),s, maxlen);
        break;

    default:
        strncpy(s, "Unknown AF", maxlen);
        break;
    }

    return (s);
}

/*
 * Public function for server sockets to accept a connection
 *
 * Public function defined in stream_socket.h
 */
int SOCKET_SERVER_accept(intptr_t *h, intptr_t hListener, int mSec_timeout)
{
    struct linux_socket *pSL;
    struct linux_socket *pSA;
    struct unix_fdrw rw;
    int r;

    /* make sure this is not valid. */
    *h = 0;

    /* translate to our internal form */
    pSL = _stream_socket_h2ps(hListener, 'l');
    if(pSL == NULL)
    {
        return (-1);
    }

    memset(&rw, 0, sizeof(rw));
    rw.is_connected  = true;
    rw.fd            = pSL->h;
    rw.type          = 's';
    rw.rw            = 'r';
    rw.log_prefix    = "sock-accept";
    rw.log_why       = LOG_DBG_SOCKET;
    rw.fifo_handle   = 0;
    rw.mSecs_timeout = mSec_timeout;

    /* is there somebody knocking waiting to be accepted? */
    r = POLL_readable(&rw);
    if(r < 0)
    {
        _stream_socket_error(pSL, "poll", _socket_errno(), NULL);
        return (r);
    }

    if(r == 0)
    {
        /* Nobody is there */
        /* we accepted 0 connections */
        return (0);
    }

    /* init the new accepted socket */
    pSA = _stream_socket_create(&(pSL->cfg) , &socket_server_funcs);
    if(!pSA)
    {
        return (-1);
    }

    /* this is our accepted socket. */
    pSA->cfg.ascp = 'a';

    /* update our error message */
    pSL->err_action = "accept";

    /* setup for the accept call */
    pSA->other_len = sizeof(pSA->other);
    memset((void *)(&pSA->other), 0, sizeof(pSA->other));

    /* Accept our new connection */
    pSA->other_len = sizeof(pSA->other);
    pSA->h = accept(pSL->h,
                     (struct sockaddr *)&(pSA->other),
                     &(pSA->other_len));

    /* did something go wrong? */
    if(pSA->h < 0)
    {
        _stream_socket_error(pSA, "accept-fail", _socket_errno(), NULL);
        _stream_socket_close(pSA);
        _stream_socket_destroy(pSA);
        return (-1);
    }

    /* print a debug log about the connection */
    if(LOG_test(LOG_DBG_SOCKET))
    {
        /* Technique is from here: */
        /* http://beej.us/guide/bgnet/output/html/multipage/getpeernameman.html */

        /* ip6 strings are the *larger* */
        /* of IPNET_ADDRSTRLEN(ie: v4) */
        /* or IPNET6_ADDRSTRLEN(ie: v6) */
        /* so we use the ipnet6 version */
        char ipstr[ INET6_ADDRSTRLEN ];
        int  port;

        /* provide a dummy name incase something goes wrong below */
        strcpy(ipstr, "unknown");
        /* deal with both IPv4 and IPv6: */
        port = -1;
        switch(pSA->other.ss_family)
        {
        case AF_INET:
            port = ((struct sockaddr_in *)(&(pSA->other)))->sin_port;
            break;
        case AF_INET6:
            port = ((struct sockaddr_in6 *)(&(pSA->other)))->sin6_port;
            break;
        }
        get_ip_str((struct sockaddr *)(&(pSA->other)), ipstr, sizeof(ipstr));

        /* convert port endian: */
        port = ntohs((u_short)port);
        //LOG_printf(LOG_DBG_SOCKET, "socket(server:%s) new cid: %d, h: %d\n",
                //     pSA->cfg.service,
                //    pSA->connection_id,
                //    (int)(pSA->h));
        //LOG_printf(LOG_DBG_SOCKET, "socket(server:%s) peer: %s, port %d\n",
                    // pSA->cfg.service,
                    // ipstr,
                    // port);
    }

    /* mark connection as accepted */
    pSA->cfg.ascp = 'a';
    pSA->is_connected = true;
    *h = STREAM_structToH(pSA->pParent);
    /* we accepted 1 connection */
    return (1);
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

