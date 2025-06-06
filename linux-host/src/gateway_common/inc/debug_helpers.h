/******************************************************************************
 @file debug_helpers.h

 @brief TIMAC 2.0 API Application Server Debug(test) thread.

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
#if !defined(DEBUG_THREAD_H)
#define DEBUG_THREAD_H

#include <stdint.h>
#include <stdbool.h>

#define DEBUG_KEY_non_ascii      0x8000
#define DEBUG_KEY_alt_modifier   0x0100
#define DEBUG_KEY_shift_modifier 0x0200
#define DEBUG_KEY_ctrl_modifier  0x0400

#define DEBUG_KEY_u_arrow   (DEBUG_KEY_non_ascii + 1)
#define DEBUG_KEY_d_arrow   (DEBUG_KEY_non_ascii + 2)
#define DEBUG_KEY_l_arrow   (DEBUG_KEY_non_ascii + 3)
#define DEBUG_KEY_r_arrow   (DEBUG_KEY_non_ascii + 4)
#define DEBUG_KEY_pgup      (DEBUG_KEY_non_ascii + 5)
#define DEBUG_KEY_pgdn      (DEBUG_KEY_non_ascii + 6)
#define DEBUG_KEY_home      (DEBUG_KEY_non_ascii + 7)
#define DEBUG_KEY_end       (DEBUG_KEY_non_ascii + 8)
#define DEBUG_KEY_fX(X)     (DEBUG_KEY_non_ascii + 0x10 + (X) /* 0x10 through 0x1f */)

#define DEBUG_KEY_cu_arrow   (DEBUG_KEY_u_arrow  + DEBUG_KEY_ctrl_modifier)
#define DEBUG_KEY_cd_arrow   (DEBUG_KEY_d_arrow  + DEBUG_KEY_ctrl_modifier)
#define DEBUG_KEY_cl_arrow   (DEBUG_KEY_l_arrow  + DEBUG_KEY_ctrl_modifier)
#define DEBUG_KEY_cr_arrow   (DEBUG_KEY_r_arrow  + DEBUG_KEY_ctrl_modifier)

#define DEBUG_KEY_cpgup      (DEBUG_KEY_pgup + DEBUG_KEY_ctrl_modifier)
#define DEBUG_KEY_cpgdn      (DEBUG_KEY_pgdn + DEBUG_KEY_ctrl_modifier)
#define DEBUG_KEY_chome      (DEBUG_KEY_home + DEBUG_KEY_ctrl_modifier)
#define DEBUG_KEY_cend       (DEBUG_KEY_end + DEBUG_KEY_ctrl_modifier)

#define DEBUG_KEY_sfX(X)        (DEBUG_KEY_shift_modifier + DEBUG_KEY_fX(X))
#define DEBUG_KEY_cfX(X)        (DEBUG_KEY_ctrl_modifier  + DEBUG_KEY_fX(X))
#define DEBUG_KEY_afX(X)        (DEBUG_KEY_alt_modifier   + DEBUG_KEY_fX(X))

#define DEBUG_KEY_f1        DEBUG_KEY_fX(1) /* plain function keys */
#define DEBUG_KEY_f2        DEBUG_KEY_fX(2)
#define DEBUG_KEY_f3        DEBUG_KEY_fX(3)
#define DEBUG_KEY_f4        DEBUG_KEY_fX(4)
#define DEBUG_KEY_f5        DEBUG_KEY_fX(5)
#define DEBUG_KEY_f6        DEBUG_KEY_fX(6)
#define DEBUG_KEY_f7        DEBUG_KEY_fX(7)
#define DEBUG_KEY_f8        DEBUG_KEY_fX(8)
#define DEBUG_KEY_f9        DEBUG_KEY_fX(9)
#define DEBUG_KEY_f10       DEBUG_KEY_fX(10)
#define DEBUG_KEY_f11       DEBUG_KEY_fX(11)
#define DEBUG_KEY_f12       DEBUG_KEY_fX(12)

#define DEBUG_KEY_sf1        DEBUG_KEY_sfX(1) /* shift function keys */
#define DEBUG_KEY_sf2        DEBUG_KEY_sfX(2)
#define DEBUG_KEY_sf3        DEBUG_KEY_sfX(3)
#define DEBUG_KEY_sf4        DEBUG_KEY_sfX(4)
#define DEBUG_KEY_sf5        DEBUG_KEY_sfX(5)
#define DEBUG_KEY_sf6        DEBUG_KEY_sfX(6)
#define DEBUG_KEY_sf7        DEBUG_KEY_sfX(7)
#define DEBUG_KEY_sf8        DEBUG_KEY_sfX(8)
#define DEBUG_KEY_sf9        DEBUG_KEY_sfX(9)
#define DEBUG_KEY_sf10       DEBUG_KEY_sfX(10)
#define DEBUG_KEY_sf11       DEBUG_KEY_sfX(11)
#define DEBUG_KEY_sf12       DEBUG_KEY_sfX(12)

#define DEBUG_KEY_cf1        DEBUG_KEY_cfX(1) /* control function keys */
#define DEBUG_KEY_cf2        DEBUG_KEY_cfX(2)
#define DEBUG_KEY_cf3        DEBUG_KEY_cfX(3)
#define DEBUG_KEY_cf4        DEBUG_KEY_cfX(4)
#define DEBUG_KEY_cf5        DEBUG_KEY_cfX(5)
#define DEBUG_KEY_cf6        DEBUG_KEY_cfX(6)
#define DEBUG_KEY_cf7        DEBUG_KEY_cfX(7)
#define DEBUG_KEY_cf8        DEBUG_KEY_cfX(8)
#define DEBUG_KEY_cf9        DEBUG_KEY_cfX(9)
#define DEBUG_KEY_cf10       DEBUG_KEY_cfX(10)
#define DEBUG_KEY_cf11       DEBUG_KEY_cfX(11)
#define DEBUG_KEY_cf12       DEBUG_KEY_cfX(12)

#define DEBUG_KEY_af1        DEBUG_KEY_afX(1) /* alt function keys */
#define DEBUG_KEY_af2        DEBUG_KEY_afX(2)
#define DEBUG_KEY_af3        DEBUG_KEY_afX(3)
#define DEBUG_KEY_af4        DEBUG_KEY_afX(4)
#define DEBUG_KEY_af5        DEBUG_KEY_afX(5)
#define DEBUG_KEY_af6        DEBUG_KEY_afX(6)
#define DEBUG_KEY_af7        DEBUG_KEY_afX(7)
#define DEBUG_KEY_af8        DEBUG_KEY_afX(8)
#define DEBUG_KEY_af9        DEBUG_KEY_afX(9)
#define DEBUG_KEY_af10       DEBUG_KEY_afX(10)
#define DEBUG_KEY_af11       DEBUG_KEY_afX(11)
#define DEBUG_KEY_af12       DEBUG_KEY_afX(12)

struct debug_menu_item {
    const char *txt;
    intptr_t cookie;
    void (*handler)(const struct debug_menu_item *p, intptr_t cookie);
};

struct debug_getstr_info {
    const char *prompt;
    char *buf;
    size_t buflen;
    bool no_nl;
    const char *defaultvalue;
    int callnum; /* set to zero the first time you call get_string2 */
};

struct debug_getnum_info {
    const char *prompt;
    int nbits;
    bool is_base16;
    bool is_signed;
    bool default_value;
    int64_t sv;
    uint64_t uv;
};

extern intptr_t debug_thread_id;

extern intptr_t DEBUG_thread(intptr_t cookie);

/*!
 * @brief make the console beep.
 */
extern void DEBUG_beep(void);

/*!
 * @brief printf to the debug interface.
 * @param fmt - printf format string.
 */
extern void DEBUG_printf(const char *fmt, ...);

/*!
 * @brief building block for DEBUG_printf()
 * @param fmt - printf format string.
 * @param ap - parameter list
 */
extern void DEBUG_vprintf(const char *fmt, va_list ap);

/*!
 * @brief returntrue if a key has been pressed/waiting.
 */
extern bool DEBUG_kbhit(void);

/*!
 * @brief unget a key back, like ungetc()
 * @param key - the key to unget.
 */
extern void DEBUG_ungetkey(int key);

/*!
 * @brief get key from keyboard,
 * @return Returns EOF if there is no key pressed
 */
extern int  DEBUG_getkey(int timeout);

/*!
 * @brief Wait for ever for a key
 */
extern int  DEBUG_getkey_waitforever(void);

/*!
 * @brief get a string from user for debug reasons.
 * @param str - buffer to put string
 * @param len - size of string buffer.
 * @return negative if the debug interface dies.
 */
extern int  DEBUG_get_string(char *str, size_t len);

/*!
 * @brief fancy get string, with default value for the string
 * @pInfo - fancy details to get a string (ie: Default value etc)
 * @return negative if the debug interface dies.
 */
extern int  DEBUG_get_string2(struct debug_getstr_info *pInfo);

/*!
 * @brief Get a number in a fancy way, defaults, etc
 * @param pGni - pointer to get-number-info holding get details.
 * @return negative if the debug interface dies.
 */
extern int DEBUG_getnum(struct debug_getnum_info *pGni);

/*!
 * @brief Simple ask user for an integer
 * @param value - where to store value.
 */
extern int  DEBUG_get_integer(int *value);

/*!
 * @get an numbre, with a prompt and a default default value
 * @param prompt - user prompt
 * @param value - where to store result
 * @param default_value - default value
 * @return negative if the debug interface dies.
 */
extern int  DEBUG_get_integer2(const char *prompt, int *value, int default_value );

/*!
 * @brief simple get a signed 64bit number
 * @param value - store here
 * @return negative if the debug interface dies.
 */
extern int  DEBUG_get_int64(int64_t *value);

/*!
 * @brief simple get a unsigned 64bit number
 * @param value - store here
 * @return negative if the debug interface dies.
 */
extern int  DEBUG_get_uint64(uint64_t *value);

/*!
 * @brief present user with a menu and call menu functions
 * @param pMenu - null terminated list of menu items
 * @param cookie - for menu callback
 */
extern void DEBUG_menu(const struct debug_menu_item *pMenu, intptr_t extra_cookie);

/*!
 * @brief handle sub menu within a menu
 */
extern void DEBUG_submenu(const struct debug_menu_item *pMenu, intptr_t extra_cookie);

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

