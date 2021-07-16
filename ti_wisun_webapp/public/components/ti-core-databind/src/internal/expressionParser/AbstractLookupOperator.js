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

gc.databind.internal.expressionParser.AbstractLookupOperator = function(operator)
{
	this.operator = operator;
};

gc.databind.internal.expressionParser.AbstractLookupOperator.prototype = new gc.databind.ILookupBindValue(); 
	
gc.databind.internal.expressionParser.AbstractLookupOperator.Factory = function(operator)
{
	this.operator = operator;
};

gc.databind.internal.expressionParser.AbstractLookupOperator.Factory.prototype = new gc.databind.internal.expressionParser.IOperator.Factory();


gc.databind.internal.expressionParser.AbstractLookupOperator.Factory.prototype.testLookupBinding = function(lookupBinding)
{
	if (!(lookupBinding instanceof gc.databind.AbstractLookupBindValue || lookupBinding instanceof gc.databind.ILookupBindValue))
	{ 
		var text = this.operator === '()' ? "a function" : this.operator === "." ? "an object" : "an array";
		throw "'" + lookupBinding.getName() + "' is not " + text + " type.  It cannot be used with the " + this.operator + " operator."; 
	}
};
		
gc.databind.internal.expressionParser.AbstractLookupOperator.Factory.prototype.parse = function(uri, factory, precedence)
{
	var openingBrace = this.operator.charAt(0);
	var closingBrace = this.operator.charAt(1);
	
	var endPos = factory.findLastIndexOf(uri, closingBrace, true);
	if (endPos >= 0)
	{
		if (endPos === uri.length-1)
		{
			// valid lookup operation
			var pos = factory.findLastIndexOf(uri, openingBrace);
			if (pos === 0)
			{
				// literal array or just plain parentheses
				return this.parseLiteral(uri.substring(1, uri.length-1), factory, precedence);
			}
			else if (pos < 0)
			{
				// missing matching '[' or '(' operator.
				throw "I found a '" + closingBrace + "' operator, but I couldn't find the matching '" + openingBrace + "' operator.  " +
					"To be honest I was expecting one in the following text: " + uri.substring(0, endPos+1);
			}
			else if (pos === endPos - 1)
			{
				// empty middle paramenter
				throw "I found an empty operator '" + this.operator + "'.  To be honest, I was expecting to find something inside.";
			}
			else
			{
				// empty right paramenter, this is the normal case, nothing following the <expression>[].
				var arrayText = uri.substring(0, pos);
				var indexText = uri.substring(pos+1, endPos);
				
				if (arrayText === 'Q')
				{
				    return gc.databind.internal.expressionParser.QFunctionOperator.factory.parse(indexText, factory, 0);
				}

				// strip parenthesis (since we are not registering lookup bindings in binding Register)
				while(arrayText.charAt(0) === '(' && arrayText.charAt(arrayText.length-1) === ')')
				{
					precedence = 0; // reset precedence do to parentheses found
					arrayText = arrayText.substring(1, arrayText.length-1);
				}
				
				var lookupBinding = factory.parseLookupExpression(arrayText, precedence);  
				lookupBinding.setName(arrayText);
				this.testLookupBinding(lookupBinding);  // throw exception if invalid binding found.
				
				var indexBindings = [];
				
				var parameters = indexText.split(',');
				for(var i = 0; i < parameters.length; i++ )
				{
					var parameter = parameters[i];
					if (parameter.length === 0)
					{
						throw "Empty array index or function parameter.  " +
							"To be honest, I was expecting one or more parameters separated by commas, " +
							"but found that one of the parameters was empty in: " + indexText; 
					}
					
					var indexBinding = factory.parseExpression(parameter, 0);
					if (!indexBinding)
					{
                        throw 'Index binding "' + parameter +'" does not exist'; 
					}

					indexBindings.push(indexBinding);
				}
				
				var result = this.createOperator();
				result.lookupBinding = lookupBinding;
				result.indexBindings = indexBindings;
				
				for(var j = indexBindings.length; j-- > 0; )
				{
					// add listeners to index changes.
					indexBindings[j].addChangedListener(result);
				}
				return result;
			}
		}
		else if (uri.charAt(endPos+1) === '.' && endPos < uri.length-2)
		{
			// dot operator found
			return gc.databind.internal.expressionParser.DotOperator.factory.parse(uri, factory, precedence);
		}
		else // extra trailing text.
		{
			throw "I found an operator '" + this.operator + "' with unexpected characters following it.  " +
			"To be honest, I was not expecting to find another operator after the last '" + closingBrace  +
			" in the following text: " + uri.substring(endPos+1);
		}
	}
	return null;
};

gc.databind.internal.expressionParser.AbstractLookupOperator.Factory.prototype.parseLiteral = function()
{
};

gc.databind.internal.expressionParser.AbstractLookupOperator.Factory.prototype.getOperator = function()
{
	return this.operator;
};

gc.databind.internal.expressionParser.AbstractLookupOperator.prototype.addStreamingListener = function(listener)
{
    this.lookupBinding.addStreamingListener(listener);
};
        
gc.databind.internal.expressionParser.AbstractLookupOperator.prototype.removeStreamingListener = function(listener)
{
    this.lookupBinding.removeStreamingListener(listener);
};

gc.databind.internal.expressionParser.AbstractLookupOperator.prototype.addChangedListener = function(listener)
{
	this.lookupBinding.addChangedListener(listener);
};
		
gc.databind.internal.expressionParser.AbstractLookupOperator.prototype.removeChangedListener = function(listener)
{
	this.lookupBinding.removeChangedListener(listener);
};

gc.databind.internal.expressionParser.AbstractLookupOperator.prototype.getStatus = function()
{
	var status = this.lookupBinding.getStatus();
	for(var i = 0; status === null && i < this.indexBindings.length; i++)
	{
		status = this.indexBindings[i].getStatus();
	}
	return status;
};

gc.databind.internal.expressionParser.AbstractLookupOperator.prototype.setStatus = function(status)
{
	this.lookupBinding.setStatus(status);
};

gc.databind.internal.expressionParser.AbstractLookupOperator.prototype.addStatusListener = function(listener)
{
	this.lookupBinding.addStatusListener(listener);
	
	for(var i = this.indexBindings.length; i-- > 0; )
	{
		 this.indexBindings[i].addStatusListener(listener);
	}
};

gc.databind.internal.expressionParser.AbstractLookupOperator.prototype.removeStatusListener = function(listener)
{
	this.lookupBinding.removeStatusListener(listener);

	for(var i = this.indexBindings.length; i-- > 0; )
	{
		this.indexBindings[i].removeStatusListener(listener);
	}
};
		
gc.databind.internal.expressionParser.AbstractLookupOperator.prototype.dispose = function()
{
	if (this.lookupBinding.dispose !== undefined)
	{
		this.lookupBinding.dispose();
	}
	
	for(var i = this.indexBindings.length; i-- > 0; )
	{
		var indexBinding = this.indexBindings[i];
		indexBinding.removeChangedListener(this);
		if (indexBinding.dispose !== undefined)
		{
			indexBinding.dispose();
		}
	}
};
		
gc.databind.internal.expressionParser.AbstractLookupOperator.prototype.getType = function()
{
	return this.lookupBinding.getType();
};
		
gc.databind.internal.expressionParser.AbstractLookupOperator.prototype.isStale = function()
{
	var result = this.lookupBinding.isStale();
	
	for(var i = this.indexBindings.length; result === false && i-- > 0; )
	{
		result = this.indexBindings[i].isStale();
	}
	return result;
};
		
gc.databind.internal.expressionParser.AbstractLookupOperator.prototype.addStaleListener = function(listener)
{
	this.lookupBinding.addStaleListener(listener);
	
	for(var i = this.indexBindings.length; i-- > 0; )
	{
		this.indexBindings[i].addStaleListener(listener);
	}
};
		
gc.databind.internal.expressionParser.AbstractLookupOperator.prototype.removeStaleListener = function(listener)
{
	this.lookupBinding.removeStaleListener(listener);
	
	for(var i = this.indexBindings.length; i-- > 0; )
	{
		this.indexBindings[i].removeStaleListener(listener);
	}
};
		
gc.databind.internal.expressionParser.AbstractLookupOperator.prototype.isReadOnly = function()
{
	return this.lookupBinding.isReadOnly();
};
		
gc.databind.internal.expressionParser.AbstractLookupOperator.prototype.setName = function(name)
{
	this.fName = name;
};
		
gc.databind.internal.expressionParser.AbstractLookupOperator.prototype.getName = function() 
{
	return this.fName;
};

gc.databind.internal.expressionParser.AbstractLookupOperator.prototype.onStaleChanged = function()
{
	// remove listener
	this._staleIndexBinding.removeStaleListener(this);
	this._staleIndexBinding = undefined;
	
	// attempt to setIndex again
	this.setIndex.apply(this, this._cachedIndecies);
};

gc.databind.internal.expressionParser.AbstractLookupOperator.prototype.setIndex = function()
{
	var indecies = [];
	
	for(var i = 0; i < this.indexBindings.length; i++)
	{
		var indexBinding = this.indexBindings[i];
		if (indexBinding.isStale())
		{
			// postpone calling setIndex on lookupBinding until all indecies have 
			// non stale values.
			if (this._staleIndexBinding === undefined)
			{
				this._staleIndexBinding = indexBinding;
				indexBinding.addStaleListener(this);
			}
			this._cachedIndecies = arguments;
			return;
		}
		indecies.push(indexBinding.getValue());
	}
	for(i = 0; i < arguments.length; i++)
	{
		indecies.push(arguments[i]);
	}
	
	this.lookupBinding.setIndex.apply(this.lookupBinding, indecies);
};

gc.databind.internal.expressionParser.AbstractLookupOperator.prototype.getValue = function()
{
	return this.lookupBinding.getValue();
};

gc.databind.internal.expressionParser.AbstractLookupOperator.prototype.setValue = function(value, progress, forceWrite)
{
	this.lookupBinding.setValue(value, progress, forceWrite);
};

gc.databind.internal.expressionParser.AbstractLookupOperator.prototype.onValueChanged = function(oldValue, newValue, progress)
{
	this.setIndex();
};

gc.databind.internal.expressionParser.AbstractLookupOperator.prototype.toString = function()
{
	var result = this.lookupBinding.toString() + this.operator.charAt(0) + this.indexBindings[0].toString();
	
	for(var i = 1; i < this.indexBindings.length; i++)
	{
		result += ', ' + this.indexBindings[i].toString();
	}
	return result + this.operator.charAt(1);
};

