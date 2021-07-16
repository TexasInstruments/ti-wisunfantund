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
 */
gc.databind.IBindFactory = function() 
{
};
	
/**
 * Creates a bindable object associated with the given name.  
 * 
 * @param {String} name - uniquely identifying the bindable object within the model.  
 * @return {gc.databind.IBind} - the newly created bindable object, or null if this name is not supported.
 */
gc.databind.IBindFactory.prototype.createNewBind = function(name)
{
};

/**
 * Returns the unique identifying name of the model.   
 * 
 * @return {string} - the unique name of the model.
 */
gc.databind.IBindFactory.prototype.getName = function()
{
};

