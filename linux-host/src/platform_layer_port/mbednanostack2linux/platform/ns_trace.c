/******************************************************************************

 @file  ns_trace.c

 @brief Provides ns_trace module functions

 Group: WCS, LPC
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

#include <semaphore.h>

#include "ns_trace.h"

#include <stdint.h>

#include <stdio.h>
#include <stdbool.h>
#include <string.h>
#include <stdarg.h>

#include "ip6string.h"

// Linux only to get our thread IDs
#define _GNU_SOURCE
#include <unistd.h>
#include <sys/syscall.h>

#define VT100_COLOR_ERROR "\x1b[31m"
#define VT100_COLOR_WARN  "\x1b[33m"
#define VT100_COLOR_INFO  "\x1b[39m"
#define VT100_COLOR_DEBUG "\x1b[90m"
#define VT100_COLOR_DEMO  "\x1b[39m"
#define VT100_RESET_TERM  "\x1b[0m\n\r"

#define DEFAULT_TRACE_TMP_LINE_LEN  128

typedef enum
{
    ITM_9600 = 9600,
    ITM_57600 = 57600,
    ITM_115200 = 115200,
    ITM_230400 = 230400,
    ITM_460800 = 460800,
    ITM_500000 = 500000,
    ITM_576000 = 576000,
    ITM_921600 = 921600,
    ITM_1000000 = 1000000,
    ITM_1152000 = 1152000,
    ITM_1500000 = 1500000,
    ITM_2000000 = 2000000,
    ITM_2500000 = 2500000,
    ITM_3000000 = 3000000,
    ITM_3500000 = 3500000,
    ITM_4000000 = 4000000,
    ITM_6000000 = 6000000
} ITM_baudrate;


typedef struct _ITM_config_
{
    uint_fast32_t systemClock;
    ITM_baudrate  baudRate;
} ITM_config;


typedef enum
{
    ITM_TS_DIV_NONE = 0,
    ITM_TS_DIV_4 = 1,
    ITM_TS_DIV_16 = 2,
    ITM_TS_DIV_64 = 3
} ITM_tsPrescale;

typedef enum
{
    ITM_SYNC_NONE = 0,
    ITM_SYNC_16M_CYCLES = 1,
    ITM_SYNC_64M_CYCLES = 2,
    ITM_SYNC_256M_CYCLES = 3
} ITM_syncPacketRate;

char tmpStr[DEFAULT_TRACE_TMP_LINE_LEN];

static sem_t ns_trace_mutex_handle;
char ns_buf[256];

void ns_trace_init(void)
{
    int retc;

    retc = sem_init(&ns_trace_mutex_handle, 0, 1);
    if (retc != 0) {
        while (1);
    }

   
    ns_enable_module();

}

void ns_trace_printf(uint8_t dlevel, const char *grp, const char *fmt, ...)
{
    va_list ap;
    va_start(ap, fmt);
    ns_trace_vprintf(dlevel, grp, fmt, ap);
    va_end(ap);
}

void ns_trace_vprintf(uint8_t dlevel, const char *grp, const char *fmt, va_list ap)
{
    sem_wait(&ns_trace_mutex_handle);
    int len_written = 0, total_len =0, remaining_len;
    char *pBuf;

    pBuf = ns_buf;

    switch (dlevel) {
        case (TRACE_LEVEL_ERROR):
            len_written = snprintf(ns_buf, sizeof(ns_buf), "%s[Thread ID:%ld][ERR ][%-4s]: ", VT100_COLOR_ERROR, syscall(SYS_gettid), grp);
            break;
        case (TRACE_LEVEL_WARN):
            len_written = snprintf(ns_buf, sizeof(ns_buf), "%s[Thread ID:%ld][WARN][%-4s]: ", VT100_COLOR_WARN, syscall(SYS_gettid), grp);
            break;
        case (TRACE_LEVEL_INFO):
            len_written = snprintf(ns_buf, sizeof(ns_buf), "%s[Thread ID:%ld][INFO][%-4s]: ", VT100_COLOR_INFO, syscall(SYS_gettid), grp);
            break;
        case (TRACE_LEVEL_DEBUG):
            len_written = snprintf(ns_buf, sizeof(ns_buf), "%s[Thread ID:%ld][DBG ][%-4s]: ", VT100_COLOR_DEBUG, syscall(SYS_gettid), grp);
            break;
        default:
            len_written = snprintf(ns_buf, sizeof(ns_buf), "%s[Thread ID:%ld][    ][%-4s]: ", VT100_COLOR_DEBUG, syscall(SYS_gettid), grp);
            break;
    }
    total_len += len_written;
    remaining_len = sizeof(ns_buf) - total_len;

    // update the buf position
    pBuf += len_written;
    len_written = vsnprintf(pBuf, remaining_len, fmt, ap);
    if (len_written > (remaining_len - sizeof(VT100_RESET_TERM)))
    {
        len_written = remaining_len - sizeof(VT100_RESET_TERM);
    }

    total_len += len_written;
    remaining_len = sizeof(ns_buf) - total_len;

    // update the buf position
    pBuf += len_written;
    len_written = snprintf(pBuf, remaining_len, VT100_RESET_TERM);

    total_len += len_written;
    remaining_len = sizeof(ns_buf) - total_len;

    // update the buf position
    pBuf += len_written;

    //print buffer to stdout for now
    printf("%s", ns_buf);
    // for(int x = 0; x < total_len; x++)
    // {
    //     ns_put_char_blocking(ns_buf[x]);
    // }
    sem_post(&ns_trace_mutex_handle);
}

void ns_enable_module(void)
{
}

void ns_disable_module(void)
{
}

void ns_put_char_blocking(const char ch)
{
    // output char to stdout for now
    printf("%c", ch);
}

void ns_enable_exception_trace(void)
{
}

void ns_enable_ps_sampling(void)
{
}

bool ns_enable_data_trace(const uint32_t *variable)
{
    return true;
}

void ns_enable_cycle_counter(void)
{
}

void ns_enable_timing(ITM_tsPrescale tsPrescale)
{
}

void ns_enable_sync_packets(ITM_syncPacketRate syncPacketRate)
{
}

void ns_flush_module(void)
{
}

char *ns_trace_ipv6(const void *addr_ptr)
{
    if (addr_ptr == NULL) {
        return "<null>";
    }
    tmpStr[0] = 0;
    ip6tos(addr_ptr, tmpStr);
    return tmpStr;
}

char *ns_trace_ipv6_prefix(const uint8_t *prefix, uint8_t prefix_len)
{
    if ((prefix_len != 0 && prefix == NULL) || prefix_len > 128) {
        return "<err>";
    }

    ip6_prefix_tos(prefix, prefix_len, tmpStr);

    return tmpStr;
}

char *ns_trace_array(const uint8_t *buf, uint16_t len)
{
    int i;
    if (len == 0) {
        return "";
    }
    if (buf == NULL) {
        return "<null>";
    }

    const uint8_t *ptr = buf;
    char *pOutput = tmpStr;
    // zero tmpbuf to Null
    memset (pOutput, 0x0,DEFAULT_TRACE_TMP_LINE_LEN);

    char overflow = 0;
    for (i = 0; i < len; i++) {
        int retval = snprintf(pOutput, DEFAULT_TRACE_TMP_LINE_LEN, "%02x:", *ptr++);
        if (retval <= 0 || retval > DEFAULT_TRACE_TMP_LINE_LEN) {
            overflow = 1;
            break;
        }
        // move pOutput to next position
        pOutput += retval;

    }

    if (overflow) {
        // replace last character as 'star',
        // which indicate buffer len is not enough
        tmpStr[DEFAULT_TRACE_TMP_LINE_LEN - 1] = '*';
    } else {
        //null to replace last ':' character
        tmpStr[DEFAULT_TRACE_TMP_LINE_LEN - 1] = 0;
    }

    return tmpStr;
}

char *ns_trace_array16(const uint16_t *buf, uint16_t len)
{
    int i;
    if (len == 0) {
        return "";
    }
    if (buf == NULL) {
        return "<null>";
    }

    const uint16_t *ptr = buf;
    char *pOutput = tmpStr;
    // zero tmpbuf to Null
    memset (pOutput, 0x0,DEFAULT_TRACE_TMP_LINE_LEN);

    char overflow = 0;
    for (i = 0; i < len; i++) {
        int retval = snprintf(pOutput, DEFAULT_TRACE_TMP_LINE_LEN, "%04x: ", *ptr++);
        if (retval <= 0 || retval > DEFAULT_TRACE_TMP_LINE_LEN) {
            overflow = 1;
            break;
        }
        // move pOutput to next position
        pOutput += retval;

    }

    if (overflow) {
        // replace last character as 'star',
        // which indicate buffer len is not enough
        tmpStr[DEFAULT_TRACE_TMP_LINE_LEN - 1] = '*';
    } else {
        //null to replace last ':' character
        tmpStr[DEFAULT_TRACE_TMP_LINE_LEN - 1] = 0;
    }

    return tmpStr;

}
