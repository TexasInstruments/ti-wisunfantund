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

gc.databind.CollectionBindValue = function(bindings)
{
	this.bindings = bindings;
};

gc.databind.CollectionBindValue.prototype = new gc.databind.IBindValue();

gc.databind.CollectionBindValue.prototype.getValue = function()
{
	var values = {};
	for(var bindName in this.bindings)
	{
		if (this.bindings.hasOwnProperty(bindName))
		{
			values[bindName] = this.bindings[bindName].getValue();
		}
	}
	return values;
};	

gc.databind.CollectionBindValue.prototype.setValue = function(value, progress)
{
	for(var bindName in this.bindings)
	{
		if (this.bindings.hasOwnProperty(bindName))
		{
			var newValue = value[bindName];
			var binding = this.bindings[bindName];
			if (newValue !== undefined)
			{
				newValue = gc.databind.DataConverter.convert(newValue, undefined, binding.getType());
				binding.setValue(newValue, progress);
			}
		}
	}
};

gc.databind.CollectionBindValue.prototype.getType = function()
{
	return 'object';
};

gc.databind.CollectionBindValue.prototype.addChangedListener = function(listener)
{
	for(var bindName in this.bindings)
	{
		if (this.bindings.hasOwnProperty(bindName))
		{
			this.bindings[bindName].addChangedListener(listener);
		}
	}
};
	
gc.databind.CollectionBindValue.prototype.removeChangedListener = function(listener)
{
	for(var bindName in this.bindings)
	{
		if (this.bindings.hasOwnProperty(bindName))
		{
			this.bindings[bindName].removeChangedListener(listener);
		}
	}
};
	
gc.databind.CollectionBindValue.prototype.addStreamingListener = function(listener)
{
    for(var bindName in this.bindings)
    {
        if (this.bindings.hasOwnProperty(bindName))
        {
            this.bindings[bindName].addStreamingListener(listener);
        }
    }
};
    
gc.databind.CollectionBindValue.prototype.removeStreamingListener = function(listener)
{
    for(var bindName in this.bindings)
    {
        if (this.bindings.hasOwnProperty(bindName))
        {
            this.bindings[bindName].removeStreamingListener(listener);
        }
    }
};
    
gc.databind.CollectionBindValue.prototype.isStale = function()
{
	for(var bindName in this.bindings)
	{
		if (this.bindings.hasOwnProperty(bindName))
		{
			if (this.bindings[bindName].isStale())
			{
				return true;
			}
		}
	}
	return false;
};
	
gc.databind.CollectionBindValue.prototype.addStaleListener = function(listener)
{
	for(var bindName in this.bindings)
	{
		if (this.bindings.hasOwnProperty(bindName))
		{
			this.bindings[bindName].addStaleListener(listener);
		}
	}
};
	
gc.databind.CollectionBindValue.prototype.removeStaleListener = function(listener)
{
	for(var bindName in this.bindings)
	{
		if (this.bindings.hasOwnProperty(bindName))
		{
			this.bindings[bindName].removeStaleListener(listener);
		}
	}
};
	
gc.databind.CollectionBindValue.prototype.isReadOnly = function()
{
	for(var bindName in this.bindings)
	{
		if (this.bindings.hasOwnProperty(bindName))
		{
			if (this.bindings[bindName].isReadOnly())
			{
				return true;
			}
		}
	}
	return false;
};

gc.databind.CollectionBindValue.prototype.getStatus = function()
{
	if (this._status)
	{
		return this._status;
	}
	else
	{
		for(var bindName in this.bindings)
		{
			if (this.bindings.hasOwnProperty(bindName))
			{
				var status = this.bindings[bindName].getStatus();
				if (status)
				{
					return status;
				}
			}
		}
		return null;
	}
};

gc.databind.CollectionBindValue.prototype.setStatus = function(status)
{
	this._status = status;
};
	
gc.databind.CollectionBindValue.prototype.addStatusListener = function(listener)
{
	for(var bindName in this.bindings)
	{
		if (this.bindings.hasOwnProperty(bindName))
		{
			this.bindings[bindName].addStatusListener(listener);
		}
	}
};

gc.databind.CollectionBindValue.prototype.removeStatusListener = function(listener)
{
	for(var bindName in this.bindings)
	{
		if (this.bindings.hasOwnProperty(bindName))
		{
			this.bindings[bindName].removeStatusListener(listener);
		}
	}
};
	
gc.databind.CollectionBindValue.prototype.getName = function()
{
	return this._name;
};
	
gc.databind.CollectionBindValue.prototype.setName = function(name)
{
	this._name = name;
};
