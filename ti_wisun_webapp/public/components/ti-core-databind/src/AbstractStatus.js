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

(function() 
{
	/**
	 * A factory for creating IStatus objects.
	 * 
	 * @constructor
	 * @implements gc.databind.IStatus
	 */
	gc.databind.AbstractStatus= function(type)
	{
		if (type !== undefined)
		{
			this.type = type;
		}
	};
	
	gc.databind.AbstractStatus.prototype = new gc.databind.IStatus();
	
	gc.databind.AbstractStatus.prototype.getId = function()
	{
		return this.id;
	};

	gc.databind.AbstractStatus.prototype.getType = function()
	{
		return this.type;
	};

	gc.databind.AbstractStatus.prototype.getMessage = function()
	{
		return this.message;
	};
	
	gc.databind.AbstractStatus.prototype.equals = function(status)
	{
		return (status && status.getMessage() === this.message && status.getType() === this.type && status.getId() === this.id) || false;
	};

	var typesRegistry = {};
	var idRegistryByType = {};
	
	var createStatus = function(type, message, id)
	{
		// if no error message, then return OK status for all types.
		if (message === undefined)
		{
			return null;
		}

		type = type || gc.databind.StatusType.ERROR;
		
		// use prototype chain to store type information like ERROR or WARNING (instead of duplicating in all objects).
		var baseStatusObject = typesRegistry[type];
		if (baseStatusObject === undefined)
		{
			baseStatusObject = new gc.databind.AbstractStatus(type);
			typesRegistry[type] = baseStatusObject;
		}
		
		// again use prototype chain to store status id's instead of duplicating in all objects.
		if (id !== undefined)
		{
			idRegistryByType[type] = idRegistryByType[type] || {};
			var idRegistry = idRegistryByType[type];
			if (idRegistry.hasOwnProperty(id))
			{
				baseStatusObject = idRegistry[id];
			}
			else
			{
				idRegistry[id] = Object.create(baseStatusObject);
				baseStatusObject = idRegistry[id];
				baseStatusObject.id = id;
			}
		}
		
		var status = Object.create(baseStatusObject);
		status.message = message;
		return status;
	};
	
	/** 
	 * Factory method to create an ERROR IStatus object 
	 * 
	 * @param {string} message - the error message for the IStatus object returned.
	 * @param {string=} id - error identifier for the IStatus object returned. 
	 * @return {gc.databind.IStatus} IStatus object with given error message 
	 **/
	gc.databind.AbstractStatus.createErrorStatus = function(message, id)
	{
		return createStatus(gc.databind.StatusType.ERROR, message, id);
	};

	/** 
	 * Factory method to create a WARNING IStatus object 
	 * 
	 * @param {string} message - the warning message for the IStatus object returned.
	 * @param {string=} id - warning identifier for the IStatus object returned.
	 * @return {gc.databind.IStatus} IStatus object with given warning message 
	 **/
	gc.databind.AbstractStatus.createWarningStatus = function(message, id)
	{
		return createStatus(gc.databind.StatusType.WARNING, message, id);
	};
	
}());


