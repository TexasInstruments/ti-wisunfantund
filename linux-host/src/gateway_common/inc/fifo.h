/******************************************************************************
 @file fifo.h

 @brief TIMAC 2.0 API generic fifo interface

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

#if !defined(FIFO_H)
#define FIFO_H

/** ============================================================================
 *  Overview
 *  ========
 *
 *  This impliments the classic FIFO data structure.
 *
 *  ============================================================================
 */

#include <stdint.h>
#include <stdbool.h>
#include <stddef.h>

#ifdef __cplusplus
extern "C"
{
#endif

/*!
 * @brief create a fifo
 *
 * @param name       - usable string for debug purposes.
 * @param item_size  - size of 1 item in the fifo
 * @param fifo_depth - how deep (in items) is the fifo
 * @param use_mutex  - if true, a mutex will be allocated to protect this fifo.
 *
 * @return success: non-zero handle upon success.
 */
intptr_t FIFO_create(const char *name,
                      size_t item_size,
                      size_t fifo_depth,
                      bool use_mutex);

/*!
 * @brief Destroy a fifo
 *
 * @param h - handle returned by FIFO_create()
 *
 */
void FIFO_destroy(intptr_t h);

/*!
 * @brief stdio library style fgetc() function for a fifo.
 *
 * @param h - the fifo handle returned by FIFO_create()
 *
 * @return EOF (when empty), or the unsigned char returned as an integer
 *
 * Note: This assumes the underlying item_size is 1 byte
 */
int FIFO_fgetc(intptr_t h);

/*!
 * @brief stdio library style fputc() function for a fifo.
 *
 * @param c - the byte to write
 * @param h - the fifo handle returned by FIFO_create()
 *
 * @return -1 on error, or the unsigned byte cast to an integer
 *
 * Note: This assumes the underlying item_size is 1 byte
 */
int FIFO_fputc(int c, intptr_t h);

/*!
 * @brief How many items can be put into the FIFO?
 *
 * @param h - the fifo handle returned by FIFO_create()
 *
 * @returns negative on error(invalid handle), or 0..fifo_depth
 */
int FIFO_getSpaceAvail(intptr_t h);

/*!
 * @brief How many items are in the fifo already
 *
 * @param h - the fifo handle returned by FIFO_create()
 *
 * @returns negative on error(invalid handle), or 0..fifo_depth
 */
int FIFO_getItemsAvail(intptr_t h);

/*!
 * @brief Insert items (n) into the fifo
 *
 * @param h - the fifo handle returned by FIFO_create()
 * @param pDdata - pointer to the data to insert
 * @param cnt    - number of items
 *
 * @returns negative on error (invalid handle), or 0..actual inserted
 *
 * This is equal to: FIFO_insertWithTimeout(h, pData, cnt, 0);
 */
int    FIFO_insert(intptr_t h, const void *pData, size_t cnt);

/*!
 * @brief Insert items (n) into the fifo with timeout
 *
 * @param h - the fifo handle returned by FIFO_create()
 * @param pDdata - pointer to the data to insert
 * @param cnt    - number of items
 * @param timeout_mSecs - timeout (wait for spae)
 *
 * @returns negative on error (invalid handle), or 0..actual inserted
 */
int FIFO_insertWithTimeout(intptr_t h,
                            const void *pData,
                            size_t cnt,
                            int timeout_mSecs);

/*!
 * @brief Remove items (n) from the fifo
 *
 * @param h - the fifo handle returned by FIFO_create()
 * @param pDdata - items will be placed herepointer to the data to insert
 * @param cnt    - number of items
 *
 * @returns negative on error (invalid handle), or 0..actual removed
 *
 * This is equal to: FIFO_removeWithTimeout(h, pData, cnt, 0);
 */
int    FIFO_remove(intptr_t h, void *pdata, size_t cnt);

/*!
 * @brief Remove items (n) from the fifo
 *
 * @param h - the fifo handle returned by FIFO_create()
 * @param pDdata - items will be placed herepointer to the data to insert
 * @param cnt    - number of items
 * @param timeout_mSecs - timeout in miliseconds
 *
 * @returns negative on error (invalid handle), or 0..actual removed
 *
 */
int    FIFO_removeWithTimeout(intptr_t h,
                               void *pdata,
                               size_t cnt,
                               int timeout_mSecs);

/*!
 * @brief Get parameters to support zero-copy into fifo (for example DMA usage)
 *
 * @param h - the fifo handle returned by FIFO_create()
 * @param ppData - pointer-pointer for the data transfer pointer
 * @param item_count - pointer to the count of items that can be removed
 * @param item_size  - how big each item is
 *
 * @returns negative if handle is invalid.
 *
 * Example:
 * \code
 *      // In the DMA start-transfer, do this:
 *      FIFO_insertDMA_setup(h, &pBuf, &n, &s);
 *
 *      // Presumably a DMA hardware would do this
 *      nbytes = n * s;
 *      while(nbytes){
 *         UART_putc(*pBuf);
 *         pBuf++;
 *         nbytes--;
 *      }
 *
 *      // the dma end-of-transfer interrupt would do this
 *      FIFO_insertDMA_update(h, n);
 * \endcode
 */
int  FIFO_insertDMA_setup(intptr_t h,
                           void **pData,
                           size_t *item_count,
                           size_t *item_size);

/*!
 * @brief Called affter DMA insert operation is complete, updates the fifo
 *
 * @param h - the fifo handle returned by FIFO_create()
 * @param actual - the actual count transfered
 *
 * Note: If the actual count is zero this function can be optionally skipped.
 *
 */
void FIFO_insertDMA_update(intptr_t h, size_t actual);

/*!
 * @brief Get parameters to suppor zero-copy from fifo (for example DMA usage)
 *
 * @param h - the fifo handle returned by FIFO_create()
 * @param ppData - pointer-pointer for the data transfer pointer
 * @param item_count - pointer to the count of items that can be inserted
 * @param item_size  - how big each item is
 *
 * @returns negative if handle is invalid.
 *
 * Example:
 * \code
 *      // In the DMA start start transfer, do this:
 *      FIFO_removeDMA_setup(h, &pBuf, &n, &s);
 *
 *      // Presumably a DMA hardware would do this
 *      nbytes = n * s;
 *      while(nbytes){
 *         *pBuf = UART_GetByte()
 *         pBuf++;
 *         nbytes--;
 *      }
 *
 *      // the dma end-of-transfer interrupt would do this
 *      FIFO_insertDMA_update(h, n);
 * \endcode
 */
int  FIFO_removeDMA_setup(intptr_t h,
                           void **pData,
                           size_t *item_count,
                           size_t *item_size);

/*!
 * @brief Called affter DMA Remove operation is complete; updates the fifo
 *
 * @param h - the fifo handle returned by FIFO_create()
 * @param actual - the actual count transfered
 *
 * Note: If the actual count is zero this function can be optionally skipped.
 */
void FIFO_removeDMA_update(intptr_t h, size_t actual);

/*!
 * @brief Wait for data to inserted into the fifo
 * @param h - fifo handle from FIFO_create() with mutex = true
 * @param mSec_timeout - how long to wait.
 * @returns negative on error, 0(timeout) postive you should check the fifo.
 */
int FIFO_waitForInsert(intptr_t h, int mSec_timeout);

/*!
 * @brief Wait for data to be removed
 * @param h - fifo handle from FIFO_create() with mutex = true
 * @param mSec_timeout - how long to wait.
 * @returns negative on error, 0(timeout) postive you should check the fifo.
 */
int FIFO_waitForRemove(intptr_t h, int mSec_timeout);

#ifdef __cplusplus
}
#endif

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

