/******************************************************************************
 @file linux_uart.c

 @brief TIMAC 2.0 API Linux specific HLOS implimentation for uart stream

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

#include "stream.h"
#include "fifo.h"
#include "threads.h"
#include "stream_uart.h"
#include "log.h"
#include "void_ptr.h"
#include "unix_fdrw.h"
#include "timer.h"
#include <sys/ioctl.h>
#include "threads.h"

#define _STREAM_IMPLIMENTOR_ 1
#include "stream_private.h"

#include <stdio.h>
#include <unistd.h>
#include <sys/types.h>
#include <sys/stat.h>
#include <fcntl.h>
#include <string.h>
#include <malloc.h>
#include <errno.h>
#include <termios.h>
#ifdef NPI_USE_NLI
#include <npi_hdlc.h>
#endif
#include <sys/signal.h>
#include <stdbool.h>

#include "ns_trace.h"

#define TRACE_GROUP "uart"
/*!
 * \def UF_isSet()
 * @brief test if a uart flag is set or not
 */
#define UF_isSet(pUL, FN)  \
    ((pUL)->cfg.open_flags & (STREAM_UART_FLAG_ ## FN))

/*!
 * @var [private] test variable to determine if stream is a uart or not
 */
static const int  uart_test = 'U';

int uart_raw_debug = 0;

#define LUTS_birth 0 /*! Linux Uart Thread State, not started yet */
#define LUTS_alive 1 /*! Linux Uart Thread State, running */
#define LUTS_exit  2 /*! Linux Uart Thread State, requested to exit */
#define LUTS_dead  3 /*! Linux Uart Thread State, It's Dead Jim.. */

/*!
 * @struct linux_uart
 *
 * Private UART details for a UART on Linux
 */
struct linux_uart {
    /*! Parent owning stream */
    struct io_stream *pParent;
    /*! used to verify pointer, should point to uart_test */
    const int  *test_ptr;

    /*! Unix file descriptor */
    int h;

    /*! uart configuration */
    struct uart_cfg cfg;

    /*! Has the terminal conditions been set? */
    bool   tcs_set;

    /*! Original IO State prior to our changes, used to restore old state */
    struct termios ios_orig;
    /*! our new IO configuration */
    struct termios ios_new;

    /*! See LUTS_<various> above */
    volatile int    thread_state;

    /*! If this UART is using a fifo this is the fifo handle */
    intptr_t rx_fifo;
    /*! If this uart is using a thread to read, this is the thread handle */
    intptr_t rx_thread;
};
#ifdef NPI_USE_NLI
static bool _uart_pollRxAvail(struct io_stream *pIO, int mSec_timeout);
#endif
/*!
 * @brief [private] Convert a io_stream to a Linux Uart Pointer
 * @param pIO - the io stream
 * @return linux uart pointer, or NULL if not valid
 */

static struct linux_uart *_uart_pio_to_plu(struct io_stream *pIO)
{
    struct linux_uart *pLU;

    if( pIO == NULL )
    {
        return NULL;
    }
    /* Cast */
    pLU = (struct linux_uart *)(pIO->opaque_ptr);

    /* do we have a pointer */
    if(pLU)
    {
        /* Verify the internal pointer */
        if(pLU->test_ptr != &uart_test)
        {
            pLU = NULL;
        }
    }
    return (pLU);
}

/*!
 * @brief get the linux uart struct from the stream
 * @param pIO - the io stream
 * @returns linux uart struct.
 */
static struct linux_uart *uart_pio_to_plu(struct io_stream *pIO)
{
    struct linux_uart *pLU;

    pLU = _uart_pio_to_plu(pIO);
    if(pLU == NULL)
    {
        //LOG_printf(LOG_ERROR, "not a uart: %p\n", (void *)(pIO));
    }
    return (pLU);
}

/*
  Determine if this is a uart handle.
  public function in stream.h
*/
bool STREAM_isUart(intptr_t h)
{
    struct linux_uart *pLU;

    pLU = _uart_pio_to_plu(STREAM_hToStruct(h));
    if(pLU)
    {
        return (true);
    }
    else
    {
        return (false);
    }
}

/*!
 * @brief Common routine to log a UART error
 * @param pLU - the linux uart
 * @param msg1 - message
 * @param msg2 - second message (or null)
 *
 */
static void _uart_error(struct linux_uart *pLU,
                         const char *msg1, const char *msg2)
{
    /* mark the error */
    pLU->pParent->is_error = true;

    /* do we need to look up strerror? */
    if(msg2 == NULL)
    {
        msg2 = strerror(errno);
    }
    if(msg2 == NULL)
    {
        msg2 = "";
    }

    //LOG_printf(LOG_ERROR, "%s: %s (%d) %s\n",
                //pLU->cfg.devname, msg1, errno, msg2);
}

/*!
 * @brief [private] code to determine if the usb serial port is dead/unplugged.
 * @param pLU - linux uart details
 * @param pRW - the RW structure
 */
static void uart_disconnect_check(struct linux_uart *pLU,
                                   struct unix_fdrw *pRW)
{
    if(pRW->is_error)
    {
        pLU->pParent->is_error = true;
        //LOG_printf(LOG_ERROR, "%s: low level error\n", pLU->cfg.devname);
    }

    if(!(pRW->is_connected))
    {
        pLU->pParent->is_error = true;
        //LOG_printf(LOG_ERROR, "%s: no longer connected\n", pLU->cfg.devname);
    }
}

/*!
 * @brief [private] Code to handl the STREAM_WrBytes() for uarts
 * @param pIO - the io stream
 * @param databytes - pointer to data buffer
 * @param nbytes- count of bytes to write
 * @param timeout_mSecs - write timeout
 *
 * @returns negative on error, 0..actual written
 */
static int _uart_wrBytes(struct io_stream *pIO,
                          const void *databytes,
                          size_t nbytes, int timeout_mSecs)
{
    int r;
    struct unix_fdrw rw;
    struct linux_uart *pLU;

    pLU = uart_pio_to_plu(pIO);
    if(!pLU)
    {
        return (-1);
    }

#ifdef NPI_USE_NLI
    //-- Add NLI Data
    uint8_t *nliBuffer = NULL, *encodedBuffer = NULL;
    uint16_t nliBufferLen, encodedBufferLen;
	/* Add NLI byte to base MT Message buffer */
    nliBuffer = add_NLI_byte(databytes, nbytes, 1, &nliBufferLen);
	/* Encode base MT Message buffer using HDLC */
    if (nliBuffer)
    {
        encodedBuffer = hdlc_encode(true, nliBuffer, nliBufferLen, &encodedBufferLen);
        if (encodedBuffer == NULL)
        {
            tr_error("Unix-WR out of byffer (encode buffer): nbytes (Len=%d) ", nbytes);
            free(nliBuffer);
            return nbytes;
        }
    }
    else{
        tr_error("Unix-WR out of byffer (nliBuffer): nbytes (Len=%d) NLI-Len(%d)", nbytes , nliBufferLen);
        return nbytes;
    }
#endif

    /* setup common IO routine */
    memset((void *)(&rw), 0, sizeof(rw));

    rw.is_connected = true;
    rw.type         = 'u';
    rw.rw           = 'w';
    rw.fd           = pLU->h;
    rw.log_prefix   = "uart-wr";
    rw.log_why      = LOG_DBG_UART;
    rw.log_why_raw  = LOG_DBG_UART_RAW;
#ifndef NPI_USE_NLI
    rw.c_bytes      = databytes;
    rw.n_todo       = nbytes;
#else
    rw.c_bytes      = encodedBuffer;
    rw.n_todo       = encodedBufferLen;
#endif
    rw.fifo_handle  = 0; /* we don't (currently) do writes via fifo operations */

    /* use the common code */
    r = UNIX_fdRw(&rw);

    if (uart_raw_debug)
        tr_debug("Unix-WR (Len=%d) %s", rw.n_todo , trace_array(rw.c_bytes, rw.n_todo ));
    uart_disconnect_check(pLU, &rw);
#ifdef NPI_USE_NLI
    /* Free HDLC buffers */
    if (nliBuffer)
    {
        free(nliBuffer);
    }

    if (encodedBuffer)
    {
        free(encodedBuffer);
    }

    if (r == encodedBufferLen)
    {
	    // Return Non-encoded payload length written to transport
	    return (nbytes);
    }
    else
    {
        return (r);
    }
#else
    return (r);
#endif

}

/*!
 * @brief [private] Code to handl the STREAM_RdBytes() for uarts
 * @param pIO - the io stream
 * @param databytes - pointer to data buffer
 * @param nbytes- count of bytes to read
 * @param timeout_mSecs - read timeout
 *
 * @returns negative on error, 0..actual read
 */
static int _uart_rdBytes(struct io_stream *pIO,
                          void *databytes, size_t nbytes, int timeout_mSecs)
{
    int r = 0;
#ifndef NPI_USE_NLI
    struct unix_fdrw rw;
#endif
    struct linux_uart *pLU;

    pLU = uart_pio_to_plu(pIO);
    if(!pLU)
    {
        return (-1);
    }

#ifndef NPI_USE_NLI
    /* setup common IO routine */
    memset((void *)(&rw), 0, sizeof(rw));

    rw.is_connected  = true;
    rw.type          = 'u';
    rw.rw            = 'r';
    rw.fd            = pLU->h;
    rw.log_prefix    = "uart-rd";
    rw.log_why       = LOG_DBG_UART;
    rw.log_why_raw   = LOG_DBG_UART_RAW;
    rw.v_bytes       = databytes;
    rw.n_todo        = nbytes;
    rw.fifo_handle   = pLU->rx_fifo;
    rw.mSecs_timeout = timeout_mSecs;

    /* use the common code */
    r = UNIX_fdRw(&rw);
    uart_disconnect_check(pLU,&rw);
#else
    if (_uart_pollRxAvail(pLU->pParent, 0) > 0) {
        uint8_t *decodedBytes = pull_hdlc(pLU->h, &r);

        if (decodedBytes)
        {
            // Strip off NLI
            r-=1;
            memcpy(databytes, decodedBytes + 1, r);
#ifdef HDLC_DEBUG
            tr_debug("RD HDLC (Len=%d) %s", r, trace_array(databytes, r));
#endif
            free(decodedBytes);
        }
        else
        {
            tr_error("Unix-RD pull_hdlc buf=NULL ");
            return 0;
        }
    }
    else{
#ifdef HDLC_DEBUG
        tr_debug("HDLC-Read: nByte(%d) RX not available",nbytes);
#endif
    }
#endif
    if (r)
    {   // only dump the RX data when data is not empty
        if (uart_raw_debug)
            tr_debug("Unix-RD (Len=%d) %s", r, trace_array(databytes, r));
    }
    return (r);
}

/*!
 * @brief [private] Poll function for the UART
 * @param pIO - io stream for the uart
 * @param mSec_timeout - timeout period for the poll
 *
 * @returns boolean, true if it is readable within the timeout period
 */
static bool _uart_pollRxAvail(struct io_stream *pIO, int mSec_timeout)
{
    struct unix_fdrw rw;
    struct linux_uart *pLU;
    int r;

    /* retrieve our linux uart */
    pLU = uart_pio_to_plu(pIO);
    if(pLU == NULL)
    {
        return (false);
    }

    /* if we are using the RX thread.. */
    /* we simply check the fifo. */
    if(pLU->rx_fifo)
    {
        r = FIFO_getItemsAvail(pLU->rx_fifo);
    }
    else
    {
        memset((void *)(&rw), 0, sizeof(rw));
        rw.is_connected = true;
        rw.fd           = pLU->h;
        rw.rw           = 'r';
        rw.type         = 'u';
        rw.log_prefix   = "uart-poll";
        rw.log_why      = LOG_DBG_UART;
        rw.log_why_raw  = LOG_DBG_UART_RAW;
        r = POLL_readable(&rw);
        if((r < 0) || (rw.is_error))
        {
            _uart_error(pLU, "poll", NULL);
            r = 0;
        }
    }
    if(r)
    {
        return (true);
    }
    else
    {
        return (false);
    }
}

/*!
 * @brief Close/Deallocate the uart information.
 * @param pLU - pointer to linux uart.
 */
static void _uart_closePtr(struct linux_uart *pLU)
{
    int r;
    int n;

    if(pLU == NULL)
    {
        return;
    }

    /* if we are using a thread, tell it to shut down */
    if(pLU->rx_thread)
    {
        pLU->thread_state = LUTS_exit;
        /* wait for thread to wakeup and acknowledge */
        /* when it does acknowlege, it will exit */
        for(n = 0 ; n < 100 ; n++)
        {
            if(pLU->thread_state != pLU->thread_state)
            {
                /* YEA it has stopped. */
                break;
            }
            else
            {
                /* be power nice. */
                TIMER_sleep(1);
            }
        }
        FIFO_destroy(pLU->rx_fifo);
        /* The thread has exited we don't need to clean up */
        pLU->rx_thread = 0;
    }

    /* do we need to restore the line state? */
    if(pLU->tcs_set)
    {
        r = tcsetattr(pLU->h, TCSANOW, &(pLU->ios_orig));
        if(r < 0)
        {
            _uart_error(pLU, "uart-close-tcsetattr()", NULL);
            /* keep going! */
        }
    }

    /* release our copy of the device name */
    if(pLU->cfg.devname)
    {
        free_const((const void *)(pLU->cfg.devname));
        pLU->cfg.devname = NULL;
    }

    /* Close the handle */
    if(pLU->h > 0)
    {
        close(pLU->h);
        pLU->h = -1;
    }

    if(pLU->pParent)
    {
        STREAM_destroyPrivate(pLU->pParent);
        pLU->pParent = NULL;
    }
    memset((void *)(pLU), 0, sizeof(*pLU));
    /* And release our uart structure */
    free((void *)(pLU));
}

/*!
 * @brief [private] Close the UART
 * @param pIO - the io stream for the uart
 */
static void _uart_close(struct io_stream *pIO)
{
    struct linux_uart *pLU;

    pLU = uart_pio_to_plu(pIO);
    if(pLU)
    {
        _uart_closePtr(pLU);
    }
}

/*!
 * @brief This is the rx thread for the uart
 * @brief h - the linux uart in abstract
 * @returns Nothing meaningful
 */
static intptr_t _uart_rx_thread(intptr_t h)
{
    struct linux_uart *pLU;
    struct unix_fdrw  rw;
    int r;

    /* recover the linux uart */
    pLU = (struct linux_uart *)(h);

    /* mark the new thread state */
    pLU->thread_state = LUTS_alive;

    /* we run until we are toll to exit. */
    while(pLU->thread_state == LUTS_alive)
    {
        if(pLU->pParent->is_error)
        {
            break;
        }
        memset((void *)(&rw), 0, sizeof(rw));
        rw.is_connected  = true;
        rw.fd            = pLU->h;
        rw.type          = 'u';
        rw.log_prefix    = pLU->cfg.devname;
        rw.log_why       = LOG_DBG_UART;
        rw.log_why_raw   = LOG_DBG_UART_RAW;
        rw.rw            = 'r';
        rw.fifo_handle   = pLU->rx_fifo;

        rw.c_bytes       = NULL;
        rw.v_bytes       = NULL;
        rw.n_done        = 0;
        rw.n_todo        = 0;
        rw.mSecs_timeout = 100;

        r = POLL_readable(&rw);
        if((r < 0) || (rw.is_error))
        {
            _uart_error(pLU, "poll error?",NULL);
            continue;
        }
        if(!r)
        {
            /* no data.. */
            continue;
        }

        /* do the transfer */
        r = UNIX_fdRw(&rw);
        if((r < 0) || (rw.is_error))
        {
            _uart_error(pLU, "fifo xfer error", NULL);
        }
    }

    pLU->thread_state = LUTS_dead;
    /* Done */
    return (0);
}

/*!
 * @brief [private] Setup a thread for this uart
 * @param pLU - the linux uart
 */
static void _setup_rx_thread(struct linux_uart *pLU)
{
    /* are we using a thread? */
    if(!UF_isSet(pLU, rd_thread))
    {
        return;
    }

    /* FIFO for *bytes*, depth 4K, with an access mutex. */
    pLU->rx_fifo = FIFO_create(pLU->cfg.devname,
                               sizeof(uint8_t), __4K, true);
    if(pLU->rx_fifo == 0)
    {
        _uart_error(pLU, "no fifo?", "");
        return;
    }

    /* We are going to "give birth" our thread.. */
    pLU->thread_state = LUTS_birth;

    /* Create the thread */
    pLU->rx_thread = THREAD_create(pLU->cfg.devname,
                                    _uart_rx_thread,
                                    (intptr_t)(pLU), 0);

    /* Hmm something is wrong */
    if(pLU->rx_thread == 0)
    {
        _uart_error(pLU, "no rx thread?", "");
        return;
    }
}

/*!
 * @brief Flush the uart transmission
 * @param pIO - the uart stream
 * @returns 0 on success, negative on error
 */
static int _uart_flush(struct io_stream *pIO)
{
    int r;
    struct linux_uart *pLU;

    /* recover our pointer */
    pLU    = uart_pio_to_plu(pIO);
    if(!pLU)
    {
        return (-1);
    }

    /* tell the thing to drain */
    r = tcdrain(pLU->h);
    if(r != 0)
    {
        _uart_error(pLU, "flush()?",NULL);
    }
    return (r);
}

/*!
 * @var STREAM_uart_funcs
 * @brief [private]
 *
 * This is the various functions that provide for the uart
 */
static const struct io_stream_funcs STREAM_uart_funcs = {
    .name          = "uart",
    .close_fn      = _uart_close,
    .wr_fn         = _uart_wrBytes,
    .rd_fn         = _uart_rdBytes,
    .flush_fn      = _uart_flush,
    .poll_fn       = _uart_pollRxAvail
};
/*
 * Create a uart stream
 *
 * Public function defined in stream_uart.h
 */
intptr_t STREAM_createUart(const struct uart_cfg *pCFG)
{
    int r;
    int f;
    struct linux_uart *pLU;

    pLU = NULL;
    /* minimal sanity */
    if(pCFG->devname == NULL)
    {
        //LOG_printf(LOG_ERROR, "uart: no devicename?\n");
        goto fail;
    }

    if(pCFG->baudrate == 0)
    {
        //LOG_printf(LOG_ERROR, "uart: bad baudrate?\n");
        goto fail;
    }

    /* get space for our private stuff */
    pLU = calloc(1, sizeof(*pLU));
    if(!pLU)
    {
        goto fail;
    }

    /* in case this goes bad.. */
    pLU->h = -1;

    /* mark as a valid structure */
    pLU->test_ptr = &uart_test;

    /* Remember things */
    pLU->pParent = STREAM_createPrivate(&STREAM_uart_funcs, (intptr_t)(pLU));
    if( pLU->pParent == NULL )
    {
        _uart_error(pLU, "no memory1?", NULL);
        goto fail;
    }

    /* copy the cfg over */
    pLU->cfg = *pCFG;

    /* convert caller pointer to our pointer */
    pLU->cfg.devname = strdup(pLU->cfg.devname);
    if(pLU->cfg.devname == NULL)
    {
        _uart_error(pLU, "no memory2?", NULL);
        goto fail;
    }

    /* http://tldp.org/HOWTO/Serial-Programming-HOWTO/x115.html */
    f = O_RDWR | O_NOCTTY;
#ifdef NPI_USE_NLI
    f |= O_CLOEXEC;
#endif

#ifndef NPI_USE_NLI
    if(!UF_isSet(pLU, rd_thread))
    {
        f |= O_NONBLOCK;
    }
#endif
    /* get our device. */
    //LOG_printf(LOG_DBG_UART, "open(%s) begin\n", pLU->cfg.devname);
    pLU->h = open(pLU->cfg.devname, f);
    //LOG_printf(LOG_DBG_UART, "open(%s) result=%d\n",
                //pLU->cfg.devname,((int)(pLU->h)));
    if(pLU->h < 0)
    {
        //int err = errno;
        //printf('%i', err);
        goto fail;
    }

    /* setup the thread if needed */
    _setup_rx_thread(pLU);
    if(pLU->pParent->is_error)
    {
        goto fail;
    }


    /* make the file descriptor asynchronous */
    /* Get old flags */
    f = fcntl(pLU->h, F_GETFL, 0);
    if(!UF_isSet(pLU, rd_thread))
    {
        /* using threads mean we *MUST* use blocking */
        f |= FNDELAY;
    }

    /* set the new flags */
    r = fcntl(pLU->h, F_SETFL, f);
    if(r < 0)
    {
        _uart_error(pLU, "FASYNC|FNDELAY",NULL);
        goto fail;
    }

    /* Set RAW MODE, and other line settings */
    /* save current port settings */
    r = tcgetattr(pLU->h, &(pLU->ios_orig));
    if(r < 0)
    {
        _uart_error(pLU, "tcgetattr()", NULL);
        goto fail;
    }

    /* copy unknown fields over */
    /* this way we do not mess up 'hidden' things */
    pLU->ios_new = pLU->ios_orig;

    /* make the terminal raw mode */
    cfmakeraw(&(pLU->ios_new));

    /* Map Baudrate */
    r = -1;

#define _b(X)   case X: r = B ## X; break;
    switch(pLU->cfg.baudrate)
    {
        _b(50);
        _b(75);
        _b(110);
        _b(134);
        _b(150);
        _b(200);
        _b(300);
        _b(600);
        _b(1200);
        _b(1800);
        _b(2400);
        _b(4800);
        _b(9600);
        _b(19200);
        _b(38400);
        _b(57600);
        _b(115200);
        _b(230400);
        _b(460800);
    default:
        r = -1;
        break;
    }
#undef _b

    if(r < 0)
    {
        _uart_error(pLU, "invalid-baudrate",NULL);
        goto fail;
    }

    /* set baudrate */
    cfsetispeed(&(pLU->ios_new), r);
    cfsetospeed(&(pLU->ios_new), r);

    /* we want a polling read not a blocking read */
    pLU->ios_new.c_cc[ VMIN ] = 0;
    /* No timeout! respond immediatly */
    pLU->ios_new.c_cc[ VTIME ] = 0;

    /* flush all IO */
    r = tcflush(pLU->h, TCIFLUSH);
    if(r < 0)
    {
        _uart_error(pLU, "tcflush",NULL);
        goto fail;
    }
    /* set the new line configuration */
    r = tcsetattr(pLU->h, TCSANOW, &(pLU->ios_new));
    if(r < 0)
    {
        _uart_error(pLU, "tcsetattr",NULL);
        goto fail;
    }
#ifndef NPI_USE_NLI
    int bits;
    r = ioctl(pLU->h, TIOCMGET, &bits);
    bits |= TIOCM_RTS;
    bits |= TIOCM_DTR;
    r = ioctl(pLU->h, TIOCMSET, &bits);

    /* we set this, so we need to put it back later */
    pLU->tcs_set = true;
#endif
    if(r<0)
    {
 fail:
        _uart_closePtr(pLU);
        return (0);
    }
    else
    {
        /* all is well */
        return STREAM_structToH(pLU->pParent);
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
