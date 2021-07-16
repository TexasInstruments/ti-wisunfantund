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
 * Class that implements ILookupBindValue interface for an arbitrary javascript function.
 * The binding is read-only and updates its value whenever the indecies change.
 * The indecies are used as paramters to the function, whose return value is used as
 * the value for this binding.
 *
 * @constructor
 * @extends gc.databind.AbstractLookupBindValue
 * 
 * @param {function} functionMethod - a function object whose return value is used as this binding's value.
 * @param {object} [thisPointer] - 'this' object to use when calling the function.
 */
gc.databind.FunctionBindValue = function(functionMethod, thisPointer) 
{
	gc.databind.AbstractLookupBindValue.call(this);
	
    this.functionMethod = functionMethod;
    if (thisPointer !== undefined)
    {
        this.functionThis = thisPointer;
    }
};

gc.databind.FunctionBindValue.prototype = new gc.databind.AbstractLookupBindValue();

gc.databind.FunctionBindValue.prototype.setValue = function(value, progress)
{
};

gc.databind.FunctionBindValue.prototype.isReadOnly = function()
{
    return true;
};

gc.databind.FunctionBindValue.prototype.onIndexChanged = function(indecies)
{
	try
	{
		this.updateValue(this.functionMethod.apply(this.functionThis, indecies));
		this.setStatus(null);  // clear pre-existing error messages
	}
	catch(e)
	{
		// report exceptions as errors.
		this.setStatus(gc.databind.AbstractStatus.createErrorStatus(e));
	}
};



