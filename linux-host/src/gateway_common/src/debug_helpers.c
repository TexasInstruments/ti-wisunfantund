/******************************************************************************
 @file debug_helpers.c

 @brief TIMAC 2.0 API helper/debug functions.

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
#include <stdlib.h>
#include <string.h>
#include "stream.h"
#include "limits.h"
#include "log.h"
#include "timer.h"
#include "debug_helpers.h"
#include "hlos_specific.h"

intptr_t debug_thread_id;

void DEBUG_beep(void)
{
    DEBUG_printf("[BEEP]");
    _DEBUG_beep();
    TIMER_sleep(50); /* make it readable! */
    DEBUG_printf("\b\b\b\b\b\b      \b\b\b\b\b\b");
    STREAM_flush(STREAM_debug_stdout);
}

void DEBUG_printf(const char *fmt, ...)
{
    va_list ap;
    va_start(ap, fmt);
    DEBUG_vprintf(fmt, ap);
    va_end(ap);
}

void DEBUG_vprintf(const char *fmt, va_list ap)
{
    STREAM_vprintf(STREAM_debug_stdout, fmt, ap);
    STREAM_flush(STREAM_debug_stdout);
}

int DEBUG_getkey_waitforever(void)
{
    STREAM_flush(STREAM_debug_stdout);
    return (DEBUG_getkey(-1));
}

int DEBUG_get_string(char *str, size_t len)
{
    struct debug_getstr_info gsi;

    memset(&(gsi), 0, sizeof(gsi));

    gsi.buf = str;
    gsi.callnum = 0;
    gsi.buflen = len;
    gsi.defaultvalue = NULL;

    return (DEBUG_get_string2(&gsi));
}

int DEBUG_get_string2(struct debug_getstr_info *pGsi)
{
    int c;
    size_t n;
    size_t x;

    /* turn echo off on console */
    _DEBUG_echo_off();

    /* handle dumb case */
    if(pGsi->buflen == 0)
    {
        return (0);
    }

    if(pGsi->callnum == 0)
    {
        /* do not do this again */
        pGsi->callnum = 1;
        if(pGsi->prompt)
        {
            DEBUG_printf("%s: ", pGsi->prompt);
        }

        if(pGsi->defaultvalue)
        {
            strcpy(pGsi->buf, pGsi->defaultvalue);
        }
        else
        {
            pGsi->buf[0] = 0;
        }
        DEBUG_printf("%s", pGsi->buf);
    }

    for(;;)
    {
        c = DEBUG_getkey_waitforever();
        if(c < 0)
        {
            //LOG_printf(LOG_ERROR, "Debug interface is dead\n");
            return (-1);
        }
        /*printf("You pressed: 0x%04x\n", c); */
        n = strlen(pGsi->buf);
        if((c >= 0x20) && (c < 0x7f))
        {
            /* Leave room for null */
            if((n + 2) >= pGsi->buflen)
            {
                DEBUG_beep();
            }
            else
            {
                pGsi->buf[n + 0] = ((char)c);
                pGsi->buf[n + 1] = 0;
                DEBUG_printf("%c", c);
            }
            continue;
        }

        /* handle funky chars */
        switch (c)
        {
        default:
            /* FUTURE: */
            /* Add UP/DN and history... */
            DEBUG_beep();
            break;
        case 0x0d: /* CR (windows uses this) */
        case 0x0a: /* LF (linux uses this) */
            if(pGsi->no_nl)
            {
                /* do not print the newline */
            }
            else
            {
                DEBUG_printf("\n"); /* respond to the user */
            }
            //LOG_printf(LOG_ALWAYS,"DEBUG: %s: %s\n",
                    //    pGsi->prompt ? pGsi->prompt : "(getstr-noprompt)" ,
                    //    pGsi->buf);
            return (0);
            break;
        case 0x1b: /* escape */
            if(n == 0)
            {
                DEBUG_beep();
            }
            else
            {
                for(x = 0; x < n; x++)
                {
                    DEBUG_printf("\b");
                }
                for(x = 0; x < n; x++)
                {
                    DEBUG_printf(" ");
                }
                for(x = 0; x < n; x++)
                {
                    DEBUG_printf("\b");
                }
                pGsi->buf[0] = 0;
            }
            break;
        case DEBUG_KEY_l_arrow:
        case 0x08: /* backspace */
        case 0x7f: /* delete */
            if(n == 0)
            {
                DEBUG_beep();
            }
            else
            {
                n--;
                pGsi->buf[n] = 0;
                DEBUG_printf("\b \b");
            }
            break;
        }
    }
}

int DEBUG_getnum(struct debug_getnum_info *pGni)
{
    int r;

    struct debug_getstr_info gsi;
    char *ep;
    char iobuf[50];

    memset((void *)&gsi, 0, sizeof(gsi));
    gsi.prompt = pGni->prompt;
    gsi.buf = iobuf;
    gsi.buflen = sizeof(iobuf);
    gsi.no_nl = true;

    if(pGni->default_value)
    {
        if(pGni->is_base16)
        {
            (void)snprintf(iobuf,
                           sizeof(iobuf),
                           "0x%llx",
                           (unsigned long long)(pGni->sv));
        }
        else if(pGni->is_signed)
        {
            (void)snprintf(iobuf,
                           sizeof(iobuf),
                           "%lld",
                           (long long)(pGni->sv));
        }
        else
        {
            (void)snprintf(iobuf,
                           sizeof(iobuf),
                           "%llu",
                           (unsigned long long)(pGni->uv));
        }
        gsi.defaultvalue = iobuf;
    }

    for(;;)
    {
        r = DEBUG_get_string2(&gsi);
        /* garentee zero termination */
        gsi.buf[gsi.buflen-1] = 0;
        if(r < 0)
        {
            return (r);
        }
        if(pGni->is_signed)
        {
            pGni->sv = strtoll(gsi.buf, &ep, 0);
            pGni->uv = (uint64_t)(pGni->sv);
        }
        else
        {
            pGni->uv = strtoull(gsi.buf, &ep, 0);
            pGni->sv = (uint64_t)(pGni->sv);
        }

        /* accept many spaces after the number, but spaces only.. */
        if(ep != iobuf)
        {
            while(*ep == ' ')
            {
                ep++;
            }
        }
        if((ep == gsi.buf) || (*ep != 0))
        {
            DEBUG_beep();
            continue;
        }
        else
        {
            DEBUG_printf("\n");
            return (0);
        }
    }
}

int  DEBUG_get_integer2(const char *prompt, int *value, int default_value)
{
    int r;
    struct debug_getnum_info gni;

    memset((void *)(&(gni)), 0, sizeof(gni));
    gni.prompt = prompt;
    gni.default_value = true;
    gni.sv = default_value;
    gni.uv = default_value;
    gni.is_signed = true;
    gni.nbits = sizeof(*value) * 8;
    gni.is_base16 = false;

    r = DEBUG_getnum(&gni);

    *value = (int)(gni.sv);
    return (r);
}

int  DEBUG_get_integer(int *value)
{
    int r;
    struct debug_getnum_info gni;

    memset((void *)(&(gni)), 0, sizeof(gni));
    gni.is_signed = true;
    gni.nbits = sizeof(*value) * 8;
    gni.is_base16 = false;

    r = DEBUG_getnum(&gni);

    *value = (int)(gni.sv);
    return (r);
}

int  DEBUG_get_int64(int64_t *value)
{
    int r;
    struct debug_getnum_info gni;

    memset((void *)(&(gni)), 0, sizeof(gni));
    gni.is_signed = true;
    gni.is_base16 = false;
    gni.nbits = sizeof(*value) * 8;

    r = DEBUG_getnum(&gni);

    *value = (int64_t)gni.sv;
    return (r);
}

int  DEBUG_get_uint64(uint64_t *value)
{
    int r;
    struct debug_getnum_info gni;

    memset((void *)(&(gni)), 0, sizeof(gni));
    gni.is_signed = false;
    gni.is_base16 = false;
    gni.nbits = sizeof(*value) * 8;

    r = DEBUG_getnum(&gni);

    *value = (int64_t)gni.uv;
    return (r);
}

static int debug_key_ungetc;

bool DEBUG_kbhit(void)
{
    int r;
    if(debug_key_ungetc)
    {
        return (true);
    }

    r = _DEBUG_getkey();
    if(r != EOF)
    {
        DEBUG_ungetkey(r);
    }

    if(r == EOF)
    {
        return (false);
    }
    else
    {
        return (true);
    }
}

void DEBUG_ungetkey(int key)
{
    debug_key_ungetc = key;
}

int DEBUG_getkey(int timeout)
{
    timertoken_t tstart;
    int r;

    if(debug_key_ungetc)
    {
        r = debug_key_ungetc;
        debug_key_ungetc = 0;
        return (r);
    }

    if(timeout < 0)
    {
        for(;;)
        {
            r = _DEBUG_getkey();
            if(r != EOF)
            {
                return (r);
            }
            /* Do not thrash the machine! */
            /* this is a human typing.. */
            TIMER_sleep(50);
        }
    }

    if(timeout == 0)
    {
        if(!DEBUG_kbhit())
        {
            return (EOF);
        }
        else
        {
            return (DEBUG_getkey(0));
        }
    }

    tstart = TIMER_timeoutStart();

    for(;;)
    {
        if(DEBUG_kbhit())
        {
            return (DEBUG_getkey(0));
        }
        else
        {
            TIMER_sleep(50);
        }
        if(TIMER_timeoutIsExpired(tstart, timeout))
        {
            return (EOF);
        }
    }
}

void DEBUG_menu(const struct debug_menu_item *pMenu, intptr_t extra_cookie)
{
    int x;
    int l;

    for(;;)
    {
        LOG_lock();
        DEBUG_printf("\n");
        for(x = 0; pMenu[x].txt; x++)
        {
            /* allow for blank lines in the menu. */
            if(pMenu[x].handler)
            {
                DEBUG_printf("%2d) %s\n", x + 1, pMenu[x].txt);
               // //LOG_printf(LOG_ALWAYS, "DEBUG: %2d) %s\n", x + 1, pMenu[x].txt);
                continue;
            }
            /* this is informational not a selectable item. */
            DEBUG_printf("    %s\n", pMenu[x].txt);
            ////LOG_printf(LOG_ALWAYS, "    %s\n", pMenu[x].txt);
        }
        /* we have this many items */
        l = x;

        DEBUG_printf("Enter Selection: (0=exit) ");
        LOG_unLock();
        DEBUG_get_integer(&x);
        if(x == 0)
        {
            return;
        }
        //LOG_printf(LOG_ALWAYS, "Enter Selection: (0=exit) %d\n", x);

        x--;
        if((x >= 0) && (x < l))
        {
            if(pMenu[x].handler == NULL)
            {
                DEBUG_printf("Invalid selection: %d\n", x + 1);
                //LOG_printf(LOG_ALWAYS, "Invalid selection: %d\n", x + 1);
            }
            else
            {
                //LOG_printf(LOG_ALWAYS, "Selected: %s\n", pMenu[x].txt);
                (*(pMenu[x].handler))(pMenu + x, extra_cookie);
            }
        }
    }
}

void DEBUG_submenu(const struct debug_menu_item *pMI, intptr_t extracookie)
{
    DEBUG_menu((const struct debug_menu_item *)(pMI->cookie), extracookie);
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

