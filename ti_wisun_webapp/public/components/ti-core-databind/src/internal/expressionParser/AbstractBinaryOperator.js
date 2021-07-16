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

gc.databind.internal.expressionParser.AbstractBinaryOperator = function(operator)
{
	if (operator)
	{
		this.operator = operator;
	}	
	
	this.fEvents = new gc.databind.internal.Events(this);
};

gc.databind.internal.expressionParser.AbstractBinaryOperator.prototype = new gc.databind.IBindValue();

gc.databind.internal.expressionParser.AbstractBinaryOperator.Factory = function(operator)
{
	this.operator = operator;
};

gc.databind.internal.expressionParser.AbstractBinaryOperator.Factory.prototype = new gc.databind.internal.expressionParser.IOperator.Factory();


gc.databind.internal.expressionParser.AbstractBinaryOperator.Factory.prototype.createOperator = function()
{
};
		
gc.databind.internal.expressionParser.AbstractBinaryOperator.Factory.prototype.parse = function(uri, factory, precedence)
{
	var pos = factory.findLastIndexOf(uri, this.operator);
	if (pos > 0 && pos < uri.length-1) // can't be first or last character, because it's not a unary operator
	{
		var operandText = uri.substring(0, pos);
		var leftOperand = factory.parseExpression(operandText, precedence);
		operandText = uri.substring(pos + this.operator.length); 
		// there are not operators to the right of this one at the same precedence level
		var rightOperand = factory.parseExpression(operandText, precedence+1);
		
		var result = this.createOperator();
		result.leftOperand = leftOperand;
		result.rightOperand = rightOperand;
		return result;
	}
	return null;
};
	
gc.databind.internal.expressionParser.AbstractBinaryOperator.Factory.prototype.getOperator = function()
{
	return this.operator;
};
	
gc.databind.internal.expressionParser.AbstractBinaryOperator.prototype.toString = function()
{
	return this.leftOperand.toString() + ' ' + this.operator + ' ' + this.rightOperand.toString();
};

gc.databind.internal.expressionParser.AbstractBinaryOperator.prototype.setValue = function(value, progress)
{
	if (!this.isReadOnly())
	{
		try
		{
			// call doSetValue(newValue, isLeftParamConstand, variableParam, constantValue)
			if (this.leftOperand.isReadOnly())
			{
				value = this.doSetValue(value, this.leftOperand.getValue(), true);
				var rightType = this.rightOperand.getType();
				value = gc.databind.DataConverter.convert(value, typeof value, rightType);
				this.rightOperand.setValue(value, progress);
			}
			else
			{	
				value = this.doSetValue(value, this.rightOperand.getValue(), false);
				var leftType = this.leftOperand.getType();
				value = gc.databind.DataConverter.convert(value, typeof value, leftType);
				this.leftOperand.setValue(value, progress);
			}
		}
		catch(e)
		{
			this.setStatus(gc.databind.AbstractStatus.createErrorStatus(e));
		}
	}
};

gc.databind.internal.expressionParser.AbstractBinaryOperator.prototype.addStreamingListener = function(listener)
{
    this.leftOperand.addStreamingListener(listener);
    this.rightOperand.addStreamingListener(listener);
};
        
gc.databind.internal.expressionParser.AbstractBinaryOperator.prototype.removeStreamingListener = function(listener)
{
    this.leftOperand.removeStreamingListener(listener);
    this.rightOperand.removeStreamingListener(listener);
};
        
gc.databind.internal.expressionParser.AbstractBinaryOperator.prototype.addChangedListener = function(listener)
{
	this.leftOperand.addChangedListener(listener);
	this.rightOperand.addChangedListener(listener);
};
		
gc.databind.internal.expressionParser.AbstractBinaryOperator.prototype.removeChangedListener = function(listener)
{
	this.leftOperand.removeChangedListener(listener);
	this.rightOperand.removeChangedListener(listener);
};
		
gc.databind.internal.expressionParser.AbstractBinaryOperator.prototype.addStatusListener = function(listener)
{
	this.fEvents.addListener('StatusChanged', listener);
	
	this.leftOperand.addStatusListener(listener);
	this.rightOperand.addStatusListener(listener);
};
		
gc.databind.internal.expressionParser.AbstractBinaryOperator.prototype.removeStatusListener = function(listener)
{
	this.fEvents.removeListener('StatusChanged', listener);
	
	this.leftOperand.removeStatusListener(listener);
	this.rightOperand.removeStatusListener(listener);
};
		
gc.databind.internal.expressionParser.AbstractBinaryOperator.prototype.dispose = function()
{
	if (this.leftOperand.dispose !== undefined)
	{
		this.leftOperand.dispose();
	}
	if (this.rightOperand.dispose !== undefined)
	{
		this.rightOperand.dispose();
	}
};

gc.databind.internal.expressionParser.AbstractBinaryOperator.prototype.fStatus = null;

gc.databind.internal.expressionParser.AbstractBinaryOperator.prototype.getStatus = function()
{
	var status = this.fStatus;
	
	if (status === null)
	{
		status = this.leftOperand.getStatus();
	}
	if (status === null)
	{
		status = this.rightOperand.getStatus();
	}
	
	return status;
};

gc.databind.internal.expressionParser.AbstractBinaryOperator.prototype.notifyStatusChanged = function(status)
{
	this.fEvents.fireEvent('StatusChanged', status);
};

gc.databind.internal.expressionParser.AbstractBinaryOperator.prototype.setStatus = function(status) 
{
	if( status != this.fStatus)
	{
		this.onStatusChanged( this.fStatus, status);
		this.fStatus = status;
		this.notifyStatusChanged(this.fStatus);
	}
};

gc.databind.internal.expressionParser.AbstractBinaryOperator.prototype.onStatusChanged = function(oldStatus, newStatus) 
{
};

gc.databind.internal.expressionParser.AbstractBinaryOperator.prototype.getName = function() 
{
	return this.fName;
};

gc.databind.internal.expressionParser.AbstractBinaryOperator.prototype.setName = function(name) 
{
	this.fName = name;
};

gc.databind.internal.expressionParser.AbstractBinaryOperator.prototype.doBooleanOperation = function(leftValue, rightValue)
{
	if (this.evalBoolean !== undefined)
	{
		return this.evalBoolean(leftValue, rightValue);
	}
	else
	{
		throw "Operator '" + this.operator + "' does not support boolean types";
	}
};

gc.databind.internal.expressionParser.AbstractBinaryOperator.prototype.doNumericOperation = function(leftValue, rightValue)
{
	if (this.evalNumber !== undefined)
	{
		return this.evalNumber(leftValue, rightValue);
	}
	else
	{
		throw "Operator '" + this.operator + "' does not support numeric types";
	}
};

gc.databind.internal.expressionParser.AbstractBinaryOperator.prototype.doArrayOperation = function(leftValue, rightValue)
{
	if (this.evalArray !== undefined)
	{
		return this.evalArray(leftValue, rightValue);
	}
	else
	{
		throw "Operator '" + this.operator + "' does not support array types";
	}
};
		
gc.databind.internal.expressionParser.AbstractBinaryOperator.prototype.doStringOperation = function(leftValue, rightValue)
{
	if (this.evalString !== undefined)
	{
		return this.evalString(leftValue, rightValue);
	}
	else
	{
		throw "Operator '" + this.operator + "' does not support string types";
	}
};

gc.databind.internal.expressionParser.AbstractBinaryOperator.prototype.doObjectOperation = function(leftValue, rightValue)
{
	if (this.evalObject !== undefined)
	{
		return this.evalObject(leftValue, rightValue);
	}
	else
	{
		throw "Operator '" + this.operator + "' does not support object types";
	}
};

gc.databind.internal.expressionParser.AbstractBinaryOperator.prototype.getValue = function()
{
	var leftValue = this.leftOperand.getValue();
	var rightValue = this.rightOperand.getValue();
	
	if (leftValue === null || rightValue === null)
	{
		return null; // one side or the other cannot be evaulated, so pass this information along.
	}
	else if (leftValue === undefined || rightValue === undefined)
	{
		return undefined;
	}
	
	var leftType = this.leftOperand.getType();
	var rightType = this.rightOperand.getType();

	try
	{
		if (leftType === "boolean" && rightType === "boolean")
		{
			return this.doBooleanOperation(leftValue, rightValue);
		}
		else if (leftType === "array")
		{
			return this.doArrayOperation(leftValue, rightType === 'array' ? rightValue : [rightValue]);
		}
		else if (rightType === "array")
		{
			return this.doArrayOperation([leftValue], rightValue);
		}
		else if (leftType === "string")
		{
			return this.doStringOperation(leftValue, rightType === "string" ? rightValue : rightValue.toString());
		}
		else if (rightType === "string")
		{
			return this.doStringOperation(leftValue.toString(), rightValue);
		}
		else if (leftType === "number" && rightType === "number")
		{
			return this.doNumericOperation(leftValue, rightValue);
		}
		else if (leftType === "number" && typeof rightValue.valueOf() === "number")
		{
			return this.doNumericOperation(leftValue, rightValue.valueOf());
		}
		else if (leftType === "number" && rightType === "boolean")
		{
			return this.doNumericOperation(leftValue, rightValue ? 1 : 0);
		}
		else if (rightType === "number" && typeof leftValue.valueOf() === "number")
		{
			return this.doNumericOperation(leftValue.valueOf(), rightValue);
		}
		else if (rightType === "number" && leftType === "boolean")
		{
			return this.doNumericOperation(leftValue ? 1 : 0, rightValue);
		}
		else if (this.evalString !== undefined)
		{
			return this.doStringOperation(leftValue.toString(), rightValue.toString());
		}
		else if (leftType === "object" && rightType === "object")
		{
			return this.doObjectOperation(leftValue, rightValue);
		}
		else 
		{
			var type = "object";
			if (this.evalBoolean === undefined && (leftType === "boolean" || rightType === "boolean"))
			{
				type = "boolean";
			}
			if (this.evalNumber === undefined && (leftType === "number" || rightType === "number"))
			{
				type = "numeric";
			}
			
			throw "Operator '" + this.operator + "' does not support " + type + " types"; 
		}
	}
	catch(e)
	{
		this.setStatus(gc.databind.AbstractStatus.createErrorStatus(e));
		return null;
	}
};
		
gc.databind.internal.expressionParser.AbstractBinaryOperator.prototype.getType = function()
{
	var value = this.getValue();
	if (value !== null && value !== undefined)
	{
		var result = typeof value;
		if (result === "object" && value instanceof Array)
		{
			result = "array";
		}
		return result;
	}
	
	var leftType = this.leftOperand.getType();
	var rightType = this.rightOperand.getType();

	if (leftType === rightType)
	{
		return leftType;
	}
	else if (leftType === "array" || rightType === "array")
	{
		return "array";
	}
	else if (leftType === "string" || rightType === "string")
	{
		return "string";
	}
	else if (leftType === "number" || rightType === "number")
	{
		return "number";
	}
	else
	{
		return "object";
	}
};
		
gc.databind.internal.expressionParser.AbstractBinaryOperator.prototype.isStale = function()
{
	return this.leftOperand.isStale() || this.rightOperand.isStale();
};
		
gc.databind.internal.expressionParser.AbstractBinaryOperator.prototype.addStaleListener = function(listener)
{
	this.leftOperand.addStaleListener(listener);
	this.rightOperand.addStaleListener(listener);
};
		
gc.databind.internal.expressionParser.AbstractBinaryOperator.prototype.removeStaleListener = function(listener)
{
	this.leftOperand.removeStaleListener(listener);
	this.rightOperand.removeStaleListener(listener);
};
		
gc.databind.internal.expressionParser.AbstractBinaryOperator.prototype.isReadOnly = function()
{
	return this.doSetValue === undefined || !((this.leftOperand.isReadOnly() ? 1 : 0) ^ (this.rightOperand.isReadOnly() ? 1 : 0));
};



