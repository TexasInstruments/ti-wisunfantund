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
 * This adaptor class provides default implementations for the methods described
 * by IStatusListener, IChangedListener and IStaleListener interfaces.
 * 
 * @constructor
 * @implements gc.databind.IStatusListener
 * @implements gc.databind.IChangedListener
 * @implements gc.databind.IStaleListener
 */
gc.databind.BindListenerAdapter = function() 
{
};

gc.databind.BindListenerAdapter.prototype.onStatusChanged = function(status) 
{
};

gc.databind.BindListenerAdapter.prototype.onValueChanged = function(oldValue, newValue, progress) 
{
};

gc.databind.BindListenerAdapter.prototype.onStaleChanged = function() 
{
};
