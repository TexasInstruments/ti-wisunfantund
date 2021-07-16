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

gc.databind.internal.expressionParser.NumberLiteral = function(literal)
{
	this.literalValue = literal;
};

gc.databind.internal.expressionParser.NumberLiteral.prototype = new gc.databind.internal.expressionParser.AbstractLiteralBinding();


gc.databind.internal.expressionParser.NumberLiteral.prototype.toString = function()
{
	return this.literalValue.toString();
};
	
gc.databind.internal.expressionParser.NumberLiteral.parse = function(literal)
{
	var value = Number(literal);
	if (!isNaN(value))
	{
		return value;
	}
	return null;
};

gc.databind.internal.expressionParser.NumberLiteral.parseLiteral = function(uri)
{
	var result = gc.databind.internal.expressionParser.NumberLiteral.parse(uri);
	return result === null ? null : new gc.databind.internal.expressionParser.NumberLiteral(result);
};
