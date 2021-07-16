/*****************************************************************
 * Copyright (c) 2013--2014 Texas Instruments and others
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
 * Listener interface that provides the client with notification when 
 * the stale state of a IBindValue object changes.    
 * 
 * @interface
 */
gc.databind.IStaleListener = function() 
{
};

/**
 * This method is called when the stale state of a IBindValue object has changed.   
 */
gc.databind.IStaleListener.prototype.onStaleChanged = function()
{
};
