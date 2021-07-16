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
 * Interface that allows clients to obtain references to IBind objects. 
 * Both the backplane and all models implement this interface.
 * Bindable object can also implement this interface to provide more bindable objects.
 *
 * Models should inherit from AbstractBindFactory instead of implementing this interface.  
 * 
 *	@interface
 *  @extends gc.databind.IDisposable
 */
gc.databind.IBindProvider = function() 
{
};
	
gc.databind.IBindProvider.prototype = new gc.databind.IDisposable();

/**
 * Returns a bindable object associated with the given name.
 * 
 * @param {String} name - uniquely identifying the bindable object within the model.  
 * @return {gc.databind.IBind} a reference to the bindable object or null if bindable object 
 *          with this name is not supported.
 */
gc.databind.IBindProvider.prototype.getBinding = function(name)
{
};

/**
 * get a data model that has already been registered with this binding provider.
 * 
 * @param {string} [name] - identifier for the model. E.g. widget. If
 *        missing returns the default model.
 * @returns {gc.databind.IBindFactory} - the model found or undefined if it
 *          is not registered.
 */
gc.databind.IBindProvider.prototype.getModel = function(name)
{
};


