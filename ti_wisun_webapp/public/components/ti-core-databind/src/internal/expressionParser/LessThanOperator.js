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
	var OP = "<";
	
	gc.databind.internal.expressionParser.LessThanOperator = function()
	{
		gc.databind.internal.expressionParser.AbstractComparisonOperator.call(this);
	};
	
	gc.databind.internal.expressionParser.LessThanOperator.prototype = new gc.databind.internal.expressionParser.AbstractComparisonOperator(OP);

	gc.databind.internal.expressionParser.LessThanOperator.factory = (function()
	{
		var Factory = function()
		{
		};
		
		Factory.prototype = new gc.databind.internal.expressionParser.AbstractComparisonOperator.Factory(OP);

		Factory.prototype.createOperator = function()
		{
			return new gc.databind.internal.expressionParser.LessThanOperator();
		};
		
		return new Factory();
	}());
	
	gc.databind.internal.expressionParser.LessThanOperator.prototype.evalNumber = 
		gc.databind.internal.expressionParser.LessThanOperator.prototype.evalString = function(left, right)
	{
		return left < right;
	};
}());
