/*****************************************************************
 * Copyright (c) 2018 Texas Instruments and others
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
 * Interface for a Trigger that is created using gc.databind.registry.createTrigger() method. 
 * 
 * @interface
 */ 

gc.databind.ITrigger = function()
{
};

/**
 * Sets or retrieves the enable state of the trigger.  A disabled trigger will not call the user's callback
 * even if the trigger condition is met.
 * If this method is called with no parameters, it acts as a getter returning the current enabled state. 
 * Otherwise this method acts as a setter for the enabled state and returns the this pointer so that 
 * the caller can chain additional calls to methods on this object.  
 * 
 * @param {boolean} [enable] - if present, the new enabled state for this trigger.
 * @returns {boolean|object} - if getter then the enabled state; otherwise, the this pointer. 
 */
gc.databind.ITrigger.prototype.enable = function()
{
};

/**
 * Sets the condition for this trigger to call the user's callback method.
 * The trigger will fire when this condition transitions from false to true, and the trigger is enabled.  
 * 
 * @param {string} condition - A binding expression, that evaluates to a boolean result, to be used as the condition. 
 */
gc.databind.ITrigger.prototype.setCondition = function()
{
};

/**
 * Method to free resources when the trigger is not longer needed.  This method should be called when making this
 * trigger available for garbage collection. 
 *   
 */
gc.databind.ITrigger.prototype.dispose = function()
{
};

/**
 * Factory method to create instances of event Triggers.
 * 
 * @param {function} callback - callback method for when trigger condition is met. 
 * @param {string} condition - A binding expression, that evaluates to a boolean result, to be used as the condition. 
 * @returns {gc.databind.ITrigger} - newly created ITrigger instance.   
 */
gc.databind.createTrigger = function(callback, condition) 
{
    return new gc.databind.internal.Trigger(callback, condition);  
};

