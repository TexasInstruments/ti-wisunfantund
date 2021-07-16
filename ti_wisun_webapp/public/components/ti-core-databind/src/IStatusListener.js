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
 * Listener interface that provides the client with notification when 
 * the status of a bindable object changes.
 * 
 * @interface
 */
gc.databind.IStatusListener = function() 
{
};

/**
 * This method is called when the status of the bindable object changed.   
 * 
 * @param {gc.databind.IStatus} status - the new status of the bindable object. 
 */
gc.databind.IStatusListener.prototype.onStatusChanged = function(status)
{
};

