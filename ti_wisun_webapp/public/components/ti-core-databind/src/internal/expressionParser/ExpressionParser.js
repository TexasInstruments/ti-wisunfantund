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

gc.databind.internal.expressionParser.ExpressionParser = function(bindingProvider)
{
	this.bindProvider = bindingProvider;
	
	// add brackets that exclude operators
	this.addBraces('[', ']');  // array operator
	this.addBraces("'", "'"); // string literal single quotes
	
	// add operator factories for parser here in reverse precedence order
	// Priority 13: conditional ?: operator
	this.addOperatorFactory(gc.databind.internal.expressionParser.ConditionalOperator.factory);
	
	// Priority 12: logical or || operator.
	this.addOperatorFactory(gc.databind.internal.expressionParser.LogicalOrOperator.factory);
	
	// Priority 11: logical and && operator.
	this.addOperatorFactory(gc.databind.internal.expressionParser.LogicalAndOperator.factory);
	
	// Priority 10: bit wise or | operator.
	// Priority 9: bit wise xor ^ operator.
	// Priority 8: bit wise and & operator.
	// Priority 7: equality == and != operators
	this.addOperatorFactory(
			gc.databind.internal.expressionParser.EqualsOperator.factory,
			gc.databind.internal.expressionParser.NotEqualsOperator.factory);
	
	// Priority 6: comparison >, >=, <, <= operators
	this.addOperatorFactory(
			gc.databind.internal.expressionParser.GreaterThanOrEqualsOperator.factory,
			gc.databind.internal.expressionParser.LessThanOrEqualsOperator.factory,
			gc.databind.internal.expressionParser.GreaterThanOperator.factory,
			gc.databind.internal.expressionParser.LessThanOperator.factory);

	// Priority 5: shift >>, <<, >>> operators
	// Priority 4: arithmetic +, - operators
	this.addOperatorFactory(
			gc.databind.internal.expressionParser.AdditionOperator.factory,
			gc.databind.internal.expressionParser.SubtractionOperator.factory);
	
	// Priority 3: arithmetic *, /, % operators
	this.addOperatorFactory(
			gc.databind.internal.expressionParser.MultiplicationOperator.factory,
			gc.databind.internal.expressionParser.DivisionOperator.factory,
			gc.databind.internal.expressionParser.RemainderOperator.factory);
	
	// Priority 2: unary operators
	this.addOperatorFactory(
			gc.databind.internal.expressionParser.NegationOperator.factory, 
			gc.databind.internal.expressionParser.ArithmeticNotOperator.factory,
			gc.databind.internal.expressionParser.LogicalNotOperator.factory);

	// Priority 1: array index [] operator, and function() operator
	this.addOperatorFactory(gc.databind.internal.expressionParser.ArrayOperator.factory);
	this.addOperatorFactory(gc.databind.internal.expressionParser.FunctionOperator.factory);
};

gc.databind.internal.expressionParser.ExpressionParser.prototype = new gc.databind.internal.expressionParser.AbstractUriBindingFactory();

gc.databind.internal.expressionParser.ExpressionParser.prototype.bindValue = function(uri, isLookupBinding)
{
	if (uri.length === 0)
	{
		throw "Empty Param";
	}
	
	var modelFactory;
	var pos = uri.indexOf('.');
	if (pos > 0)
	{
		var modelName = uri.substring(0, pos);
		if (modelName === 'widget' || modelName ==='$')
		{
		    var endPos = uri.indexOf('.', pos+1);
		    if (endPos > 0)
		    {
		        var widgetModelName = uri.substring(pos+1, endPos);
		        if (this.bindProvider.getModel(widgetModelName))
		        {
		            modelName = widgetModelName;
		            pos = endPos;
		        }
		    }
		}
		
	    modelFactory = this.bindProvider.getModel(modelName);

	    if (modelFactory !== null && modelFactory !== undefined)
	    {
	        uri = uri.substring(pos+1);
	    }
	}

    modelFactory = modelFactory || this.bindProvider.getModel();
    if (modelFactory)
    {
        if (isLookupBinding)
        {
            return modelFactory.createNewBind(uri);  
        }
        return modelFactory.parseModelBinding(uri);
	}
    else
    {
        throw "There is no default model for bindings";
    }
};

gc.databind.internal.expressionParser.ExpressionParser.prototype.parseExpression = function(expression, precedence)
{
	return this.bindProvider.getBinding(expression, precedence);
};
