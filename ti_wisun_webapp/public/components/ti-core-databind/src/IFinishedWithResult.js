/*****************************************************************
 * Copyright (c) 2013-2014 Texas Instruments and others
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *  Paul Gingrich, Dobrin Alexiev - Initial API and implementation
 *****************************************************************/
var gc = gc || {};
gc.databind = gc.databind || {};

/**
 * Callback interface that signals the completion of asynchronous operation with result. 
 * The client provides IFinishedWithResult to obtain the result value or completion status.
 * 
 * @interface
 */
gc.databind.IFinishedWithResult = function()
{
};

/**
 * Notifies the client that the asynchronous operation with result has completed.
 *    
 * @param status {gc.databind.IStatus} - The status information associated with the completion of 
 *                the operation, or null if the operation completed successfully.   
 * @param result {Object}  - the result of the asynchronous operation.  
 */
gc.databind.IFinishedWithResult.prototype.done = function(status, result)
{
};
