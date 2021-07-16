/*****************************************************************
 * Copyright (c) 2013-2014 Texas Instruments and others
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
gc.databind.internal.expressionParser = gc.databind.internal.expressionParser || {};

gc.databind.internal.expressionParser.AbstractUnaryOperator = function(operator)
{
	this.operator = operator;
};

gc.databind.internal.expressionParser.AbstractUnaryOperator.prototype = new gc.databind.IBindValue();

gc.databind.internal.expressionParser.AbstractUnaryOperator.Factory = function(operator)
{
	this.operator = operator;
};

gc.databind.internal.expressionParser.AbstractUnaryOperator.Factory.prototype = new gc.databind.internal.expressionParser.IOperator.Factory();

gc.databind.internal.expressionParser.AbstractUnaryOperator.Factory.prototype.createOperator = function()
{
};
		
gc.databind.internal.expressionParser.AbstractUnaryOperator.Factory.prototype.parse = function(uri, factory, precedence)
{
	if (uri.indexOf(this.operator) === 0)
	{
		var operandText = uri.substring(this.operator.length);
		var operand = factory.parseExpression(operandText, precedence);
		if (operand !== null)
		{
			var result = this.createOperator();
			result.operand = operand;
			return result;
		}
	}
	return null;
};

gc.databind.internal.expressionParser.AbstractUnaryOperator.prototype.addStreamingListener = function(listener)
{
    this.operand.addStreamingListener(listener);
};
        
gc.databind.internal.expressionParser.AbstractUnaryOperator.prototype.removeStreamingListener = function(listener)
{
    this.operand.removeStreamingListener(listener);
};
        
gc.databind.internal.expressionParser.AbstractUnaryOperator.prototype.addChangedListener = function(listener)
{
    this.operand.addChangedListener(listener);
};
        
gc.databind.internal.expressionParser.AbstractUnaryOperator.prototype.removeChangedListener = function(listener)
{
	this.operand.removeChangedListener(listener);
};

gc.databind.internal.expressionParser.AbstractUnaryOperator.prototype.getStatus = function()
{
	return this.operand.getStatus();
};

gc.databind.internal.expressionParser.AbstractUnaryOperator.prototype.setStatus = function(status)
{
	this.operand.setStatus(status);
};

gc.databind.internal.expressionParser.AbstractUnaryOperator.prototype.addStatusListener = function(listener)
{
	this.operand.addStatusListener(listener);
};

gc.databind.internal.expressionParser.AbstractUnaryOperator.prototype.removeStatusListener = function(listener)
{
	this.operand.removeStatusListener(listener);
};
		
gc.databind.internal.expressionParser.AbstractUnaryOperator.prototype.dispose = function()
{
	if (this.operand.dispose !== undefined)
	{
		this.operand.dispose();
	}
};
		
gc.databind.internal.expressionParser.AbstractUnaryOperator.prototype.setValue = function(value, progress)
{
	if (value === null || value === undefined)
	{
		return; // ignore null values
	}
	
	var type = this.operand.getType();
	var result;
	
	try
	{
		if (type === "boolean")
		{
			result = this.doBooleanOperation(value, true);
		}
		else if (type === "number")
		{
			result = this.doNumericOperation(value, true);
		}
		else if (type === "array")
		{
			result = this.doArrayOperation(value, true);
		}
		else if (type === "string")  
		{
			result = this.doStringOperation(value, true);
		}
		else if (type === 'object')
		{
			result = this.doObjectOperation(value, true);
		}
		else 
		{
			throw "Operation '" + this.operation + "' does not support " + type + "types";
		}
		this.operand.setValue(result, progress);
	}
	catch(e)
	{
		this.setStatus(gc.databind.AbstractStatus.createErrorStatus(e));
	}
};
		
gc.databind.internal.expressionParser.AbstractUnaryOperator.prototype.getValue = function()
{
	var value = this.operand.getValue();
	
	if (value === null || value === undefined)
	{
		return value; // parameter is not available, pass this on.
	}

	var type = this.operand.getType();
	
	try
	{
		if (type === "boolean")
		{
			return this.doBooleanOperation(value, false);
		}
		else if (type === "number")
		{
			return this.doNumericOperation(value, false);
		}
		else if (type === "array")
		{
			return this.doArrayOperation(value, false);
		}
		else if (type === "string") 
		{
			return this.doStringOperation(value, false);
		}
		else if (type === "object")
		{
			return this.doObjectOperation(value, false);
		}
		else 
		{
			throw "Operator '"+ this.operator + "' does not support " + type + " types"; 
		}
	}
	catch(e)
	{
		this.setStatus(gc.databind.AbstractStatus.createErrorStatus(e));
		return null;
	}
};

gc.databind.internal.expressionParser.AbstractUnaryOperator.prototype.doBooleanOperation = function(value, write)
{
	if (this.evalBoolean !== undefined)
	{
		return this.evalBoolean(value, write);
	}
	else
	{
		throw "Operator '" + this.operator + "' does not support boolean types";
	}
};

gc.databind.internal.expressionParser.AbstractUnaryOperator.prototype.doNumericOperation = function(value, write)
{
	if (this.evalNumber !== undefined)
	{
		return this.evalNumber(value, write);
	}
	else
	{
		throw "Operator '" + this.operator + "' does not support numeric types";
	}
};

gc.databind.internal.expressionParser.AbstractUnaryOperator.prototype.doArrayOperation = function(valueArray, write)
{
	if (this.evalArray !== undefined)
	{
		if (valueArray instanceof Array)
		{
			return this.evalArray(valueArray, write);
		}
		else
		{
			return this.evalArray([valueArray], write);
		}
	}
	else
	{
		throw "Operator '" + this.operator + "' does not support array types";
	}
};
		
gc.databind.internal.expressionParser.AbstractUnaryOperator.prototype.doStringOperation = function(value, write)
{
	if (this.evalString !== undefined)
	{
		return this.evalString(value, write);
	}
	else
	{
		throw "Operator '" + this.operator + "' does not support string types";
	}
};
	
gc.databind.internal.expressionParser.AbstractUnaryOperator.prototype.doObjectOperation = function(value, write)
{
	if (this.evalObject !== undefined)
	{
		return this.evalObject(value, write);
	}
	else // try converting using number or string conversion if available before reporting object types not supported.
	{
		value = value.valueOf();  // Object.valueOf() returns this (so unchanged if not overridden).
		var type = typeof value;
		if (type === "number" && this.evalNumber !== undefined)
		{
			return this.evalNumber(value, write);
		}
		else if (this.evalString !== undefined)
		{
			return this.evalString(value.toString(), write);
		}
		else
		{
			throw "Operator '" + this.operator + "' does not support object types";
		}
	}
};
	
gc.databind.internal.expressionParser.AbstractUnaryOperator.prototype.getType = function()
{
	return this.operand.getType();
};

gc.databind.internal.expressionParser.AbstractUnaryOperator.Factory.prototype.getOperator = function()
{
	return this.operator;
};
		
gc.databind.internal.expressionParser.AbstractUnaryOperator.prototype.toString = function()
{
	return this.operator + this.operand.toString();
};
		
gc.databind.internal.expressionParser.AbstractUnaryOperator.prototype.isStale = function()
{
	return this.operand.isStale();
};
		
gc.databind.internal.expressionParser.AbstractUnaryOperator.prototype.addStaleListener = function(listener)
{
	this.operand.addStaleListener(listener);
};
		
gc.databind.internal.expressionParser.AbstractUnaryOperator.prototype.removeStaleListener = function(listener)
{
	this.operand.removeStaleListener(listener);
};
		
gc.databind.internal.expressionParser.AbstractUnaryOperator.prototype.isReadOnly = function()
{
	return this.operand.isReadOnly();
};
		
gc.databind.internal.expressionParser.AbstractUnaryOperator.prototype.setName = function(name)
{
	this.fName = name;
};
		
gc.databind.internal.expressionParser.AbstractUnaryOperator.prototype.getName = function() 
{
	return this.fName;
};
	
