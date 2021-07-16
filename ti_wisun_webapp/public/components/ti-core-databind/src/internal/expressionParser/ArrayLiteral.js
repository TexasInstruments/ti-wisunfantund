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
	var openingBracket = "[";
	var closingBracket = "]";
	var separator = ",";
	
	gc.databind.internal.expressionParser.ArrayLiteral = function(valueArray)
	{
		this.literalValue = valueArray;
	};
	
	gc.databind.internal.expressionParser.ArrayLiteral.prototype = new gc.databind.internal.expressionParser.AbstractLiteralBinding();
	
	gc.databind.internal.expressionParser.ArrayLiteral.prototype.getType = function()
	{
		return "array";
	};

	gc.databind.internal.expressionParser.ArrayLiteral.prototype.toString = function()
	{
		var text = openingBracket + this.literalValue.length === 0 ? '' : this.literalValue[0].toString();
		
		for(var i = 1; i < this.literalValue.length; i++)
		{
			text += separator + this.literalValue[i].toString();
		}
		
		return text + closingBracket;
	};
	
	gc.databind.internal.expressionParser.ArrayLiteral.parseLiteral = function(uri)
	{
		var values = uri.split(separator);
		
		if (values === null || values.length === 0)
		{
			return new gc.databind.internal.expressionParser.ArrayLiteral([]);
		}
		else if (values.length == 1)
		{
			return new gc.databind.internal.expressionParser.ArrayLiteral([values[0]]);
		}
		
		var numberLiterals = [];
		var stringLiterals = [];
		var booleanLiterals = [];
		
		for(var i = 0; i < values.length; i++)
		{
			var value = values[i].trim();
			if (value.length > 0)
			{
				stringLiterals.push(value);
				if (booleanLiterals !== undefined)
				{
					var booleanLiteral = gc.databind.internal.expressionParser.BooleanLiteral.parse(value);
					if (booleanLiteral !== null)
					{
						booleanLiterals.push(booleanLiteral);
					}
					else
					{
						booleanLiterals = undefined; 
					}
				}
				if (numberLiterals !== undefined)
				{
					var numberLiteral = gc.databind.internal.expressionParser.NumberLiteral.parse(value);
					if (numberLiteral !== null)
					{
						numberLiterals.push(numberLiteral);
					}
					else 
					{
						numberLiterals = undefined;
					}
				}
			}
			else
			{
				// empty item
				stringLiterals.push('');
				if (numberLiterals !== undefined)
				{
					numberLiterals.push(0);
				}
				if (booleanLiterals !== undefined)
				{
					booleanLiterals.push(false);
				}
			}
		}
	
		return new gc.databind.internal.expressionParser.ArrayLiteral(
				booleanLiterals || numberLiterals || stringLiterals);
	};
}());
