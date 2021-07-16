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

/** @namespace */
var gc = gc || {};
/** @namespace */
gc.databind = gc.databind || {};

gc.databind.name = "Data Binding";  // can be used as a source for ti-core-logger errors and wanings

/**
 * The basic bindable object that models provide. 
 * Provides status information for the bind.
 *   
 * Clients do not implement this interface directly. 
 * They need to inherit from AbstractBindValue or AbstractBindAction instead.   
 * 
 *	@interface
 */
gc.databind.IBind = function() 
{
};

/**
 * The status of this bindable object.
 *  
 * @return {gc.databind.IStatus} the status of this bindable object. 
 */
gc.databind.IBind.prototype.getStatus = function()
{
};

/**
 * Set the status of this bindable object.
 *  
 * @param {gc.databind.IStatus} status - the new status. 
 */
gc.databind.IBind.prototype.setStatus = function(status)
{
};
	
/**
 * Add IStatusListener to this object so the client can be notified for status changes.  
 * 
 * @param {gc.databind.IStatusListener} listener - listener for the status change of this bindable object. 
 */
gc.databind.IBind.prototype.addStatusListener = function(listener)
{
};

/**
 * Remove IStatusListener, previously added with addStatusListener().  
 * 
 * @param {gc.databind.IStatusListener} listener - listener for the status change of this bindable object. 
 */
gc.databind.IBind.prototype.removeStatusListener = function(listener)
{
};
	
/**
 * The name of this bindable object.
 * 
 * @return {string} the name of this bindable object.
 */
gc.databind.IBind.prototype.getName = function()
{
};
	
/**
 * Sets the name of this bindable object.
 * 
 * @param {string} name - the name of this bindable object.
 */
gc.databind.IBind.prototype.setName = function(name)
{
};
