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
 * Interface that provides a way to convert an object of one type to and object 
 * of another type.  
 * 
 *	@interface
 */
gc.databind.IDataConverter = function()
{
};
	
/**
 * Called to convert an object of one type to another type. 
 * 
 * @param {*} input - input to convert 
 * @return {*} value of input after conversion.
 */
gc.databind.IDataConverter.prototype.convert = function(input)
{
};
