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
	var OP = "||";
	
	gc.databind.internal.expressionParser.LogicalOrOperator = function()
	{
		gc.databind.internal.expressionParser.AbstractBinaryOperator.call(this);
	};
	
	gc.databind.internal.expressionParser.LogicalOrOperator.prototype = new gc.databind.internal.expressionParser.AbstractBinaryOperator(OP);
	
	gc.databind.internal.expressionParser.LogicalOrOperator.factory = (function()
	{
		var Factory = function()
		{
		};
		
		Factory.prototype = new gc.databind.internal.expressionParser.AbstractBinaryOperator.Factory(OP);
		
		Factory.prototype.createOperator = function()
		{
			return new gc.databind.internal.expressionParser.LogicalOrOperator();
		};
		
		return new Factory();
	}());

	gc.databind.internal.expressionParser.LogicalOrOperator.prototype.evalBoolean = function(left, right)
	{
		return left || right;
	};
	
	gc.databind.internal.expressionParser.LogicalOrOperator.prototype.evalNumber = function(left, right)
	{
		return left != 0 || right != 0;
	};
	
	gc.databind.internal.expressionParser.LogicalOrOperator.prototype.getType = function()
	{
		return "boolean";
	};
}());
