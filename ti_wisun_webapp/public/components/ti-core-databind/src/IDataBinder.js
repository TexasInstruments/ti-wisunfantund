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
 * Interface for the two-way data binding between two IBindValue instances. 
 * 
 * @interface
 */ 

gc.databind.IDataBinder = function()
{
};

/**
 * Sets or retrieves the enable state of the two way data binding between two IBindValues. 
 * If this method is called with no parameters, it acts as a getter returning the current enabled state. 
 * Otherwise this method acts as a setter for the enabled state and returns the this pointer so that 
 * the caller can chain additional calls to methods on this object.  
 * 
 * @param {boolean} [enable] - if present, the new enabled state for this binder.
 * @returns {boolean|object} - if getter then the enabled state; otherwise, the this pointer. 
 */
gc.databind.IDataBinder.prototype.enable = function()
{
};

