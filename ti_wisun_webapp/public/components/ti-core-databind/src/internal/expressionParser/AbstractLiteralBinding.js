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

gc.databind.internal.expressionParser.AbstractLiteralBinding = function()
{
};

gc.databind.internal.expressionParser.AbstractLiteralBinding.prototype = new gc.databind.IBindValue();

gc.databind.internal.expressionParser.AbstractLiteralBinding.prototype.addStreamingListener = function(listener)
{
};
        
gc.databind.internal.expressionParser.AbstractLiteralBinding.prototype.removeStreamingListener = function(listener)
{
};

gc.databind.internal.expressionParser.AbstractLiteralBinding.prototype.addChangedListener = function(listener)
{
};
	
gc.databind.internal.expressionParser.AbstractLiteralBinding.prototype.removeChangedListener = function(listener)
{
};
	
gc.databind.internal.expressionParser.AbstractLiteralBinding.prototype.addStatusListener = function(listener)
{
};
	
gc.databind.internal.expressionParser.AbstractLiteralBinding.prototype.removeStatusListener = function(listener)
{
};
	
gc.databind.internal.expressionParser.AbstractLiteralBinding.prototype.getValue = function()
{
	return this.literalValue;
};
	
gc.databind.internal.expressionParser.AbstractLiteralBinding.prototype.setValue = function(value, progress)
{
};
	
gc.databind.internal.expressionParser.AbstractLiteralBinding.prototype.getType = function()
{
	return typeof this.literalValue;
};
	
gc.databind.internal.expressionParser.AbstractLiteralBinding.prototype.getStatus = function()
{
	return null;
};
	
gc.databind.internal.expressionParser.AbstractLiteralBinding.prototype.setStatus = function(status)
{
};

gc.databind.internal.expressionParser.AbstractLiteralBinding.prototype.isStale = function()
{
	return false;
};
	
gc.databind.internal.expressionParser.AbstractLiteralBinding.prototype.addStaleListener = function(listener)
{
};
	
gc.databind.internal.expressionParser.AbstractLiteralBinding.prototype.removeStaleListener = function(listener)
{
};
	
gc.databind.internal.expressionParser.AbstractLiteralBinding.prototype.isReadOnly = function()
{
	return true;
};
	
gc.databind.internal.expressionParser.AbstractLiteralBinding.prototype.setName = function(name) 
{
	this.fName = name;
};
	
gc.databind.internal.expressionParser.AbstractLiteralBinding.prototype.getName = function() 
{
	return this.fName;
};
