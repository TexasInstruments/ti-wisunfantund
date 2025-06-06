/******************************************************************************
 @file ini_file.c

 @brief TIMAC 2.0 API Implimentation file to parse INI files

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
#include "ini_file.h"
#include "stream.h"
#include "log.h"
#include <string.h>
#include <stdlib.h>
#include <limits.h>

/*
 * Return true if the current item matches
 *
 * Public function defined in ini_file.h
 */
bool INI_itemMatches(struct ini_parser *pINI,
                      const char *sectionstr, const char *namestr)
{
    bool answer;
    if(sectionstr == NULL)
    {
        sectionstr = "*";
    }
    if(namestr == NULL)
    {
        namestr = "*";
    }

    answer = true;

    /* let simple wild cards work */
    if(0 == strcmp("*", sectionstr))
    {
        /* then it matches */
    }
    else if(0 != strcmp(pINI->cur_section, sectionstr))
    {
        answer = false;
    }

    if(0 == strcmp("*", namestr))
    {
        /* then it matches */
    }
    else if(pINI->item_name == NULL)
    {
        /* it does not match */
        answer = false;
    }
    else if(0 != strcmp(pINI->item_name, namestr))
    {
        answer = false;
    }
    return (answer);
}

/*
 * log/print a syntax error message about the current line in the file
 *
 * Public function defined in ini_file.h
 */
void INI_syntaxError(struct ini_parser *pINI, const char *fmt, ...)
{
    va_list ap;

    va_start(ap,fmt);
    INI_vsyntaxError(pINI, fmt, ap);
    va_end(ap);
}

/*
 * building block for INI_syntaxError()
 *
 * Public function defined in ini_file.h
 */
void INI_vsyntaxError(struct ini_parser *pINI, const char *fmt, va_list ap)
{
    pINI->is_error = true;
    //LOG_printf(LOG_ERROR, "%s:%d: Error: ",
    //             pINI->filename,
    //             pINI->lineno);
    // LOG_vprintf(LOG_ERROR, fmt, ap);
}

/*!
 * @brief Remove leading/trailing white space from a string
 */
static void _trim_spaces(char *s)
{
    char *cp;
    size_t n;
    int c;
    int done;

    /* blank string */

    /* Trim end */
    done = false;
    do
    {
        /* blank line */
        if(*s == 0)
        {
            /* then stop */
            break;
        }
        /* find end */
        cp = strchr(s, 0);
        cp--;
        /* what is there? */
        c = *cp;
        switch(c)
        {
        case ' ':
        case '\t':
        case '\n':
        case '\r':
            *cp = 0;
            c = 0;
            break;
        default:
            done = true;
            /* no change */
            break;
        }
    }
    while(!done)
        ;

    /* trim front */
    n = strspn(s, " \t\r\n");
    if(n)
    {
        /* use memmove() because the strings overlap
         * and *ANSI* states: If the strings overlap
         * then the results are undefined
         *---
         * SOME libaries this works well
         * SOME libraries it fails
         *---
         * A google search for: "glibc strcpy overlap bug"
         * will show you that *SOME* times this happens
         * and *SOMETIMES* this does not happen
         * and it is very subtile... depending upon
         * the exact CPU core....
         * SO... we use MEMMOVE instead.
         *---
         * The +1 is for the NULL byte.
         */
        size_t l = strlen(s)+1;
        memmove((void *)(s), (void *)(s+1), l);
    }
}

/*!
 * @brief Parse a section name from the workbuffer
 * @param pINI - the parse information
 * @returns void, may set pINI->is_error
 */
static void _section_name(struct ini_parser *pINI)
{
    /* we have found the '[', find the ']' opening. */
    char *cp;

    /* replace leading [ with a space */
    pINI->workbuf[0] = ' ';

    /* search backward in the string for the closing ] */
    cp = strrchr(pINI->workbuf, ']');
    /* not found? */
    if(cp == NULL)
    {
        INI_syntaxError(pINI, "missing-]\n");
        return;
    }
    /* kill trailing item */
    *cp = 0;
    /* trim spaces in this senaro: */
    /* before/after section name: [  foobar  ] */
    _trim_spaces(pINI->workbuf);

    if(strlen(pINI->workbuf) > (sizeof(pINI->cur_section)-1))
    {
        INI_syntaxError(pINI, "too-big\n");
        return;
    }
    strcpy(pINI->cur_section, pINI->workbuf);

    pINI->item_name = NULL;
    pINI->item_value = NULL;
}

/*!
 * @brief [private] Parse the name and value from the workbuffer.
 * @param pINI - ini file parse information
 * @returns void, may set pINI->is_error
 */
static void _item_name_value(struct ini_parser *pINI)
{
    char *cp;
    /* syntax is, where <ws> is optional white space
     *    <ws>text<ws>=<ws><value text><ws>
     */
    _trim_spaces(pINI->workbuf);

    /* Find the name value seperator */
    cp = strchr(pINI->workbuf, '=');
    /* missing equals? */
    if(!cp)
    {
        INI_syntaxError(pINI, "missing-equal\n");
        return;
    }

    /* setup the item name and value */
    pINI->item_name  = pINI->workbuf;

    /* kill the equal sign */
    *cp = 0;

    /* set the value */
    pINI->item_value = cp+1;

    _trim_spaces(pINI->item_name);
    _trim_spaces(pINI->item_value);
}

/*
 * Open and read an INI file, and parse it
 *
 * Public function defined in ini_file.h
 */
int INI_read(const char *filename,
              ini_rd_callback *rd_fn, intptr_t client_cookie)
{
    intptr_t s;
    int r;

    s = STREAM_createRdFile(filename);
    if(s == 0)
    {
        return (-1);
    }
    r = INI_parse(s, filename, rd_fn, client_cookie);
    STREAM_close(s);
    return (r);

}

/*
 * Parse an existing (already open) INI file from an arbitrary stream
 *
 * Public function defined in ini_file.h
 */

int INI_parse(intptr_t s,
               const char *filename,
               ini_rd_callback *rd_fn,
               intptr_t client_cookie)
{
    char *cp;
    struct ini_parser d;
    bool handled;
    int c;

    memset(&d, 0, sizeof(d));
    d.client_cookie = client_cookie;
    d.callback_fn   = rd_fn;
    d.stream      = s;
    d.filename      = filename;

    for(;;)
    {
        if(d.is_error)
        {
            break;
        }
        memset(d.workbuf, 0, sizeof(d.workbuf));
        cp = STREAM_fgets(d.workbuf, sizeof(d.workbuf), d.stream);
        if(cp == NULL)
        {
            break;
        }
        /* Line *MUST* end on a cr or lf */
        /* otherwise the line was truncated during the read */
        cp = strchr( d.workbuf, '\n' );
        if( cp == NULL ){
            cp = strchr(d.workbuf, '\r' );
        }
        if( cp == NULL ){
            INI_syntaxError( &d, "Line too long (max: %d)\n",sizeof(d.workbuf)-1);
            continue;
        }
        d.lineno  += 1;
        d.item_name = NULL;
        d.item_value = NULL;
        d.did_dequote = false;

        _trim_spaces(d.workbuf);
        c = d.workbuf[0];
        if((c == 0) ||
           (c == ';') ||
           (c == '#') ||
           ((c=='/') && (d.workbuf[1]=='/')))
        {

            /* blank or comment */
            continue;
        }

        if(c == '[')
        {
            _section_name(&d);
        }
        else
        {
            _item_name_value(&d);
        }

        if(d.is_error)
        {
            break;
        }
        handled = false;
        c = (*(d.callback_fn))(&d, &handled);
        if(c < 0)
        {
            break;
        }
        if(!handled)
        {
            /* we ignore section only calls */
            if(d.item_name == NULL)
            {
                continue;
            }
            /* otherwise, ITEMS must be handled */
            //LOG_printf(LOG_ERROR,
                        // "%s:%d: [%s] %s not handled\n",
                        // d.filename,
                        // d.lineno,
                        // d.cur_section,
                        // (d.item_name == NULL) ? "" : d.item_name);
            INI_syntaxError(&d, "not-handled\n");
        }
    }

    if(d.is_error)
    {
        return (-1);
    }
    else
    {
        return (0);
    }
}

/*!
 * @brief [private] convert char to a hex nibble
 * @returns converted char, or negative if invalid
 */
static int _dehex(int v)
{
    if((v >= 'a') && (v <= 'f'))
    {
        return (10 + v - 'a');
    }
    if((v >= 'A') && (v <= 'F'))
    {
        return (10 + v - 'A');
    }

    if((v >= '0') && (v <= '9'))
    {
        return (0 + v - '0');
    }
    /* error */
    return (-1);
}

/*!
 * @brief [private] Parse a backslash escaped element in a string or single char
 * @param pINI - parse details
 * @param rd   - where the read cursor is located in the work buffer
 * @param ep   - Updated read pointer after parsing.
 * @returns bool true on success
 */
static bool _parse_backslash(struct ini_parser *pINI,
                              char *rd, char **ep, int *val)
{
    int value;
    int len;
    int a,b,c;

    (void)(pINI); /* not used */

    /* https://en.wikipedia.org/wiki/Escape_sequences_in_C */
    len = 0;
    a = rd[0];
    b = rd[1];
    c = rd[2];
    switch(a)
    {
    default:
        value = 0;
        len = 0;
        break;
    case 'a': value = 0x07; len = 1; break;
    case 'b': value = 0x08; len = 1; break;
    case 'f': value = 0x0c; len = 1; break;
    case 'n': value = 0x0a; len = 1; break;
    case 'r': value = 0x0d; len = 1; break;
    case 't': value = 0x09; len = 1; break;
    case 'v': value = 0x0b; len = 1; break;
    case '"': value = '"'; len = 1; break;
    case '\\': value = '\\'; len = 1; break;
    case '\'': value = '\''; len = 1; break;
    }
    if(len)
    {
        /* good one of the above matched */
    }
    else if(a == 'x')
    {
        len = 3;
        /* This is where we *BREAK* rules
         * The C standard says: the hex digits can continue for ever
         * ie:   \x123456789 is a value
         * We however only take the first 2 chars
         */
        b = _dehex(b);
        c = _dehex(c);
        if((b < 0) || (c < 0))
        {
            len = -1;
        }
        value = (b * 16) + c;
    }
    else
    {
        /* assume octal */
        len = 3;
        a = _dehex(a);
        b = _dehex(b);
        c = _dehex(c);
        if((a < 0) || (b < 0) || (c < 0) ||
            (a > 3) || (b > 7) || (c > 7))
        {
            len = -1;
        }
        value = (a * 8 * 8) + (b * 8) + c;
    }

    if(len < 0)
    {
        /* do not advance rd on errors */
        return (false);
    }

    *ep = rd + len;
    *val = value;
    return (true);
}

/*!
 * @brief [private] Values written as a C constant of a single quoted
 * @param pINI - the ini parse information
 * @returns bool true if valid, otherwise false
 *
 * for example:  foo = 'a'
 *
 * can be interpreted as a string, or as the value 0x41 (65 decimal)
 */
static bool _single_quote_number(struct ini_parser *pINI, int *val)
{
    char *cp;

    *val = 0;

    /* must start with single quote */
    if(pINI->item_value[0] != '\'')
    {
        return (false);
    }

    /* backslash? */
    if(pINI->item_value[1] == '\\')
    {
        /* handle that */
        if(!_parse_backslash(pINI, pINI->item_value+2, &(cp), val))
        {
            return (false);
        }
    }
    else
    {
        /* otherwise it is a single letter */
        *val = pINI->item_value[1] & 0x0ff;
        cp = pINI->item_value+2;
    }

    /* cp must now be pointing at a single quote at the end */
    if((cp[0] == '\'') && (cp[1]==0))
    {
        /* all is well */
        return (true);
    }
    else
    {
        return (false);
    }
}

/*
 * Parse the current item value as 64bit number
 *
 * Public function defined in ini_file.h
 */
uint64_t INI_valueAsU64(struct ini_parser *pINI)
{
    uint64_t v;

    if(INI_isValueU64(pINI, &v))
    {
        return (v);
    }

    INI_syntaxError(pINI, "not-a-number\n");
    return (0);
}

/*
 * Determine if the value could be parsed as a unsigned 64bit number
 *
 * Public function defined in ini_file.h
 */
bool INI_isValueU64(struct ini_parser *pINI, uint64_t *val)
{
    int v;
    char *cp;

    /* accept a single byte, ie: 'a' == 0x41 */
    if(pINI->item_value[0] == '\'')
    {
        if(_single_quote_number(pINI, &v))
        {
            *val = v;
            return (true);
        }
        else
        {
            return (false);
        }
    }

    *val = (uint64_t)(strtoull(pINI->item_value, &cp, 0));
    /* because we trimed, we should not have anything following the value */
    if((*cp != 0) || (cp == pINI->item_value))
    {
        return (false);
    }
    else
    {
        return (true);
    }
}

/*
 * Return the current value as a signed 64bit number
 *
 * Public function defined in ini_file.h
 */
int64_t INI_valueAsS64(struct ini_parser *pINI)
{
    int64_t v;

    if(INI_isValueS64(pINI, &v))
    {
        return (v);
    }
    INI_syntaxError(pINI, "not-a-number\n");
    return (0);
}

/*
 * Determine if the current value could be a signed 64bit number
 *
 * Public function defined in ini_file.h
 */
bool INI_isValueS64(struct ini_parser *pINI, int64_t *val)
{

    char *cp;
    int iv;

    /* accept a single byte, ie: 'a' == 0x41 */
    if(pINI->item_value[0] == '\'')
    {
        if(_single_quote_number(pINI, &iv))
        {
            *val = iv;
            return (true);
        }
        else
        {
            return (false);
        }
    }

    *val = (int64_t)(strtoll(pINI->item_value, &cp, 0));
    /* because we trimed, we should not have anything following the value */
    if((*cp != 0) || (cp == pINI->item_value))
    {
        return (false);
    }
    else
    {
        return (true);
    }
}

/*
 * Return the current value as a double (float) number
 *
 * Public function defined in ini_file.h
 */
double INI_valueAsDouble(struct ini_parser *pINI)
{
    double dbl;
    if(INI_isValueDouble(pINI, &dbl))
    {
        return (dbl);
    }

    INI_syntaxError(pINI, "not-a-number\n");
    return (0.0);
}

/*
 * Return true if the current value is parseable as a double precision number
 *
 * Public function defined in ini_file.h
 */

bool INI_isValueDouble(struct ini_parser *pINI, double *val)
{
    char *cp;
    int v;

    *val = 0.0;

    /* accept a single byte, ie: 'A' == 0x41 */
    if(pINI->item_value[0] == '\'')
    {
        if(_single_quote_number(pINI, &v))
        {
            *val = (double)(v);
            return (true);
        }
        else
        {
            return (false);
        }
    }

    *val = strtod(pINI->item_value, &cp);
    /* because we trimed, we should not have anything following the value */
    if((*cp != 0) || (cp == pINI->item_value))
    {
        return (false);
    }
    else
    {
        return (true);
    }
}

/*
 * Return current value as a boolean
 *
 * Public function defined in ini_file.h
 */
bool INI_valueAsBool(struct ini_parser *pINI)
{
    bool b;
    if(INI_isValueBool(pINI, &b))
    {
        return (b);
    }
    INI_syntaxError(pINI, "not-a-bool\n");
    return (false);
}

/*
 * Return true if the current value is a boolean, and return the value
 *
 * Public function defined in ini_file.h
 */
bool INI_isValueBool(struct ini_parser *pINI, bool *val)
{
    int x;
    /* we don't support quoted strings here */
    static const char *t_strs[] = {
        "y", "yes", "t", "true", "1", NULL
    };

    static const char *f_strs[] = {
        "n", "no", "f", "false", "0", NULL
    };

    for(x = 0 ; t_strs[x] ; x++)
    {
        if(0 == strcasecmp(t_strs[x], pINI->item_value))
        {
            *val = true;
            return (true);
        }
    }

    for(x = 0 ; f_strs[x] ; x++)
    {
        if(0 == strcasecmp(f_strs[x], pINI->item_value))
        {
            *val = false;
            return (true);
        }
    }
    return (false);
}

/*
 * Remove quotes from a value if they exist
 *
 * Public function defined in ini_file.h
 */
int INI_dequote(struct ini_parser *pINI)
{
    char *cp;
    char *rd;
    char *wr;
    int c;
    int quotechar;

    if(pINI->did_dequote)
    {
        return (0);
    }
    pINI->did_dequote = true;

    c = pINI->item_value[0];
    quotechar = c;
    if((c=='"') || (c=='\''))
    {
        /* we have a quote */
    }
    else
    {
        /* no quote, we are done */
        return (int)strlen(pINI->item_value);
    }

    /* we have a quote, we must have at least 2 bytes on the line */
    /* must have at least 2 bytes in the string */
    if(pINI->item_value[1] == 0)
    {
    fail:
        /* we do not, we have a single byte.. this is wrong */
        INI_syntaxError(pINI, "bad-quote\n");
        return (0);
    }

    /* go past opening quote */
    pINI->item_value += 1;

    /* make sure start quote matches end quote */
    cp = strchr(pINI->item_value, 0);
    /* backup from the end */
    cp--;
    /* we should be at the closing quote char */
    if(cp[0] != quotechar)
    {
        /* this does not match, thats bad */
        goto fail;
    }

    /* kill that closing quote */
    *cp = 0;

    /* Now, parse the string in place */

    /* we read here */
    rd = pINI->item_value;
    /* we write here (in place) */
    wr = pINI->item_value;

    /* Over time, with escaped stuff */
    /* the RD pointer will advance further */
    /* then the WRITE pointer */

    for(;;)
    {
        if(pINI->is_error)
        {
            /* stop on errors */
            break;
        }

        /* get next char */
        c = *rd;
        rd++;
        /* Done? */
        if(c == 0)
        {
            break;
        }

        /* should not be a bare naked quote char internal */
        /* they must instead be escaped */
        if(c == quotechar)
        {
            INI_syntaxError(pINI, "bad-quote-escape\n");
            break;
        }

        /* is it an escaped char? */
        if(c == '\\')
        {
            /* then parse it as such */
            int v;
            if(_parse_backslash(pINI, rd, &rd , &v))
            {
                c = v;
            }
            else
            {
                c = '?';
                INI_syntaxError(pINI, "bad-escape\n");
            }
        }
        /* write the byte */
        *wr = ((char)(c));
        wr++;
    }
    /* always terminate the string */
    *wr = 0;
    /* cannot use strlen here */
    /* because the embedded escapes may have inserted */
    /* a NULL byte into the string */
    return (int)(wr - pINI->item_value);
}

/*
 * Lookup a flag from a table of known flag names.
 *
 * Public function defined in ini_file.h
 */
const struct ini_flag_name *INI_flagLookup(const struct ini_flag_name *pFlag,
                                            const char *s, bool *isnot)
{
    if(0 == strncmp(s, "not-", 4))
    {
        *isnot = true;
        s += 4;
    }
    else
    {
        *isnot = false;
    }

    while(pFlag->name)
    {
        if(0 == strcmp(pFlag->name, s))
        {
            return (pFlag);
        }
        pFlag++;
    }
    /* not found */
    return (NULL);
}

/*
 * strdup() the current value and return a pointer
 *
 * Public function defined in ini_file.h
 */
char *INI_itemValue_strdup(struct ini_parser *pINI)
{
    /* strdup the value and handle errors. */
    char *cp;
    INI_dequote(pINI);
    cp = strdup(pINI->item_value);
    if(cp == NULL)
    {
        pINI->is_error = true;
        //LOG_printf(LOG_ERROR, "%s:%d: no memory for [%s] %s\n",
                    // pINI->filename,
                    // pINI->lineno,
                    // pINI->cur_section,
                    // pINI->item_name);
    }
    return (cp);
}

/*
 * Return the current value as an integer
 *
 * Public function defined in ini_file.h
 */
int INI_valueAsInt(struct ini_parser *pINI)
{
    int v;

    v = 0;
    if(INI_isValueInt(pINI, &v))
    {
        return (v);
    }
    INI_syntaxError(pINI, "not-a-number\n");
    return (0);
}

/*
 * Determine if current value is an integer, or not
 *
 * Public function defined in ini_file.h
 */
bool INI_isValueInt(struct ini_parser *pINI, int *vi)
{
    int64_t v64;

    *vi = 0;

    if(!INI_isValueS64(pINI, &v64))
    {
        return (false);
    }

    if((v64 < INT_MIN) && (v64 > INT_MAX))
    {
        INI_syntaxError(pINI, "out-of-range\n");
        return (false);
    }
    *vi = (int)(v64);
    return (true);
}

/*
 * Does current section look like an integer prefixed string.
 *
 * Examples:  [uart-3], or [dog-5]
 *
 * In the above examples, it is the 3rd uart, or the 5th dog
 *
 * Public function defined in ini_file.h
 */
bool INI_isNth(struct ini_parser *pINI,
                const char *sectionprefix, unsigned *nth)
{
    int n;
    size_t l;
    const char *cp;
    char *ep;

    /* always initialize */
    if(nth)
    {
        *nth = 0;
    }

    l = strlen(sectionprefix);
    cp = pINI->cur_section;
    if(0 != strncmp(cp, sectionprefix, l))
    {
        return (false);
    }

    /* goto the digit location */
    cp = cp + l;
    /* accept decimal only */
    n = (int)strtol(cp, &ep, 10);
    if(nth)
    {
        *nth = n;
    }
    if((cp == ep) || (*ep))
    {
        INI_syntaxError(pINI, "not-integer\n");
        return (false);
    }
    /* Great success */
    return (true);
}

/*
 * Public function defined in: ini_file.h
 * Purpose: initialize the structure
 */

static const int magic_numlist_test = 'N';

void INI_valueAsNumberList_init(struct ini_numlist *pInitThis, struct ini_parser *pINI)
{
    int c;
    memset((void *)(pInitThis), 0, sizeof(*pInitThis));
    pInitThis->magic = ((intptr_t)(&magic_numlist_test));
    pInitThis->pINI = pINI;

    _trim_spaces(pInitThis->pINI->item_value);

    /* This thing must start with a number or a negative sign. */
    /* Otherwise we don't have any numbers */
    c = pInitThis->pINI->item_value[0];

    switch (c)
    {
    default:
        INI_syntaxError(pINI, "not a number list\n");
        break;
    case '-':
        /* Beause this is here, strtol() will try
         * to convert this into a number..
         * if there are more bytes following...
         * ie: -123, then we are good.
         * If it is not, for example -foo
         * strtol() will not convert and will
         * return an error indication
         * which is good.
         */
    case '0':
    case '1':
    case '2':
    case '3':
    case '4':
    case '5':
    case '6':
    case '7':
    case '8':
    case '9':
        /* all is well */
        break;
    }
}

int INI_valueAsNumberList_next(struct ini_numlist *p)
{
    char *cp;
    char *ep;
    if(p->magic != ((intptr_t)(&magic_numlist_test)))
    {
        BUG_HERE("Not a proper structure\n");
    }
    if(p->is_error)
    {
        return (EOF);
    }

    cp = p->pINI->item_value;
    _trim_spaces(cp);

    if(cp[0] == 0)
    {
        /* no more data? */
        return (EOF);
    }

    /* convert the number */
    p->value = (int)(strtol(cp, &ep, 0));

    /* any errors? */
    if(cp == ep)
    {
        INI_syntaxError(p->pINI, "not a number: %s\n", cp);
        p->is_error = true;
        return (EOF);
    }
    else
    {
        /* otherwise we got a number :-) */
    }

    _trim_spaces(ep);
    p->pINI->item_value = ep;
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

