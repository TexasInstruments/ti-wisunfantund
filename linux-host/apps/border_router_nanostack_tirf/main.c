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

/* POSIX Header files */
#include <pthread.h>

/* nanostack header files */
#include "ns_trace.h"
#include "mesh_system.h"
#include "mbedtls_wisun_config.h"

#ifdef NV_RESTORE
#include "nvocmp.h"
#else
#include "nvintf.h"
#endif

#include "mt_msg.h"
#include "stream_uart.h"

#define TRACE_GROUP "brro"

/******************************************************************************
 Extern functions
 *****************************************************************************/
extern void ws_br_handler_init();
extern void ncp_tasklet_start();

/******************************************************************************
 Global Variables
 *****************************************************************************/

 /* NV Function Pointers */
 NVINTF_nvFuncts_t* pNV;

bool ncp_enabled = true;

extern bool extAddrFlag; 

extern void *mainThread(void *arg0);
extern void ncp_tasklet_start();

/* Stack size in bytes */
#define WISUNTHREADSTACKSIZE    1024


// ----------------------------------------------------------------------------

void assertHandler(void)
{
    tr_err("Asserted! Exiting now.");
    return -1;
}

//all MT interface related contructs: consider moving to a separate file 

/*! The interface the API mac uses, points to either the socket or the uart */
struct mt_msg_interface *API_MAC_msg_interface;

/*! UART configuration for apimac if talking to UART instead of npi */
struct uart_cfg   uart_cfg = {
    .devname = "/dev/ttyACM0",
    .baudrate = 115200,
    .open_flags = STREAM_UART_FLAG_default
};

struct mt_msg_interface uart_mt_interface = {
    .dbg_name                  = "uart",
    .is_NPI                    = false,
    .frame_sync                = true,
    .include_chksum            = true,
    .hndl                      = 0,
    .s_cfg                     = NULL,
    .u_cfg                     = &uart_cfg,
    .rx_thread                 = 0,
    .tx_frag_size              = 0,
    .retry_max                 = 3,
    .frag_timeout_mSecs        = 1000,
    .intermsg_timeout_mSecs    = 10000,
    .intersymbol_timeout_mSecs = 100,
    .srsp_timeout_mSecs        = 1000,
    .stack_id                  = 0,
    .len_2bytes                = true,
    .rx_handler_cookie         = 0,
    .is_dead                   = false,
    .flush_timeout_mSecs       = 100
};


static void *create_rcp_interface(void)
{
    int r;

    MT_MSG_init();

    if( API_MAC_msg_interface == NULL )
    {
        //BUG_HERE("msg interface not specified(NULL)\n");
    }

    r = MT_MSG_interfaceCreate(API_MAC_msg_interface);
    if(r != 0)
    {
        FATAL_printf("Cannot init interface (%d)\n", r);
    }

    /* Reset device for initialization */
    //resetCoPDevice(); //mvtodo : should this be done? ignoring for now

    /* We return "other" list semaphore.
       When we get an AREQ, we post here
       If some external event occurs
       We let the caller post here also
    */
    return ((void *)(API_MAC_msg_interface->rx_list.sem));
}

void rcp_interface_init(void)
{
    TIMER_init(); //why is this needed - check it //mvtodo
    
    // Initialize the MT interface
    API_MAC_msg_interface = &uart_mt_interface;

    //mvtodo: for now ignoring the async response semaphore 
    create_rcp_interface();

    //consider getting the version from rcp lmac 
} 


// ----------------------------------------------------------------------------
int main() {
    // Initalize trace
    ns_trace_init();

    // Start up NV system
    pNV = (NVINTF_nvFuncts_t *)malloc(sizeof(NVINTF_nvFuncts_t));
    if (pNV == NULL) {
        // Handle memory allocation failure
        tr_err("Failed to allocate memory for NV! Stopping Stack here.");
        return -1;
    }

#ifdef NV_RESTORE
    NVOCMP_loadApiPtrs(pNV);
    pNV->initNV(NULL);
#endif

    tr_info("Starting Border Router\n");

#ifdef DONT_USE_THIS
    pthread_t           thread;
    pthread_attr_t      attrs;
    struct sched_param  priParam;
    int                 retc;

    /* Initialize the attributes structure with default values */
    pthread_attr_init(&attrs);
    ncp_enabled = false;

    /* Set the scheduling policy to Round Robin */
    struct sched_param  schedParam;
    schedParam.sched_priority = 0;
    retc = pthread_attr_setschedpolicy(&attrs, SCHED_RR);
    if (retc != 0) {
        /* failed to set scheduling policy */
        tr_err("Failed to set scheduling policy. retc: %i\n", retc);
        while (1) {}
    }

    int minPriority = sched_get_priority_min(SCHED_RR);
    int maxPriority = sched_get_priority_max(SCHED_RR);

    /* Set priority, detach state, and stack size attributes */
    priParam.sched_priority = 1;
    retc = pthread_attr_setschedparam(&attrs, &priParam);
    retc |= pthread_attr_setdetachstate(&attrs, PTHREAD_CREATE_DETACHED);
    // retc |= pthread_attr_setstacksize(&attrs, WISUNTHREADSTACKSIZE);
    if (retc != 0) {
        /* failed to set attributes */
        tr_err("Failed to set pthread attributes. retc: %i\n", retc);
        while (1) {}
    }

    retc = pthread_create(&thread, &attrs, mainThread, NULL);
    if (retc != 0) {
        /* pthread_create() failed */
        while (1) {}
    }

    // Initialize mesh system and start the event loop thread
    mesh_system_init();
#else
    // Initialize mesh system and start the ns event loop thread
    mesh_system_init();    

    // Initialize ws br handles = -1 before starting the ncp tasklet
    ws_br_handler_init();

#ifdef WISUN_RCP_ENABLE
    //Initialize MT interface 
    rcp_interface_init();

    //Create rcp tasklet
    rcp_tasklet_start();

    usleep(100000);
    
    rcp_init();

    while (extAddrFlag == false) {
        usleep(100000); // 100ms sleep
    }

#endif //WISUN_RCP_ENABLE

    // Create ncp tasklet
    ncp_tasklet_start(); 

#endif //DONT_USE_THIS

    while(true){
        sleep(100);
    }

    return (0);
}