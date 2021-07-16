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
 * Interface that performs an action in the model rather than simply assigning values.
 * Actions could include adding a new value to a list, or removing a value from a list.  
 * 
 * Clients do not implement this interface directly. 
 * They need to inherit from AbstractBindAction instead.   
 * 
 *  @interface
 *  @extends gc.databind.IBindValue
 */
gc.databind.IBindAction = function()
{
};

gc.databind.IBindAction.prototype = new gc.databind.IBindValue();
/**
 * By default it is a Boolean value showing if the action can be executed 
 * at a give time or not. Used to update the UI elements.
 * 
 * @returns {boolean} true if action is available at this time; otherwise, false.
 */
gc.databind.IBindAction.prototype.getValue = function()
{
};

/**
 * Executes asynchronously a method with the given input parameters and 
 * return the result inside the IFinishedWithResult callback.
 * 
 * @param {Object} parameters - input parameters of this method packed as JSON object. 
 * @param {gc.databind.IFinishedWithResult} callback - contains both the method return value and the error status. 
 */
gc.databind.IBindAction.prototype.run = function(parameters, callback)
{
};
