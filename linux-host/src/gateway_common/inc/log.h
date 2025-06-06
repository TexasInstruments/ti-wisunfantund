/******************************************************************************
 @file log.h

 @brief TIMAC 2.0 API generic log to file or stream

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

#if !defined(LOG_H)
#define LOG_H

/*!
 * @file log.h
 *
 * @brief This handles all logging by the app
 */
#include <stdint.h>
#include <stddef.h>
#include <stdbool.h>
#include <stdarg.h>
#include "compiler.h"
#include "bitsnbits.h"
#include "ini_file.h"

typedef int64_t logflags_t;

/* @struct LOG_cfg
 *
 * @brief Log configuration.
 */
struct LOG_cfg {
    /*! typically a file or /dev/stderr */
    intptr_t log_stream;

    /*! the filename we are logging to */
    const char *filename;

    /*! what are we logging, see LOG_ALWAYS, or LOG_DBG_various, or others
     *
     * See LOG_test() for a description of how log flags work.
     */
    logflags_t log_flags;

    /*! True if the log output should be sent to both a file and stderr */
    bool dup_to_stderr;
};

/*
 * @def BUG_HERE
 * @hideinitializer
 *
 * Prints a debug message when a bug is discovered.
 */
// #define BUG_HERE(...)  \
//     LOG_bug_here(__FILE__, __func__, __LINE__, __VA_ARGS__)

#define BUG_HERE(...)

/*
 * @brief See macro: BUG_HERE(), Log a bug message, because something is wrong
 * @param file_name - filename, typically  __FILE__
 * @param func_name - function name, typically: from __func__
 * @param lineno - line number, typically from __line__
 * @param fmt - printf() format parameter
 *
 */
void LOG_bug_here(const char *file_name,
                   const char *func_name,
                   int lineno,
                   const char *fmt, ...);

/*
 * @var LOG_cfg
 * @brief log configuration so you can modify the 'log_flags' on the fly.
 */
extern struct LOG_cfg log_cfg;

/*!
 * @brief Determine if this "why" reason indicates we should log.
 *
 * @returns true if the log should occur or not.
 */
bool LOG_test(logflags_t whybits);

/*!
 * @brief Setup the log, default is: /dev/stderr
 */
void LOG_init(const char *filename);

/*!
 * @brief printf() a message to the log or not, via why bit or not
 *
 * @param whybits - Reason for log
 * @param fmt     - printf formatter.
 *
 * Internally, this uses LOG_Test() to determine if it should/ log or not.
 */
void LOG_printf(logflags_t whybits,
                 _Printf_format_string_ const char *fmt, ...)
    __attribute__((format (printf,2,3)));

/*!
 * @brief print a log message, the unix errno an translated error message
 *
 * In this form:
 *
 * \code
 *     LOG_printf(LOG_ERROR "%s: (%d) %s\n", msg, errno, strerror(errno));
 * \endcode
 */
void LOG_perror(const char *msg);

/*!
 * @brief print two log messages, the unix errno an translated error message
 *
 * In this form:
 *
 * \codes
 *     LOG_printf(LOG_ERROR,
 *                 "%s: %s (%d) %s\n",
 *                 msg1, msg2, errno,
 *                 strerror(errno));
 * \endcode
 */
void LOG_perror2(const char *msg1, const char *msg2);

/*!
 * @brief Building block for LOG_printf()
 *
 * @param whybits - reason for log
 * @param fmt - printf format
 * @param ap - vararg list of paramters for fmt
 */
void LOG_vprintf(logflags_t whybits, const char *fmt, va_list ap);

/*!
 * @brief Hexdump data to the log
 *
 * @param whybits - Parameter for LOG_test()
 * @param addr - address to print in hex dump
 * @param pBytes - data to print
 * @param nbytes - number of bytes to print
 *
 * @alsosee HEXLINE_Init() and HEXLINE_Format()
 */
void LOG_hexdump(logflags_t whybits,
                 uint64_t addr,
                 const void *pBytes,
                 size_t nbytes);

/*
 * @brief Lock the log output over the course of several LOG_printf() messages
 *
 * Also see: LOG_UnLock()
 */
void LOG_lock(void);

/*
 * @brief Unlock (after lockign) the log output
 *
 * Also see: LOG_Lock()
 */
void LOG_unLock(void);

/*!
 * @brief close the log file
 *
 */
void LOG_close(void);

#define LOG_ALWAYS 0         /*! override and log this */
/* All DBG items should be specific bits! */

#define LOG_FATAL             _bit0
#define LOG_ERROR             _bit1
#define LOG_WARN              _bit2
#define LOG_DBG_MUTEX         _bit3   /*! mutex debug messages enabled */
#define LOG_DBG_THREAD        _bit4   /*! thread debug messages enabled */
#define LOG_DBG_FIFO          _bit5   /*! fifo   debug messages enabled */
#define LOG_DBG_UART          _bit6   /*! uart   debug messages enabled */
#define LOG_DBG_UART_RAW      _bit7   /*! uart   debug (raw rd/wr bytes)*/
#define LOG_DBG_SLEEP         _bit8   /*! sleep  debug messages enabled */
#define LOG_DBG_SOCKET        _bit9   /*! socket debug messages enabled */
#define LOG_DBG_SOCKET_RAW    _bit9   /*! socket debug messages enabled */
#define LOG_DBG_COLLECTOR     _bit10  /*! Collector debug messages enabled */
#define LOG_DBG_COLLECTOR_RAW _bit11  /*! Collector raw data debug messages enabled */

/* Bit ranges */
#define LOG_DBG_NV_bitnum_first 12
#define LOG_DBG_NV_bitnum_last  15

/* Bit ranges */
#define LOG_DBG_MT_bitnum_first 16
#define LOG_DBG_MT_bitnum_last  23

#define LOG_DBG_API_MAC_bitnum_first 24
#define LOG_DBG_API_MAC_bitnum_last  27

/* Apps can use bit 32 ... and above */
#define LOG_DBG_APP_bitnum_first  32
#define LOG_DBG_APP_bitnum_last   62 /* Because the flags are *SIGNED* cannot use 63 */

/* if log_cfg.log_flags == EVERYTHING */
/*    Then everything is logged */
#define LOG_EVERYTHING -1 /*! used in log_cfg.log_flags Log everything */
#define LOG_NOTHING    -2 /*! do not log anything */

/* forward decloration (see: ini_file.h) */
struct ini_parser;

/*
 * @brief Handle INI File settings for logs
 * @param pINI - ini file parse information
 * @param handled - set to true if this settings was handled.
 * @returns negative if error
 *
 * This inside an INI file the following construct:
 *     [log]
 *        filename FILENAME
 *        flags    NUMBER or NAMES
 *
 * This specifies where the log will be written.
 * By default, there is no log.
 * FLAGS can be a number, or a series of names.
 * The work flags may be repeated multiple times
 * The flags are effectivly cumlative.
 */

int LOG_INI_settings(struct ini_parser *pINI, bool *handled);

/* forward decloration */
struct ini_flag_name;

/*
 * @var log_flag_names
 * @brief list of appl log flag names, see LOG_INI_Settings() for more details.
 *
 * (this is a constant array, of pointers to constant structures)
 *
 * Note this array ends with a null pointer.
 * Each sub-array, ends with (pFlag->name == NULL)
 */
extern const struct ini_flag_name * const log_flag_names[];
/* @var log_builtin_flag_names
 * @brief Built in log names for various modules, see LOG_INI_Settings()
 */
extern const struct ini_flag_name log_builtin_flag_names[];
extern const struct ini_flag_name mt_msg_log_flags[];
extern const struct ini_flag_name nv_log_flags[];
extern const struct ini_flag_name api_mac_log_flags[];

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
