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
	var operator = '()';
	
	gc.databind.internal.expressionParser.FunctionOperator = function()
	{
	};

	gc.databind.internal.expressionParser.FunctionOperator.prototype = new gc.databind.internal.expressionParser.AbstractLookupOperator(operator);

	gc.databind.internal.expressionParser.FunctionOperator.factory = (function() 
	{
		var Factory = function()
		{
		};
		
		Factory.prototype = new gc.databind.internal.expressionParser.AbstractLookupOperator.Factory(operator);

		Factory.prototype.createOperator = function()
		{
			return new gc.databind.internal.expressionParser.FunctionOperator();
		};
		
		Factory.prototype.parseLiteral = function(uri, factory, precedence)
		{
			return factory.parseExpression(uri, 0); // reset precedence to look for operators inside parentheses.
		};
		
		return new Factory();
	}());
}());
