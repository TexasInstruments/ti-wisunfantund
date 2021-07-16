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
gc.databind.internal = gc.databind.internal || {};

/**
 * Concrete Class for a Trigger that fires a user callback when a condition is met. 
 * 
 * @constructor
 * @implements {gc.databind.ITrigger}
 */ 

gc.databind.internal.Trigger = function(callback, condition)
{
    this._triggerEventCallback = callback;
    if (condition)
    {
        this.setCondition(condition);
    }
};

gc.databind.internal.Trigger.prototype = new gc.databind.ITrigger();
gc.databind.internal.Trigger.prototype._enabled = true;

gc.databind.internal.Trigger.prototype.enable = function(enable)
{
    if (enable === undefined)
    {
        return this._enabled;
    }
    enable = !!enable;
    if (this._enabled !== enable)
    {
        if (enable && this._conditionBind)
        {
            this._conditionBind.addChangedListener(this);
        }
        else if (this._conditionBind)
        {
             this._conditionBind.removeChangedListener(this);
        }
        this._enabled = enable;
    }
};

gc.databind.internal.Trigger.prototype.onValueChanged = function(oldValue, newValue, progress)
{
    newValue = !!this._conditionBind.getValue();
    if (this.fCachedValue !== newValue)
    {
        this.fCachedValue = newValue;
        if (newValue && this._enabled)
        {
            this._triggerEventCallback(progress);
        }
    }
};

/**
 * Sets the condition for this trigger to call the users callback method.
 * The trigger will fire when this condition transitions from false to true, and the trigger is enabled.  
 * 
 * @param {string} condition - A binding expression, that evaluates to a boolean result, to be used as the condition. 
 * @returns {boolean|object} - if getter then the enabled state; otherwise, the this pointer. 
 */
gc.databind.internal.Trigger.prototype.setCondition = function(condition)
{
    // remove listener from old condition if there was one.
    if (this._conditionBind && this._enabled)
    {
        this._conditionBind.reamoveChangedListener(this);
    }
    
    // get new condition binding
    this._conditionBind = condition && gc.databind.registry.getBinding(condition);
    
    // add listener if we are enabled
    if (this._conditionBind && this._enabled) 
    {
        this._conditionBind.addChangedListener(this);
    }
    
    // initialize fCachedValue so we can detect changes going forward in order to fire events.  
    this.fCachedValue = !!(this._conditionBind && this._conditionBind.getValue());
};

gc.databind.internal.Trigger.prototype.dispose = function()
{
    if (this._conditionBind)
    {
        this._conditionBind.removeChangedListener(this);
        this._conditionBind = undefined;
    }
};

