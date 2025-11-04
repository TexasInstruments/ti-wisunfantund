/******************************************************************************
 @file nv_linux.c

 @brief TIMAC 2.0 API Linux wrapper of the multi-page NV module

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
 
 
******************************************************************************/

/******************************************************************************
 Includes
******************************************************************************/

#include "nv_linux.h"

#include "stream.h"
#include "log.h"
#include "mutex.h"
#include "fatal.h"
#include "ini_file.h"
#include "bitsnbits.h"
#include "mac_assert.h"

#include <string.h>
#include <malloc.h>    /* for calloc */

/******************************************************************************
 Constants and definitions
******************************************************************************/

// nvocmp.c defines

// CC26x2/CC13x2 devices flash page size is (1 << 13) or 0x2000
#define PAGE_SIZE_LSHIFT 13
#if !defined (FLASH_PAGE_SIZE)
#define FLASH_PAGE_SIZE  (1 << PAGE_SIZE_LSHIFT)
#endif // FLASH_PAGE_SIZE

#ifndef NVOCMP_NVPAGES
#define NVOCMP_NVPAGES      2     //1 ~ 5 are supported
#endif

#if (NVOCMP_NVPAGES > 5)
#error "NVOCMP_NVPAGES should be in between 1 and 5"
#endif

// NVS.h defines
#define NVS_STATUS_SUCCESS          (0)

// Linux specific defines
#if !defined (SNV_FIRST_PAGE)
#define SNV_FIRST_PAGE  0x00
#endif

static uint32_t nvBegPage = SNV_FIRST_PAGE;
static uint32_t nvEndPage = (SNV_FIRST_PAGE + NVOCMP_NVPAGES - 1);
static uint32_t nvPageSize = FLASH_PAGE_SIZE;

/******************************************************************************
 Local variables
******************************************************************************/

bool linux_CONFIG_NV_RESTORE;
#ifdef DEVICE_TYPE_BORDER_ROUTER 
static const char _nv_default_filename[] = "nv-simulation-br.bin";
#else
static const char _nv_default_filename[] = "nv-simulation-rn.bin";
#endif
static const char *NV_filename = _nv_default_filename;
static uint8_t    *NV_ramSim;
static unsigned    NV_ramLength;

/******************************************************************************
 API Functions - NV driver
*******************************************************************************/
/*!
 * @brief simulate embedded macro to calculate flash byte location
 * @param pg - page
 * @param ofs - offset into page
 * @returns pointer to the specific byte
 */
static uint8_t *NVOCMP_FLASHADDR(uint32_t pg, uint32_t ofs)
{
    uint8_t *p;
    uint32_t x;

    x = (((pg) * FLASH_PAGE_SIZE) + ofs);
    p = NV_ramSim;
    p = p + x;
    return (p);
}


/*
  Initialize the NV simulation.

  Public function defined in nv_linux.h
 */
void NV_LINUX_init(void)
{
    /* Load the simulation file.. */
    NV_LINUX_load();
}

/*!
 * @brief Load the NV simulation file from disk.
 */
void NV_LINUX_load(void)
{
    int r;
    int64_t filesize;
    intptr_t s;

    NV_ramLength = (nvEndPage - nvBegPage + 1) * nvPageSize;

    /* Get memory for the NV implimentation */
    NV_ramSim = calloc(1,NV_ramLength);
    if(!NV_ramSim)
    {
        tr_err("NV no ram\n");
    }

    /* simuate erased data */
    memset(NV_ramSim, NVOCMP_ERASEDBYTE, NV_ramLength);

    /* Load Linux NV RAM simulation */
    if(NV_filename == NULL)
    {
        /* the filename should be specified in the ini file */
        tr_err("missing nv filename");
    }

    // if(!CONFIG_NV_RESTORE) //CADEN -- this is original implementation, bases this on the .ini file at runtime.
    if(!STREAM_FS_fileExists(NV_filename)) // for now use the file if it exists
    {
        tr_warn("config: Not using NV Restore, clearing old NV file\n");
        goto over_write;
    }

    filesize = STREAM_FS_getSize(NV_filename);
    /* if the file exists then load it */
    if(filesize == NV_ramLength)
    {
        s = STREAM_createRdFile(NV_filename);
        if(s == 0)
        {
            tr_err("Failed to load %s\n", NV_filename);
            MAC_ASSERT(0);
            return;
        }
        r = STREAM_rdBytes(s, NV_ramSim, NV_ramLength, 0);
        if(r != ((int)NV_ramLength))
        {
            tr_error("nvram: %s, expected %d, got %d\n",
                         NV_filename,
                         NV_ramLength,
                         r);
            MAC_ASSERT(0);
            return;
        }
        tr_info("nvram: Loaded: %s, length=%d\n",
                   NV_filename,
                   NV_ramLength);
    }
    else
    {
    over_write:
        tr_info("nvram: creating: %s\n", NV_filename);
        /* we just write it */
        NV_LINUX_save();
    }
}

/*!
 * @brief  Save the NV simulation to disk
 */
void NV_LINUX_save(void)
{
    intptr_t s;
    int r;

    tr_info("nvram: save: %s, length=%d\n",
               NV_filename,
               NV_ramLength);

    s = STREAM_createWrFile(NV_filename);
    if(s == 0)
    {
        tr_err("Failed to save %s\n", NV_filename);
        MAC_ASSERT(0);
        return;
    }
    r = STREAM_wrBytes(s, NV_ramSim, NV_ramLength, 0);
    STREAM_close(s);

    if(r != (int)NV_ramLength)
    {
        tr_err("%s: Cannot write %d bytes, wrote: %d instead\n",
                     NV_filename,
                     NV_ramLength,
                     r);
    }
}

/*!
 *@brief Simulate embedded macro for NVS_read
 */
int_fast16_t NV_LINUX_read(uint8_t pg, uint16_t off, uint8_t *pBuf, uint16_t len)
{
    /* Aboslute address of Flash data block */
    uint8_t *addr = NVOCMP_FLASHADDR(pg, off);
    memmove((void *)(pBuf), (void *)(addr), len);
    tr_debug("read: pg:%d, ofs=0x%04x, num=%d\n", pg, off, len);
    return NVS_STATUS_SUCCESS;
}

/*!
 *@brief Simulate embedded macro for NVS_write
 */
int_fast16_t NV_LINUX_write(uint8_t dstPg, uint16_t off, uint8_t *pBuf, uint16_t len)
{
    uint8_t *pDst;
    pDst = NVOCMP_FLASHADDR(dstPg, off);
    tr_debug("write: pg:%d, ofs=0x%04x, num=%d\n", dstPg, off, len);
    memmove(pDst, pBuf, len);
    return NVS_STATUS_SUCCESS;
}

/*!
 *@brief Simulate embedded macro for NVS_erase
 */
int_fast16_t NV_LINUX_erase(uint8_t dstPg)
{
    uint8_t *pBuf;
    pBuf = NVOCMP_FLASHADDR(dstPg, 0);
    memset((void *)(pBuf), NVOCMP_ERASEDBYTE, nvPageSize);
    return NVS_STATUS_SUCCESS;
}

/*
   CURRENTLY UNUSED
   Process the INI file settings

   Public function in nv_linux.h
 */
// int NV_LINUX_INI_settings(struct ini_parser *pINI, bool *handled)
// {
//     tr_info("called here!");
//     if(INI_itemMatches(pINI, "nv", "filename"))
//     {
//         if(NV_filename)
//         {
//             /*
//                Thou shall not 'free' a constant string!
//                aka: the default filename
//              */
//             if(NV_filename != _nv_default_filename)
//             {
//                 free_const((const void *)NV_filename);
//             }
//             NV_filename = NULL;
//         }
//         NV_filename = INI_itemValue_strdup(pINI);
//         *handled = true;
//         return (0);
//     }

//     if(INI_itemMatches(pINI, "nv", "page-size-bytes"))
//     {
//         nvPageSize = INI_valueAsInt(pINI);
//         *handled = true;
//         return (0);
//     }

//     if(INI_itemMatches(pINI, "nv", "num-pages"))
//     {
//         nvEndPage = nvBegPage + INI_valueAsInt(pINI);
//         *handled = true;
//         return (0);
//     }

//     if(INI_itemMatches(pINI, "nv", "reserved-pages"))
//     {
//         /* how many pages do we have now? */
//         int n;
//         n = nvEndPage - nvBegPage;
//         nvBegPage = INI_valueAsInt(pINI);
//         nvEndPage = nvBegPage + n;

//         *handled = true;
//         return (0);
//     }

//     /* unknown */
//     return (0);
// }

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