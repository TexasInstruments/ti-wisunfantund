/******************************************************************************
 @file ini_file.h

 @brief TIMAC 2.0 API Parse INI files to configure appliations

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
#include <stdbool.h>
#include <stdarg.h>

/*
 * @file ini_file.h
 *
 * @brief This parses Windows style INI file used for configuration
 *
 * The general form of an ini file that is supported is shown below
 * Note this code has a reasonable limit on the INI file line length
 * all lines must be less then 4K bytes.
 *
 * \code
 *   ;; Comment..
 *   [strings]
 *   quoted = "Hichhiker\'s Guide To the Galaxy"
 *   noquote = Hello world how are you
 *   quoted2 = "  leading spaces"
 *   quoted3 = "trailing spaces "
 *
 *   [numbers]
 *   decnumber = 42
 *   hexnumber = 0x42
 *   octnumber = 042
 *   ; An astrix is decimal 42 also
 *   singlequote = '*'
 * \endcode
 *
 * Example C Code that uses this
 * =============================
 *
 * \code
 * int my_ini_callback(struct ini_rd_detail *pINI)
 * {
 *      // Just check one item
 *      if(INI_itemMatches(pINI, "numbers", NULL)){
 *          printf("We are in the numbers section\n");
 *      }
 *      // check both items
 *      if(INI_itemMatches(pINI, "numbers", "decnumber")){
 *          v = INI_valueAsInt(pINI);
 *          if(pINI->is_error){
 *               printf("%s:%d: Not a number!\n",
 *                  pINI->filename, pINI->lineno);
 *               // Tell parser to stop ... we have a problem
 *               return (-1);
 *          }
 *          printf("The value is: %d\n", v);
 *          return 0;
 *      }
 *      // we could do more checks here
 *      return 0;
 * }
 *
 * int main(...)
 * {
 *     INI_Read("myconfig.ini", my_ini_callback, 0);
 * }
 * \endcode
 *
 */
#if !defined(INI_FILE_H)
#define INI_FILE_H

/* Forward delcoration */
struct ini_parser;

/*!
 * @typedef ini_rd_callback
 * @param pIPD - parse details, see ini_parser
 * @param handled - set to true if the item was handled.
 * @return 0 to keep going, negative to stop (this is not an error)
 *
 * This is the callback handler used by the INI file parser.
 * the user (application) provides this function to the ini file parser
 *
 * To declare an error in the callback, you have 2 options
 * - Option 1: Call INI_syntaxError(), or
 * - Option 2: Set pIPD->is_error = true
 *
 */

typedef int ini_rd_callback(struct ini_parser *pINI, bool *handled);

/*!
 * @struct ini_parser
 *
 * @brief provides details to the parser callback while parsing an INI file
 */

struct ini_parser {
    /* did an error occur? */
    bool is_error;

    /* have we already dequoted the value? */
    bool did_dequote;

    /* stream we are reading from */
    intptr_t stream;

    /* the current callback function */
    ini_rd_callback *callback_fn;
    /* for use by the callback */
    intptr_t client_cookie;

    /* filename we are reading */
    const char *filename;
    /* line number we are reading */
    int lineno;

    /* parser uses for its working storage */
    char workbuf[4096];
    /* current section name */
    char cur_section[50];
    /* the name is NULL or points into the workbuffer */
    char *item_name;
    /* the value is NULL or points into the workbuffer */
    char *item_value;
};

/*!
 * @brief strdup() the value and return it.
 * @return strdup'ed value or null on error
 *
 * If strdup() fails, an appropriate log message is created.
 */
char *INI_itemValue_strdup(struct ini_parser *pINI);

/*!
 * @brief Determine if the value is a simple integer
 * @param pINI - current parser information
 * @param value - the value is stored here if function returns true
 * @returns boolean true if tests pass.
 */
bool INI_isValueInt(struct ini_parser *pINI, int *value);

/*!
 * @brief Determine if the value is a simple integer
 * @param pINI - current parser information
 * @param value - the value is stored here if function returns true
 * @returns boolean true if tests pass.
 */
int INI_valueAsInt(struct ini_parser *pINI);

/*!
 * @brief Determine if the value is a unsigned 64bit number
 * @param pINI - current parser information
 * @param value - the value is stored here if function returns true
 * @returns true if tests pass.
 */
bool INI_isValueBool(struct ini_parser *pINI, bool *value);

/*!
 * @brief Determine if the value is a unsigned 64bit number
 * @param pINI - current parser information
 * @returns boolean true if tests pass.
 */
bool INI_isValueU64(struct ini_parser *pINI, uint64_t *value);

/*!
 * @brief Determine if the value is a Signed 64bit number
 * @param pINI - current parser information
 * @param value - the value is stored here if function returns true
 * @returns boolean true if tests pass.
 */
bool INI_isValueS64(struct ini_parser *pINI, int64_t *value);

/*!
 * @brief Determine if the value is a double, or not
 * @param pINI - current parser information
 * @param value - the value is stored here if function returns true
 * @returns boolean true if tests pass.
 */
bool INI_isValueDouble(struct ini_parser *pINI, double *value);

/*!
 * @brief Log an error message about the syntax error at the current file & line
 * @param pINI - current parser details
 * @param fmt - printf like error message.
 *
 * Prints:   <time> filename:lineno: Error:  <your message here>
 * You must supply the NEWLINE in your fmt output.
 */
void INI_syntaxError(struct ini_parser *pINI, const char *fmt, ...);

/*!
 * @brief Building block for INI_syntaxError()
 * @param pINI - current parser details
 * @param fmt - printf like error message.
 * @param ap - va_list for the format
 *
 */
void INI_vsyntaxError(struct ini_parser *pINI, const char *fmt, va_list ap);

/*!
 * @brief convert current text item into a double precision value
 * @param pINI - current parser details
 * @returns the value, see 'is_error' to determine error conditions
 *
 */
double INI_valueAsDouble(struct ini_parser *pINI);

/*!
 * @brief convert current text item into an unsigned 64bit value
 * @param pINI - current parser details
 * @returns the value, see 'is_error' to determine error conditions
 *
 */
uint64_t INI_valueAsU64(struct ini_parser *pINI);

/*!
 * @brief convert current text item into an signed 64bit value
 * @param pINI - current parser details
 * @returns the value, see 'is_error' to determine error conditions
 */
int64_t  INI_valueAsS64(struct ini_parser *pINI);

/*!
 * @brief convert current text item as a boolean
 * @param pINI - the parse details
 * @returns boolean based upon findings in the item name
 *
 * A wide variety of true/false things are supported.
 */
bool INI_valueAsBool(struct ini_parser *pINI);

/*!
 * @brief Dequote the current item and handle any escaped bytes
 * @param pINI - the current parser details
 *
 * @returns negative on parse error, 0..actual length
 *
 * Note: in some cases the converted string might contain null bytes.
 *
 * The data is located in the "workbuffer" and
 * is pointed to by the "item_value"
 *
 * The quotes must match, if the string begins with a single quote
 * the string must end with a single quote, internally any
 * escaped values must be coherent, all of the C string escapes work
 */
int  INI_dequote(struct ini_parser *pINI);

/*!
 * @brief Read an INI file, calling the callback as items are discovered.
 *
 * @param filename - the filename, suitible for STREAM file functions.
 * @param rd_fn - callback, called for each interesting things found in the file
 * @param client_cookie - for use by callback
 *
 * Interesting things are defined as:
 *  - NOT blank lines
 *  - NOT comment lines
 *  - Section name lines
 *  - name/value pair lines
 */
int INI_read(const char *filename, ini_rd_callback *rd_fn, intptr_t cookie);

/*!
 * @brief Read an INI file, calling the callback as items are discovered.
 *
 * @param s - the io stream to parse.
 * @param filename - used for syntax error messages
 * @param rd_fn - callback, called for each interesting things found in the file
 * @param client_cookie - for use by the callback function
 *
 * Interesting things are defined as:
 *  - NOT blank lines
 *  - NOT comment lines
 *  - Section name lines
 *  - name/value pair lines
 */
int INI_parse(intptr_t s, const char *filename,
               ini_rd_callback *rd_fn, intptr_t client_cookie);

/*!
 * @brief Determine if the current item matches
 * @param pINI - the ini file details
 * @param sectionstr - NULL matches anything
 * @param namestr - NULL matches anything, non-null must match the item name
 * @return bool true if the match occurs
 */
bool INI_itemMatches(struct ini_parser *pINI,
                      const char *sectionstr, const char *namestr);

/*!
 * @brief Determine if the section name matches an indexed name
 * @param pINI - the ini file details
 * @param sectionprefix - partial text for the section prefix
 * @param nth - put the nth vaule here
 * @return bool true if the match occurs
 *
 * The intent here is to handle INI cases where we have an indexed section name.
 * in the example below, "foo-" is the prefix, and the numbers 1 and 5 are
 * the two indexes.
 *
 * <pre>
 *     [foo-1]
 *        blah = dog
 *        bbbb = cat
 *     [foo-5]
 *        blah = dog
 *        bbbb = cat
 * </pre>
 *
 */
bool INI_isNth(struct ini_parser *pINI,
                const char *sectionprefix, unsigned *nth);

struct ini_numlist {
    intptr_t magic;
    struct ini_parser *pINI;
    int value;
    bool is_error;
};

/*!
 * @brief Parser a series of numbers, like an array
 *
 * Example:
 * \code
 *     channelmask =  1  4 9  30
 * \endcode
 *
 * Step 1: call INI_valueAsNumberList_init()
 *         note the: _init() call does not parse the first number
 * Step 2: call INI_valueAsNumberList_next() for each number
 *         This call returns EOF at the end of the list or if an error occurs.
 */
void INI_valueAsNumberList_init(struct ini_numlist *pInitThis, struct ini_parser *pINI);
/* returns EOF as last item */
int INI_valueAsNumberList_next(struct ini_numlist *pInitThis);

/*
 * @struct ini_flag_name
 * @brief  array of flags, terminate with 'name=NULL'
 */
struct ini_flag_name {
    const char *name;
    int64_t     value;
};

/*
 * @brief Lookup in an array of flags, for a matching name
 * @param pFlags - flag array, terminate with 'name=NULL'
 * @param is_not - set to true if the flag name begins with "not-"
 * @returns NULL if not found, otherwise a pointer.
 */
const struct ini_flag_name *INI_flagLookup(const struct ini_flag_name *pFlags,
                                            const char *name, bool *is_not);

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
