/******************************************************************************

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

#include <stdint.h>
#include <unistd.h>
#include <stdio.h>
#include <stdlib.h>
#include <assert.h>

/* POSIX Header files */
#include <pthread.h>

/* C headers that need extern "C" */
extern "C"
{
/* nanostack header files */
#include "ns_trace.h"
#include "mesh_system.h"
#include "mbedtls_wisun_config.h"
#include "platform/arm_hal_interrupt.h"

/* MT header files */
#include "timer.h"

#ifdef NV_RESTORE
#include "nvocmp.h"
#else
#include "nvintf.h"
#endif

#include "mt_msg.h"
#include "stream_uart.h"
}

#include "CfgParser.hpp"

#define TRACE_GROUP "brro"

/******************************************************************************
 Extern functions
*****************************************************************************/
extern "C"
{
    void ws_br_handler_init();
    void ncp_tasklet_start();
    void rcp_tasklet_start();
    void rcp_init();
}

/******************************************************************************
 Global Variables
*****************************************************************************/

/* NV Function Pointers */
NVINTF_nvFuncts_t *pNV;

bool ncp_enabled = true;

CfgParser cfgParser;

extern "C" bool extAddrFlag;

extern "C" void *mainThread(void *arg0);
extern "C" void ncp_tasklet_start();

uint16_t ncp_socket_port = 0;

/* Stack size in bytes */
#define WISUNTHREADSTACKSIZE 1024

// ----------------------------------------------------------------------------

// all MT interface related contructs: consider moving to a separate file

/*! The interface the API mac uses, points to either the socket or the uart */
struct mt_msg_interface *API_MAC_msg_interface;

struct mt_msg_interface uart_mt_interface = {
    .dbg_name = "uart",
    .is_NPI = false,
    .frame_sync = true,
    .include_chksum = true,
    .hndl = 0,
    .s_cfg = nullptr,
    .u_cfg = nullptr, // must be initialized via uart-cfg section of ini config file
    .rx_thread = 0,
    .tx_frag_size = 0,
    .retry_max = 3,
    .frag_timeout_mSecs = 1000,
    .intermsg_timeout_mSecs = 10000,
    .intersymbol_timeout_mSecs = 100,
    .srsp_timeout_mSecs = 1000,
    .stack_id = 0,
    .len_2bytes = true,
    .rx_handler_cookie = 0,
    .is_dead = false,
    .flush_timeout_mSecs = 100};

static int create_rcp_interface()
{
    int r;

    MT_MSG_init();

    if (API_MAC_msg_interface == nullptr)
    {
        tr_error("msg interface not specified(NULL)\n");
        return (-1);
    }

    r = MT_MSG_interfaceCreate(API_MAC_msg_interface);
    if (r != 0)
    {
        tr_error("Cannot init interface (%d)\n", r);
        return (-1);
    }

    /* We return "other" list semaphore.
    When we get an AREQ, we post here
    If some external event occurs
    We let the caller post here also
    */
    return (0);
}

int rcp_interface_init()
{
    TIMER_init(); // why is this needed - check it //mvtodo

    // Initialize the MT interface
    API_MAC_msg_interface = &uart_mt_interface;

    tr_info("creating RCP interface with UART parameters: devname =  %s, baudrate = %d\n",
            uart_mt_interface.u_cfg->devname, uart_mt_interface.u_cfg->baudrate);

    if (create_rcp_interface() < 0)
    {
        return (-1);
    }

    // consider getting the version from rcp lmac

    // all good
    return (0);
}

// ----------------------------------------------------------------------------
int main(int argc, char **argv)
{

    // Initalize trace
    ns_trace_init();

    if (argc == 1)
    {
        tr_error("Need to pass in a cfg file: Refer to 'Building and Running the project' section in the readme\n");
        return (-1);
    }

    // Read and then apply settings from the config file
    tr_info("Parsing cfg file: %s\n", argv[1]);
    if (cfgParser.parse(argc, argv) == false)
    {
        tr_error("Failed to read or parse input cfg file\n");
        return (-1);
    }

    cfgParser.applySettings(&uart_mt_interface.u_cfg, &ncp_socket_port);

    // Start up NV system
    pNV = new NVINTF_nvFuncts_t();
    if (pNV == nullptr)
    {
        // Handle memory allocation failure
        tr_err("Failed to allocate memory for NV! Stopping Stack here.");
        return -1;
    }

#ifdef NV_RESTORE
    NVOCMP_loadApiPtrs(pNV);
    pNV->initNV(nullptr);
#endif

    tr_info("Starting Router Node\n");

    // Initialize mesh system and start the ns event loop thread
    mesh_system_init();

#ifdef WISUN_RCP_ENABLE
    // Initialize MT interface
    if (rcp_interface_init() < 0)
    {
        return (-1);
    }

    // Create rcp tasklet
    rcp_tasklet_start();

    usleep(100000);

#endif // WISUN_RCP_ENABLE

    // Create ncp tasklet
    ncp_tasklet_start();

    bool addr_ready = false;
    do
    {
        rcp_init();
        usleep(500000); // 500ms sleep
        platform_enter_critical();
        addr_ready = extAddrFlag;
        platform_exit_critical();
    } while (!addr_ready);

    while (true)
    {
        // keep thread alive but inactive
        usleep(1000000);
    }

    return (0);
}
