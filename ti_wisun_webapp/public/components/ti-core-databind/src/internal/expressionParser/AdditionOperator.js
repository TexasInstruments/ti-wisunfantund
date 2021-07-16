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

(function() 
{
	var OP = "+";
	
	gc.databind.internal.expressionParser.AdditionOperator = function()
	{
		gc.databind.internal.expressionParser.AbstractBinaryOperator.call(this);
	};
	
	gc.databind.internal.expressionParser.AdditionOperator.prototype = new gc.databind.internal.expressionParser.AbstractBinaryOperator(OP);
	
	gc.databind.internal.expressionParser.AdditionOperator.factory = (function()
	{
		var Factory = function()
		{
		};
		
		Factory.prototype = new gc.databind.internal.expressionParser.AbstractBinaryOperator.Factory(OP);
		
		Factory.prototype.createOperator = function()
		{
			return new gc.databind.internal.expressionParser.AdditionOperator();
		};
		
		return new Factory();
	}());

	gc.databind.internal.expressionParser.AdditionOperator.prototype.evalArray = function(left, right)
	{
		var result;
		
		if (left.length === 0)
		{
			result = right;
		}
		else if (right.length === 0)
		{
			result = left;
		}
		else
		{
			result = [];
			
			for(var i = 0; i < left.length; i++)
			{
				result.push(left[i]);
			}
			for(i = 0; i < right.length; i++)
			{
				result.push(right[i]);
			}
		}
		return result;
	};

	gc.databind.internal.expressionParser.AdditionOperator.prototype.evalString = 
		gc.databind.internal.expressionParser.AdditionOperator.prototype.evalNumber = function(left, right)
	{
		return left + right;
	};
	
	gc.databind.internal.expressionParser.AdditionOperator.prototype.doSetValue = function(value, constant, isLeftParamConstant)
	{
		var type = this.getType();
		if (type == "string")
		{
			var match = constant.toString();
			if (isLeftParamConstant)
			{
				if (value.indexOf(match) === 0)
				{
					return value.substring(match.length);
				}
			}
			else if (value.lastIndexOf(match) + match.length == value.length)
			{
				return value.substring(0, value.length- match.length);
			}
		}
		else if (type == "number")
		{
			return value - constant;
		}
		return value;
	};

}());
