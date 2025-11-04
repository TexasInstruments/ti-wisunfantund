/******************************************************************************
 @file stream_uart.h

 @brief TIMAC 2.0 API Header for streams that are uarts

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

#if !defined(STREAM_UART_H)
#define STREAM_UART_H

#include "bitsnbits.h"
#include "stdint.h"

/*!
 * @struct uart_cfg
 */
struct uart_cfg {
    /*! device name, linux example: "/dev/ttyUSB0" */
    const char *devname;

    /*! Example: cfg.baudrate = 115200 */
    int baudrate;

    /*! See STREAM_UART_FLAG_xxxx below */
    int open_flags;

};

/*! Use a linux thread to read this device into a fifo */
#define STREAM_UART_FLAG_rd_thread    _bit0
/*! use hardware handshake */
#define STREAM_UART_FLAG_hw_handshake _bit1
/*! Basic IO, no thread no nothing blocking IO */
#define STREAM_UART_FLAG_default     0

/*!
 * @brief Create a stream that is UART based
 *
 * @param pCFG - the uart configuration to use.
 *
 * @returns non-zero on success
 */
intptr_t STREAM_createUart(const struct uart_cfg *pCFG);

/*!
 * @brief Test if this stream is a uart or not
 * @param h - the io stream to test
 * @returns true if io stream is a uart.
 */
bool STREAM_isUart(intptr_t h);

/* forward decloration */
struct ini_parser;

/*
 * @brief Handle INI File settings for a uart.
 * @param pINI - ini file parse information
 * @param handled - set to true if this settings was handled.
 * @returns negative on error
 *
 * This parses a UART configuration like this:
 *     [uart-N]
 *        devname /some/name
 *        baudrate VALUE
 *        hw_handshake bool
 *        flag name
 *        flag name .. [flags can be repeated]
 *
 * Where [uart-N] ranges from uart-0 to uart-MAX_UARTS
 * and will populate the array ALL_UART_CFGS[]
 */
int UART_INI_settingsNth(struct ini_parser *pINI, bool *handled);

/*
 * @brief building block for UART_INI_settingsNth()
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
 * struct stream_cfg my_cfg;
 *
 * int my_settings(struct ini_parser *pINI, bool *handled)
 * {
 *     // Handle [server] sections
 *     if(!INI_itemMatches(pINI, "server", NULL)){
 *         return 0;
 *     }
 *     return SOCKET_INI_settingsOne(pINI, handled, &my_cfg);
 * }
 * \endcode
 */
int UART_INI_settingsOne(struct ini_parser *pINI,
                          bool *handled,
                          struct uart_cfg *pCfg);

/*
 * @def INI_MAX_UARTS
 * @hideinitializer
 * @brief  number of uarts supported by the built in ini reader.
 */
#define INI_MAX_UARTS 10

/* @var ALL_INI_UARTS
 * @brief Array of all uarts supported by the INI file
 */
extern struct uart_cfg ALL_INI_UARTS[INI_MAX_UARTS];

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
