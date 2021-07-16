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

(function()
{
    var keyValueChangeHandler = function()
    {
        if (!this._readOnly)  // ignore localStorage, because if it has a value, its wrong because we don't store constant values there.
        {
            // calculate new key value
            this._storageKey = this._storageKeyPrefix;
            
            for(var i = 0; i < this._indexBindings.length; i++)
            {
                this._storageKey += '_' + this._indexBindings[i].getValue();
            }
        
            // load preference value from local storage
            this.updateValue(gc.localStorage.getItem(this._storageKey) || this.fDefaultValue);
        }
    };
    
    /** 
     * Class that extends AbstractBindValue for a variable value binding that
     * is persisted in the user's preferences.  Each binding
     * requires a set of keys that make it unique within the users preferences.
     * One or more keys may be provided as additional attributes to this 
     * constructor.  These attributes may either be string literals (constant key),
     * or IBindValues where the key value is provided by another binding.  In this 
     * case, when any key changes value, this binding's value is updated with the
     * stored user preference for the new keys.  All keys are joined together to 
     * form a single user preference key with '_' delimiters inserted between key values.
     *
     * @constructor
     * @extends gc.databind.AbstractBindValue
     * @param {...*} args one or more key values or key bindings.
     */
    gc.databind.UserPreferenceBindValue = function() 
    {
        gc.databind.AbstractBindValue.call(this, typeof String);
        
        this._storageKeyPrefix = gc.fileCache.getProjectName();
        this._storageKeyChangeHandler = { onValueChanged: keyValueChangeHandler.bind(this) };
        this._indexBindings = this._indexBindings || [];
        
        if (arguments.length > 0)
        {
            for(var i = 0; i < arguments.length; i++)
            {
                var key = arguments[i];
                if (key instanceof gc.databind.AbstractBindValue)
                {
                    key.addChangedListener(this._storageKeyChangeHandler);
                }
                else
                {
                    key = new gc.databind.ConstantBindValue(key);
                }
                this._indexBindings.push(key);
            }
        }
        // trigger key value change to initialize binding value from user preferences.
        keyValueChangeHandler.call(this);
    };
    
    gc.databind.UserPreferenceBindValue.prototype = new gc.databind.AbstractBindValue();
    
    gc.databind.UserPreferenceBindValue.prototype.excludeFromStorageProviderData = true;
    gc.databind.UserPreferenceBindValue.prototype._readOnly = false;
    
    gc.databind.UserPreferenceBindValue.prototype.onValueChanged = function(oldValue, newValue)
    {
        if (!this._readOnly)
        {
            // save new value in local storage 
            gc.localStorage.setItem(this._storageKey, newValue);
        }
    };
    
    gc.databind.UserPreferenceBindValue.prototype.dispose = function()
    {
        for(var i = this._indexBindings.length; i-- > 0; )
        {
            var indexBinding = this._indexBindings[i];
            indexBinding.removeChangedListener(this._storageKeyChangeHandler);
            if (indexBinding.dispose !== undefined)
            {
                indexBinding.dispose();
            }
        }
    };
    
    gc.databind.UserPreferenceBindValue.prototype.setReadOnly = function(readOnly)
    {
		if (this._readOnly !== readOnly)
		{
			this._readOnly = readOnly;
		}
    };
    
    gc.databind.UserPreferenceBindValue.prototype.setDefaultValue = function(defaultValue)
    {
        if (this._readOnly)
        {
            this.updateValue(defaultValue);
        }
        else if (this.fDefaultValue !== defaultValue)
        {
            this.fDefaultValue = defaultValue;
            
            // trigger key value change to initialize binding value from user preferences.
            keyValueChangeHandler.call(this);
        }
    };
    
}());
