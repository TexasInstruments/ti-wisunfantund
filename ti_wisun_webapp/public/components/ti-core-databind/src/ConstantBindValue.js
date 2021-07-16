/*****************************************************************
 * Copyright (c) 2015-2016 Texas Instruments and others
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

/** 
 * Class that implements IBindValue interface for a constant value binding.
 *
 * @constructor
 * @extends gc.databind.VariableBindValue
 * 
 * @param {*} initialValue - the constant value returned by this binding. 
 * @param {boolean} [readOnly=false] - flag indicating if this binding is a constant (not writable by setValue()). 
 */
gc.databind.ConstantBindValue = function(initialValue) 
{
	gc.databind.VariableBindValue.call(this, initialValue);
};

gc.databind.ConstantBindValue.prototype = new gc.databind.VariableBindValue(undefined, true);

