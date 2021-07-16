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

gc.databind.internal.expressionParser.ConditionalOperator = function()
{
};

gc.databind.internal.expressionParser.ConditionalOperator.prototype = new gc.databind.IBindValue();

gc.databind.internal.expressionParser.ConditionalOperator.factory = (function()
{
	var openingBrace = "?";
	var closingBrace = ":";
	
	var Factory = function()
	{
	};
	
	Factory.prototype = new gc.databind.internal.expressionParser.IOperator.Factory();
	
	Factory.prototype.parse = function(uri, factory, precedence)
	{
		var pos = factory.findFirstIndexOf(uri, openingBrace, 0);
		if (pos === 0)
		{
			// empty condition paramenter
			throw "I found a '?' operator but nothing in front of it.  " +
				"To be honest, I was expecting to find something before the '?' in the following text: " + uri;
		}
		else if (pos > 0)
		{
			var conditionText = uri.substring(0, pos);
			var remainingText = uri.substring(pos + 1);
			
			pos = factory.findMatchingBrace(remainingText, openingBrace, closingBrace);
			
			if (pos < 0)  
			{
				// missing matching ':' operator.
				throw "I found a '?' operator, but I couldn't find the matching ':' operator.  " +
					"To be honest I was expecting one in the following text: " + remainingText;
			}
			else if (pos === 0)
			{
				// empty middle paramenter
				throw "I found a ':' imediately following a '?' operator.  To be honest, I was expecting to find something between them.";
			}
			else if (pos >= remainingText.length-1)
			{
				// empty right paramenter
				throw "I found a '?' operator a with matching ':', but nothing after the ':' operator.  " +
					"To be honest, I was expecting to find something after the ':' in the following text: " + remainingText;
			}
			else
			{
				var trueText = remainingText.substring(0, pos);
				var falseText = remainingText.substring(pos+1);
				
				var result = new gc.databind.internal.expressionParser.ConditionalOperator();
				
				result.condition = factory.parseExpression(conditionText, precedence);
				result.trueOperand = factory.parseExpression(trueText, precedence);
				result.falseOperand = factory.parseExpression(falseText, precedence);
				return result;
			}
		}
		return null;
	};
	
	Factory.prototype.getOperator = function()
	{
		return openingBrace;
	};

	return new Factory();
}());

gc.databind.internal.expressionParser.ConditionalOperator.prototype.addChangedListener = function(listener)
{
	this.condition.addChangedListener(listener);
	this.trueOperand.addChangedListener(listener);
	this.falseOperand.addChangedListener(listener);
};

gc.databind.internal.expressionParser.ConditionalOperator.prototype.removeChangedListener = function(listener)
{
	this.condition.removeChangedListener(listener);
	this.trueOperand.removeChangedListener(listener);
	this.falseOperand.removeChangedListener(listener);
};

gc.databind.internal.expressionParser.ConditionalOperator.prototype.addStatusListener = function(listener)
{
	this.condition.addStatusListener(listener);
	this.trueOperand.addStatusListener(listener);
	this.falseOperand.addStatusListener(listener);
};

gc.databind.internal.expressionParser.ConditionalOperator.prototype.removeStatusListener = function(listener)
{
	this.condition.removeStatusListener(listener);
	this.trueOperand.removeStatusListener(listener);
	this.falseOperand.removeStatusListener(listener);
};
	
gc.databind.internal.expressionParser.ConditionalOperator.prototype.dispose = function()
{
	if (this.condition.dispose !== undefined)
	{
		this.condition.dispose();
	}
	if (this.trueOperand.dispose !== undefined)
	{
		this.trueOperand.dispose();
	}
	if (this.falseOperand.dispose !== undefined)
	{
		this.falseOperand.dispose();
	}
};

var getConditionalBranch = function(self)
{
	var value = self.condition.getValue();
	
	return (value ? self.trueOperand : self.falseOperand);
};

gc.databind.internal.expressionParser.ConditionalOperator.prototype.getValue = function()
{
	return getConditionalBranch(this).getValue();
};
	
gc.databind.internal.expressionParser.ConditionalOperator.prototype.setValue = function(value, progress)
{
	getConditionalBranch(this).setValue(value, progress);
};
	
gc.databind.internal.expressionParser.ConditionalOperator.prototype.getType = function()
{
	return getConditionalBranch(this).getType();
};

gc.databind.internal.expressionParser.ConditionalOperator.prototype.getStatus = function()
{
	return getConditionalBranch(this).getStatus();
};

gc.databind.internal.expressionParser.ConditionalOperator.prototype.setStatus = function(status)
{
	getConditionalBranch(this).setStatus(status);
};

gc.databind.internal.expressionParser.ConditionalOperator.prototype.toString = function()
{
	return " ? " + this.trueOperand.toString() + " : " + this.falseOperand.toString();
};

gc.databind.internal.expressionParser.ConditionalOperator.prototype.isStale = function()
{
	return this.condition.isStale() || getConditionalBranch(this).isStale();
};

gc.databind.internal.expressionParser.ConditionalOperator.prototype.addStaleListener = function(listener)
{
	this.condition.addStaleListener(listener);
	this.trueOperand.addStaleListener(listener);
	this.falseOperand.addStaleListener(listener);
};

gc.databind.internal.expressionParser.ConditionalOperator.prototype.removeStaleListener = function(listener)
{
	this.condition.removeStaleListener(listener);
	this.trueOperand.removeStaleListener(listener);
	this.falseOperand.removeStaleListener(listener);
};

gc.databind.internal.expressionParser.ConditionalOperator.prototype.isReadOnly = function()
{
	return getConditionalBranch(this).isReadOnly();
};
	
gc.databind.internal.expressionParser.ConditionalOperator.prototype.setName = function(name)
{
	this.fName = name;
};
	
gc.databind.internal.expressionParser.ConditionalOperator.prototype.getName = function()
{
	return this.fName;
};

gc.databind.internal.expressionParser.ConditionalOperator.prototype.addStreamingListener = function(listener)
{
    var streamingOperand = getConditionalBranch(this);
    streamingOperand.addStreamingListener(listener);
    
    this.condition.addChangedListener(
        { 
            onValueChanged: function()
            {
                streamingOperand.removeStreamingListener(listener);
                streamingOperand = getConditionalBranch(this);
                streamingOperand.addStreamingListener(listener);
            }.bind(this)
       });
};

gc.databind.internal.expressionParser.ConditionalOperator.prototype.removeStreamingdListener = function(listener)
{
    this.trueOperand.removeChangedListener(listener);
    this.falseOperand.removeChangedListener(listener);
};

