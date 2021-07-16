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

gc.databind.internal.expressionParser.OperatorList = function(args)
{
	this.samePrecedenceOperators = [];
	for(var i = 0; i < args.length; i++)
	{
		this.samePrecedenceOperators.push(args[i]);
	}
};

gc.databind.internal.expressionParser.OperatorList.prototype = new gc.databind.internal.expressionParser.IOperator.Factory();
	
gc.databind.internal.expressionParser.OperatorList.prototype.parse = function(uri, factory, precedence)
{
	// search for first operator from right to left order 
	var firstOperator = -1;
	var operator = null;
	for(var i = 0; i < this.samePrecedenceOperators.length; i++)
	{
		var parser = this.samePrecedenceOperators[i];
		var pos = factory.findLastIndexOf(uri, parser.getOperator());
		if (pos > firstOperator)
		{
			firstOperator = pos;
			operator = parser;
		}
	}
	if (operator !== null)
	{
		return operator.parse(uri, factory, precedence);
	}
	return null;
};

gc.databind.internal.expressionParser.OperatorList.prototype.getOperator = function()
{
	return this.samePrecedenceOperators.get(0).getOperator();
};

