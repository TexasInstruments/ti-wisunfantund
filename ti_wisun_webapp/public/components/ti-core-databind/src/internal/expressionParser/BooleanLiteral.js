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

gc.databind.internal.expressionParser.BooleanLiteral = function(literal)
{
	this.literalValue = literal;
};

gc.databind.internal.expressionParser.BooleanLiteral.prototype = new gc.databind.internal.expressionParser.AbstractLiteralBinding();

gc.databind.internal.expressionParser.BooleanLiteral.prototype.toString = function()
{
	return literalValue.toString();
};

gc.databind.internal.expressionParser.BooleanLiteral.parse = function(literal)
{
	var upperCaseValue = literal.toUpperCase();
	if (upperCaseValue == "TRUE" || upperCaseValue == "FALSE")
	{
		return upperCaseValue == "TRUE";
	}
	return null;
};

gc.databind.internal.expressionParser.BooleanLiteral.parseLiteral = function(literal)
{
	var booleanValue = gc.databind.internal.expressionParser.BooleanLiteral.parse(literal);
	if (booleanValue !== null)
	{
		return new gc.databind.internal.expressionParser.BooleanLiteral(booleanValue);
	}
	return null;
};

