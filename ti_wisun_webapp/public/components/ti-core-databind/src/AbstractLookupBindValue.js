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
 * Abstract class that implements ILookupBindValue interface. Clients can either 
 * instantiate this class directly or create classes derived from it for 
 * their value bindable object.   
 *
 * @constructor
 * @extends gc.databind.AbstractBindValue
 * @implements gc.databind.ILookupBindValue
 * @param {string} [defaultType] - the default type, used only if value is null. 
 */
gc.databind.AbstractLookupBindValue = function(defaultType) 
{
	gc.databind.AbstractBindValue.call(this, defaultType);
};

gc.databind.AbstractLookupBindValue.prototype = new gc.databind.AbstractBindValue();

/**
 * Implementation of the ILookupBindValue.setIndex.  This implementation keeps track of the 
 * index(es) and calls the abstract method onIndexChanged() when any
 * index value(s) change.  The getIndex() method can be used to retrieve the index 
 * values inside the onIndexChanged() method to re-evaluate the model data's location 
 * and possibly it's new value. 
 * 
 * @param {...number|string} index - one or more new index values to use for lookup
 */
gc.databind.AbstractLookupBindValue.prototype.setIndex = function()
{
	var changed = false;
	this.fIndexValues = this.fIndexValues || [];
	
	for(var i=0; i<arguments.length && i < this.fIndexValues.length; i++) 
	{
		var oldIndex = this.fIndexValues[i];
		var newIndex = arguments[i];
		if (oldIndex != newIndex)
		{
			this.fIndexValues[i] = newIndex;
			changed = true;
		}
	}
	for(; i<arguments.length; i++)
	{
		this.fIndexValues.push(arguments[i]);
		changed = true;
	}
	if (changed)
	{
		this.onIndexChanged(this.fIndexValues);
	}
};

/**
 * Notification method to override that is called when any one of the multi-dimensional
 * indecies have changed.  Implement this method to re-calcualate the location of the 
 * model data that is to be bound by this binding.  Call setValue() to update this bindings
 * value and notify listeners if the value has changed due to the change in index.
 * 
 * @abstract
 * @param {Array.number|string} indices - the multi-dimensional index values to use for lookup.
 * @return the new calculated value based on the new indices.  Will be used to update binding value and notify listeners.
 */
gc.databind.AbstractLookupBindValue.prototype.onIndexChanged = function(indices)
{
};

gc.databind.AbstractLookupBindValue.prototype.getIndex = function()
{
	return this.fIndexValues;
};

gc.databind.AbstractLookupBindValue.prototype.assertNotNull = function(index)
{
	if (index === null || index === undefined)
	{
		throw "The index value is null.";
	}
};

gc.databind.AbstractLookupBindValue.prototype.assertValidArrayIndex = function(index, size, startIndex)
{
	this.assertNotNull(index);
	
	if (isNaN(index))
	{
		throw "The index is not valid. Cannot convert '" + index + "' to an integer.";
	}
	
	startIndex = startIndex || 0;
	size = size || 1;
	var endIndex = size + startIndex - 1;

	/*jsl:ignore*/
	index = parseInt(index); 
	/*jsl:end*/
	
	if (index < startIndex || index > endIndex)
	{
		throw 'The index ' + index + ' is out of bounds.  It must be between ' + startIndex + ' and ' + endIndex;
	}
	
	return index;
};

gc.databind.AbstractLookupBindValue.prototype.assertValidFieldName = function(fieldName, possibleFieldNames)
{
	this.assertNotNull(fieldName);
	
	fieldName = fieldName.toString();
	
	if (possibleFieldNames === undefined || !possibleFieldNames.hasOwnProperty(fieldName) )
	{
		throw "The index '" + fieldName + "' was not found.";
	}
	return fieldName;
};

gc.databind.AbstractLookupBindValue.prototype.assertValidData = function(index, data)
{
	this.assertNotNull(index);
	
	if (data === undefined)
	{
		throw "The index '" + index + "' was not found.";
	}
};

