/******************************************************************************
 @file nv_linux.h

 @brief TIMAC 2.0 API nv_linux.h NV implimentation for linux.

 Group: CMCU LPC
 Target Device: Linux

 ******************************************************************************
 
 Copyright (c) 2019-2025, Texas Instruments Incorporated
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

 #ifndef NV_LINUX_H
 #define NV_LINUX_H
 
 /******************************************************************************
  Includes
  *****************************************************************************/
 
 #include <nvocmp.h>
 #include <stdint.h>
 #include <stdbool.h>
 
 #ifdef __cplusplus
 extern "C"
 {
 #endif

 #include "ns_trace.h"

 #define TRACE_GROUP "NV"
 
 /******************************************************************************
  Constants and definitions
  *****************************************************************************/
 
 // Defines used by the nvocmp source files
 #define FALSE false
 #define TRUE true
 
 /* forward declaration so that this file does not depend upon 'ini_file.h' */
 struct ini_parser;
 
 /* This is a linux specific CONFIG.H, in the embedded world this feature
  * is hard coded at compile time, in the Linux implimentation this feature
  * can be set via the configuration file. hence, the variable
  * linux_CONFIG_NV_RESTORE masquerades as a compile time constant.
  */
 extern bool linux_CONFIG_NV_RESTORE;
 /*! Should the application restore state from the NV simulation file? */
 #define CONFIG_NV_RESTORE linux_CONFIG_NV_RESTORE
 
 // Contents of an erased Flash memory locations
 #define NVOCMP_ERASEDBYTE   0xFF
 
 // Linux simulation handle for the NVS driver
 #define NVS_HANDLE (uint32_t*)1
 
 /*!
  *  @brief forward declaration to remove dependency on NVS.h (simulation only)
  */
 typedef struct
 {
     void   *regionBase;   /*!< Base address of the NVS region. If the NVS
                                region is not directly accessible by the MCU
                                (such as SPI flash), this field will be set to
                                #NVS_REGION_NOT_ADDRESSABLE. */
     size_t  regionSize;   /*!< NVS region size in bytes. */
     size_t  sectorSize;   /*!< Erase sector size in bytes. This attribute is
                                device specific. */
 } NVS_Attrs;
 
 // Simulated handle for the NVS driver
 typedef uint32_t* NVS_Handle;
 
 /******************************************************************************
  Macros
 ******************************************************************************/
 
 #define NVOCMP_ALERT(cond, message) { \
     if(!(cond)) tr_warn("NVOCMP_ALERT: message=%s\n", (message)); }
 #define NVOCMP_ASSERT(cond, message) { \
     if(!(cond)) tr_err("NVOCMP_ASSERT: message=%s\n", (message)); }
 #define NVOCMP_FLASHACCESS(err) { (err) = 0; }
 
 /******************************************************************************
  Functions
 ******************************************************************************/
 
 /*
  * @brief Initialize the NV module as a whole.
  */
 void NV_LINUX_init(void);
 
 /*
  * @brief Load the NV simulation file from disk
  */
 void NV_LINUX_load(void);
 
 /*!
  * @brief Save the NV simulation file to disk
  */
 void NV_LINUX_save(void);
 
 /*!
  *@brief Simulation of embedded macro NVS_read
  */
 int_fast16_t NV_LINUX_read(uint8_t pg, uint16_t off, uint8_t *pBuf,
                            uint16_t len);
 
 /*!
  *@brief Simulation of embedded macro NVS_write
  */
 int_fast16_t NV_LINUX_write(uint8_t dstPg, uint16_t off, uint8_t *pBuf,
                             uint16_t len);
 
 /*!
  *@brief Simulation of embedded macro NVS_erase
  */
 int_fast16_t NV_LINUX_erase(uint8_t dstPg);
 
 /*
  * @brief Process NV items from the configuration file
  * @returns 0 success
  *
  * this is used as one of the callbacks for the INI_read() function.
  */
 extern int NV_LINUX_INI_settings(struct ini_parser *pINI, bool *handled);
 
 #ifdef __cplusplus
 }
 #endif
 
 #endif /* NV_LINUX_H */
 
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
 