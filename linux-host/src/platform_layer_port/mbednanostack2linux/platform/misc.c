/******************************************************************************

 @file misc.c

 @brief platform specific misc items.

 Group: CMCU, LPC
 $Target Device: DEVICES $

 ******************************************************************************
 $License: BSD3 2016 $
 ******************************************************************************
 $Release Name: PACKAGE NAME $
 $Release Date: PACKAGE RELEASE DATE $
 *****************************************************************************/

#include <openthread/config.h>

#include <openthread/platform/misc.h>

#include "ns_trace.h"

#define TRACE_GROUP "misc"

/**
 * Function documented in platform/misc.h
 */
void otPlatReset(otInstance *aInstance)
{
    (void)aInstance;
    tr_err("otPlatReset called, not supported on this platform! Looping forever.");
    while(true);
}

/**
 * Function documented in platform/misc.h
 */
otPlatResetReason otPlatGetResetReason(otInstance *aInstance)
{
    (void)aInstance;
    return OT_PLAT_RESET_REASON_UNKNOWN;
}

void otPlatWakeHost(void)
{
    tr_warn("otPlatWakeHost is unimplemented!");
}
