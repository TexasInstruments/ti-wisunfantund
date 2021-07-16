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
	gc.databind.internal.expressionParser.StringLiteral = function(literal)
	{
		this.literalValue = literal.split("\\'").join(singleQuote);
		this.literalValue = this.literalValue.split("\\\\").join("\\");
	};

	gc.databind.internal.expressionParser.StringLiteral.prototype = new gc.databind.internal.expressionParser.AbstractLiteralBinding();
	
	var singleQuote = "'";
	
	gc.databind.internal.expressionParser.StringLiteral.prototype.toString = function()
	{
		return literalValue;
	};
	
	gc.databind.internal.expressionParser.StringLiteral.parseLiteral = function(uri)
	{
		if (uri.indexOf(singleQuote) === 0)
		{
			// find end pos skipping escaped quotes preceded by backslash character.
			
			var endPos = 0;
			var escaped;
			do
			{
				endPos = uri.indexOf(singleQuote, endPos+1);
				escaped = false;
				
				for(var i = endPos; i > 0 && uri.charAt(i-1) == '\\'; i-- )
				{
					escaped = !escaped;
				}
			}
			while(escaped);
			
			if (endPos <= 0)
			{
				gc.databind.internal.expressionParser.AbstractUriBindingFactory.composeMissingClosingBraceErrMsg(uri, "single quote");
			}
			else if (endPos != uri.length-1)
			{
				gc.databind.internal.expressionParser.AbstractUriBindingFactory.composeMissingOperatorErrMsg(uri.substring(endPos+1));
			}
			else
			{
				// strip quotes
				uri = uri.substring(1, uri.length-1);
				return new gc.databind.internal.expressionParser.StringLiteral(uri);
			}
		}
		return null;
	};
}());
