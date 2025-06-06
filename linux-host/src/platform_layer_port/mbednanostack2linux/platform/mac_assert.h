/******************************************************************************

 @file  mac_assert.h

 @brief Describe the purpose and contents of the file.

 Group: WCS, LPC
 $Target Device: DEVICES $

 ******************************************************************************
 $License: BSD3 2016 $
 ******************************************************************************
 $Release Name: PACKAGE NAME $
 $Release Date: PACKAGE RELEASE DATE $
 *****************************************************************************/
 #ifndef MAC_ASSERT_H
 #define MAC_ASSERT_H

 #include "assert.h"

 /* ------------------------------------------------------------------------------------------------
  *                                           Macros
  * ------------------------------------------------------------------------------------------------
  */
 
 /*
  *  The MAC_ASSERT() macro is for use during debugging.  The given expression must
  *  evaluate as "true" or else an assert occurs. For the Linux implementation, this calls assert from
  *  assert.h. 
  *
  *  The MAC_ASSERT_FORCED() macro will immediately call the assert handler routine from assert.h.
  *
  *  To disable asserts and save code size, the project should define MACNODEBUG.
  *
  */

 #define MAC_ASSERT(expr)                     assert(expr);
 #define MAC_ASSERT_FORCED()                  assert(0);
 
 
 /**************************************************************************************************
  */
 #endif
 