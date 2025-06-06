/******************************************************************************
 @file stream_socket.h

 @brief TIMAC 2.0 API Header for streams that are sockets.

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

#if !defined(STREAM_SOCKET_H)
#define STREAM_SOCKET_H

/*!
 * @file stream_socket.h
 *
 * @brief Provides a client INET4/6 socket both server and client abstraction
 *
 * INET4/INET6 Support
 * ==================
 * Note: We have only tested INET4, not INET6.
 *
 * That said, the code is written "with the intent that INET6 works" using!
 * the appropriate function calls, etc, it is just that the INET6 code path
 * has not been tested. Thus for INET6: Your milage may vary
 *
 * Client Mode
 * ===========
 * To use this in a client mode, you generally do this:
 *
 * \code
 *    int r;
 *    intptr_t s;
 *    struct socket_cfg cfg;
 *
 *    SOCKET_init();
 *
 *    memset(&cfg, 0, sizeof(cfg));
 *    cfg.ascp = 'c'; // specify client socket
 *    cfg.host = "www.yahoo.com";
 *    cfg.service = "80";
 *    cfg.inet_4or6 = 4; // Limit to inet4
 *    s = SOCKET_CLIENT_create(&cfg);
 *    if(s == 0){
 *       FATAL_printf("cannot create socket\n");
 *    }
 *
 *    r = SOCKET_CLIENT_connect(s, -1);
 *    if(r < 0){
 *       FATAL_printf("Cannot connect\n");
 *    }
 *
 *    // Send your request..
 *    STREAM_printf(h, "GET / HTTP/1.1\r\n\r\n");
 *    // Read your response
 *    STREAM_fgets(my_buf, sizeof(my_buf), h);
 *    // Read more response ...
 *    STREAM_close(s);
 *    // we could connect again..
 *    // But this is a simple app
 *    SOCKET_CLIENT_destroy(s);
 * \endcode
 *
 * Server Mode
 * ===========
 * To use this as a server, you generally do this
 *
 * \code
 *    intptr_t s;
 *    intptr_t a;
 *    struct socket_cfg cfg;
 *
 *    SOCKET_init();
 *
 *    memset(&cfg, 0, sizeof(cfg));
 *    cfg.ascp = 's'; // specify server socket
 *    cfg.service = "9999"; // we listen on port 9999
 *    cfg.backlog = 1; // we only 1 connection at a time
 *    cfg.inet_4or6 = 4; // limit to inet4
 *
 *    // Create the socket
 *    s = SOCKET_SERVER_create(&cfg);
 *    if(s == 0){
 *        FATAL_printf("Cannot create server socket\n");
 *    }
 *
 *    // Place socket in the listening state
 *    r = SOCKET_SERVER_listen(s);
 *    if(r < 0){
 *        FATAL_printf("Cannot listen\n");
 *    }
 *
 *    for(;;){
 *        r = SOCKET_SERVER_accept(&a, s, 500);
 *        if(r < 0){
 *            FATAL_printf("Cannot accept\n");
 *            break;
 *        }
 *        if(r == 0){
 *            LOG_printf(LOG_ALWAYS, "No connection within timeout period\n");
 *            continue;
 *        }
 *
 *        // send someting to our new friend
 *        STREAM_printf(a, "Hello..\n");
 *        // wait for response
 *        cp = STREAM_fgets(my_buf, sizeof(my_buf), a);
 *        printf("The client sent: %s\n", cp);
 *        // we could do more, however - this is example doc code
 *
 *        // Disconnect
 *        STREAM_close(a);
 *        SOCKET_ACCEPT_destroy(a);
 *        // Loop for another connection
 *    }
 *
 *    STREAM_close(s);
 *    SOCKET_SERVER_destroy(s);
 * \endcode
 */

#include <stdbool.h>

/*!
 * @struct socket_cfg
 *
 * @brief How a generic simplified socket is configured.
 */
struct socket_cfg {
    /*
     * NOTE: This example implimentation does not impliment any form
     *       of security such as SSL connections.  To add security,
     *       one can add various configuration options to this
     *       structure as needed, then add the appropriate code to
     *       support the form of security desired by the end
     *       application.
     */

    /*! Which protocol to use 4 or 6?
    *  0 - pick randomly any form that works.
    *  4 - pick only inet4 protocol
    *  6 - pick only inet6 protocol
    */
    int        inet_4or6;

    /*! Set ascp to the a letter representing the type of socket
     * - set to 'c' for a client socket
     * - set to 's' for a server socket
     * - set to 'l' for a sever socket in listening state
     * - set to 'a' for an accepted socket (ie: server case)
     * - 'p' is used internally by the implimentation.
     */
    int         ascp;

    /*! For servers, what interface to bind to
     *  For clients what server connect to
     * The underling api uses "man 3 getaddrinfo"
     * SEE: http://linux.die.net/man/3/getaddrinfo
     */
    const char  *host;
    /*! What service (port number) to use
     * Example: foo.service = "80";
     *
     * Per the documentation getaddrinfo() should also accept a service
     * name, ie: 'http' here Names require other infrasructure to be in
     * place on your embedded target. A desktop Linux machine is most
     * likely "fully functional" Embedded: Use numbers, supply the files
     * required to support the name to number operation
     */
    const char  *service;

    /*! Server only, Typically this is exactly 1 (see "man 2 listen") */
    int server_backlog;

    /*! Should the socket be bound to a specific interface, ie: "lo"
     * (loopback) or "eth1" Insert the appropriate name here to bind to a
     * specific interface. Use NULL will bind to all/any devices
     */
    const char  *device_binding;

    /*! What is the connection timeout period */
    int connect_timeout_mSecs;

};

/*
 * @brief Initialize support for sockets.
 *
 * On windows, this calls: WSAStartup()
 * On Linux, nothing is required
 * On embedded platforms .. this performs requried initialization.
 */
void SOCKET_init(void);

/*!
 * @brief Determine what type of IO stream the item is.
 * @param pIO - the io stream to test
 * @return true if this is a socket of sometype
 */
bool STREAM_isSocket(intptr_t h);

/*!
 * @brief Is this socket currently in a connected state
 * @param h - the socket in question.
 * @returns true if in connected (or accepted) state.
 */
bool STREAM_SOCKET_isConnected(intptr_t h);

/*!
 * @brief Create a client socket [that connects to a server]
 * @param cfg - configuration details.
 * @returns 0 on failure, or non-zero handle.
 */
intptr_t SOCKET_CLIENT_create(struct socket_cfg *pCFG);

/*!
 * @brief Connect a socket to a server.
 * @param h - handle from SOCKET_CLIENT_create()
 * @param return 0 on success
 */
int SOCKET_CLIENT_connect(intptr_t h);

/*!
 * @def SOCKET_CLIENT_Destroy
 * @hideinitializer
 * @brief Destroy a client socket.
 */
#define SOCKET_CLIENT_destroy(h)  SOCKET_destroy(h)

/*!
 * @def SOCKET_CLIENT_Destroy
 * @hideinitializer
 * @brief Destroy a client socket.
 */
#define SOCKET_SERVER_destroy(h)  SOCKET_destroy(h)

/*!
 * @def SOCKET_LISTEN_Destroy
 * @hideinitializer
 * @brief Destroy a socket in the listen state
 */
#define SOCKET_LISTEN_destroy(h)  SOCKET_destroy(h)

/*!
 * @def SOCKET_ACCEPT_Destroy
 * @hideinitializer
 * @brief Destroy a socket in the acepted state
 */
#define SOCKET_ACCEPT_destroy(h)  SOCKET_destroy(h)

/*!
 * @brief Genericly destroy any type of socket.
 * @param h - socket handle
 */
void SOCKET_destroy(intptr_t h);

/*!
 * @brief _create a server socket (that can be connected to by a client)
 * @param cfg - configuration details
 * @returns non-zero on sucess.
 */
intptr_t SOCKET_SERVER_create(struct socket_cfg *pCFG);

/*!
 * @brief Place a server socket in the listening state.
 * @param h - handle from SOCKET_SERVER_create()
 * @returns 0 on success, negative on error.
 */
int SOCKET_SERVER_listen(intptr_t h);

/*!
 * @brief Accept connections from clients
 * @param pNewSocket - where to put the new accepted connection
 * @param hListener - listener socket used in SERVER_SOCKET_Listen()
 * @param mSec_Timeout - how long to wait for a connection.
 *
 * @returns 1 upon connection, 0 on timeout, negative on error.
 */
int SOCKET_SERVER_accept(intptr_t *pNewSocket,
                          intptr_t hListener,
                          int mSec_timeout);

/* forward decloration */
struct ini_parser;
/*
 * @brief Handle INI File settings for sockets
 * @param pINI - ini file parse information
 * @param handled - set to true if this settings was handled.
 * @returns negative on error
 *
 * This inside an INI file the following construct:
 *     [socket-N]
 *        type server | client
 *        host     NAME
 *        service  NAME
 *        devicename NAME
 *        serverbacklong NUMBER
 *
 * Where [socket-N] ranges from socket-0 to socket-MAX_SOCKETS
 * and will populate the array ALL_SOCKET_CFG[]
 *
 * The top should be either server or client
 * For a client socket: host & service(port) is where to connect to
 * For a host socket, the service is (port)
 * For both, the devicename is the device to bind to
 * For server only, serverbacklog is a parameter to the accept function.
 *
 */
int SOCKET_INI_settingsNth(struct ini_parser *pINI, bool *handled);

/*
 * @brief building block for SOCKET_INI_settingsNth()
 *
 * This function ignores the section name.
 *
 * @param pINI - ini file parse information
 * @param handled - set to true if this settings was handled.
 * @param pCfg - the configuration to structure to fill in.
 * @returns negative on error
 *
 * Example:
 * \code
 * struct socket_cfg my_cfg;
 *
 * int my_settings(struct ini_parser *pINI, bool *handled)
 * {
 *     // Handle [server] sections
 *     if(!INI_itemMatches(pINI, "server", NULL)){
 *         return (0);
 *     }
 *     return (SOCKET_INI_settingsOne(pINI, handled, &my_cfg));
 * }
 * \endcode
 */
int SOCKET_INI_settingsOne(struct ini_parser *pINI,
                            bool *handled,
                            struct socket_cfg *pCfg);

/*
 * @def INI_MAX_SOCKETS
 * @hideinitializer
 * @brief  number of sockets supported by the built in ini reader.
 */
#define INI_MAX_SOCKETS 10
/* @var ALL_INI_SOCKETS
 * @brief Array of all socket configurations supported by the framework.
 */
extern struct socket_cfg ALL_INI_SOCKETS[ INI_MAX_SOCKETS ];

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
