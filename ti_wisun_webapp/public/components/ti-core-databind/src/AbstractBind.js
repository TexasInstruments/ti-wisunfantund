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
 * Abstract class that implements IBind interface. Clients should not derive from 
 * this class directly. Instead, they need to derive from some of its derived classes:
 * AbstractBindValue or AbstractBindAction.  
 *    
 * @constructor
 * @implements gc.databind.IBind
 */
gc.databind.AbstractBind = function() 
{
	this.fEvents = new gc.databind.internal.Events(this);
};

gc.databind.AbstractBind.prototype = new gc.databind.IBind();

/**
 * Add IStatusListener to this object so the client can be notified for status changes.  
 * 
 * @param {gc.databind.IStatusListener} listener - callback for the status change events for this bindable object. 
 */
gc.databind.AbstractBind.prototype.addStatusListener = function (listener)
{
	this.fEvents.addListener('StatusChanged', listener);
};
	
/**
 * Remove IStatusListener, previously added with addStatusListener().  
 * 
 * @param {gc.databind.IStatusListener} listener - callback for the status change of this bindable object. 
 */
gc.databind.AbstractBind.prototype.removeStatusListener = function(listener)
{
	this.fEvents.removeListener('StatusChanged', listener);
};

/**
 * Notifies client listener objects when the status changes.  
 * 
 * @param {gc.databind.IStatus} status - the new status. 
 */
gc.databind.AbstractBind.prototype.notifyStatusChanged = function(status)
{
	this.fEvents.fireEvent('StatusChanged', status);
};

gc.databind.AbstractBind.prototype.fStatus = null;

/**
 * The status of this bindable object.
 *  
 * @return {gc.databind.IStatus} the status of this bindable object. 
 */
gc.databind.AbstractBind.prototype.getStatus = function()
{
	return this.fStatus;
};
	
/**
 * Set the status of this bindable object.
 *  
 * @param {gc.databind.IStatus} status - the new status. 
 */
gc.databind.AbstractBind.prototype.setStatus = function(status) 
{
	if(status != this.fStatus)
	{
		if (!(status && status.equals(this.fStatus)))
		{
			this.onStatusChanged( this.fStatus, status);
			this.fStatus = status;
			this.notifyStatusChanged(this.fStatus);
		}
	}
};

/**
 * Derived classes can override this method to be notified for status changes.
 *  
 * @abstract
 * @protected
 * @param {gc.databind.IStatus} oldStatus - the old status.  
 * @param {gc.databind.IStatus} newStatus - the new status. 
 */
gc.databind.AbstractBind.prototype.onStatusChanged = function(oldStatus, newStatus) 
{
};

/**
 * Method called when the first status listener is added to the list.
 * Derived classes can override this method to be notified for this event.
 * 
 * @protected
 */
gc.databind.AbstractBind.prototype.onFirstStatusChangedListenerAdded = function() 
{
};
	
/**
 * Method called when the last status listener is removed from the list.
 * Derived classes can override this method to be notified for this event.
 * 
 * @protected
 */
gc.databind.AbstractBind.prototype.onLastStatusChangedListenerRemoved = function()
{
};
	
/**
 * The name of this bindable object.
 * 
 * @return {string} the name of this bindable object.
 */
gc.databind.AbstractBind.prototype.getName = function() 
{
	return this.fName;
};

gc.databind.AbstractBind.prototype.fName = "";

/**
 * Sets the name of this bindable object.
 * 
 * @param {string} name - the name of this bindable object.
 */
gc.databind.AbstractBind.prototype.setName = function(name) 
{
	this.fName = name;
};

gc.databind.AbstractBind.prototype.toString = function()
{
	return this.getName();
};
