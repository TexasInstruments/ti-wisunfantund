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

gc.databind.internal.expressionParser.DotOperator = function(lookupBinding, fieldNameBinding)
{
	this.lookupBinding = lookupBinding;
	this.indexBindings = [ new gc.databind.internal.expressionParser.StringLiteral(fieldNameBinding) ];
};

gc.databind.internal.expressionParser.DotOperator.prototype = new gc.databind.internal.expressionParser.AbstractLookupOperator();

gc.databind.internal.expressionParser.DotOperator.prototype.toString = function()
{
	return this.lookupBinding.toString() + '.' + this.indexBinding[0];
};

gc.databind.internal.expressionParser.DotOperator.factory = (function()
{
	var Factory = function()
	{
	    this._qualifiers = new gc.databind.internal.QualifierFactoryMap();
	};
	
	Factory.prototype = new gc.databind.internal.expressionParser.AbstractLookupOperator.Factory('.');
	
	var createDotOperatorHelper = function(operandText)
	{
	    var leftOperand = this;
	    return (operandText.length > 1) ? new gc.databind.internal.expressionParser.DotOperator(leftOperand, operandText.substring(1)) : leftOperand;
    };
	
	Factory.prototype.parse = function(uri, factory, precedence)
	{
		// dot operator is only allowed after array or function syntax.  Otherwise it is just part of the identifier for the model binding.
		var pos = factory.findLastIndexOf(uri, '].', true);
		if (pos < 0)
		{
			pos = factory.findLastIndexOf(uri, ').', true);
		}
		
		if (pos > 0 && pos < uri.length-1) // can't be first or last character, because it's not a unary operator
		{
			pos++; 
			var operandText = uri.substring(0, pos);
			var leftOperand = factory.parseLookupExpression(operandText, precedence);
			leftOperand.setName(operandText);
			this.testLookupBinding(leftOperand);  // throw exception if invalid binding found.
			operandText = uri.substring(pos + this.operator.length);
			factory.testIdentifier(operandText, 'in dot operator field name');  // throws exception if invalid identifier.
			
			return this._qualifiers.parseQualifiers('.'+operandText, createDotOperatorHelper, leftOperand);
		}
		return null;
	};

	Factory.prototype.createOperator = function()
	{
		return new gc.databind.internal.expressionParser.DotOperator();
	};
	
	return new Factory();
}());
