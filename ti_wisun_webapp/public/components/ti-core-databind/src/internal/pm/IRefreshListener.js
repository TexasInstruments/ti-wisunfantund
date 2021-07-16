/*****************************************************************
 * Copyright (c) 2015 Texas Instruments and others
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *  Paul Gingrich - Initial API and implementation
 *****************************************************************/
var gc = gc || {};
gc.databind = gc.databind || {};

/**
 * Listener interface that provides the client with notification when 
 * each the refresh interval has expired.    
 * 
 * @private
 * @interface
 */ 
gc.databind.IRefreshListener = function()
{
};
	
/**
 * <p>This method is called when the refresh interval has expired.</p>
 * <p>Some clients wish to be 
 * informed when the operation is finally completed.  As a result, this event passes along an
 * {gc.databind.IProgressCounter} interface.  If the operation that this implementation performs
 * is asynchronous in nature, 
 * then you must indicate this by calling {gc.databind.IProgressCounter.#wait} to mark the start of the operation 
 * before returning from this method call.  Later, you must call {gc.databind.IProgressCounter#done} to mark the 
 * completion of this operation.  If this operation delegates to other operations, it
 * is acceptable to pass this progress interface along to those operations so that they can add their own
 * asynchronous jobs to the progress counter.</p>
 * <p>
 * If this operation is not asynchronous, then nothing needs to be done with the progress counter.  You can
 * simply ignore it.  However, if you delegate any operations to other objects, you still need to pass this
 * progress counter along to them in case the delgated operation is asynchronous in nature.
 * 
 * @param {gc.databind.IProgressCounter} progress - interface for the client to indicate progress of
 * asynchronous operations so the client can determine when the operation is fully completed.
 */
gc.databind.IRefreshListener.prototype.onRefresh = function(progress)
{
};

