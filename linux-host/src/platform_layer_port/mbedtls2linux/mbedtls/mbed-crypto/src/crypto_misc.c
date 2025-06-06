/******************************************************************************

 @file crpto_misc.c 

 @brief mbedTLS debug function patch

 Group: CMCU, LPC
 $Target Device: DEVICES $

 ******************************************************************************
 $License: BSD3 2016 $
 ******************************************************************************
 $Release Name: PACKAGE NAME $
 $Release Date: PACKAGE RELEASE DATE $
 *****************************************************************************/
 
/**
 * when disabling MBEDTLS_SSL_DEBUG_ALL and MBEDTLS_DEBUG_C in
 * openthread/etc/ti/CC26X2R1_LAUNCHXL/ccs/config/mbedtls_config-cc1352 or
 * openthread/etc/ti/CC26X2R1_LAUNCHXL/ccs/config/mbedtls_config-cc2652
 * during linkage, we saw the error
 * `<Linking>`
 
 * undefined                   first referenced
 * symbol                         in file     
 * ---------                   ----------------
 * mbedtls_debug_set_threshold <whole-program> 
 
 * The root cause is that 
 * 1. mbedtls_debug_set_threshold is called in dlts.cpp (openthead)
 * 2. when MBEDTLS_SSL_DEBUG_ALL and MBEDTLS_DEBUG_C are disabled, this function
 *   is not built in mbedTLS lib
 * 3. during the link, you will see this error.
 
 * In order to fix this issue.
 * 1. when MBEDTLS_SSL_DEBUG_ALL and MBEDTLS_DEBUG_C are disabled, don't call this
 *   function. This means we need to modify the openthread code.
 * 2. when MBEDTLS_SSL_DEBUG_ALL and MBEDTLS_DEBUG_C are disabled, in mbedTLS we build
 *   dummy mbedtls_debug_set_threshold. This means we need to modify the mbedTLS
 *   code.
 * 3. in application code, we provide the dummy mbedtls_debug_set_threshold.
 
 * We prefer the option 3.
 
 */ 
 
#if !defined(MBEDTLS_CONFIG_FILE)
#include "mbedtls/config.h"
#else
#include MBEDTLS_CONFIG_FILE
#endif
 
#if !defined(MBEDTLS_DEBUG_C)

void mbedtls_debug_set_threshold( int threshold )
{
    (void) threshold;
}

#endif
