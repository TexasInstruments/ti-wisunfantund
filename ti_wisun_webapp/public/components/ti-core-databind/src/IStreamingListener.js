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
 * Listener interface that provides the client with a stream of values (changed or otherwise) for an  
 * IBindValue object.    
 * 
 * @interface
 */ 
gc.databind.IStreamingListener = function()
{
};
    
/**
 * This method is called when a new value of a IBindValue object is received.
 * 
 * @param nextValue - the value just received from the target
 */
gc.databind.IStreamingListener.prototype.onDataReceived = function(nextValue)
{
};

