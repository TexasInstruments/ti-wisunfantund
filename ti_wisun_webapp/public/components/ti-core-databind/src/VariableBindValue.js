/*****************************************************************
 * Copyright (c) 2013-2014 Texas Instruments and others
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *  Paul Gingrich, Dobrin Alexiev - Initial API and implementation
 *****************************************************************/
var gc = gc || {};
gc.databind = gc.databind || {};

/**
 * Class that implements IBindValue interface for a variable value binding.
 *
 * @constructor
 * @extends gc.databind.AbstractBindValue
 *
 * @param {*} initialValue - the constant value returned by this binding.
 * @param {boolean} [readOnly=false] - flag indicating if this binding is a constant (not writable by setValue()).
 */
gc.databind.VariableBindValue = function(initialValue, readOnly)
{
	gc.databind.AbstractBindValue.call(this);

	if (this.fCachedValue != initialValue)
	{
		this.fCachedValue = initialValue;
	}
	if (readOnly !== undefined && this._readOnly != readOnly)
	{
		this._readOnly = readOnly;
	}
};

gc.databind.VariableBindValue.prototype = new gc.databind.AbstractBindValue();

gc.databind.VariableBindValue.prototype._readOnly = false;

gc.databind.VariableBindValue.prototype.setValue = function(value, progress, force)
{
	if (!this._readOnly)
	{
		gc.databind.AbstractBindValue.prototype.setValue.call(this, value, progress, force);
	}
};

gc.databind.VariableBindValue.prototype.isReadOnly = function()
{
	return this._readOnly;
};
