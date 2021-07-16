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

gc.databind.internal.expressionParser.AbstractComparisonOperator = function(operator)
{
	gc.databind.internal.expressionParser.AbstractBinaryOperator.call(this);

	if (operator)
	{
		this.operator = operator;
	}
};

gc.databind.internal.expressionParser.AbstractComparisonOperator.prototype = new gc.databind.internal.expressionParser.AbstractBinaryOperator();

gc.databind.internal.expressionParser.AbstractComparisonOperator.Factory = function(operator)
{
	this.operator = operator;
};

gc.databind.internal.expressionParser.AbstractComparisonOperator.Factory.prototype = new gc.databind.internal.expressionParser.AbstractBinaryOperator.Factory();

gc.databind.internal.expressionParser.AbstractComparisonOperator.prototype.getType = function()
{
	return "boolean";
};

gc.databind.internal.expressionParser.AbstractComparisonOperator.prototype.isReadOnly = function()
{
	return true;
};
