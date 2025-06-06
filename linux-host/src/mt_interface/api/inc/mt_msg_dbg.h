/******************************************************************************
 @file mt_msg_dbg.h

 @brief TIMAC 2.0 mt msg - debug decoder header

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

#if !defined( MT_MSG_DBG_H )
#define MT_MSG_DBG_H

/* forward declarations */
struct mt_msg_dbg_field;
struct mt_msg_dbg;

/*! contains 'pseudo-globals' when decoding/printing message content */
struct mt_msg_dbg_info {
    /*! the message being printed */
    struct mt_msg *m_pMsg;

    /*! The debug info for the message */
    struct mt_msg_dbg *m_pDbg;

    /*! What interface is this message associated with? */
    struct mt_msg_interface *m_pIface;

    /*! What field number is this? */
    int    m_field_num;

    /*! Where in the io buffer is the start of the payload */
    int    m_idx_start;

    /*! Where in playload are we decoding right now? */
    int    m_idx_cursor;

    /*! Where is the end of the payload */
    int    m_idx_end;

    /*! What is the field we are printing? */
    struct mt_msg_dbg_field *m_pCurField;
};

#define FIELDTYPE_END   0
#define FIELDTYPE_U8    1
#define FIELDTYPE_U16   2
#define FIELDTYPE_U32   3
#define FIELDTYPE_MAXBYTES(n)  (10000 + (n))
#define IS_FIELDTYPE_MAXBYTES(X)  (((X) >= 10000) && ((X) <= 19999))
#define FIELDTYPE_BYTES_N(n)   (20000 + (n))
#define IS_FIELDTYPE_BYTES_N(X)  (((X) >= 20000) && ((X) <= 29999))

/*! A field within a message */
struct mt_msg_dbg_field {
    /*! the field type, ie: FIELDTYPE_U8 */
    int m_fieldtype;

    /*! name to print for this field */
    const char *m_name;

    /*! If this field has a special case handler */
    void(*handler)(struct mt_msg_dbg_info *pW);

    /*! Next field */
    struct mt_msg_dbg_field *m_pNext;
};


/*! Debug information about a message */
struct mt_msg_dbg {
    /*! The command in the message */
    int m_cmd0;
    /*! The second command byte in the message */
    int m_cmd1;

    /*! What to print for debug purposes */
    const char *m_pktName;

    /*! List of fields in the message */
    struct mt_msg_dbg_field *m_pFields;

    /*! Next message in list of all msg debug detail */
    struct mt_msg_dbg *m_pNext;
};


/*!
 * @brief Load a message debug file, return linked list of messages
 * @param filename - filename to load
 * @return NULL on error, otherwise a null terminated linked list of debug info.
 */
struct mt_msg_dbg *MT_MSG_dbg_load(const char *filename);

/*!
 * @brief Free memory associated with a list of messages
 * @param pMsgs - list of message debug info to free
 */
void MT_MSG_dbg_free(struct mt_msg_dbg *pMsgs);

/*!
 * @brief Decode & print detail about specified message.
 *
 * @param pMsg - msg to print.
 * @param pIface - interface associated with this message.
 * @param pDbg - list of all known message debug information to search.
 *
 * If (pDbg == NULL) nothing is printed.
 */
void MT_MSG_dbg_decode(struct mt_msg *pMsg,
                        struct mt_msg_interface *pIface,
                        struct mt_msg_dbg *pDbg);

/*!
 * Linked list of all known message debug information.
 */
extern struct mt_msg_dbg *ALL_MT_MSG_DBG;

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
