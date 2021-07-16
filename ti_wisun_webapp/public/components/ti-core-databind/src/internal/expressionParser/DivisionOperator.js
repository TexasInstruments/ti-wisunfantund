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
	gc.databind.internal.expressionParser.DivisionOperator = function()
	{
		gc.databind.internal.expressionParser.AbstractBinaryOperator.call(this);
	};
	
	var OP = "/";
	
	gc.databind.internal.expressionParser.DivisionOperator.prototype = new gc.databind.internal.expressionParser.AbstractBinaryOperator(OP);
	
	gc.databind.internal.expressionParser.DivisionOperator.factory = (function()
	{
		var Factory = function()
		{
		};
		
		Factory.prototype = new gc.databind.internal.expressionParser.AbstractBinaryOperator.Factory(OP);

		Factory.prototype.createOperator = function()
		{
			return new gc.databind.internal.expressionParser.DivisionOperator();
		};
		
		return new Factory();
	}());
	
	gc.databind.internal.expressionParser.DivisionOperator.prototype.evalNumber = function(left, right) 
	{
		return left / right;
	};
	
	gc.databind.internal.expressionParser.DivisionOperator.prototype.doSetValue = function(value, constant, isLeftParamConstant)
	{
		return isLeftParamConstant ? value / constant : value * constant; 
	};

	gc.databind.internal.expressionParser.DivisionOperator.prototype.getType = function()
	{
		return "number";
	};
}());