/******************************************************************************
 @file stream.h

 @brief TIMAC 2.0 API generic byte stream abstraction header

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

#if !defined(STREAM_H)
#define STREAM_H
#include "compiler.h"
/*!
 * OVERVIEW
 * ========
 *
 * If you are familiar with the standard C library functions
 * like fopen(), fclose(), fread(), ... then you know what
 * a stream is.
 *
 * One key difference is these functions include timeout
 * parameters, where as the standard library functions
 * do not support timeout parameters
 *
 * STREAM is an abstraction that includes both files and
 * UART interfaces, socket interfaces, memory buffers
 * SPI and I2C interfaces
 *
 */
#include <stdio.h>
#include <stddef.h>
#include <stdint.h>
#include <stdbool.h>

/*!
 * @var STREAM_stdout
 * @brief simular to "FILE *stdout"
 */
extern intptr_t STREAM_stdout;
/*!
 * @var STREAM_stderr
 * @brief simular to "FILE *stderr"
 */
extern intptr_t STREAM_stderr;
/*!
 * @var _STREAM_stdin - see STREAM_stdin
 */
extern intptr_t STREAM_stdin;
/*!
 * @var _STREAM_debug - The DEBUG functions use this stream.
 * Generally, it should be the same value as one of stdio clones.
 * By default, it is exactly
 */
extern intptr_t STREAM_debug_stdin;
extern intptr_t STREAM_debug_stdout;

/*!
 * @brief Initialize the the stream module.
 */
void STREAM_init(void);

/*!
 * @brief clear any errors in this stream
 * @param h - the io stream
 */
void STREAM_clearErrors(intptr_t h);

/*!
 * @brief Determine if this stream is in error or not
 * @param h - stream
 * @returns true if in error
 */
bool STREAM_isError(intptr_t h);

/*!
 * @brief get the type name of a stream for debug print purposes.
 *
 * @param the io stream in question
 *
 * @return a printable string.
 *
 * Example, a UART stream returns "uart"
 * This is a constant string that does not need
 * to be released after use.
 */
const char *STREAM_getTypeName(intptr_t h);

/*!
 * @brief Initialize the FILE (stdio) streams
 */
void STREAM_FILE_init(void);

/*!
 * @brief Get the size (in bytes) of a file in the filesystem
 * @param filename
 *
 * @returns negative if file does not exist
 */
int64_t STREAM_FS_getSize(const char *filename);

/*!
 * @brief Determine if a file exists or not
 * @param filename - name to test
 */
bool STREAM_FS_fileExists(const char *filename);

/*!
 * @brief create (open) a writeable stream specified by filename
 *
 * @param filename - the filename to open in write mode.
 *
 * @return non-zero intptr_t success
 */
intptr_t STREAM_createWrFile(const char *filename);

/*!
 * @brief create (open) a readable stream specified by filename
 *
 * @param filename - the filename to open in read mode.
 *
 * @return non-zero intptr_t success
 */
intptr_t STREAM_createRdFile(const char *filename  );

/*!
 * @brief create FILES stream based on a FILE* pointer
 *
 * @param filename - the FILE * pointer to use to access this file
 *
 * @return non-zero intptr_t success
 */
intptr_t STREAM_createFpFile(FILE *fp);

/*
 * @brief If stream is FILE, using an FP, return the FP, otherwise null
 * @returns FILE, or NULL pointer
 */
FILE *STREAM_getFp(intptr_t h);

/*!
 * @brief is this a file stream?
 *
 * @param h - the io stream to test
 *
 * @return non-zero intptr_t success
 */
bool STREAM_isFile(intptr_t h);

/*
 * @brief Create a stream based on this (long) ascii string.
 *
 * @param str - the string to use as the buffer.
 * @return non-zero intptr_t success
 *
 * The resulting stream is read only and will aways error when a write
 * is attempted.
 *
 * This is useful when you have an embedded string you want to make
 * look like a stream of some sort (ie: test cases, unit test etc)
 */

intptr_t STREAM_stringCreate(const char *str);

/*!
 * @brief Create a stream based on this (long) ascii string.
 *
 * @param pBytes - pointer to the byte buffer to use
 * @param nbytes - size in bytes of the byte buffer
 * @returns non-zero intptr_t on success
 *
 * This resulting buffer can be read or written.
 */
intptr_t STREAM_memCreate(void *pBytes, size_t nbytes);

/*!
 * @brief Write bytes to the stream
 * @param h - the stream
 * @param databytes - bytes to write
 * @param nbytes - count to write
 * @param timeout_mSecs timeout
 * @returns negative error, 0..actual upon success
 */
int STREAM_wrBytes(intptr_t h, const void *databytes, size_t nbytes, int timeout_mSecs);

/*!
 * @brief Read bytes from the stream
 * @param h - the stream
 * @param databytes - buffer for bytes read
 * @param nbytes - count to read
 * @param timeout_mSecs timeout
 * @returns negative error, 0..actual upon success
 */
int STREAM_rdBytes(intptr_t h, void *databytes, size_t nbytes, int timeout_mSecs);

/*!
 * @brief Determine if bytes are available to be read from the stream.
 * @param h - the stream
 * @returns negative on error, 0 not readable, positive number if readable
 *
 */
int STREAM_rxAvail(intptr_t h, int mSecs_timeout);

/*!
 * @brief Close the stream
 * @param h - the stream
 *
 * In most cases, this deallocates the underlying resources.
 * However this is not always true (specifically: sockets are different)
 */
void STREAM_close(intptr_t h);

/*!
 * @brief Flush (blocking) all outgoing bytes to the device
 * @param h - the stream
 * @returns 0 on success, negative on error
 */
int STREAM_flush(intptr_t h);

/*!
 * @brief emulate stdio fputc()
 * @param c - byte to write
 * @param h - the io stream
 * @returns negative on error, or the byte value cast as an unsigned char.
 *
 * Note: This purposely has the same parameter order as fputc()
 */
int STREAM_fputc(int c, intptr_t h);

/*!
 * @brief emulate stdio fgetc()
 * @param h - the io stream
 * @returns negative on error, or the byte value cast as an unsigned char.
 *
 * Note: This purposely has the same parameter order as fgetc()
 */
int STREAM_fgetc(intptr_t h);

/*!
 * @brief emulate stdio ungetc()
 * @param h - the io stream
 * @param c - the byte being ungot
 * @returns negative on error, or the byte value cast as an unsigned char.
 *
 * Note: This purposely has the same parameter order as fgetc()
 */
int STREAM_ungetc(int c, intptr_t h);

/*!
 * @brief Simple printf() access to the io stream
 * @param h - the io stream
 * @param fmt - the printf format string, followed by parameters
 * @returns negative on error, do not trust positivie values
 *
 * This function has an internal 'hard coded' buffer that the text
 * is written into (size about N bytes) thus any single printf
 * operation that results in a text out put of more then N bytes
 * will be truncated.
 *
 * The value of N is platform specific, on Linux it is currently 1024
 * but may change in the future.
 */

int STREAM_printf(intptr_t h, _Printf_format_string_ const char *fmt, ...)
    __attribute__((format (printf,2,3)));;

/*!
 * @brief Building block for STREAM_printf()
 * @param fmt - printf format string
 * @ap - format parameters in the stdarg fashion
 * @returns the number of bytes written
 *
 * Note: See STREAM_printf() for discussion reguarding the internal
 * buffer that is used and the possiblity of this buffer overflowing
 * and your output being truncated.
 */
int STREAM_vprintf(intptr_t h, const char *fmt, va_list ap);

/*!
 * @brief emulate fgets() from stream
 * @param buf - the buffer for the string
 * @param bufsiz - the size of the buffer
 * @param h - the io stream
 * @returns NULL upon error, or the value of buf upon success
 *
 * This function purposely has the same parameter order as fgets()
 *
 * Unlike fgets(), this function guarantees a null terminated string
 * will always be returned to the caller.
 */
char *STREAM_fgets(char *buf, int bufsize, intptr_t h);

/*!
 * @brief emulate fputs() to a stream
 * @param s - the string to write
 * @param h - the stream
 * @returns negative on error, success: 0 or a postive number
 *
 * Note: this function purposely has the same parameter order
 * as the standard library function
 */
int STREAM_fputs(const char *s, intptr_t h);

/*!
 * @brief Throw away all incoming data (flush)
 * @param h - the stream
 */

void STREAM_rdDump(intptr_t h, int timeout_mSecs);

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

