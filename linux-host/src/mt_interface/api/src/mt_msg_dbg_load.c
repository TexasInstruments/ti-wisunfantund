/******************************************************************************
 @file mt_msg_dbg_load.c

 @brief TIMAC 2.0 mt msg - debug decoder config file parser.

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
#include "mt_msg.h"
#include "mt_msg_dbg.h"
#include "log.h"
#include "mutex.h"
#include "threads.h"
#include "stream.h"
#include "stream_socket.h"
#include "stream_uart.h"
#include "timer.h"
#include "ti_semaphore.h"
#include "fatal.h"

#include <stdarg.h>
#include <ctype.h>
#include <string.h>
#include <stdlib.h>

struct dbg_load_info;
typedef int parse_func_t(struct dbg_load_info *pDLI);

struct dbg_load_info {
    intptr_t m_handle;
    int m_is_error;
    const char *m_filename;
    char m_buf[100];
    int m_lineno;
    int m_arg_count;
    int m_arg_idx;
    char *m_argv[100];
    parse_func_t *pCurParseFunc;
    struct mt_msg_dbg *m_pAllMsgs;
};

/* forward decloration */
static int parse_state_no_msg(struct dbg_load_info *pDLI);

/* like perl chomp() remove any/all trailing \r\n */
static void my_chomp(char *orig_cp)
{
    char *cp;
    cp = strchr(orig_cp, '\n');
    if (cp)
    {
        *cp = 0;
    }
    cp = strchr(orig_cp, '\r');
    if (cp)
    {
        *cp = 0;
    }
}

/* Remove leading & trailing white space from a string*/
static void my_strtrim(char *orig_cp)
{
    char *cp;

    cp = orig_cp;
    /* leading white space  */
    while (*cp)
    {
        if (isspace(*cp))
        {
            memmove(cp, cp + 1, strlen(cp + 1) + 1);
            continue;
        }
        else
        {
            break;
        }
    }

    /* trailing white space */
    while (*orig_cp)
    {
        cp = strchr(orig_cp, 0);
        cp--;
        if (isspace(*cp))
        {
            *cp = 0;
            continue;
        }
        else
        {
            break;
        }
    }
}

/* Read next line from the stream */
static int next_line( struct dbg_load_info *pDLI )
{
    char *cp;

    pDLI->m_arg_count = 0;
    pDLI->m_arg_idx = 0;
    pDLI->m_argv[0] = NULL;

    cp = STREAM_fgets(pDLI->m_buf, sizeof(pDLI->m_buf), pDLI->m_handle);
    if( cp == NULL )
    {
        return EOF;
    }

    pDLI->m_lineno++;
    my_chomp(pDLI->m_buf);
    my_strtrim(pDLI->m_buf);
    /* comments? */
    if (pDLI->m_buf[0] == ';')
    {
        pDLI->m_buf[0] = 0;
        return 0;
    }
    if (pDLI->m_buf[0] == '#' )
    {
        pDLI->m_buf[0] = 0;
        return 0;
    }

    if( (pDLI->m_buf[0] == '/') && (pDLI->m_buf[1] == '/') )
    {
        pDLI->m_buf[0] = 0;
        return 0;
    }

    cp = pDLI->m_buf;

    /* tokenize */
    for (;;)
    {
        pDLI->m_argv[pDLI->m_arg_count] = strtok(cp, " \t");
        cp = NULL;
        if (pDLI->m_argv[pDLI->m_arg_count])
        {
            pDLI->m_arg_count++;
            continue;
        }
        else
        {
            break;
        }
    }

    return 0;
}

/* print and record an error */
static void do_error( struct dbg_load_info *pDLI, const char *fmt, ... )
{
    va_list ap;
    pDLI->m_is_error = 1;
    //LOG_printf(LOG_ERROR, "%s:%d: ", pDLI->m_filename, pDLI->m_lineno);
    va_start(ap, fmt);
    LOG_vprintf(LOG_ERROR, fmt, ap);
    va_end(ap);
}

/* strdup the arg as a string */
static const char *arg_str(struct dbg_load_info *pDLI)
{
    const char *cp;

    cp = pDLI ->m_argv[pDLI->m_arg_idx];
    if( cp==NULL )
    {
        do_error(pDLI, "missing parameter\n");
        return NULL;
    }
    cp = strdup(cp);
    if( cp == NULL )
    {
        do_error(pDLI, "no memory\n");
    }
    pDLI->m_arg_idx += 1;
    return cp;
}

/* arg should be an long */
static long arg_long(struct dbg_load_info *pDLI)
{
    long r;
    const char *cp;
    char *ep;

    cp = pDLI->m_argv[pDLI->m_arg_idx];
    pDLI->m_arg_idx++;
    if( cp == NULL )
    {
        do_error(pDLI, "Missing parameter\n");
        return 0;
    }
    r = strtol(cp, &ep, 0);
    if( (cp !=ep ) && (*ep == 0) )
    {
        return r;
    }
    do_error(pDLI, "not a number: %s\n",cp);
    return 0;
}


/* arg should be a u8 value */
static int arg_u8(struct dbg_load_info *pDLI)
{
    int r;
    r = arg_long(pDLI);
    if ((r < 0) || (r > 255))
    {
        do_error(pDLI, "invalid range\n");
    }
    return r;
}

#if 0 /* not used remove warning. */
static int arg_u16(struct dbg_load_info *pDLI)
{
    int r;
    r = arg_long(pDLI);
    if ((r < 0) || (r > 65535))
    {
        do_error(pDLI, "invalid range\n");
    }
    return r;
}
#endif

/* state function used when parsing fields */
static int parse_fields(struct dbg_load_info *pDLI)
{
    struct mt_msg_dbg_field *pF;
    struct mt_msg_dbg_field **ppF;

    /* field syntax:
    **     u8 NAME
    **     u16 NAME
    **     u32 name
    **     bytes name COUNT
    **     end
    */

    if (0 == strcmp("end", pDLI->m_argv[0]))
    {
        pDLI->pCurParseFunc = parse_state_no_msg;
        return 0;
    }
    pF = (struct mt_msg_dbg_field *)calloc(1, sizeof(*pF));
    if (pF == NULL)
    {
        do_error(pDLI, "no memory\n");
        return -1;
    }

    /* insert at end */
    ppF = &(pDLI->m_pAllMsgs->m_pFields);
    while( *ppF )
    {
        ppF = &((*ppF)->m_pNext);
    }
    *ppF = pF;

    /*  handle field name first*/
    pDLI->m_arg_idx++;
    pF->m_name = arg_str(pDLI);

    if (0 == strcmp("u8", pDLI->m_argv[0]))
    {
        pF->m_fieldtype = FIELDTYPE_U8;
        return 0;
    }
    if (0 == strcmp("u16", pDLI->m_argv[0]))
    {
        pF->m_fieldtype = FIELDTYPE_U16;
        return 0;
    }
    if (0 == strcmp("u32", pDLI->m_argv[0]))
    {
        pF->m_fieldtype = FIELDTYPE_U32;
        return 0;
    }
    if (0 == strcmp("bytes", pDLI->m_argv[0]))
    {
        pF->m_fieldtype = FIELDTYPE_BYTES_N(0);
        pF->m_fieldtype += arg_long(pDLI);
        return 0;
    }
    if (0 == strcmp("max-bytes", pDLI->m_argv[0]))
    {
        pF->m_fieldtype = FIELDTYPE_MAXBYTES(0);
        pF->m_fieldtype += arg_long(pDLI);
        return 0;
    }

    do_error(pDLI, "unknown: %s\n", pDLI->m_argv[0]);
    return -1;
}

/* parse state function when not-parsing fields */
static int parse_state_no_msg(struct dbg_load_info *pDLI)
{
    struct mt_msg_dbg *p;
    int t;

    t = 0;
    if (0 == strcmp(pDLI->m_argv[0], "simple-msg"))
    {
        t = 1;
    }
    if (0 == strcmp(pDLI->m_argv[0], "complex-msg"))
    {
        pDLI->pCurParseFunc = parse_fields;
        t = 1;
    }
    if (t == 0)
    {
        do_error(pDLI, "unknown: %s\n", pDLI->m_argv[0]);
        return -1;
    }

    pDLI->m_arg_idx = 1;
    p = (struct mt_msg_dbg *)calloc(1, sizeof(*p));
    if( p == NULL )
    {
        BUG_HERE("no memory\n");
    }
    p->m_pktName = arg_str(pDLI);
    p->m_cmd0 = arg_u8(pDLI);
    p->m_cmd1 = arg_u8(pDLI);

    p->m_pNext = pDLI->m_pAllMsgs;
    pDLI->m_pAllMsgs = p;
    return 0;
}


/* public function, this loads(parses) a message definition file */
struct mt_msg_dbg *MT_MSG_dbg_load(const char *filename)
{
    struct dbg_load_info dli;

    memset((void *)(&dli), 0, sizeof(dli));

    dli.m_filename = filename;
    dli.m_handle = STREAM_createRdFile(filename);
    if (dli.m_handle == 0)
    {
        return NULL;
    }

    dli.pCurParseFunc = parse_state_no_msg;
    while( next_line( &dli ) != EOF )
    {
        if( dli.m_arg_count == 0 )
        {
            continue;
        }
        if (dli.pCurParseFunc(&dli) == -1)
        {
            break;
        }
    }
    STREAM_close(dli.m_handle);
    if (dli.m_is_error)
    {
      /* yes this is a leak but this is debug code */
        MT_MSG_dbg_free(dli.m_pAllMsgs);
        return NULL;
    }
    return dli.m_pAllMsgs;
}

/* free a debug message */
static void do_free(struct mt_msg_dbg *pDbg)
{
    struct mt_msg_dbg_field *pF;

    /* Free each field */
    while(pDbg->m_pFields)
    {
        pF = pDbg->m_pFields;
        pDbg->m_pFields = pF->m_pNext;
        free( (void *)(pF->m_name) );
        free(pF);
    }
    /* the packet name */
    free( (void *)(pDbg->m_pktName) );
    /* finally the packet */
    free(pDbg);
}

void MT_MSG_dbg_free(struct mt_msg_dbg *pMsgs)
{
    struct mt_msg_dbg *pNext;

    /* walk list, freeing messages */
    while (pMsgs)
    {
        /* de-link */
        pNext = pMsgs->m_pNext;
        pMsgs->m_pNext = NULL;
        /* free */
        do_free(pMsgs);
        /* next */
        pMsgs = pNext;
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
