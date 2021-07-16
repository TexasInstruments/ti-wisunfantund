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
gc.databind.internal = gc.databind.internal || {};

/** 
 * Class that implements basic Event handling.  This class supports more than one  
 * type of event, and allows individual event listeners to be registered separately
 * for each type.  
 *    
 * @private   
 * @constructor
 */

gc.databind.internal.Events = function(owner)
{
	this.owner = owner || this; 
};

/**
 * Add a listener to this object so the client can be notified when this event happens.  
 * 
 * @param {string} event - string identifying which event to add a listener for. 
 * @param listener - listener for this event on this bindable object. 
 */
gc.databind.internal.Events.prototype.addListener = function (event, listener)
{
	this.fListeners = this.fListeners || {};
	
	var eventListeners = this.fListeners[event];
	if (eventListeners === undefined)
	{
		this.onFirstListenerAdded(event);

		this.fListeners[event] = [ listener ]; 
	}
	else if (!this.hasListener(event, listener))
	{
		eventListeners.push(listener);
	}
};

/**
 * Remove listener previously added with addListener().  
 * 
 * @param {string} event - string identifying which event to remove the listener form. 
 * @param listener - listener for the event of this bindable object. 
 */
gc.databind.internal.Events.prototype.removeListener = function(event, listener)
{
	var eventListeners = this.fListeners === undefined ? undefined : this.fListeners[event];
	if (eventListeners !== undefined)
	{
		for(var i = eventListeners.length-1; i >= 0; i--)
		{
			if (listener === eventListeners[i])
			{
				eventListeners.splice(i, 1);
				
				if(eventListeners.length === 0)
				{
					this.fListeners[event] = undefined;
					this.onLastListenerRemoved(event);
				}
				break;
			}
		}
	}
};

/**
 * Test if the given listener is already added to the specific event  
 * 
 * @param {string} event - string identifying which event to test the listener for. 
 * @param listener - listener for the event of this bindable object. 
 */
gc.databind.internal.Events.prototype.hasListener = function(event, listener)
{
	var eventListeners = this.fListeners === undefined ? undefined : this.fListeners[event];
	if (eventListeners !== undefined)
	{
		for(var i = eventListeners.length-1; i >= 0; i--)
		{
			if (listener === eventListeners[i])
			{
				return true;
			}
		}
	}
	return false;
};

/**
 * Test if the given Event has any listener at all.  
 * 
 * @param {string} event - string identifying which event to test the listener for. 
 */
gc.databind.internal.Events.prototype.hasAnyListeners = function(event)
{
	var eventListeners = this.fListeners === undefined ? undefined : this.fListeners[event];
	if (eventListeners !== undefined)
	{
		return eventListeners.length > 0;
	}
	return false;
};

/**
 * Method called when the first status listener is added to a particular event.
 * This method will simply call 'onFirst' + event + 'ListenerAdded()' method
 * if it exists.    
 * Derived classes can override this method to be notified for all events, or override
 * the 'onFirst' + event " 'ListenerAdded() for the specific event of interest.
 *  
 * @param {string} event - string identifying the event for which the first listener was added. 
 */
gc.databind.internal.Events.prototype.onFirstListenerAdded = function(event) 
{
	var listener = this.owner['onFirst' + event + 'ListenerAdded'];
	if (listener !== undefined)
	{
		listener.call(this.owner);
	}
};
	
/**
 * Method called when the last status listener is removed from a particular event.
 * This method will simply call 'onLast' + event + 'ListenerRemoved()' method
 * if it exists.    
 * Derived classes can override this method to be notified for all events, or override
 * the 'onFirst' + event " 'ListenerAdded() for the specific event of interest.
 * 
 * @param {string} event - string identifying the event for which the last listener was removed. 
 */
gc.databind.internal.Events.prototype.onLastListenerRemoved = function(event)
{
	var listener = this.owner['onLast' + event + 'ListenerRemoved'];
	if (listener !== undefined)
	{
		listener.call(this.owner);
	}
};
	
/**
 * Fires a notification for the given event to all client listener objects.  
 * 
 * @param {string} event - string identifying which event to fire on. 
 */
gc.databind.internal.Events.prototype.fireEvent = function()
{
	var event = Array.prototype.shift.apply(arguments);
	var eventListeners = this.fListeners === undefined ? undefined : this.fListeners[event];
	
	if (eventListeners !== undefined)
	{
		for(var i = eventListeners.length-1; i >= 0; i--)
		{
			var listener = eventListeners[i];
			listener['on' + event].apply(listener, arguments);
		}
	}
};




