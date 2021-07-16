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
 * Interface that provides a way for bindable objects and models to 
 * free up resources when the backplane is disposed.
 * 
 *	@interface
 */
gc.databind.IDisposable = function()
{
};
	
/**
 * Called when the backplane is disposed. 
 * Provides a way for objects to clean up resources when the backplane is disposed.   
 */
gc.databind.IDisposable.prototype.dispose = function()
{
};
