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
	var OP = "~";
	gc.databind.internal.expressionParser.ArithmeticNotOperator = function()
	{
	};
	
	gc.databind.internal.expressionParser.ArithmeticNotOperator.prototype = new gc.databind.internal.expressionParser.AbstractUnaryOperator(OP);
	
	gc.databind.internal.expressionParser.ArithmeticNotOperator.factory = (function()
	{
		var Factory = function()
		{
		};
		
		Factory.prototype = new gc.databind.internal.expressionParser.AbstractUnaryOperator.Factory(OP);

		Factory.prototype.createOperator = function()
		{
			return new gc.databind.internal.expressionParser.ArithmeticNotOperator();
		};
		
		return new Factory();
	}());

	gc.databind.internal.expressionParser.ArithmeticNotOperator.prototype.evalNumber = function(value, write)
	{
		return ~value;
	};
}());
