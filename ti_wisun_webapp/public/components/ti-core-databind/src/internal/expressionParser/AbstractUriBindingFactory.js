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
	var endsWith = function(str, suffix) 
	{
	    return str.indexOf(suffix, str.length - suffix.length) !== -1;
	};
	
	var isDigit = function(c)
	{
		return (c >= '0' && c <= '9') || c === '.';
	};
	
	var notIdentifierRegExp = /[^A-Za-z$_\.0-9]+/;
	
	var Bracket = function(opening, closing, next)
	{
		this.openingBrace = opening;
		this.closingBrace = closing;
		this.link = next;
	};
	
	Bracket.prototype.countBraces = function(text, brace, endingPos)
	{
		var count = 0; 
		for( var pos = 0; pos <= endingPos; )
		{
			pos = text.indexOf(brace, pos);
			if (pos < 0 || pos > endingPos )
			{
				break;
			}
			else if (pos === 0 || (text.charAt(pos-1) !== '\\' &&
				(this.link === null || !this.link.isInBracket(text, pos))))
			{
				count++;
			}
			pos = pos + brace.length;
		}
		return count;
	};
	
	Bracket.prototype.isInBracket = function(text, endingPos)
	{
		var count = this.countBraces(text, this.openingBrace, endingPos);
		if (count > 0)
		{
			if (this.closingBrace !== this.openingBrace)
			{
				count -= this.countBraces(text, this.closingBrace, endingPos);
				return count !== 0;
			}
			else if ((count & 1) !== 0) // if odd count, then we are in a bracket; otherwise we are not.
			{
				return true;
			}
		}
		
		// if not in this bracket, try the next one
		if (this.link !== null)
		{
			return this.link.isInBracket(text, endingPos);
		}
		return false;  // we are not in any of the brackets.
	};
			
	var composeUnrecognizedTextErrMsg = function(text, literalErrorMessage)
	{
		// Unrecognized character
		var msg = 'Unexpected character';
		if (text.length > 1)
		{
			msg += 's "' + text + '" were';
		}
		else
		{
			msg += ' "' + text + '" was';
		}
		msg += ' found.  If this was suppose to be an operator, it is not supported.';
		
		if (literalErrorMessage !== null)
		{
			msg += '  Also, I do not recognize this as part of a literal.  ' + literalErrorMessage;
		}
		throw msg;
	};
		
	var composeUnexpectedWhiteSpaceErrMsg = function(text)
	{
		// spaces are not allowed in identifiers
		throw 'Unexpected white space was found in the following expression "' + text +
			'".  To be honest, I was expecting an operator, or something other than blank.';
	};
	
	var composeUnrecognizedIdentifier = function(unrecognizedText, literalErrorMessage)
	{
		if (unrecognizedText.trim().length === 0)
		{
			this.composeUnexpectedWhiteSpaceErrMsg(unrecognizedText);
		}
		else
		{
			composeUnrecognizedTextErrMsg(unrecognizedText, literalErrorMessage);
		}
	};
		
	var composeMissingClosingBraceErrMsg = function(uri, brace)
	{
		throw 'To be honest, I was expecting to find a terminating ' + brace + ' after "' + uri + '".';
	};
	
	var composeMissingOperatorErrMsg = function(uri)
	{
		throw 'To be honest, I was expecting to find an operator at the beginning of this expression: ' + uri;
	};
		
	gc.databind.internal.expressionParser.AbstractUriBindingFactory = function()
	{
	};
	
	gc.databind.internal.expressionParser.AbstractUriBindingFactory.prototype = new gc.databind.internal.expressionParser.IUriBindingFactory();

	gc.databind.internal.expressionParser.AbstractUriBindingFactory.composeMissingClosingBraceErrMsg = composeMissingClosingBraceErrMsg;
	gc.databind.internal.expressionParser.AbstractUriBindingFactory.composeMissingOperatorErrMsg = composeMissingOperatorErrMsg;
	
	var initialize = function()
	{
		this._operatorFactories = this._operatorFactories || [];
		this._brackets = this._brackets || new Bracket("(", ")", null);
	};
	
	gc.databind.internal.expressionParser.AbstractUriBindingFactory.prototype.addOperatorFactory = function(factory)
	{
		initialize.call(this);
		if (arguments.length > 1)
		{
			factory = new gc.databind.internal.expressionParser.OperatorList(arguments);
		}
		this._operatorFactories.push(factory);
	};
		
	gc.databind.internal.expressionParser.AbstractUriBindingFactory.prototype.addBraces = function(openingBrace, closingBrace)
	{
		initialize.call(this);
		// ensure parenthesis () are kept at front of list, because order matters.
		this._brackets.link = new Bracket(openingBrace, closingBrace, this._brackets.link);
	};
	
	gc.databind.internal.expressionParser.AbstractUriBindingFactory.prototype.parseLiteral = function(uri)
	{
		var result = gc.databind.internal.expressionParser.NumberLiteral.parseLiteral(uri);
		if (result === null)
		{
			result = gc.databind.internal.expressionParser.BooleanLiteral.parseLiteral(uri);
		}
		if (result === null)
		{
			result = gc.databind.internal.expressionParser.StringLiteral.parseLiteral(uri);
		}
		return result;
	};
	
	gc.databind.internal.expressionParser.AbstractUriBindingFactory.prototype.parseLookupExpression = function(uri, precedence)
	{
	    return this.parse(uri, precedence, true);  // skip getBinding() because we don't want lookup expressions in the bindingRegister. (true === isLookupBinding)
	};
		
	gc.databind.internal.expressionParser.AbstractUriBindingFactory.prototype.findFirstIndexOf = function(text, operator, startingPos)
	{
		var pos = startingPos;
		var len = operator.length-2;
		while(true)
		{
			pos = text.indexOf(operator, pos);
			if (pos > 0 && this._brackets.isInBracket(text, pos+len))
			{
				pos = pos + operator.length;
				if (pos >= text.length)
				{
					pos = -1;  // ran out of text, so indicate no match found.
					break;
				}
			}
			else
			{
				break;
			}
		}
		return pos;
	};
		
	gc.databind.internal.expressionParser.AbstractUriBindingFactory.prototype.findLastIndexOf = function(text, operator, includeOperator)
	{
		var pos = text.lastIndexOf(operator);
		var len = includeOperator ? operator.length-1 : -1;
		while(pos > 0 && this._brackets.isInBracket(text, pos+len))
		{
			pos = text.lastIndexOf(operator, pos - operator.length);
		}
		return pos;
	};
		
	gc.databind.internal.expressionParser.AbstractUriBindingFactory.prototype.findMatchingBrace = function(text, openingBrace, closingBrace)
	{
		var pos = -1;
		var nestedBracePos = -1;
		do 
		{
			pos = this.findFirstIndexOf(text, closingBrace, pos+1);
			nestedBracePos = this.findFirstIndexOf(text, openingBrace, nestedBracePos+1);
		}
		while (nestedBracePos >= 0 && pos > nestedBracePos);
		
		return pos;
	};
	
	var composerInvalidIdentifierErrorMessage = function(text, errDetailMessage, errMessageContext)
	{
		throw 'Invalid identifier found' + (errMessageContext || '') + ': "' + text + '".  To be honest, ' + errDetailMessage;
	};
	
	gc.databind.internal.expressionParser.AbstractUriBindingFactory.prototype.testIdentifier = function(text, errMessageContext)
	{
		if (!isDigit(text.charAt(0)))
		{
			var unexpectedCharacters = notIdentifierRegExp.exec(text);
			if (unexpectedCharacters !== null)
			{
				composerInvalidIdentifierErrorMessage(text, 'I was not expecting to find "' + unexpectedCharacters[0] + '".');
			}
		}
		else if (text.charAt(0) === '.')
		{
			composerInvalidIdentifierErrorMessage(text, 'I was not expecting it to begin with a period.');
		}
		else
		{
			composerInvalidIdentifierErrorMessage(text, 'I was not expecting it to begin with a number.');
		}
	};
	
	gc.databind.internal.expressionParser.AbstractUriBindingFactory.prototype.parse = function(uri, precedence, isLookupBinding)
	{
        if (uri === null || uri === undefined || uri.length === 0)
        {
            return null;
        }
        
        precedence = precedence || 0;
        
        var result = null;
        var unrecognizedText = notIdentifierRegExp.exec(uri);
            
        // parse operators first
        if (unrecognizedText !== null)
        {
            for(var i = precedence; i < this._operatorFactories.length && result === null; i++)
            {
                var operatorFactory = this._operatorFactories[i];
                result = operatorFactory.parse(uri, this, i);
            }
        }
        
        // no operators found, try parsing literal
        var literalErrorMessage = null;
        if (result === null)
        {
            try
            {
                result = this.parseLiteral(uri);
            }
            catch(e)
            {
                if (isDigit(uri.charAt(0)))
                {
                    // identifiers can't start with a digit, so re throw this exception.
                    // hopefully this error message will be more meaningful that the identifier error message. 
                    throw e;  
                }
                literalErrorMessage = e.toString();
            }
        }
        
        // try parsing config variable references
        if (result === null)
        {
            if (unrecognizedText === null)
            {
                result = this.bindValue(uri, isLookupBinding);
            }
            else
            {
                composeUnrecognizedIdentifier(unrecognizedText[0], literalErrorMessage);
            }
        }
		
		if (result && result.setIndex)
		{
			result.setIndex();  // kick start index lookups if parseLookupExpression returns a lookup operator.
		}
		return result;
	};
	
}());
