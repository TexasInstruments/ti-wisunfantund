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
 * Callback interface that signals the completion of a asynchronous operation.
 * 
 * @interface
 */
gc.databind.IFinished = function()
{
};
	
/**
 * Signals the completion of a asynchronous operation.
 * @param {gc.databind.IStatus} status - passing null means success. If status not null it contains  
 *        the error of the operation.  
 */
gc.databind.IFinished.prototype.done = function(status)
{
};
