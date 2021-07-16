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

gc.databind.internal.expressionParser.IUriBindingFactory = function()
{
};

// Parse an expression and return a binding.  Called by the bindingRegistry so returned binding will be registered.
gc.databind.internal.expressionParser.IUriBindingFactory.prototype.parse = function(expr, precedence, isLookupBinding)
{
};

// create a new lookup binding that is not register with the binding registry because the index must not be shared.
gc.databind.internal.expressionParser.IUriBindingFactory.prototype.parseLookupExpression = function(expr, precedence)
{
};

// Create a new binding but use the binding registry to share bindings because no index is used for this binding.
gc.databind.internal.expressionParser.IUriBindingFactory.prototype.parseExpression = function(expr, precedence)
{
};

// Create a new binding for a variable parsed within an expression.  
gc.databind.internal.expressionParser.IUriBindingFactory.prototype.bindValue = function(name, isLookupBinding)
{
};
