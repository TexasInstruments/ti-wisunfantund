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

/** @namespace */
var gc = gc || {};
/** @namespace */
gc.databind = gc.databind || {};

gc.databind.name = "Data Binding";  // can be used as a source for ti-core-logger errors and wanings

/**
 * The basic bindable object that models provide. 
 * Provides status information for the bind.
 *   
 * Clients do not implement this interface directly. 
 * They need to inherit from AbstractBindValue or AbstractBindAction instead.   
 * 
 *	@interface
 */
gc.databind.IBind = function() 
{
};

/**
 * The status of this bindable object.
 *  
 * @return {gc.databind.IStatus} the status of this bindable object. 
 */
gc.databind.IBind.prototype.getStatus = function()
{
};

/**
 * Set the status of this bindable object.
 *  
 * @param {gc.databind.IStatus} status - the new status. 
 */
gc.databind.IBind.prototype.setStatus = function(status)
{
};
	
/**
 * Add IStatusListener to this object so the client can be notified for status changes.  
 * 
 * @param {gc.databind.IStatusListener} listener - listener for the status change of this bindable object. 
 */
gc.databind.IBind.prototype.addStatusListener = function(listener)
{
};

/**
 * Remove IStatusListener, previously added with addStatusListener().  
 * 
 * @param {gc.databind.IStatusListener} listener - listener for the status change of this bindable object. 
 */
gc.databind.IBind.prototype.removeStatusListener = function(listener)
{
};
	
/**
 * The name of this bindable object.
 * 
 * @return {string} the name of this bindable object.
 */
gc.databind.IBind.prototype.getName = function()
{
};
	
/**
 * Sets the name of this bindable object.
 * 
 * @param {string} name - the name of this bindable object.
 */
gc.databind.IBind.prototype.setName = function(name)
{
};

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
 * This interface represents bindable object that has value. 
 * Setting the value can be a asynchronous operation. 
 * When getValue() is called it may return a cached value.
 *  
 * If the value of a bindable object cannot be changed for given period its 
 * isReadOnly() should return true for that period. Setting the value in 
 * that case will do nothing.
 * 
 * Clients do not implement this class directly. 
 * They need to inherit from AbstractBindValue instead.   
 * 
 *  @interface
 *  @extends gc.databind.IBind
 */
gc.databind.IBindValue = function()
{
};

gc.databind.IBindValue.prototype = new gc.databind.IBind();

/**
 * Returns the value of this bindable object.
 * In the case that the model obtains the value asynchronously the value will 
 * be returned from an internal cache to conform to a synchronous method.
 *  
 * @return {Object} the value of this bindable object. 
 *         The value can be returned from an internal cache.      
 */
gc.databind.IBindValue.prototype.getValue = function()
{
};	

/** 
 * Sets the value of this bindable object. Setting the value can be an asynchronous 
 * operation. A progress counter is used to mark the completion of asynchronous operations.  
 * 
 * @param value - the new value. 
 * @param {gc.databind.IProgressCounter} [progress] - progress counter to keep track of asynchronous operations. 
 */
gc.databind.IBindValue.prototype.setValue = function(value, progress)
{
};

/**
 * The type of the bindable object's value. Usually the class of the value. 
 * If the value's type is not going to change, it can be set in the case the value is null.
 * 
 * @return {string} the class of the value, or other class if the value has not been set yet. 
 *		   null means the values has not been set yet and also the value can change its type.  
 */
gc.databind.IBindValue.prototype.getType = function()
{
};

/**
 * Add a value change listener for this bindable object. 
 *  
 * @param {gc.databind.IChangedListener} listener - callback that will be notified when the value changes.  
 */
gc.databind.IBindValue.prototype.addChangedListener = function(listener)
{
};
	
/**
 * Remove IChangedListener, previously added with addChangedListener().  
 * 
 * @param {gc.databind.IChangedListener} listener - listener for the value of this bind. 
 */
gc.databind.IBindValue.prototype.removeChangedListener = function(listener)
{
};
	
/** 
 * This method is used to determine if the value of the binding object is being changed.
 * Stale state means that setValue() has been called, but the real value of the model 
 * hasn't been updated yet. The method will be used to determine if changes should be 
 * propagated now, or wait until the binding is no longer stale to propagate changes.
 * 
 * @return {boolean} true if the value is going to change soon; otherwise, false.
 */
gc.databind.IBindValue.prototype.isStale = function()
{
};
	
/**
 * This method is used to add a stale listener. The stale listener will be 
 * called every time there is a change in the value of isStale().  
 * When isStale() called within the notification it will return the new value.
 * 
 * @param {gc.databind.IStaleListener} listener - callback that will be notified when the stale state changes.
 */
gc.databind.IBindValue.prototype.addStaleListener = function(listener)
{
};
	
/**
 * This method is used to remove a stale listener previously added with {gc.databind.IBindValue#addStaleListener}.
 *   
 * @param {gc.databind.IStaleListener} listener - callback that will be removed.
 */
gc.databind.IBindValue.prototype.removeStaleListener = function(listener)
{
};
	
/** 
 * This method indicates whether or not the value of this bindable object is modifiable or not.  
 * If this method returns true, then calling setValue() will do nothing.
 * 
 * @return {boolean} true if this binding is read only (can't be modified).
 */
gc.databind.IBindValue.prototype.isReadOnly = function()
{
};

/**
 * Add a streaming listener for this bindable object. 
 *  
 * @param {gc.databind.IStreamingListener} listener - callback that will be notified for each new value received.  
 */
gc.databind.IBindValue.prototype.addStreamingListener = function(listener)
{
};

/**
 * Remove a streaming listener for this bindable object. 
 *  
 * @param {gc.databind.IStreamingListener} listener - callback that will be notified for each new value received.  
 */
gc.databind.IBindValue.prototype.removeStreamingListener = function(listener)
{
};

/**
 * Enable or disable the deferred mode of operation.  In deferred mode, write operations
 * to the target device are deferred until the deferred mode is cleared.  The value of 
 * this binding is not effected by the deferred mode; however, the value on the target
 * may be out of sync with this binding. 
 * 
 * @param {boolean} deferredMode - true to set deferred mode, and false to clear it.
 */
gc.databind.IBindValue.prototype.setDeferredMode = function(deferredMode)
{
};

/**
 * Get the value of this binding before any pending deferred write operation.  This method is 
 * equivalent to getValue() when not in deferred mode.  So if getValue() and getValueCommitted() 
 * return different values, there must be a deferred write operation pending.  
 * 
 * @return {Object} the value of this binding before any deferred write operations.
 */
gc.databind.IBindValue.prototype.getValueCommitted = function()
{
};

/**
 * Clear any pending deferred write for the binding by reverting the pending value to be
 * written to the committed value
 */
gc.databind.IBindValue.prototype.clearDeferredWrite = function()
{
};

/**
 * Method to test if the committed value is different from the current value for this binding.
 * This method returns true if the current values is different than the committed value (the 
 * original value before deferred mode was enabled).  This method will always return false when
 * deferred mode is off.
 * 
 * @return {boolean} true if the bind value has been changed in deferred mode.
 */
gc.databind.IBindValue.prototype.isDeferredWritePending = function()
{
};
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
 * Interface that performs an action in the model rather than simply assigning values.
 * Actions could include adding a new value to a list, or removing a value from a list.  
 * 
 * Clients do not implement this interface directly. 
 * They need to inherit from AbstractBindAction instead.   
 * 
 *  @interface
 *  @extends gc.databind.IBindValue
 */
gc.databind.IBindAction = function()
{
};

gc.databind.IBindAction.prototype = new gc.databind.IBindValue();
/**
 * By default it is a Boolean value showing if the action can be executed 
 * at a give time or not. Used to update the UI elements.
 * 
 * @returns {boolean} true if action is available at this time; otherwise, false.
 */
gc.databind.IBindAction.prototype.getValue = function()
{
};

/**
 * Executes asynchronously a method with the given input parameters and 
 * return the result inside the IFinishedWithResult callback.
 * 
 * @param {Object} parameters - input parameters of this method packed as JSON object. 
 * @param {gc.databind.IFinishedWithResult} callback - contains both the method return value and the error status. 
 */
gc.databind.IBindAction.prototype.run = function(parameters, callback)
{
};

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
 * Listener interface that provides the client with notification when 
 * the status of a bindable object changes.
 * 
 * @interface
 */
gc.databind.IStatusListener = function() 
{
};

/**
 * This method is called when the status of the bindable object changed.   
 * 
 * @param {gc.databind.IStatus} status - the new status of the bindable object. 
 */
gc.databind.IStatusListener.prototype.onStatusChanged = function(status)
{
};


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
 * Listener interface that provides the client with notification when 
 * the value of IBindValue object changes.    
 * 
 * @interface
 */ 
gc.databind.IChangedListener = function()
{
};
	
/**
 * <p>This method is called when the value of a IBindValue object changed.</p>
 * <p>Some clients wish to be 
 * informed when the operation is finally completed.  As a result, this event passes along an
 * {gc.databind.IProgressCounter} interface.  If the operation that this implementation performs
 * is asynchronous in nature, 
 * then you must indicate this by calling {gc.databind.IProgressCounter.#wait} to mark the start of the operation 
 * before returning from this method call.  Later, you must call {gc.databind.IProgressCounter#done} to mark the 
 * completion of this operation.  If this operation delegates to other operations, it
 * is acceptable to pass this progress interface along to those operations so that they can add their own
 * asynchronous jobs to the progress counter.</p>
 * <p>
 * If this operation is not asynchronous, then nothing needs to be done with the progress counter.  You can
 * simply ignore it.  However, if you delegate any operations to other objects, you still need to pass this
 * progress counter along to them in case the delgated operation is asynchronous in nature.
 * 
 * @param oldValue - the old value it just changed from
 * @param newValue - the new value it just changed to
 * @param {gc.databind.IProgressCounter} progress - interface for the client to indicate progress of
 * asynchronous operations so the client can determine when the operation is fully completed.
 */
gc.databind.IChangedListener.prototype.onValueChanged = function(oldValue, newValue, progress)
{
};


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
 * <p>This interface represents a progress counter.  The progress is determined by the number of jobs to do, and
 * the number of jobs already completed.  Users can add their own jobs to the count, and indicate when the 
 * jobs are complete.      

 * <p>Clients do not implement this class directly. 
 * They need to inherit from AbstractProgressCounter instead.</p>   
 * 
 *  @interface
 *  @extends IBindValue
 */
gc.databind.IProgressCounter = function()
{
};

/**
 * Method to increase the count of jobs to do.  
 * 
 * @param {number} [jobs=1] - the number of new jobs to wait for completion on.
 */
gc.databind.IProgressCounter.prototype.wait = function(jobs)
{
};

/**
 * Method to increase the count of jobs completed that have been completed.  
 * 
 * @param {number} [jobs=1] - the number of jobs that have been completed.
 */
gc.databind.IProgressCounter.prototype.done = function(jobs)
{
};

/**
 * Method to retrieve the current number of jobs completed as a percentage of the total jobs.
 * if there are no jobs to do at all, the percentage will be 100%.  
 * 
 * @return {number} - the percentage of jobs that have been completed.  A number between 0 and 100.
 */
gc.databind.IProgressCounter.prototype.getProgress = function()
{
};



/*****************************************************************
 * Copyright (c) 2015 Texas Instruments and others
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
 * Listener interface that provides the client with a stream of values (changed or otherwise) for an  
 * IBindValue object.    
 * 
 * @interface
 */ 
gc.databind.IStreamingListener = function()
{
};
    
/**
 * This method is called when a new value of a IBindValue object is received.
 * 
 * @param nextValue - the value just received from the target
 */
gc.databind.IStreamingListener.prototype.onDataReceived = function(nextValue)
{
};


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
 * Class that implements IProgressCounter interface to count progress.  
 * This class is constructed with a  
 * callback that will be called when the progress reaches 100%.
 * A single initial job is added to the progress counter automatically.
 * in the constructor.    
 * As a result, the client must call IProgressCounter.done() once to
 * complete the job.  Typically, the client will pass this object
 * around to other parties who may or may not add their own jobs
 * to the progress counter.  Only when all jobs are completed will
 * the client recieve the callback.   
 *
 * @constructor
 * @implements gc.databind.IProgressCounter
 * 
 * @param {IFinished} callback - callback interface to call when progress reaches 100%. 
 */
gc.databind.ProgressCounter = function(callback)
{
	this._callback = callback;
	this._jobCount = 1;
	this._jobsDone = 0;
};

gc.databind.ProgressCounter.prototype = new gc.databind.IProgressCounter();

gc.databind.ProgressCounter.prototype.wait = function(jobs)
{
	jobs = jobs || 1;
	this._jobCount += jobs;
};

gc.databind.ProgressCounter.prototype.done = function(jobs)
{
	jobs = jobs || 1;
	this._jobsDone += jobs;
	
	if (this._jobsDone === this._jobCount && this._callback !== undefined)
	{
		this._callback();
	}
};

gc.databind.ProgressCounter.prototype.getProgress = function()
{
	return 100 * this._jobsDone / this._jobCount;
};

/*****************************************************************
 * Copyright (c) 2017 Texas Instruments and others
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
gc.databind.internal = gc.databind.internal || {};

(function() 
{
    gc.databind.internal.QualifierFactoryMap = function() 
    {
    };
    
    gc.databind.internal.QualifierFactoryMap.add = function(name, factory)
    {
        gc.databind.internal.QualifierFactoryMap.prototype['.$' + name] = factory; 
    };
    
    gc.databind.internal.QualifierFactoryMap.prototype.add = function(name, factory)
    {
        this['.$' + name] = factory; 
    };
    
    var QUALIFIER_PREFIX = '.$';
    var QUALIFIER_PARAM_REGEX = /\d+$/;
    
    gc.databind.internal.QualifierFactoryMap.prototype.parseQualifiers = function(name, bindFactory, bindFactoryThis)
    {
        var pos = name.lastIndexOf(QUALIFIER_PREFIX);
        if (pos > 0)
        {
            var qualifierName = name.substring(pos).toLowerCase();
            var param = qualifierName.match(QUALIFIER_PARAM_REGEX);
            if (param)
            {
                param = param[0];
                qualifierName = qualifierName.substring(0, qualifierName.length-param.length);
            }
            else
            {
                param = undefined;  // null is causing problems when passed to Number.toExponential() method.
            }
            var qualifierFactory = this[qualifierName];
            if (qualifierFactory)
            {
                var bind = this.parseQualifiers(name.substring(0, pos), bindFactory, bindFactoryThis);
                return qualifierFactory(bind, param);
            }
        }
        return bindFactory.call(bindFactoryThis, name);
    };
    
 }());

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
 * Callback interface that signals the completion of asynchronous operation with result. 
 * The client provides IFinishedWithResult to obtain the result value or completion status.
 * 
 * @interface
 */
gc.databind.IFinishedWithResult = function()
{
};

/**
 * Notifies the client that the asynchronous operation with result has completed.
 *    
 * @param status {gc.databind.IStatus} - The status information associated with the completion of 
 *                the operation, or null if the operation completed successfully.   
 * @param result {Object}  - the result of the asynchronous operation.  
 */
gc.databind.IFinishedWithResult.prototype.done = function(status, result)
{
};

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
 * <p>This interface represents a single binding within a multi-dimensional collection of bindable objects.
 * It can also be thought of as a parametized binding.  For example, an array, a structure,
 * or even a function have parameters like index, field name, and argument that 
 * are used in determining the bindings value in addition to underlying model data that is changing as well.</p>  
 * 
 * <p>It is best explained through example.  Consider the master-detail use case where you have a list box
 * that is the master selector.  Then you have widgets that show the detail based on the current single
 * selection in the listbox.  A binding for a particular piece of detail will likely look like this:
 * "a[i].x".  This expression contains an array operator and a dot operator.  The multi-dimensional 
 * collection a returns an array of structures.  In this case, the detail binding is interested in only a 
 * single value at a time.  As the users selection changes so will the binding i change, and as a result
 * the value of interest will change as well.  So in this case, we will create an ILookupBindValue
 * and call setIndex(i, "x") to indicate we are currently interested in the ith element's x field.
 * When the index changes, another call to setIndex(j) will be called to indicate that we are now only
 * interested in the jth element's x field.  In this case a is a two dimensional collection.</p>  
 * 
 * <p>Furthermore, the expression "a[i]" represents a single dimensional collection whose value is a 
 * structure.  The expression "a" is also valid, but it will not be a lookup binding.  Rather it will
 * be a normal binding that returns an array of structures (no lookup).</p>
 * 
 * <p>Clients do not implement this class directly. 
 * They need to inherit from AbstractLookupBindValue instead.</p>   
 * 
 *  @interface
 *  @extends IBindValue
 */
gc.databind.ILookupBindValue = function()
{
};

gc.databind.ILookupBindValue.prototype = new gc.databind.IBindValue();

/**
 * Method to choose which index value(s) should be used to lookup the value of this binding.
 * Setting a new index value(s) may cause the value of this binding to change.
 * 
 * @param {...number|string} index - the lookup identifier(s).  Number for array lookup, and string for fields.
 */
gc.databind.ILookupBindValue.prototype.setIndex = function(index)
{
};

/*****************************************************************
 * Copyright (c) 2013--2014 Texas Instruments and others
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
 * Listener interface that provides the client with notification when 
 * the stale state of a IBindValue object changes.    
 * 
 * @interface
 */
gc.databind.IStaleListener = function() 
{
};

/**
 * This method is called when the stale state of a IBindValue object has changed.   
 */
gc.databind.IStaleListener.prototype.onStaleChanged = function()
{
};

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
 * Additional information like error or warning message that the model can provide 
 * to the widget. Most GUI Composer widgets show the status as a small error or 
 * warning icon to the top left of the widget.
 * 
 *	@interface
 */
gc.databind.IStatus = function()
{
};

/**
 *  There are two status types - error or warning. 
 *  Different types are displayed with different visual cues in the widgets.
 *  
 *  @enum {number}
 */
gc.databind.StatusType = 
{
	/** An error status type */
	ERROR: 0,
	/** A warning status type */
	WARNING: 1
};

/**
 *  There are two status types - error or warning. 
 *  Different types are displayed with different visual clues in the widgets.  
 *  
 * @return {gc.databind.StatusType} the type of this status: ERROR or WARNING.
 */
gc.databind.IStatus.prototype.getType = function()
{
};

/**
 * The messages displayed to the user when she hovers the status icon with the mouse. 
 *  
 * @return {string} the messages displayed to the user when she hovers the status icon with the mouse.
 */
gc.databind.IStatus.prototype.getMessage = function()
{
};

/**  
 * Unique string that can be used to identify the type of error or warning 
 * in client's scripts. Once ids are defined they should not be changed because 
 * older scripts will expect the previously published values. 
 * 
 * Can be an empty string. It can be specific to a given model or shared between models.
 * 
 * @return {string} an unique string that can be used to identify the type of error in client's scripts.
 */
gc.databind.IStatus.prototype.getId = function()
{
};

/*****************************************************************
 * Copyright (c) 2015 Texas Instruments and others
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *  Paul Gingrich - Initial API and implementation
 *****************************************************************/
var gc = gc || {};
/** @namespace */
gc.widget = gc.widget || {};

/** 
 * A Status Indicator is used to show error, warning, and info messages overlaid on
 * any widget.  This interfaces allows clients to add and remove messages as needed
 * on a particular status indicator.  An error widget will be created and destroyed
 * as needed to show error, warning, or info messages.
 * 
 *	@interface
 */
gc.widget.IStatusIndicator = function()
{
};

/**
 *  There are three status indicator types - error, warning, or information. 
 *  Different types are displayed with different visual cues in the widgets.
 *  
 *  @enum {string}
 */
gc.widget.StatusIndicatorType = 
{
	/** An error status type */
	ERROR: "error",
	/** A warning status type */
	WARNING: "warning",
	/** An informative status type */
	INFO: "information"
};

/**
 * Add a status messages to be displayed to the user for this indicator.  Old message 
 * are not lost, but may be hidden by the new status message if there isn't room to show
 * all status messages for a given indicator.  If no type is provided, error is assumed.
 *  
 * @param {string} message - the new message to be added to this status indicator.
 * @param {gc.widget.StatusIndicatorType} [type] the type of new message to be added to this status indicator.
 */
gc.widget.IStatusIndicator.prototype.addMessage = function(message, type)
{
};

/**
 * Remove a status messages previously added to this indicator.  If there are more
 * than one message added to an indicator, the other status messages will not be lost.
 *  
 * @param {string} message - the old message to remove from this status indicator.
 */
gc.widget.IStatusIndicator.prototype.removeMessage = function(message)
{
};

/**
 * @namespace
 */
gc.widget.StatusIndicator = {};

/**
 * Factory object used to retrieve status indicators for a given widget.
 * 
 * @namespace
 */
gc.widget.StatusIndicator.Factory = {};

/**
 * Factory method to create/retrieve status indicators for a particular widget The widget 
 * 
 * @param {object} widget - the the widget to get a status indicator for.
 * @return {gc.widget.IStatusIndicator} the status indicator created for this widget, or null if no widget found.
 */
gc.widget.StatusIndicator.Factory.get = function(widget)
{			
	return gc.widget.internal.StatusIndicator.factory.get(widget);
};

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


/*****************************************************************
 * Copyright (c) 2018 Texas Instruments and others
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
 * Interface for a Trigger that is created using gc.databind.registry.createTrigger() method. 
 * 
 * @interface
 */ 

gc.databind.ITrigger = function()
{
};

/**
 * Sets or retrieves the enable state of the trigger.  A disabled trigger will not call the user's callback
 * even if the trigger condition is met.
 * If this method is called with no parameters, it acts as a getter returning the current enabled state. 
 * Otherwise this method acts as a setter for the enabled state and returns the this pointer so that 
 * the caller can chain additional calls to methods on this object.  
 * 
 * @param {boolean} [enable] - if present, the new enabled state for this trigger.
 * @returns {boolean|object} - if getter then the enabled state; otherwise, the this pointer. 
 */
gc.databind.ITrigger.prototype.enable = function()
{
};

/**
 * Sets the condition for this trigger to call the user's callback method.
 * The trigger will fire when this condition transitions from false to true, and the trigger is enabled.  
 * 
 * @param {string} condition - A binding expression, that evaluates to a boolean result, to be used as the condition. 
 */
gc.databind.ITrigger.prototype.setCondition = function()
{
};

/**
 * Method to free resources when the trigger is not longer needed.  This method should be called when making this
 * trigger available for garbage collection. 
 *   
 */
gc.databind.ITrigger.prototype.dispose = function()
{
};

/**
 * Factory method to create instances of event Triggers.
 * 
 * @param {function} callback - callback method for when trigger condition is met. 
 * @param {string} condition - A binding expression, that evaluates to a boolean result, to be used as the condition. 
 * @returns {gc.databind.ITrigger} - newly created ITrigger instance.   
 */
gc.databind.createTrigger = function(callback, condition) 
{
    return new gc.databind.internal.Trigger(callback, condition);  
};


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

/*******************************************************************************
 * Copyright (c) 2013-2014 Texas Instruments and others All rights reserved.
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v1.0 which accompanies this distribution,
 * and is available at http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors: Paul Gingrich, Dobrin Alexiev - Initial API and implementation
 ******************************************************************************/
var gc = gc || {};
gc.databind = gc.databind || {};

(function()
{

    var nullProgressCounter = new gc.databind.IProgressCounter();

    /**
     * Abstract class that implements IBindValue interface. Clients can either
     * instantiate this class directly or create classes derived from it for
     * their value bindable object.
     *
     * @constructor
     * @extends gc.databind.AbstractBind
     * @implements gc.databind.IBindValue
     *
     * @param {string} [defaultType] - the default type, used only if value is
     *        null.
     */
    gc.databind.AbstractBindValue = function(defaultType)
    {
        gc.databind.AbstractBind.call(this);

        if (defaultType && defaultType !== this.fDefaultType)
        {
            this.fDefaultType = defaultType;
        }
    };

    gc.databind.AbstractBindValue.prototype = new gc.databind.AbstractBind();

    /**
     * Add a value change listener for this bindable object.
     *
     * @param {gc.databind.IChangedListener} listener - callback that will be
     *        notified when the value changes.
     */
    gc.databind.AbstractBindValue.prototype.addChangedListener = function(listener)
    {
        this.fEvents.addListener('ValueChanged', listener);
    };

    /**
     * Remove IChangedListener, previously added with addChangedListener().
     *
     * @param {gc.databind.IChangedListener} listener - specific callback to be
     *        removed.
     */
    gc.databind.AbstractBindValue.prototype.removeChangedListener = function(listener)
    {
        this.fEvents.removeListener('ValueChanged', listener);
    };

    /**
     * Return true if there are changed listeners for this object.
     *
     * @returns {boolean} true if there are changed listeners for this object.
     */
    gc.databind.AbstractBindValue.prototype.hasChangedListeners = function()
    {
        return this.fEvents.hasAnyListeners('ValueChanged');
    };

    /**
     * Notifies client listener objects when the status changes.
     *
     * @param {object} oldValue - value it was before
     * @param {object} newValue - value it is now
     * @param {gc.databind.IProgressCounter} progress - progress counter to
     *        record the completion of asynchronous operations resulting from
     *        this event.
     */
    gc.databind.AbstractBindValue.prototype.notifyChangedListeners = function(oldValue, newValue, progress)
    {
        this.fEvents.fireEvent('ValueChanged', oldValue, newValue, progress);
    };

    /**
     * Method called when the first value change listener is added to the list.
     * Derived classes can override this method to be notified for this event.
     */
    gc.databind.AbstractBindValue.prototype.onFirstValueChangedListenerAdded = function()
    {
    };

    /**
     * Method called when the last change listener is removed from the list.
     * Derived classes can override this method to be notified for this event.
     */
    gc.databind.AbstractBindValue.prototype.onLastValueChangedListenerRemoved = function()
    {
    };

    
    /**
     * Perform a deep compare on two values to determine if they have changes.
     * written to the committed value
     * 
     * @returns {boolean} true if the new value is not the same as the current value.
     */
    gc.databind.AbstractBindValue.prototype.isValueNotEqualTo = function(newValue) 
    {
        var oldValue = this.fCachedValue;
        if (newValue instanceof Array && oldValue instanceof Array && newValue.length === oldValue.length)
        {
            // compare all elements of the array
            for (var i = newValue.length; i-- > 0;)
            {
                if (newValue[i] !== oldValue[i])
                {
                    return true;
                }
            }
            return false;
        }
        return (newValue !== oldValue && ((typeof newValue !== 'number') || !isNaN(newValue) || (typeof oldValue !== 'number') || !isNaN(oldValue)));
    };

    /**
     * Sets the value of this bindable object. Setting the value can be an
     * asynchronous operation. If the caller is interested in knowing when the
     * operation is complete, they will pass in an
     * {gc.databind.IProgressCounter} object to keep track of the progress till
     * completion. This class implements this method and calls {#onValueChanged}
     * if the new value is in fact different. It also notifies IValueChanged
     * listeners and passes along the progress counter to them as well. Clients
     * should not override this method. Instead they should override
     * {#onValueChanged} instead.
     *
     * @param {Object} value - the new value.
     * @param {gc.databind.IProgressCounter} [progress] - notification when the
     *        value is set in the model.
     */
    gc.databind.AbstractBindValue.prototype.setValue = function(value, progress, forceWrite)
    {
        var blockEditOperation = gc.databind.blockNewEditUndoOperationCreation;
        gc.databind.blockNewEditUndoOperationCreation = true;  // tell widget model to not create Undo/Redo actions based on target data changes.
        try
        {
            if (!this.isReadOnly() && (forceWrite || this.isValueNotEqualTo(value)))
            {
                progress = progress || nullProgressCounter;
                var oldValue = this.fCachedValue;
                this.fCachedValue = value;
                this.onValueChanged(oldValue, value, progress);
                this.notifyChangedListeners(oldValue, value, progress);
            }
        }
        catch(e)
        {
            console.error(e);
        }
        finally
        {
            gc.databind.blockNewEditUndoOperationCreation = blockEditOperation;
        }
    };

    /**
     * Updates the value of this bindable object, and notify all listeners. This
     * method is identical to setValue() method except it does not call
     * onValueChanged() even if the value has changed. Derived objects should
     * use this method to update the underlying value instead of setValue().
     * Then derived objects can then use onValueChanged() to detect when the
     * value has been changed by others only.
     *
     * @protected
     * @param {Object} value - the new value.
     * @param {gc.databind.IProgressCounter} [progress] - optional progress
     *        counter if you wish to keep track of when the new value has
     *        propagated through all bindings bound to this one.
     * @param {Boolean} [skipStreamingListeners] - true, if you do not want
     *        to notify streaming listeners of the new value; for example, if
     *        you are updating the default value before reading the target.
     */
    gc.databind.AbstractBindValue.prototype.updateValue = function(value, progress, skipStreamingListeners)
    {
        var blockEditOperation = gc.databind.blockNewEditUndoOperationCreation;
        gc.databind.blockNewEditUndoOperationCreation = true;  // tell widget model to not create Undo/Redo actions based on target data changes.
        try
        {
            if (this.isValueNotEqualTo(value))
            {
                var oldValue = this.fCachedValue;
                this.fCachedValue = value;
                this.notifyChangedListeners(oldValue, value, progress || nullProgressCounter);
            }

            if (!skipStreamingListeners)
            {
                this.notifyDataReceivedListeners(value);
            }
        }
        catch(e)
        {
            console.error(e);
        }
        finally
        {
            gc.databind.blockNewEditUndoOperationCreation = blockEditOperation;
        }
    };

    /**
     * Returns the value of this bindable object. In the case that the model
     * obtains the value asynchronously the value will be returned from an
     * internal cache to conform to a synchronous method.
     *
     * @return {Object} the value of this bindable object. The value will be
     *         returned from an internal cache.
     */
    gc.databind.AbstractBindValue.prototype.getValue = function()
    {
        return this.fCachedValue;
    };

    /**
     * The type of the bindable object's value. Usually the class of the value.
     * If the value's type is not going to change, it can be set in the case the
     * value is null.
     *
     * @return {string} the class of the value, or other class if the value has
     *         not been set yet. null means the values has not been set yet and
     *         also the value can change its type.
     */
    gc.databind.AbstractBindValue.prototype.getType = function()
    {
        var result = this.fDefaultType;
        if (this.fCachedValue !== undefined && this.fCachedValue !== null)
        {
            result = typeof this.fCachedValue;
            if (result === "object" && this.fCachedValue instanceof Array)
            {
                result = "array";
            }
        }
        return result;
    };

    /**
     * Method to change the bindable object's default type. The default type is
     * used when the current value is undefined or null.
     *
     * @param {string} the new default type of the value.
     */
    gc.databind.AbstractBindValue.prototype.setDefaultType = function(defaultType)
    {
        this.fDefaultType = defaultType;
    };

    /**
     * Notification when the value of this bindable object changes. Derived
     * classes can override this method to be notified of changes caused by
     * setValue() method calls. The default implementation of this method does
     * nothing. If this method is a proxy for an asynchronous operation then use
     * the progress counter provided to record the progress and completion of
     * this operation.
     *
     * @protected
     * @param {Object} oldValue - the old value.
     * @param {Object} newValue - the new value.
     * @param {gc.databind.IProgressCounter} progress - progress counter to keep
     *        track of when this value has been truely set.
     */
    gc.databind.AbstractBindValue.prototype.onValueChanged = function(oldValue, newValue, progress)
    {
    };

    gc.databind.AbstractBindValue.prototype.toString = function()
    {
        if (this.fCachedValue === undefined)
        {
            return gc.databind.AbstractBind.prototype.toString.call(this);
        }
        else if (this.fCachedValue === null)
        {
            return 'null';
        }
        return this.fCachedValue.toString();
    };

    /**
     * This method is used to determine if the value of the binding object is
     * being changed. Stale state means that setValue() has been called, but the
     * real value of the model hasn't been updated yet. The method will be used
     * to determine if changes should be propagated now, or wait until the
     * binding is no longer stale to propagate changes.
     *
     * @return {boolean} true if the value is going to change soon; otherwise,
     *         false.
     */
    gc.databind.AbstractBindValue.prototype.isStale = function()
    {
        return this._isStale || false;
    };

    /**
     * Derived classes can call this method to set the stale state of the
     * object.
     *
     * @param {boolean} stale - if the value of stale or not.
     */
    gc.databind.AbstractBindValue.prototype.setStale = function(stale)
    {
        if (this._isStale !== stale)
        {
            this._isStale = stale;
            this.notifyStaleListeners();
        }
    };

    /**
     * Method called when the first stale listener is added to the list. Derived
     * classes can override this method to be notified for this event.
     */
    gc.databind.AbstractBindValue.prototype.onFirstStaleChangedListenerAdded = function()
    {
    };

    /**
     * Method called when the last stale listener is removed from the list.
     * Derived classes can override this method to be notified for this event.
     */
    gc.databind.AbstractBindValue.prototype.onLastStaleChangedListenerRemoved = function()
    {
    };

    /**
     * This method is used to add a stale listener. The stale listener will be
     * called every time there is a change in the value of isStale(). When
     * isStale() called within the notification it will return the new value.
     */
    gc.databind.AbstractBindValue.prototype.addStaleListener = function(listener)
    {
        this.fEvents.addListener('StaleChanged', listener);
    };

    /**
     * This method is used to remove a stale listener previously added with
     * addStaleListener().
     */
    gc.databind.AbstractBindValue.prototype.removeStaleListener = function(listener)
    {
        this.fEvents.removeListener('StaleChanged', listener);
    };

    /**
     * Return true if there are stale listeners for this object.
     *
     * @returns {boolean} true if there are stale listeners for this object.
     */
    gc.databind.AbstractBindValue.prototype.hasStaleListeners = function()
    {
        return this.fEvents.hasAnyListeners('StaleChanged');
    };

    /**
     * This method triggers stale change notification to all stale listeners.
     */
    gc.databind.AbstractBindValue.prototype.notifyStaleListeners = function()
    {
        this.fEvents.fireEvent('StaleChanged');
    };

    /**
     * This method indicates whether or not the value of this bindable object is
     * modifiable or not. If this method returns true, then calling setValue()
     * will do nothing.
     *
     * @returns {boolean} true if this binding is read only (can't be modified).
     */
    gc.databind.AbstractBindValue.prototype.isReadOnly = function()
    {
        return false;
    };

    /**
     * Add a streaming listener for this bindable object.
     *
     * @param {gc.databind.IStreamingListener} listener - callback that will be notified for each new value received.
     */
    gc.databind.AbstractBindValue.prototype.addStreamingListener = function(listener)
    {
        this.fEvents.addListener('DataReceived', listener);
    };

    /**
     * Remove a streaming listener for this bindable object.
     *
     * @param {gc.databind.IStreamingListener} listener - callback that will be notified for each new value received.
     */
    gc.databind.AbstractBindValue.prototype.removeStreamingListener = function(listener)
    {
        this.fEvents.removeListener('DataReceived', listener);
    };

    /**
     * Notifies client listener objects when new data is received.
     *
     * @param {object} nextValue - value just received
     */
    gc.databind.AbstractBindValue.prototype.notifyDataReceivedListeners = function(nextValue)
    {
        this.fEvents.fireEvent('DataReceived', nextValue);
    };

    /**
     * Method called when the first streaming listener is added to the list.
     * Derived classes can override this method to be notified for this event.
     */
    gc.databind.AbstractBindValue.prototype.onFirstDataReceivedListenerAdded = function()
    {
    };

    /**
     * Method called when the last streaming listener is removed from the list.
     * Derived classes can override this method to be notified for this event.
     */
    gc.databind.AbstractBindValue.prototype.onLastDataReceivedListenerRemoved = function()
    {
    };

    gc.databind.AbstractBindValue.prototype.fDeferredMode = false;

    gc.databind.AbstractBindValue.prototype.setDeferredMode = function(deferredMode)
    {
        deferredMode = deferredMode || false;
        if (deferredMode !== this.fDeferredMode)
        {
            this.fDeferredMode = deferredMode;
            this.fCommittedValue = this.fCachedValue;
        }
    };

    gc.databind.AbstractBindValue.prototype.isDeferredWritePending = function()
    {
        return this.fDeferredMode && this.isValueNotEqualTo(this.fCommittedValue);
    };

    gc.databind.AbstractBindValue.prototype.getValueCommitted = function()
    {
        return this.fDeferredMode ? this.fCommittedValue : this.fCachedValue;
    };
    
    gc.databind.AbstractBindValue.prototype.clearDeferredWrite = function() 
    {
        if (this.fDeferredMode) 
        {
            this.updateValue(this.fCommittedValue, null, true);
        }
    };

}());

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
 * Abstract class that implements ILookupBindValue interface. Clients can either 
 * instantiate this class directly or create classes derived from it for 
 * their value bindable object.   
 *
 * @constructor
 * @extends gc.databind.AbstractBindValue
 * @implements gc.databind.ILookupBindValue
 * @param {string} [defaultType] - the default type, used only if value is null. 
 */
gc.databind.AbstractLookupBindValue = function(defaultType) 
{
	gc.databind.AbstractBindValue.call(this, defaultType);
};

gc.databind.AbstractLookupBindValue.prototype = new gc.databind.AbstractBindValue();

/**
 * Implementation of the ILookupBindValue.setIndex.  This implementation keeps track of the 
 * index(es) and calls the abstract method onIndexChanged() when any
 * index value(s) change.  The getIndex() method can be used to retrieve the index 
 * values inside the onIndexChanged() method to re-evaluate the model data's location 
 * and possibly it's new value. 
 * 
 * @param {...number|string} index - one or more new index values to use for lookup
 */
gc.databind.AbstractLookupBindValue.prototype.setIndex = function()
{
	var changed = false;
	this.fIndexValues = this.fIndexValues || [];
	
	for(var i=0; i<arguments.length && i < this.fIndexValues.length; i++) 
	{
		var oldIndex = this.fIndexValues[i];
		var newIndex = arguments[i];
		if (oldIndex != newIndex)
		{
			this.fIndexValues[i] = newIndex;
			changed = true;
		}
	}
	for(; i<arguments.length; i++)
	{
		this.fIndexValues.push(arguments[i]);
		changed = true;
	}
	if (changed)
	{
		this.onIndexChanged(this.fIndexValues);
	}
};

/**
 * Notification method to override that is called when any one of the multi-dimensional
 * indecies have changed.  Implement this method to re-calcualate the location of the 
 * model data that is to be bound by this binding.  Call setValue() to update this bindings
 * value and notify listeners if the value has changed due to the change in index.
 * 
 * @abstract
 * @param {Array.number|string} indices - the multi-dimensional index values to use for lookup.
 * @return the new calculated value based on the new indices.  Will be used to update binding value and notify listeners.
 */
gc.databind.AbstractLookupBindValue.prototype.onIndexChanged = function(indices)
{
};

gc.databind.AbstractLookupBindValue.prototype.getIndex = function()
{
	return this.fIndexValues;
};

gc.databind.AbstractLookupBindValue.prototype.assertNotNull = function(index)
{
	if (index === null || index === undefined)
	{
		throw "The index value is null.";
	}
};

gc.databind.AbstractLookupBindValue.prototype.assertValidArrayIndex = function(index, size, startIndex)
{
	this.assertNotNull(index);
	
	if (isNaN(index))
	{
		throw "The index is not valid. Cannot convert '" + index + "' to an integer.";
	}
	
	startIndex = startIndex || 0;
	size = size || 1;
	var endIndex = size + startIndex - 1;

	/*jsl:ignore*/
	index = parseInt(index); 
	/*jsl:end*/
	
	if (index < startIndex || index > endIndex)
	{
		throw 'The index ' + index + ' is out of bounds.  It must be between ' + startIndex + ' and ' + endIndex;
	}
	
	return index;
};

gc.databind.AbstractLookupBindValue.prototype.assertValidFieldName = function(fieldName, possibleFieldNames)
{
	this.assertNotNull(fieldName);
	
	fieldName = fieldName.toString();
	
	if (possibleFieldNames === undefined || !possibleFieldNames.hasOwnProperty(fieldName) )
	{
		throw "The index '" + fieldName + "' was not found.";
	}
	return fieldName;
};

gc.databind.AbstractLookupBindValue.prototype.assertValidData = function(index, data)
{
	this.assertNotNull(index);
	
	if (data === undefined)
	{
		throw "The index '" + index + "' was not found.";
	}
};


/*****************************************************************
 * Copyright (c) 2015 Texas Instruments and others
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

(function()
{
    var StorageProvider = function(modelBindings)
    {
        this._bindings = modelBindings;
    };

    StorageProvider.prototype.readData = function()
    {
        var data = {};
        for(var bindName in this._bindings)
        {
            if (this._bindings.hasOwnProperty(bindName))
            {
                var bind = this._bindings[bindName];
                if (!bind.isReadOnly() && bind.excludeFromStorageProviderData === undefined)
                {
                    data[bindName] = this._bindings[bindName].getValue();
                }
            }
        }
        return data;
    };

    StorageProvider.prototype.writeData = function(data)
    {
        for(var bindName in data)
        {
            if (data.hasOwnProperty(bindName))
            {
                var bind = this._bindings[bindName];
                if (bind)
                {
                    bind.setValue(data[bindName]);
                }
            }
        }
    };

    var TARGET_CONNECTED_BINDNAME = '$target_connected';

	/**
	 * Abstract class that provides default implementation of IBindFactory.  This class
	 * implements the getName() method for IBindFactory.
	 *
	 * @constructor
	 * @implements gc.databind.IBindFactory
	 * @param {string} name - uniquely identifiable name for this bind factory.
    */
	gc.databind.AbstractBindFactory = function(name)
	{
        if ( name !== undefined )
        {
            this._id = name;
        }
	};

	gc.databind.AbstractBindFactory.prototype = new gc.databind.IBindFactory();

    /**
     * Method to initialize internal private data structures.  This method must be called once, by
     * final concrete class to initialize all abstract base classes.  This is necessary because the
     * abstract base class constructors are called multiple times, and some initialization needs to
     * be performed only once.  Derived implementations should override this method, and their own
     * one time initialization steps, and call the base classes init() function too.
     *
     */
    gc.databind.AbstractBindFactory.prototype.init = function()
    {
        this._modelBindings = {};
        this._modelBindings[TARGET_CONNECTED_BINDNAME] = new gc.databind.VariableBindValue(false, true);
        this._modelQualifiers = new gc.databind.internal.QualifierFactoryMap();
    };

    /**
     * Method to create a storage provider for this Model.  This method should be called from the
     * overridden init() method of the derived Model.  Do this if you wish menu item File/Save Settings
     * should store the bindings in this model when the user requests it.  In general, Math and prop
     * bindings do not need to be stored, because their value is not read from a target and therefore
     * represent calculated values that do not change.
     */
    gc.databind.AbstractBindFactory.prototype.createStorageProvider = function()
    {
        var modelBindings = this._modelBindings;

        var name = this.getName();
        gc.File = gc.File || {};
        gc.File.ready = gc.File.ready || Q.Promise(function(resolve) { gc.File.fireReady = resolve; });
        gc.File.ready.then(function()
        {
            // register data provider to load and store data from the factory provided when called upon.
            gc.File.addDataProvider(name, new StorageProvider(modelBindings));
        });
    };

	gc.databind.AbstractBindFactory.prototype.getName = function()
	{
		return this._id;
	};

	/**
	 * Helper method for finding and/or creating bindings on this model.  This method does not go through the binding registry
	 * to find the binding, and does not apply qualifiers.  If the binding does not already exist it will be created.
	 * To parse bindings, including qualifiers, use gc.databind.registry.getBinding() api instead, but be sure to prepend the model name to the binding name.
	 * to ensure this model is used to create the binding.
	 *
	 * @param {String} name - uniquely identifying the bindable object within the model.
	 * @return {gc.databind.IBind} - the existing or newly created bindable object, or null if this name is not supported by this model.
	 */
	gc.databind.AbstractBindFactory.prototype.getBinding = function(name)
	{
        // ensure aliased bindings like "uart.temp" and "target_dev.temp" return the same instance of the model's binding.
        // We do this by storing model bindings in the model factory so we can lookup aliased bindings.
        var bind = this._modelBindings[name];
        if (!bind)
        {
            bind = this.createNewBind(name);
            if (bind)
            {
                bind.setName(name);
            }
            this._modelBindings[name] = bind;
        }
		return bind;
	};

    gc.databind.AbstractBindFactory.prototype.hasBinding = function(bindingName) {
        return this._modelBindings.hasOwnProperty(bindingName);
    };

	gc.databind.AbstractBindFactory.prototype.parseModelBinding = function(name)
	{
	    return this._modelQualifiers.parseQualifiers(name, this.getBinding, this);
	};

    gc.databind.AbstractBindFactory.prototype.getAllBindings = function()
    {
        return this._modelBindings;
    };

    /**
     * Method to set the connected or disconnected state of the model.  This method
     * is called by the transport when a connecting is established or broken.  The connected
     * state is available as a binding, "$target_connected", to app developers if they
     * need to show the connected state of a transport.
     * This method must be called once from the concrete class instance's constructor.
     *
     * @param {boolean} newState - true if to set state to connected, otherwise new state is disconnected.
     */
    gc.databind.AbstractBindFactory.prototype.setConnectedState = function(newState)
    {
        this._modelBindings[TARGET_CONNECTED_BINDNAME].updateValue(newState);

        if (newState && this._connectDeferred)
        {
            this._connectDeferred.resolve();
            this._connectDeferred = null;
        }
    };

    /**
     * Query method to determine if the model is connected or disconnected from a target.
     *
     * @return {boolean} - true if the model is connected to a target, otherwise false.
     */
    gc.databind.AbstractBindFactory.prototype.isConnected = function()
    {
        return this._modelBindings[TARGET_CONNECTED_BINDNAME].getValue();
    };

    /**
     * Method to register model specific qualifiers.  Qualifiers are registered by name with a factory method
     * for creating the qualifier on demand.  To use a qualifier on a binding, append '.$' plus the name of the
     * qualifier with an optional numeric agrument; for example, "mybind.$q7" would apply the "q" value qualifier with 7 fractional bits.
     * All qualifiers can have an optional single value numeric argument.  This means that the qualifier name cannot end with numeric characters;
     * otherwise, they will be parsed as an argument instead of the qualifier name.  All models have the default "q", "hex", "dec", etc..., number
     * formatting qualifiers already registered.  Use this method to register additional, model specific qualifiers.
     *
     *
     * @param {string} name - the name of the qualifier, without the '.$' prefix.
     * @param {gc.databind.AbstractBindFactory#qualifierFactoryMethod} factory - the factory method to create the qualifier on a specific binding.
     */
    gc.databind.AbstractBindFactory.prototype.addQualifier = function(name, factory)
    {
        this._modelQualifiers.add(name, factory);
    };

    /**
     * Factory method used by addQualifier.
     *
     * @param {gc.databind.IBindValue} bind - the binding to apply the qualifier to.
     * @param {number} [param] - optional numeric argument for the qualifier.  If an argument is required,
     * but it is undefined, an appropriate default (like zero) should be applied.
     * @callback gc.databind.AbstractBindFactory#qualifierFactoryMethod
     */

    /**
     * Helper method to get a promise that is resolved when the model is connected to a target.
     * Derived classes should use this to delay accessing the target until the model is connected.
     *
     * @return {promise} - a promise that is either already resolved, or will resolve the next time
     * the model is connected to a target through a transport.
     */
    gc.databind.AbstractBindFactory.prototype.whenConnected = function()
    {
        this._connectDeferred = this._connectDeferred || Q.defer();
        return this._connectDeferred.promise;
    };

    /**
     * Creates a new scripting instance.
     *
     * @param {number} [bufferLength] - The buffer length that will be used for data exchange
     * between the main UI thread and the script execution worker thread.  The default is 2072 bytes.
     * @param {string} [logfile] - The log file path
     * @return {gc.databind.Scripting} - the newly created script instance.
     */
    gc.databind.AbstractBindFactory.prototype.newScriptInstance = function(bufferLength, logfile) {
        var logs = [];
        var instance =  new gc.databind.Scripting(bufferLength || (24 /*header*/ + 2048 /*payload*/), this._scriptHandler.bind(this));
        var handler = {
            _saveLog: function() {
                var defer = Q.defer();
                if (logs && logs.length > 0) {
                    if (typeof process === 'undefined') {
                        gc.File.saveBrowserFile(logs.join('\n'), {filename: logfile || 'scripting.log'});
                        logs = [];
                        defer.resolve();

                    } else {
                        gc.File.save(logs.join('\n'), {localPath: logfile || 'scripting.log'}, null, function(){
                            logs = [];
                            defer.resolve();
                        });
                    }
                }
                return defer.promise;
            },
            onLog: function(detail) {
                if (detail.clear) {
                    logs = [];
                }
                if (detail.text) {
                    logs.push(detail.text);
                }
            },
            onMainCompleted: function() {
               this._saveLog();
            },
            onTerminated: function() {
                this._saveLog();
            },
            onExit: function() {
                this._saveLog().then(function() {
                    window.close();
                });
            }
        };
        instance.addEventListener('Exit', handler);
        instance.addEventListener('Log', handler);
        instance.addEventListener('MainCompleted', handler);
        instance.addEventListener('Terminated', handler);
        return instance;
    };

    /**
     * Callback message handler for the scripting engine.
     *
     * @private
     */
    gc.databind.AbstractBindFactory.prototype._scriptHandler = function(event) {
        var detail = event.data;

        /* handle common messages */
        switch (detail.cmd) {
            case 'read':
                return this._scriptRead(detail.name);

            case 'write':
                return this._scriptWrite(detail.name, detail.value);

            case 'invoke':
                return this._scriptInvoke(detail.name, detail.args, detail.inf);
        }

        var msg = "Unsupported cmd or event: " + detail.cmd || detail.event;
        gc.console.error("Scripting", msg);
        return Q.reject(msg);
    };

    /**
     * Default implementation for reading value from the target.
     *
     * @protected
     * @param {string} uri - the name of the binding to read
     * @return {Promise} - a promise that resolves to the value read.
     */
    gc.databind.AbstractBindFactory.prototype._scriptRead = function(uri) {
        var binding = this.getBinding(uri);
        if (binding) {
            return Q(binding.getValue());
        } else {
            var msg = "Failed to read value, " + uri + " does not exist."
            gc.console.error("Scripting", msg);
            return Q.reject(msg);
        }
    };

    /**
     * Default implementation for writing value to the target.
     *
     * @protected
     * @param {string} uri - the name of the binding to write
     * @param {Object} value - the value to write
     * @return {Promise} - that resolves when the write operation has completed.
     */
    gc.databind.AbstractBindFactory.prototype._scriptWrite = function(uri, value) {
        var binding = this.getBinding(uri);
        if (binding.isReadOnly()) {
            var msg = "Failed writing value, " + url + " is reaonly.";
            gc.console.error("Scripting", msg)
            return Q.reject(msg);
        }

        if (binding) {
            return Q.Promise(function(resolve) {
                var progress = new gc.databind.ProgressCounter(resolve);
                binding.setValue(value, progress, true);
                progress.done();
            });
        } else {
            var msg = "Failed to write value, " + uri + " does not exist."
            gc.console.error("Scripting", msg);
            return Q.reject(msg);
        }
    };

    /**
     * Sub-class can override this method to expose method that can be invoked by the scripting engine.
     *
     * @protected
     * @param {String} method - name of the method to invoke from the script
     * @param {Object[]} args - array of arguments to pass to the method
     * @param {String} [inf] - name of the interface to invoke the method, if appropriate.
     */
    gc.databind.AbstractBindFactory.prototype._scriptInvoke = function(method, args, inf) {
        var self = this;
        if (args && !Array.isArray(args)) args = [args];

        /* invoke matching interface defined by the codec */
        if (self._codec && self._codec.getInterfaces && inf) {
            var infs = self._codec.getInterfaces();
            for (var i in infs) {
                if (inf === i && infs.hasOwnProperty(i)) {
                    var _inf = infs[i];

                    return _inf[method] ? Q(_inf[method].apply(_inf, args)) : Q.reject(inf + " does not have ${method} method.");
                }
            }

            return Q.reject(self._codec.name + " does not have ${inf}.");
        }

        /* invoke codec method */
        if (self._codec) {
            return self._codec[method] ? Q(self._codec[method].apply(self._codec, args)) : Q.reject(self._codec.name + " does not have " + method + " method.");
        }

        return Q.reject("Failed to invoke " + method + " method.");
    };

    var ModelBindProvider = function(model)
    {
        this._model = model;
        this._bindings = {};
        this._expressionParser = new gc.databind.internal.expressionParser.ExpressionParser(this);
    };

    ModelBindProvider.prototype = new gc.databind.IBindProvider();

    var stripSpacesMatchString = /^\s+|\s*([^A-Za-z0-9$_ ']+|'[^']*')\s*|\s+$/g;

    ModelBindProvider.prototype.getBinding = function(name, hint)
    {
        if (hint === undefined)
        {
            name = name.replace(stripSpacesMatchString, "$1");
        }
        
        var bind = this._bindings[name]; // lookup an existing binding for the same expression
        if (bind === undefined) // if not created yet, use expressionParser to create a new binding.
        {
            if (name === 'this') 
            {
                bind = new gc.databind.VariableBindValue();
            }
            else 
            {
                // pass hint to expressionParser so skip operators already tested for in sub-expressions.
                bind = this._expressionParser.parse(name, hint) || null;
            }
            
            if (bind !== null)
            {
                bind.setName(name);
            }
            this._bindings[name] = bind;
        }
        return bind;
    };

    ModelBindProvider.prototype.getModel = function(name)
    {
        if (name)
        {
            return gc.databind.registry.getModel(name);
        }
        return this._model;
    };

    ModelBindProvider.prototype.dispose = function()
    {
        for ( var name in this._bindings)
        {
            if (this._bindings.hasOwnProperty(name))
            {
                var bind = this._bindings[name];
                if (bind.dispose !== undefined)
                {
                    bind.dispose();
                }
            }
        }
        this._bindings = {};
    };

    /**
     * Helper method to parse a binding expression using this model as the default for all binding URI's.
     * The resulting bind expression will not be store in the global registry, but rather in a private one.
     * Therefore, you must use this API to retrieve existing model specific bind expressions.
     *
     * @param {string} expression - the binding expression to parse.
     *
     * @return {gc.databind.IBind} - the existing or newly created bindable object, or null if this name is not supported by this model.
     */
    gc.databind.AbstractBindFactory.prototype.parseModelSpecificBindExpression = function(expression)
    {
        this._bindProvider = this._bindProvider || new ModelBindProvider(this);
        var result = this._bindProvider.getBinding("" + expression);
        return result;
    };

    /**
     * Helper method clear all private model specific bind expressions that have been created.  Use this to clear bindings
     * created with the parseModelSpecificBindExpression() helper method.
     */
    gc.databind.AbstractBindFactory.prototype.clearAllModelSpecificBindExpressions = function()
    {
        if (this._bindProvider)
        {
            this._bindProvider = undefined;
        }
    };

    /**
     * Method called when a transport is disconnected from the target.  The default implementation is to iterate through
     * all the bindings and call onDisconnected() on each binding if it supports such a method.  The purpose is for those
     * bindings to clear any critical errors that might have incurred.
     */
    gc.databind.AbstractBindFactory.prototype.onDisconnected = function()
    {
        this.setConnectedState(false);

        var bindings = this.getAllBindings();
        for(var bindName in bindings)
        {
            if (bindings.hasOwnProperty(bindName))
            {
                var bind = bindings[bindName];
                if (bind.onDisconnected)
                {
                    bind.onDisconnected();
                }
            }
        }
    };
    
    /**
     * <p>Helper method that can be used to do custom conversion of values based on getter and setter bind expressions.  It is not
     * necessary to provide both a getter and setter for this conversion to work.  The getter and setter expressions are model 
     * specific bind expressions that can use other model bindings and a 'this' variable.  The 'this' variable is expected 
     * to be used in these expressions because it represents the value to be converted.  If a 'this' variable is not used, then
     * the result of the conversion will be independent of the input value.</p>  
     * 
     * <p>If a getter expression is specified, the 'this' variable is assigned the value passed in, and the return value is 
     * calculated by calling getValue() on this getter expression.</p>
     * <p>If a setter expression is specified, the setValue() of setter bind expression is called with the value passed in, and 
     * the value of the 'this' variable is returned as the result.  In this situation, the setter expression must be a bi-directional
     * expression since it will be evaluated inversely.  A bi-directional expression is an expression that contains only one 
     * variable bind and uses simple scale and shift operations; for example, 'this*9/5+32'.  This example could be used to 
     * convert Celcius values to Fahrenheit if passed in as the getter expression.  When passed in as the setter expression it 
     * performs the inverse operation and converts Fahrenheit to Celcius.</p>
     * 
     * @param {Number} value - the value that is to be converted
     * @param {string} [getter] - the getter expression to do the conversion.  If specified, the setter expression is not used.
     * @param {String} [setter] - the setter expression to do the inverse conversion if no getter is specified..
     * @return the converted value based on the getter expression, or if not provided, then the setter expression.
     */
    gc.databind.AbstractBindFactory.prototype.getConvertedValue = function(value, getterExpression, setterExpression) 
    {
        var expr;
        if (getterExpression) 
        {
            expr = this.parseModelSpecificBindExpression(getterExpression);
            this._bindProvider.getBinding('this').setValue(value);
            return expr && expr.getValue();
        } 
        else if (setterExpression)
        {
            expr = this.parseModelSpecificBindExpression(setterExpression);
            if (expr)
            {
                var thisBind = this._bindProvider.getBinding('this');
                thisBind.setValue(undefined);
                expr.setValue(value);
                return thisBind.getValue();
            }
            return undefined;
        } else {
            return value;
        }
    };
    
}());

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
 * This adaptor class provides default implementations for the methods described
 * by IStatusListener, IChangedListener and IStaleListener interfaces.
 * 
 * @constructor
 * @implements gc.databind.IStatusListener
 * @implements gc.databind.IChangedListener
 * @implements gc.databind.IStaleListener
 */
gc.databind.BindListenerAdapter = function() 
{
};

gc.databind.BindListenerAdapter.prototype.onStatusChanged = function(status) 
{
};

gc.databind.BindListenerAdapter.prototype.onValueChanged = function(oldValue, newValue, progress) 
{
};

gc.databind.BindListenerAdapter.prototype.onStaleChanged = function() 
{
};

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

var gc = gc || {};
gc.databind = gc.databind || {};

/**
 * Class that implements ILookupBindValue interface for a variable lookup value binding.
 * Use this class if you wish to create a lookup binding based on a given array or struct data pointer.
 *
 * @constructor
 * @extends gc.databind.AbstractLookupBindValue
 *
 * @param {*} initialData - the constant array or object data to use for lookups.
 * @param {boolean} readOnly - flag to indicate if setValue() method should be allowed to modify the data.
 */
gc.databind.VariableLookupBindValue = function(initialData, readOnly)
{
	gc.databind.AbstractLookupBindValue.call(this);

	this.data = initialData;
	if (readOnly !== undefined && readOnly != this._readOnly)
	{
		this._readOnly = readOnly;
	}

};

gc.databind.VariableLookupBindValue.prototype = new gc.databind.AbstractLookupBindValue();

gc.databind.VariableLookupBindValue.prototype._readOnly = false;

gc.databind.VariableLookupBindValue.prototype.setValue = function(value, progress, force)
{
	if (!this._readOnly)
	{
		// allow this value to be modified.
		gc.databind.AbstractLookupBindValue.prototype.setValue.call(this, value, progress, force);
	}
};

gc.databind.VariableLookupBindValue.prototype.isReadOnly = function()
{
	return this._readOnly;
};

/**
 * Implemented to use the data provided to lookup values based on index changes.
 * The data must be an array or object type with nested arrays or objects as needed.
 * The index must be numeric for array types and string for object types.
 * This method calls setValue() to update this bindings
 * value and notify listeners based on the new index values.
 *
 * @param {Array.number|string} indecies - the multi-dimensional index values to use for lookup.
 */
gc.databind.VariableLookupBindValue.prototype.onIndexChanged = function(indecies)
{
	var value = this.data;

	try
	{
		for(var i = 0; value !== undefined && indecies != undefined && i < indecies.length; i++)
		{
			var index = indecies[i];
			if (index === null || index === undefined)
			{
				throw "The index value is null.";
			}
			if (value instanceof Array)
			{
				value = value[this.assertValidArrayIndex(index, value.length)];
			}
			else if (typeof value === "object")
			{
				var fields = index.toString().split('.');
				for(var j = 0; j < fields.length; j++)
				{
					index = fields[j];
					value = value[index];
					if (value === undefined)
					{
						this.assertValidFieldName(index);
					}
				}
			}
			else
			{
				this.assertValidData(index);
			}
		}
		this.setStatus(null);  // if no exceptions clear errors
	}
	catch(e)
	{
		value = undefined;
		this.setStatus(gc.databind.AbstractStatus.createErrorStatus(e));
	}

	this.updateValue(value);
};

gc.databind.VariableLookupBindValue.prototype.setData = function(data)
{
	this.data = data;
	this.onIndexChanged(this.fIndexValues);
};

gc.databind.VariableLookupBindValue.prototype.getData = function(data)
{
	return this.data;
};

gc.databind.AbstractLookupBindValue.prototype.toString = function()
{
	try
	{
		return JSON.stringify(this.data);
	}
	catch(e)
	{
		return "" + this.data;
	}
};

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


/*****************************************************************
 * Copyright (c) 2018 Texas Instruments and others
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

(function()
{
    var keyValueChangeHandler = function()
    {
        if (!this._readOnly)  // ignore localStorage, because if it has a value, its wrong because we don't store constant values there.
        {
            // calculate new key value
            this._storageKey = this._storageKeyPrefix;
            
            for(var i = 0; i < this._indexBindings.length; i++)
            {
                this._storageKey += '_' + this._indexBindings[i].getValue();
            }
        
            // load preference value from local storage
            this.updateValue(gc.localStorage.getItem(this._storageKey) || this.fDefaultValue);
        }
    };
    
    /** 
     * Class that extends AbstractBindValue for a variable value binding that
     * is persisted in the user's preferences.  Each binding
     * requires a set of keys that make it unique within the users preferences.
     * One or more keys may be provided as additional attributes to this 
     * constructor.  These attributes may either be string literals (constant key),
     * or IBindValues where the key value is provided by another binding.  In this 
     * case, when any key changes value, this binding's value is updated with the
     * stored user preference for the new keys.  All keys are joined together to 
     * form a single user preference key with '_' delimiters inserted between key values.
     *
     * @constructor
     * @extends gc.databind.AbstractBindValue
     * @param {...*} args one or more key values or key bindings.
     */
    gc.databind.UserPreferenceBindValue = function() 
    {
        gc.databind.AbstractBindValue.call(this, typeof String);
        
        this._storageKeyPrefix = gc.fileCache.getProjectName();
        this._storageKeyChangeHandler = { onValueChanged: keyValueChangeHandler.bind(this) };
        this._indexBindings = this._indexBindings || [];
        
        if (arguments.length > 0)
        {
            for(var i = 0; i < arguments.length; i++)
            {
                var key = arguments[i];
                if (key instanceof gc.databind.AbstractBindValue)
                {
                    key.addChangedListener(this._storageKeyChangeHandler);
                }
                else
                {
                    key = new gc.databind.ConstantBindValue(key);
                }
                this._indexBindings.push(key);
            }
        }
        // trigger key value change to initialize binding value from user preferences.
        keyValueChangeHandler.call(this);
    };
    
    gc.databind.UserPreferenceBindValue.prototype = new gc.databind.AbstractBindValue();
    
    gc.databind.UserPreferenceBindValue.prototype.excludeFromStorageProviderData = true;
    gc.databind.UserPreferenceBindValue.prototype._readOnly = false;
    
    gc.databind.UserPreferenceBindValue.prototype.onValueChanged = function(oldValue, newValue)
    {
        if (!this._readOnly)
        {
            // save new value in local storage 
            gc.localStorage.setItem(this._storageKey, newValue);
        }
    };
    
    gc.databind.UserPreferenceBindValue.prototype.dispose = function()
    {
        for(var i = this._indexBindings.length; i-- > 0; )
        {
            var indexBinding = this._indexBindings[i];
            indexBinding.removeChangedListener(this._storageKeyChangeHandler);
            if (indexBinding.dispose !== undefined)
            {
                indexBinding.dispose();
            }
        }
    };
    
    gc.databind.UserPreferenceBindValue.prototype.setReadOnly = function(readOnly)
    {
		if (this._readOnly !== readOnly)
		{
			this._readOnly = readOnly;
		}
    };
    
    gc.databind.UserPreferenceBindValue.prototype.setDefaultValue = function(defaultValue)
    {
        if (this._readOnly)
        {
            this.updateValue(defaultValue);
        }
        else if (this.fDefaultValue !== defaultValue)
        {
            this.fDefaultValue = defaultValue;
            
            // trigger key value change to initialize binding value from user preferences.
            keyValueChangeHandler.call(this);
        }
    };
    
}());

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
 * Class that implements ILookupBindValue interface for an arbitrary javascript function.
 * The binding is read-only and updates its value whenever the indecies change.
 * The indecies are used as paramters to the function, whose return value is used as
 * the value for this binding.
 *
 * @constructor
 * @extends gc.databind.AbstractLookupBindValue
 * 
 * @param {function} functionMethod - a function object whose return value is used as this binding's value.
 * @param {object} [thisPointer] - 'this' object to use when calling the function.
 */
gc.databind.FunctionBindValue = function(functionMethod, thisPointer) 
{
	gc.databind.AbstractLookupBindValue.call(this);
	
    this.functionMethod = functionMethod;
    if (thisPointer !== undefined)
    {
        this.functionThis = thisPointer;
    }
};

gc.databind.FunctionBindValue.prototype = new gc.databind.AbstractLookupBindValue();

gc.databind.FunctionBindValue.prototype.setValue = function(value, progress)
{
};

gc.databind.FunctionBindValue.prototype.isReadOnly = function()
{
    return true;
};

gc.databind.FunctionBindValue.prototype.onIndexChanged = function(indecies)
{
	try
	{
		this.updateValue(this.functionMethod.apply(this.functionThis, indecies));
		this.setStatus(null);  // clear pre-existing error messages
	}
	catch(e)
	{
		// report exceptions as errors.
		this.setStatus(gc.databind.AbstractStatus.createErrorStatus(e));
	}
};




/*****************************************************************
 * Copyright (c) 2015 Texas Instruments and others
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

gc.databind.CollectionBindValue = function(bindings)
{
	this.bindings = bindings;
};

gc.databind.CollectionBindValue.prototype = new gc.databind.IBindValue();

gc.databind.CollectionBindValue.prototype.getValue = function()
{
	var values = {};
	for(var bindName in this.bindings)
	{
		if (this.bindings.hasOwnProperty(bindName))
		{
			values[bindName] = this.bindings[bindName].getValue();
		}
	}
	return values;
};	

gc.databind.CollectionBindValue.prototype.setValue = function(value, progress)
{
	for(var bindName in this.bindings)
	{
		if (this.bindings.hasOwnProperty(bindName))
		{
			var newValue = value[bindName];
			var binding = this.bindings[bindName];
			if (newValue !== undefined)
			{
				newValue = gc.databind.DataConverter.convert(newValue, undefined, binding.getType());
				binding.setValue(newValue, progress);
			}
		}
	}
};

gc.databind.CollectionBindValue.prototype.getType = function()
{
	return 'object';
};

gc.databind.CollectionBindValue.prototype.addChangedListener = function(listener)
{
	for(var bindName in this.bindings)
	{
		if (this.bindings.hasOwnProperty(bindName))
		{
			this.bindings[bindName].addChangedListener(listener);
		}
	}
};
	
gc.databind.CollectionBindValue.prototype.removeChangedListener = function(listener)
{
	for(var bindName in this.bindings)
	{
		if (this.bindings.hasOwnProperty(bindName))
		{
			this.bindings[bindName].removeChangedListener(listener);
		}
	}
};
	
gc.databind.CollectionBindValue.prototype.addStreamingListener = function(listener)
{
    for(var bindName in this.bindings)
    {
        if (this.bindings.hasOwnProperty(bindName))
        {
            this.bindings[bindName].addStreamingListener(listener);
        }
    }
};
    
gc.databind.CollectionBindValue.prototype.removeStreamingListener = function(listener)
{
    for(var bindName in this.bindings)
    {
        if (this.bindings.hasOwnProperty(bindName))
        {
            this.bindings[bindName].removeStreamingListener(listener);
        }
    }
};
    
gc.databind.CollectionBindValue.prototype.isStale = function()
{
	for(var bindName in this.bindings)
	{
		if (this.bindings.hasOwnProperty(bindName))
		{
			if (this.bindings[bindName].isStale())
			{
				return true;
			}
		}
	}
	return false;
};
	
gc.databind.CollectionBindValue.prototype.addStaleListener = function(listener)
{
	for(var bindName in this.bindings)
	{
		if (this.bindings.hasOwnProperty(bindName))
		{
			this.bindings[bindName].addStaleListener(listener);
		}
	}
};
	
gc.databind.CollectionBindValue.prototype.removeStaleListener = function(listener)
{
	for(var bindName in this.bindings)
	{
		if (this.bindings.hasOwnProperty(bindName))
		{
			this.bindings[bindName].removeStaleListener(listener);
		}
	}
};
	
gc.databind.CollectionBindValue.prototype.isReadOnly = function()
{
	for(var bindName in this.bindings)
	{
		if (this.bindings.hasOwnProperty(bindName))
		{
			if (this.bindings[bindName].isReadOnly())
			{
				return true;
			}
		}
	}
	return false;
};

gc.databind.CollectionBindValue.prototype.getStatus = function()
{
	if (this._status)
	{
		return this._status;
	}
	else
	{
		for(var bindName in this.bindings)
		{
			if (this.bindings.hasOwnProperty(bindName))
			{
				var status = this.bindings[bindName].getStatus();
				if (status)
				{
					return status;
				}
			}
		}
		return null;
	}
};

gc.databind.CollectionBindValue.prototype.setStatus = function(status)
{
	this._status = status;
};
	
gc.databind.CollectionBindValue.prototype.addStatusListener = function(listener)
{
	for(var bindName in this.bindings)
	{
		if (this.bindings.hasOwnProperty(bindName))
		{
			this.bindings[bindName].addStatusListener(listener);
		}
	}
};

gc.databind.CollectionBindValue.prototype.removeStatusListener = function(listener)
{
	for(var bindName in this.bindings)
	{
		if (this.bindings.hasOwnProperty(bindName))
		{
			this.bindings[bindName].removeStatusListener(listener);
		}
	}
};
	
gc.databind.CollectionBindValue.prototype.getName = function()
{
	return this._name;
};
	
gc.databind.CollectionBindValue.prototype.setName = function(name)
{
	this._name = name;
};

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
	var nullConverter = { convert: function(input) { return input; } };

	var jsonStringifyConverter = function(input)
	{
		try
		{
			return JSON.stringify(input);
		}
		catch(e)
		{
			return "" + input;
		}
	};

	var converters =
	{
		"string" :
		{
			any : { convert: function(input) { return "" + input; } },
			"object" : { convert: jsonStringifyConverter }
		},
		"boolean" :
		{
		    any : { convert: function(input) { return !!input; } },
            "string" : { convert: function(input) { return isNaN(+input) ? input.toLowerCase().trim() === 'true' : +input !== 0; }}
		},
        "number" : { any : { convert: function(input) { return +input; } } },
        "array" : {
            any : { convert: function(input) { return input ? ("" + input).split(",").map(function(e) { return +e; }) : []; }}
        }
	};

	/**
	 * Singleton Class to register data converters that will be used by the DataBinder to
	 * convert data between bindings of different types.
	 *
	 * @class
	 */
	gc.databind.DataConverter = function()
	{
	};

	/**
	 * Method to register custom data converters to be used by the DataBindiner singleton
	 * to convert data between bindings of different types.
	 *
	 * @static
	 * @param {gc.databind.IDataConverter} converter - data converter to use to convert between the srcType and destType.
	 * @param {string} [srcType] - the type of the source that this converter is to be used on.  If not supplied, then it will
	 * be the default converter for all source types if a specific one cannot be found.
	 * @param {string} destType - the type of the output value from this converter.
	 */
	gc.databind.DataConverter.register = function(converter, destType, srcType)
	{
		if (destType !== null)
		{
			srcType = srcType || "any";

			var destConverters = converters[destType];
			if (!destConverters)
			{
				destConverters = {};
				converters[destType] = destConverters;
			}

			destConverters[srcType] = converter;
		}
	};

	/**
	 * Method to retrieve the converter for converting one source type to another destination type.
	 *
	 * @static
	 * @param {string} [srcType] - the type of the source that this converter is to be used on.  If not supplied, then it will
	 * be the default converter for all source types if a specific one cannot be found.
	 * @param {string} destType - the type of the output value from this converter.
	 * @return {gc.databind.IDataConverter} - the converter found or undefined if not found.
	 */
	gc.databind.DataConverter.getConverter = function(srcType, destType)
	{
		var converter = nullConverter;
		var destConverters = converters[destType];
		if (destConverters !== undefined)
		{
			converter = destConverters[srcType || "any"];
			if (converter === undefined)
			{
				converter = destConverters.any;
			}
		}
		return converter;
	};

	/**
	 * Method to convert an element of data from one data type to another.
	 *
	 * @static
	 * @param {string} [srcType] - the type of the source that this converter is to be used on.  If not supplied, then it will
	 * be the default converter for all source types if a specific one cannot be found.
     * @param {string} destType - the type of the output value required from this conversion.
     * @param {number} param - optional numeric parameter to control the conversion like the precision for decimal and q values.
	 * @return {*} - the converted data or undefined if no converter found.
	 */
	gc.databind.DataConverter.convert = function(data, srcType, destType, param)
	{
		if (data === null || data === undefined)
		{
			return data;  // null is null independent of type, so no conversion required.
		}
		srcType = srcType || typeof data;

		if (srcType === destType || destType === undefined || destType === null)
		{
			return data;
		}

		return this.getConverter(srcType, destType).convert(data, param);
	};

}());



/*****************************************************************
 * Copyright (c) 2013-2014 Texas Instruments and others
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
gc.databind.internal = gc.databind.internal || {};
gc.databind.internal.expressionParser = gc.databind.internal.expressionParser || {};

gc.databind.internal.expressionParser.IOperator = function()
{
};

gc.databind.internal.expressionParser.IOperator.Factory = function()
{
};

gc.databind.internal.expressionParser.IOperator.Factory.prototype.parse = function(uri, factory, precedence)
{
};

gc.databind.internal.expressionParser.IOperator.Factory.prototype.getOperator = function()
{
};
/*****************************************************************
 * Copyright (c) 2013-2014 Texas Instruments and others
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
gc.databind.internal = gc.databind.internal || {};
gc.databind.internal.expressionParser = gc.databind.internal.expressionParser || {};

gc.databind.internal.expressionParser.IUriBindingFactory = function()
{
};

// Parse an expression and return a binding.  Called by the bindingRegistry so returned binding will be registered.
gc.databind.internal.expressionParser.IUriBindingFactory.prototype.parse = function(expr, precedence, isLookupBinding)
{
};

// create a new lookup binding that is not register with the binding registry because the index must not be shared.
gc.databind.internal.expressionParser.IUriBindingFactory.prototype.parseLookupExpression = function(expr, precedence)
{
};

// Create a new binding but use the binding registry to share bindings because no index is used for this binding.
gc.databind.internal.expressionParser.IUriBindingFactory.prototype.parseExpression = function(expr, precedence)
{
};

// Create a new binding for a variable parsed within an expression.  
gc.databind.internal.expressionParser.IUriBindingFactory.prototype.bindValue = function(name, isLookupBinding)
{
};

/*****************************************************************
 * Copyright (c) 2013-2014 Texas Instruments and others
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
gc.databind.internal = gc.databind.internal || {};
gc.databind.internal.expressionParser = gc.databind.internal.expressionParser || {};

gc.databind.internal.expressionParser.AbstractLiteralBinding = function()
{
};

gc.databind.internal.expressionParser.AbstractLiteralBinding.prototype = new gc.databind.IBindValue();

gc.databind.internal.expressionParser.AbstractLiteralBinding.prototype.addStreamingListener = function(listener)
{
};
        
gc.databind.internal.expressionParser.AbstractLiteralBinding.prototype.removeStreamingListener = function(listener)
{
};

gc.databind.internal.expressionParser.AbstractLiteralBinding.prototype.addChangedListener = function(listener)
{
};
	
gc.databind.internal.expressionParser.AbstractLiteralBinding.prototype.removeChangedListener = function(listener)
{
};
	
gc.databind.internal.expressionParser.AbstractLiteralBinding.prototype.addStatusListener = function(listener)
{
};
	
gc.databind.internal.expressionParser.AbstractLiteralBinding.prototype.removeStatusListener = function(listener)
{
};
	
gc.databind.internal.expressionParser.AbstractLiteralBinding.prototype.getValue = function()
{
	return this.literalValue;
};
	
gc.databind.internal.expressionParser.AbstractLiteralBinding.prototype.setValue = function(value, progress)
{
};
	
gc.databind.internal.expressionParser.AbstractLiteralBinding.prototype.getType = function()
{
	return typeof this.literalValue;
};
	
gc.databind.internal.expressionParser.AbstractLiteralBinding.prototype.getStatus = function()
{
	return null;
};
	
gc.databind.internal.expressionParser.AbstractLiteralBinding.prototype.setStatus = function(status)
{
};

gc.databind.internal.expressionParser.AbstractLiteralBinding.prototype.isStale = function()
{
	return false;
};
	
gc.databind.internal.expressionParser.AbstractLiteralBinding.prototype.addStaleListener = function(listener)
{
};
	
gc.databind.internal.expressionParser.AbstractLiteralBinding.prototype.removeStaleListener = function(listener)
{
};
	
gc.databind.internal.expressionParser.AbstractLiteralBinding.prototype.isReadOnly = function()
{
	return true;
};
	
gc.databind.internal.expressionParser.AbstractLiteralBinding.prototype.setName = function(name) 
{
	this.fName = name;
};
	
gc.databind.internal.expressionParser.AbstractLiteralBinding.prototype.getName = function() 
{
	return this.fName;
};

/*****************************************************************
 * Copyright (c) 2013-2014 Texas Instruments and others
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
gc.databind.internal = gc.databind.internal || {};
gc.databind.internal.expressionParser = gc.databind.internal.expressionParser || {};

gc.databind.internal.expressionParser.AbstractUnaryOperator = function(operator)
{
	this.operator = operator;
};

gc.databind.internal.expressionParser.AbstractUnaryOperator.prototype = new gc.databind.IBindValue();

gc.databind.internal.expressionParser.AbstractUnaryOperator.Factory = function(operator)
{
	this.operator = operator;
};

gc.databind.internal.expressionParser.AbstractUnaryOperator.Factory.prototype = new gc.databind.internal.expressionParser.IOperator.Factory();

gc.databind.internal.expressionParser.AbstractUnaryOperator.Factory.prototype.createOperator = function()
{
};
		
gc.databind.internal.expressionParser.AbstractUnaryOperator.Factory.prototype.parse = function(uri, factory, precedence)
{
	if (uri.indexOf(this.operator) === 0)
	{
		var operandText = uri.substring(this.operator.length);
		var operand = factory.parseExpression(operandText, precedence);
		if (operand !== null)
		{
			var result = this.createOperator();
			result.operand = operand;
			return result;
		}
	}
	return null;
};

gc.databind.internal.expressionParser.AbstractUnaryOperator.prototype.addStreamingListener = function(listener)
{
    this.operand.addStreamingListener(listener);
};
        
gc.databind.internal.expressionParser.AbstractUnaryOperator.prototype.removeStreamingListener = function(listener)
{
    this.operand.removeStreamingListener(listener);
};
        
gc.databind.internal.expressionParser.AbstractUnaryOperator.prototype.addChangedListener = function(listener)
{
    this.operand.addChangedListener(listener);
};
        
gc.databind.internal.expressionParser.AbstractUnaryOperator.prototype.removeChangedListener = function(listener)
{
	this.operand.removeChangedListener(listener);
};

gc.databind.internal.expressionParser.AbstractUnaryOperator.prototype.getStatus = function()
{
	return this.operand.getStatus();
};

gc.databind.internal.expressionParser.AbstractUnaryOperator.prototype.setStatus = function(status)
{
	this.operand.setStatus(status);
};

gc.databind.internal.expressionParser.AbstractUnaryOperator.prototype.addStatusListener = function(listener)
{
	this.operand.addStatusListener(listener);
};

gc.databind.internal.expressionParser.AbstractUnaryOperator.prototype.removeStatusListener = function(listener)
{
	this.operand.removeStatusListener(listener);
};
		
gc.databind.internal.expressionParser.AbstractUnaryOperator.prototype.dispose = function()
{
	if (this.operand.dispose !== undefined)
	{
		this.operand.dispose();
	}
};
		
gc.databind.internal.expressionParser.AbstractUnaryOperator.prototype.setValue = function(value, progress)
{
	if (value === null || value === undefined)
	{
		return; // ignore null values
	}
	
	var type = this.operand.getType();
	var result;
	
	try
	{
		if (type === "boolean")
		{
			result = this.doBooleanOperation(value, true);
		}
		else if (type === "number")
		{
			result = this.doNumericOperation(value, true);
		}
		else if (type === "array")
		{
			result = this.doArrayOperation(value, true);
		}
		else if (type === "string")  
		{
			result = this.doStringOperation(value, true);
		}
		else if (type === 'object')
		{
			result = this.doObjectOperation(value, true);
		}
		else 
		{
			throw "Operation '" + this.operation + "' does not support " + type + "types";
		}
		this.operand.setValue(result, progress);
	}
	catch(e)
	{
		this.setStatus(gc.databind.AbstractStatus.createErrorStatus(e));
	}
};
		
gc.databind.internal.expressionParser.AbstractUnaryOperator.prototype.getValue = function()
{
	var value = this.operand.getValue();
	
	if (value === null || value === undefined)
	{
		return value; // parameter is not available, pass this on.
	}

	var type = this.operand.getType();
	
	try
	{
		if (type === "boolean")
		{
			return this.doBooleanOperation(value, false);
		}
		else if (type === "number")
		{
			return this.doNumericOperation(value, false);
		}
		else if (type === "array")
		{
			return this.doArrayOperation(value, false);
		}
		else if (type === "string") 
		{
			return this.doStringOperation(value, false);
		}
		else if (type === "object")
		{
			return this.doObjectOperation(value, false);
		}
		else 
		{
			throw "Operator '"+ this.operator + "' does not support " + type + " types"; 
		}
	}
	catch(e)
	{
		this.setStatus(gc.databind.AbstractStatus.createErrorStatus(e));
		return null;
	}
};

gc.databind.internal.expressionParser.AbstractUnaryOperator.prototype.doBooleanOperation = function(value, write)
{
	if (this.evalBoolean !== undefined)
	{
		return this.evalBoolean(value, write);
	}
	else
	{
		throw "Operator '" + this.operator + "' does not support boolean types";
	}
};

gc.databind.internal.expressionParser.AbstractUnaryOperator.prototype.doNumericOperation = function(value, write)
{
	if (this.evalNumber !== undefined)
	{
		return this.evalNumber(value, write);
	}
	else
	{
		throw "Operator '" + this.operator + "' does not support numeric types";
	}
};

gc.databind.internal.expressionParser.AbstractUnaryOperator.prototype.doArrayOperation = function(valueArray, write)
{
	if (this.evalArray !== undefined)
	{
		if (valueArray instanceof Array)
		{
			return this.evalArray(valueArray, write);
		}
		else
		{
			return this.evalArray([valueArray], write);
		}
	}
	else
	{
		throw "Operator '" + this.operator + "' does not support array types";
	}
};
		
gc.databind.internal.expressionParser.AbstractUnaryOperator.prototype.doStringOperation = function(value, write)
{
	if (this.evalString !== undefined)
	{
		return this.evalString(value, write);
	}
	else
	{
		throw "Operator '" + this.operator + "' does not support string types";
	}
};
	
gc.databind.internal.expressionParser.AbstractUnaryOperator.prototype.doObjectOperation = function(value, write)
{
	if (this.evalObject !== undefined)
	{
		return this.evalObject(value, write);
	}
	else // try converting using number or string conversion if available before reporting object types not supported.
	{
		value = value.valueOf();  // Object.valueOf() returns this (so unchanged if not overridden).
		var type = typeof value;
		if (type === "number" && this.evalNumber !== undefined)
		{
			return this.evalNumber(value, write);
		}
		else if (this.evalString !== undefined)
		{
			return this.evalString(value.toString(), write);
		}
		else
		{
			throw "Operator '" + this.operator + "' does not support object types";
		}
	}
};
	
gc.databind.internal.expressionParser.AbstractUnaryOperator.prototype.getType = function()
{
	return this.operand.getType();
};

gc.databind.internal.expressionParser.AbstractUnaryOperator.Factory.prototype.getOperator = function()
{
	return this.operator;
};
		
gc.databind.internal.expressionParser.AbstractUnaryOperator.prototype.toString = function()
{
	return this.operator + this.operand.toString();
};
		
gc.databind.internal.expressionParser.AbstractUnaryOperator.prototype.isStale = function()
{
	return this.operand.isStale();
};
		
gc.databind.internal.expressionParser.AbstractUnaryOperator.prototype.addStaleListener = function(listener)
{
	this.operand.addStaleListener(listener);
};
		
gc.databind.internal.expressionParser.AbstractUnaryOperator.prototype.removeStaleListener = function(listener)
{
	this.operand.removeStaleListener(listener);
};
		
gc.databind.internal.expressionParser.AbstractUnaryOperator.prototype.isReadOnly = function()
{
	return this.operand.isReadOnly();
};
		
gc.databind.internal.expressionParser.AbstractUnaryOperator.prototype.setName = function(name)
{
	this.fName = name;
};
		
gc.databind.internal.expressionParser.AbstractUnaryOperator.prototype.getName = function() 
{
	return this.fName;
};
	

/*****************************************************************
 * Copyright (c) 2013-2014 Texas Instruments and others
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
gc.databind.internal = gc.databind.internal || {};
gc.databind.internal.expressionParser = gc.databind.internal.expressionParser || {};

gc.databind.internal.expressionParser.AbstractBinaryOperator = function(operator)
{
	if (operator)
	{
		this.operator = operator;
	}	
	
	this.fEvents = new gc.databind.internal.Events(this);
};

gc.databind.internal.expressionParser.AbstractBinaryOperator.prototype = new gc.databind.IBindValue();

gc.databind.internal.expressionParser.AbstractBinaryOperator.Factory = function(operator)
{
	this.operator = operator;
};

gc.databind.internal.expressionParser.AbstractBinaryOperator.Factory.prototype = new gc.databind.internal.expressionParser.IOperator.Factory();


gc.databind.internal.expressionParser.AbstractBinaryOperator.Factory.prototype.createOperator = function()
{
};
		
gc.databind.internal.expressionParser.AbstractBinaryOperator.Factory.prototype.parse = function(uri, factory, precedence)
{
	var pos = factory.findLastIndexOf(uri, this.operator);
	if (pos > 0 && pos < uri.length-1) // can't be first or last character, because it's not a unary operator
	{
		var operandText = uri.substring(0, pos);
		var leftOperand = factory.parseExpression(operandText, precedence);
		operandText = uri.substring(pos + this.operator.length); 
		// there are not operators to the right of this one at the same precedence level
		var rightOperand = factory.parseExpression(operandText, precedence+1);
		
		var result = this.createOperator();
		result.leftOperand = leftOperand;
		result.rightOperand = rightOperand;
		return result;
	}
	return null;
};
	
gc.databind.internal.expressionParser.AbstractBinaryOperator.Factory.prototype.getOperator = function()
{
	return this.operator;
};
	
gc.databind.internal.expressionParser.AbstractBinaryOperator.prototype.toString = function()
{
	return this.leftOperand.toString() + ' ' + this.operator + ' ' + this.rightOperand.toString();
};

gc.databind.internal.expressionParser.AbstractBinaryOperator.prototype.setValue = function(value, progress)
{
	if (!this.isReadOnly())
	{
		try
		{
			// call doSetValue(newValue, isLeftParamConstand, variableParam, constantValue)
			if (this.leftOperand.isReadOnly())
			{
				value = this.doSetValue(value, this.leftOperand.getValue(), true);
				var rightType = this.rightOperand.getType();
				value = gc.databind.DataConverter.convert(value, typeof value, rightType);
				this.rightOperand.setValue(value, progress);
			}
			else
			{	
				value = this.doSetValue(value, this.rightOperand.getValue(), false);
				var leftType = this.leftOperand.getType();
				value = gc.databind.DataConverter.convert(value, typeof value, leftType);
				this.leftOperand.setValue(value, progress);
			}
		}
		catch(e)
		{
			this.setStatus(gc.databind.AbstractStatus.createErrorStatus(e));
		}
	}
};

gc.databind.internal.expressionParser.AbstractBinaryOperator.prototype.addStreamingListener = function(listener)
{
    this.leftOperand.addStreamingListener(listener);
    this.rightOperand.addStreamingListener(listener);
};
        
gc.databind.internal.expressionParser.AbstractBinaryOperator.prototype.removeStreamingListener = function(listener)
{
    this.leftOperand.removeStreamingListener(listener);
    this.rightOperand.removeStreamingListener(listener);
};
        
gc.databind.internal.expressionParser.AbstractBinaryOperator.prototype.addChangedListener = function(listener)
{
	this.leftOperand.addChangedListener(listener);
	this.rightOperand.addChangedListener(listener);
};
		
gc.databind.internal.expressionParser.AbstractBinaryOperator.prototype.removeChangedListener = function(listener)
{
	this.leftOperand.removeChangedListener(listener);
	this.rightOperand.removeChangedListener(listener);
};
		
gc.databind.internal.expressionParser.AbstractBinaryOperator.prototype.addStatusListener = function(listener)
{
	this.fEvents.addListener('StatusChanged', listener);
	
	this.leftOperand.addStatusListener(listener);
	this.rightOperand.addStatusListener(listener);
};
		
gc.databind.internal.expressionParser.AbstractBinaryOperator.prototype.removeStatusListener = function(listener)
{
	this.fEvents.removeListener('StatusChanged', listener);
	
	this.leftOperand.removeStatusListener(listener);
	this.rightOperand.removeStatusListener(listener);
};
		
gc.databind.internal.expressionParser.AbstractBinaryOperator.prototype.dispose = function()
{
	if (this.leftOperand.dispose !== undefined)
	{
		this.leftOperand.dispose();
	}
	if (this.rightOperand.dispose !== undefined)
	{
		this.rightOperand.dispose();
	}
};

gc.databind.internal.expressionParser.AbstractBinaryOperator.prototype.fStatus = null;

gc.databind.internal.expressionParser.AbstractBinaryOperator.prototype.getStatus = function()
{
	var status = this.fStatus;
	
	if (status === null)
	{
		status = this.leftOperand.getStatus();
	}
	if (status === null)
	{
		status = this.rightOperand.getStatus();
	}
	
	return status;
};

gc.databind.internal.expressionParser.AbstractBinaryOperator.prototype.notifyStatusChanged = function(status)
{
	this.fEvents.fireEvent('StatusChanged', status);
};

gc.databind.internal.expressionParser.AbstractBinaryOperator.prototype.setStatus = function(status) 
{
	if( status != this.fStatus)
	{
		this.onStatusChanged( this.fStatus, status);
		this.fStatus = status;
		this.notifyStatusChanged(this.fStatus);
	}
};

gc.databind.internal.expressionParser.AbstractBinaryOperator.prototype.onStatusChanged = function(oldStatus, newStatus) 
{
};

gc.databind.internal.expressionParser.AbstractBinaryOperator.prototype.getName = function() 
{
	return this.fName;
};

gc.databind.internal.expressionParser.AbstractBinaryOperator.prototype.setName = function(name) 
{
	this.fName = name;
};

gc.databind.internal.expressionParser.AbstractBinaryOperator.prototype.doBooleanOperation = function(leftValue, rightValue)
{
	if (this.evalBoolean !== undefined)
	{
		return this.evalBoolean(leftValue, rightValue);
	}
	else
	{
		throw "Operator '" + this.operator + "' does not support boolean types";
	}
};

gc.databind.internal.expressionParser.AbstractBinaryOperator.prototype.doNumericOperation = function(leftValue, rightValue)
{
	if (this.evalNumber !== undefined)
	{
		return this.evalNumber(leftValue, rightValue);
	}
	else
	{
		throw "Operator '" + this.operator + "' does not support numeric types";
	}
};

gc.databind.internal.expressionParser.AbstractBinaryOperator.prototype.doArrayOperation = function(leftValue, rightValue)
{
	if (this.evalArray !== undefined)
	{
		return this.evalArray(leftValue, rightValue);
	}
	else
	{
		throw "Operator '" + this.operator + "' does not support array types";
	}
};
		
gc.databind.internal.expressionParser.AbstractBinaryOperator.prototype.doStringOperation = function(leftValue, rightValue)
{
	if (this.evalString !== undefined)
	{
		return this.evalString(leftValue, rightValue);
	}
	else
	{
		throw "Operator '" + this.operator + "' does not support string types";
	}
};

gc.databind.internal.expressionParser.AbstractBinaryOperator.prototype.doObjectOperation = function(leftValue, rightValue)
{
	if (this.evalObject !== undefined)
	{
		return this.evalObject(leftValue, rightValue);
	}
	else
	{
		throw "Operator '" + this.operator + "' does not support object types";
	}
};

gc.databind.internal.expressionParser.AbstractBinaryOperator.prototype.getValue = function()
{
	var leftValue = this.leftOperand.getValue();
	var rightValue = this.rightOperand.getValue();
	
	if (leftValue === null || rightValue === null)
	{
		return null; // one side or the other cannot be evaulated, so pass this information along.
	}
	else if (leftValue === undefined || rightValue === undefined)
	{
		return undefined;
	}
	
	var leftType = this.leftOperand.getType();
	var rightType = this.rightOperand.getType();

	try
	{
		if (leftType === "boolean" && rightType === "boolean")
		{
			return this.doBooleanOperation(leftValue, rightValue);
		}
		else if (leftType === "array")
		{
			return this.doArrayOperation(leftValue, rightType === 'array' ? rightValue : [rightValue]);
		}
		else if (rightType === "array")
		{
			return this.doArrayOperation([leftValue], rightValue);
		}
		else if (leftType === "string")
		{
			return this.doStringOperation(leftValue, rightType === "string" ? rightValue : rightValue.toString());
		}
		else if (rightType === "string")
		{
			return this.doStringOperation(leftValue.toString(), rightValue);
		}
		else if (leftType === "number" && rightType === "number")
		{
			return this.doNumericOperation(leftValue, rightValue);
		}
		else if (leftType === "number" && typeof rightValue.valueOf() === "number")
		{
			return this.doNumericOperation(leftValue, rightValue.valueOf());
		}
		else if (leftType === "number" && rightType === "boolean")
		{
			return this.doNumericOperation(leftValue, rightValue ? 1 : 0);
		}
		else if (rightType === "number" && typeof leftValue.valueOf() === "number")
		{
			return this.doNumericOperation(leftValue.valueOf(), rightValue);
		}
		else if (rightType === "number" && leftType === "boolean")
		{
			return this.doNumericOperation(leftValue ? 1 : 0, rightValue);
		}
		else if (this.evalString !== undefined)
		{
			return this.doStringOperation(leftValue.toString(), rightValue.toString());
		}
		else if (leftType === "object" && rightType === "object")
		{
			return this.doObjectOperation(leftValue, rightValue);
		}
		else 
		{
			var type = "object";
			if (this.evalBoolean === undefined && (leftType === "boolean" || rightType === "boolean"))
			{
				type = "boolean";
			}
			if (this.evalNumber === undefined && (leftType === "number" || rightType === "number"))
			{
				type = "numeric";
			}
			
			throw "Operator '" + this.operator + "' does not support " + type + " types"; 
		}
	}
	catch(e)
	{
		this.setStatus(gc.databind.AbstractStatus.createErrorStatus(e));
		return null;
	}
};
		
gc.databind.internal.expressionParser.AbstractBinaryOperator.prototype.getType = function()
{
	var value = this.getValue();
	if (value !== null && value !== undefined)
	{
		var result = typeof value;
		if (result === "object" && value instanceof Array)
		{
			result = "array";
		}
		return result;
	}
	
	var leftType = this.leftOperand.getType();
	var rightType = this.rightOperand.getType();

	if (leftType === rightType)
	{
		return leftType;
	}
	else if (leftType === "array" || rightType === "array")
	{
		return "array";
	}
	else if (leftType === "string" || rightType === "string")
	{
		return "string";
	}
	else if (leftType === "number" || rightType === "number")
	{
		return "number";
	}
	else
	{
		return "object";
	}
};
		
gc.databind.internal.expressionParser.AbstractBinaryOperator.prototype.isStale = function()
{
	return this.leftOperand.isStale() || this.rightOperand.isStale();
};
		
gc.databind.internal.expressionParser.AbstractBinaryOperator.prototype.addStaleListener = function(listener)
{
	this.leftOperand.addStaleListener(listener);
	this.rightOperand.addStaleListener(listener);
};
		
gc.databind.internal.expressionParser.AbstractBinaryOperator.prototype.removeStaleListener = function(listener)
{
	this.leftOperand.removeStaleListener(listener);
	this.rightOperand.removeStaleListener(listener);
};
		
gc.databind.internal.expressionParser.AbstractBinaryOperator.prototype.isReadOnly = function()
{
	return this.doSetValue === undefined || !((this.leftOperand.isReadOnly() ? 1 : 0) ^ (this.rightOperand.isReadOnly() ? 1 : 0));
};




/*****************************************************************
 * Copyright (c) 2013-2014 Texas Instruments and others
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
gc.databind.internal = gc.databind.internal || {};
gc.databind.internal.expressionParser = gc.databind.internal.expressionParser || {};

gc.databind.internal.expressionParser.AbstractComparisonOperator = function(operator)
{
	gc.databind.internal.expressionParser.AbstractBinaryOperator.call(this);

	if (operator)
	{
		this.operator = operator;
	}
};

gc.databind.internal.expressionParser.AbstractComparisonOperator.prototype = new gc.databind.internal.expressionParser.AbstractBinaryOperator();

gc.databind.internal.expressionParser.AbstractComparisonOperator.Factory = function(operator)
{
	this.operator = operator;
};

gc.databind.internal.expressionParser.AbstractComparisonOperator.Factory.prototype = new gc.databind.internal.expressionParser.AbstractBinaryOperator.Factory();

gc.databind.internal.expressionParser.AbstractComparisonOperator.prototype.getType = function()
{
	return "boolean";
};

gc.databind.internal.expressionParser.AbstractComparisonOperator.prototype.isReadOnly = function()
{
	return true;
};

/*****************************************************************
 * Copyright (c) 2013-2014 Texas Instruments and others
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
gc.databind.internal = gc.databind.internal || {};
gc.databind.internal.expressionParser = gc.databind.internal.expressionParser || {};

(function()
{
	var endsWith = function(str, suffix) 
	{
	    return str.indexOf(suffix, str.length - suffix.length) !== -1;
	};
	
	var isDigit = function(c)
	{
		return (c >= '0' && c <= '9') || c === '.';
	};
	
	var notIdentifierRegExp = /[^A-Za-z$_\.0-9]+/;
	
	var Bracket = function(opening, closing, next)
	{
		this.openingBrace = opening;
		this.closingBrace = closing;
		this.link = next;
	};
	
	Bracket.prototype.countBraces = function(text, brace, endingPos)
	{
		var count = 0; 
		for( var pos = 0; pos <= endingPos; )
		{
			pos = text.indexOf(brace, pos);
			if (pos < 0 || pos > endingPos )
			{
				break;
			}
			else if (pos === 0 || (text.charAt(pos-1) !== '\\' &&
				(this.link === null || !this.link.isInBracket(text, pos))))
			{
				count++;
			}
			pos = pos + brace.length;
		}
		return count;
	};
	
	Bracket.prototype.isInBracket = function(text, endingPos)
	{
		var count = this.countBraces(text, this.openingBrace, endingPos);
		if (count > 0)
		{
			if (this.closingBrace !== this.openingBrace)
			{
				count -= this.countBraces(text, this.closingBrace, endingPos);
				return count !== 0;
			}
			else if ((count & 1) !== 0) // if odd count, then we are in a bracket; otherwise we are not.
			{
				return true;
			}
		}
		
		// if not in this bracket, try the next one
		if (this.link !== null)
		{
			return this.link.isInBracket(text, endingPos);
		}
		return false;  // we are not in any of the brackets.
	};
			
	var composeUnrecognizedTextErrMsg = function(text, literalErrorMessage)
	{
		// Unrecognized character
		var msg = 'Unexpected character';
		if (text.length > 1)
		{
			msg += 's "' + text + '" were';
		}
		else
		{
			msg += ' "' + text + '" was';
		}
		msg += ' found.  If this was suppose to be an operator, it is not supported.';
		
		if (literalErrorMessage !== null)
		{
			msg += '  Also, I do not recognize this as part of a literal.  ' + literalErrorMessage;
		}
		throw msg;
	};
		
	var composeUnexpectedWhiteSpaceErrMsg = function(text)
	{
		// spaces are not allowed in identifiers
		throw 'Unexpected white space was found in the following expression "' + text +
			'".  To be honest, I was expecting an operator, or something other than blank.';
	};
	
	var composeUnrecognizedIdentifier = function(unrecognizedText, literalErrorMessage)
	{
		if (unrecognizedText.trim().length === 0)
		{
			this.composeUnexpectedWhiteSpaceErrMsg(unrecognizedText);
		}
		else
		{
			composeUnrecognizedTextErrMsg(unrecognizedText, literalErrorMessage);
		}
	};
		
	var composeMissingClosingBraceErrMsg = function(uri, brace)
	{
		throw 'To be honest, I was expecting to find a terminating ' + brace + ' after "' + uri + '".';
	};
	
	var composeMissingOperatorErrMsg = function(uri)
	{
		throw 'To be honest, I was expecting to find an operator at the beginning of this expression: ' + uri;
	};
		
	gc.databind.internal.expressionParser.AbstractUriBindingFactory = function()
	{
	};
	
	gc.databind.internal.expressionParser.AbstractUriBindingFactory.prototype = new gc.databind.internal.expressionParser.IUriBindingFactory();

	gc.databind.internal.expressionParser.AbstractUriBindingFactory.composeMissingClosingBraceErrMsg = composeMissingClosingBraceErrMsg;
	gc.databind.internal.expressionParser.AbstractUriBindingFactory.composeMissingOperatorErrMsg = composeMissingOperatorErrMsg;
	
	var initialize = function()
	{
		this._operatorFactories = this._operatorFactories || [];
		this._brackets = this._brackets || new Bracket("(", ")", null);
	};
	
	gc.databind.internal.expressionParser.AbstractUriBindingFactory.prototype.addOperatorFactory = function(factory)
	{
		initialize.call(this);
		if (arguments.length > 1)
		{
			factory = new gc.databind.internal.expressionParser.OperatorList(arguments);
		}
		this._operatorFactories.push(factory);
	};
		
	gc.databind.internal.expressionParser.AbstractUriBindingFactory.prototype.addBraces = function(openingBrace, closingBrace)
	{
		initialize.call(this);
		// ensure parenthesis () are kept at front of list, because order matters.
		this._brackets.link = new Bracket(openingBrace, closingBrace, this._brackets.link);
	};
	
	gc.databind.internal.expressionParser.AbstractUriBindingFactory.prototype.parseLiteral = function(uri)
	{
		var result = gc.databind.internal.expressionParser.NumberLiteral.parseLiteral(uri);
		if (result === null)
		{
			result = gc.databind.internal.expressionParser.BooleanLiteral.parseLiteral(uri);
		}
		if (result === null)
		{
			result = gc.databind.internal.expressionParser.StringLiteral.parseLiteral(uri);
		}
		return result;
	};
	
	gc.databind.internal.expressionParser.AbstractUriBindingFactory.prototype.parseLookupExpression = function(uri, precedence)
	{
	    return this.parse(uri, precedence, true);  // skip getBinding() because we don't want lookup expressions in the bindingRegister. (true === isLookupBinding)
	};
		
	gc.databind.internal.expressionParser.AbstractUriBindingFactory.prototype.findFirstIndexOf = function(text, operator, startingPos)
	{
		var pos = startingPos;
		var len = operator.length-2;
		while(true)
		{
			pos = text.indexOf(operator, pos);
			if (pos > 0 && this._brackets.isInBracket(text, pos+len))
			{
				pos = pos + operator.length;
				if (pos >= text.length)
				{
					pos = -1;  // ran out of text, so indicate no match found.
					break;
				}
			}
			else
			{
				break;
			}
		}
		return pos;
	};
		
	gc.databind.internal.expressionParser.AbstractUriBindingFactory.prototype.findLastIndexOf = function(text, operator, includeOperator)
	{
		var pos = text.lastIndexOf(operator);
		var len = includeOperator ? operator.length-1 : -1;
		while(pos > 0 && this._brackets.isInBracket(text, pos+len))
		{
			pos = text.lastIndexOf(operator, pos - operator.length);
		}
		return pos;
	};
		
	gc.databind.internal.expressionParser.AbstractUriBindingFactory.prototype.findMatchingBrace = function(text, openingBrace, closingBrace)
	{
		var pos = -1;
		var nestedBracePos = -1;
		do 
		{
			pos = this.findFirstIndexOf(text, closingBrace, pos+1);
			nestedBracePos = this.findFirstIndexOf(text, openingBrace, nestedBracePos+1);
		}
		while (nestedBracePos >= 0 && pos > nestedBracePos);
		
		return pos;
	};
	
	var composerInvalidIdentifierErrorMessage = function(text, errDetailMessage, errMessageContext)
	{
		throw 'Invalid identifier found' + (errMessageContext || '') + ': "' + text + '".  To be honest, ' + errDetailMessage;
	};
	
	gc.databind.internal.expressionParser.AbstractUriBindingFactory.prototype.testIdentifier = function(text, errMessageContext)
	{
		if (!isDigit(text.charAt(0)))
		{
			var unexpectedCharacters = notIdentifierRegExp.exec(text);
			if (unexpectedCharacters !== null)
			{
				composerInvalidIdentifierErrorMessage(text, 'I was not expecting to find "' + unexpectedCharacters[0] + '".');
			}
		}
		else if (text.charAt(0) === '.')
		{
			composerInvalidIdentifierErrorMessage(text, 'I was not expecting it to begin with a period.');
		}
		else
		{
			composerInvalidIdentifierErrorMessage(text, 'I was not expecting it to begin with a number.');
		}
	};
	
	gc.databind.internal.expressionParser.AbstractUriBindingFactory.prototype.parse = function(uri, precedence, isLookupBinding)
	{
        if (uri === null || uri === undefined || uri.length === 0)
        {
            return null;
        }
        
        precedence = precedence || 0;
        
        var result = null;
        var unrecognizedText = notIdentifierRegExp.exec(uri);
            
        // parse operators first
        if (unrecognizedText !== null)
        {
            for(var i = precedence; i < this._operatorFactories.length && result === null; i++)
            {
                var operatorFactory = this._operatorFactories[i];
                result = operatorFactory.parse(uri, this, i);
            }
        }
        
        // no operators found, try parsing literal
        var literalErrorMessage = null;
        if (result === null)
        {
            try
            {
                result = this.parseLiteral(uri);
            }
            catch(e)
            {
                if (isDigit(uri.charAt(0)))
                {
                    // identifiers can't start with a digit, so re throw this exception.
                    // hopefully this error message will be more meaningful that the identifier error message. 
                    throw e;  
                }
                literalErrorMessage = e.toString();
            }
        }
        
        // try parsing config variable references
        if (result === null)
        {
            if (unrecognizedText === null)
            {
                result = this.bindValue(uri, isLookupBinding);
            }
            else
            {
                composeUnrecognizedIdentifier(unrecognizedText[0], literalErrorMessage);
            }
        }
		
		if (result && result.setIndex)
		{
			result.setIndex();  // kick start index lookups if parseLookupExpression returns a lookup operator.
		}
		return result;
	};
	
}());

/*****************************************************************
 * Copyright (c) 2013-2014 Texas Instruments and others
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
gc.databind.internal = gc.databind.internal || {};
gc.databind.internal.expressionParser = gc.databind.internal.expressionParser || {};

gc.databind.internal.expressionParser.AbstractLookupOperator = function(operator)
{
	this.operator = operator;
};

gc.databind.internal.expressionParser.AbstractLookupOperator.prototype = new gc.databind.ILookupBindValue(); 
	
gc.databind.internal.expressionParser.AbstractLookupOperator.Factory = function(operator)
{
	this.operator = operator;
};

gc.databind.internal.expressionParser.AbstractLookupOperator.Factory.prototype = new gc.databind.internal.expressionParser.IOperator.Factory();


gc.databind.internal.expressionParser.AbstractLookupOperator.Factory.prototype.testLookupBinding = function(lookupBinding)
{
	if (!(lookupBinding instanceof gc.databind.AbstractLookupBindValue || lookupBinding instanceof gc.databind.ILookupBindValue))
	{ 
		var text = this.operator === '()' ? "a function" : this.operator === "." ? "an object" : "an array";
		throw "'" + lookupBinding.getName() + "' is not " + text + " type.  It cannot be used with the " + this.operator + " operator."; 
	}
};
		
gc.databind.internal.expressionParser.AbstractLookupOperator.Factory.prototype.parse = function(uri, factory, precedence)
{
	var openingBrace = this.operator.charAt(0);
	var closingBrace = this.operator.charAt(1);
	
	var endPos = factory.findLastIndexOf(uri, closingBrace, true);
	if (endPos >= 0)
	{
		if (endPos === uri.length-1)
		{
			// valid lookup operation
			var pos = factory.findLastIndexOf(uri, openingBrace);
			if (pos === 0)
			{
				// literal array or just plain parentheses
				return this.parseLiteral(uri.substring(1, uri.length-1), factory, precedence);
			}
			else if (pos < 0)
			{
				// missing matching '[' or '(' operator.
				throw "I found a '" + closingBrace + "' operator, but I couldn't find the matching '" + openingBrace + "' operator.  " +
					"To be honest I was expecting one in the following text: " + uri.substring(0, endPos+1);
			}
			else if (pos === endPos - 1)
			{
				// empty middle paramenter
				throw "I found an empty operator '" + this.operator + "'.  To be honest, I was expecting to find something inside.";
			}
			else
			{
				// empty right paramenter, this is the normal case, nothing following the <expression>[].
				var arrayText = uri.substring(0, pos);
				var indexText = uri.substring(pos+1, endPos);
				
				if (arrayText === 'Q')
				{
				    return gc.databind.internal.expressionParser.QFunctionOperator.factory.parse(indexText, factory, 0);
				}

				// strip parenthesis (since we are not registering lookup bindings in binding Register)
				while(arrayText.charAt(0) === '(' && arrayText.charAt(arrayText.length-1) === ')')
				{
					precedence = 0; // reset precedence do to parentheses found
					arrayText = arrayText.substring(1, arrayText.length-1);
				}
				
				var lookupBinding = factory.parseLookupExpression(arrayText, precedence);  
				lookupBinding.setName(arrayText);
				this.testLookupBinding(lookupBinding);  // throw exception if invalid binding found.
				
				var indexBindings = [];
				
				var parameters = indexText.split(',');
				for(var i = 0; i < parameters.length; i++ )
				{
					var parameter = parameters[i];
					if (parameter.length === 0)
					{
						throw "Empty array index or function parameter.  " +
							"To be honest, I was expecting one or more parameters separated by commas, " +
							"but found that one of the parameters was empty in: " + indexText; 
					}
					
					var indexBinding = factory.parseExpression(parameter, 0);
					if (!indexBinding)
					{
                        throw 'Index binding "' + parameter +'" does not exist'; 
					}

					indexBindings.push(indexBinding);
				}
				
				var result = this.createOperator();
				result.lookupBinding = lookupBinding;
				result.indexBindings = indexBindings;
				
				for(var j = indexBindings.length; j-- > 0; )
				{
					// add listeners to index changes.
					indexBindings[j].addChangedListener(result);
				}
				return result;
			}
		}
		else if (uri.charAt(endPos+1) === '.' && endPos < uri.length-2)
		{
			// dot operator found
			return gc.databind.internal.expressionParser.DotOperator.factory.parse(uri, factory, precedence);
		}
		else // extra trailing text.
		{
			throw "I found an operator '" + this.operator + "' with unexpected characters following it.  " +
			"To be honest, I was not expecting to find another operator after the last '" + closingBrace  +
			" in the following text: " + uri.substring(endPos+1);
		}
	}
	return null;
};

gc.databind.internal.expressionParser.AbstractLookupOperator.Factory.prototype.parseLiteral = function()
{
};

gc.databind.internal.expressionParser.AbstractLookupOperator.Factory.prototype.getOperator = function()
{
	return this.operator;
};

gc.databind.internal.expressionParser.AbstractLookupOperator.prototype.addStreamingListener = function(listener)
{
    this.lookupBinding.addStreamingListener(listener);
};
        
gc.databind.internal.expressionParser.AbstractLookupOperator.prototype.removeStreamingListener = function(listener)
{
    this.lookupBinding.removeStreamingListener(listener);
};

gc.databind.internal.expressionParser.AbstractLookupOperator.prototype.addChangedListener = function(listener)
{
	this.lookupBinding.addChangedListener(listener);
};
		
gc.databind.internal.expressionParser.AbstractLookupOperator.prototype.removeChangedListener = function(listener)
{
	this.lookupBinding.removeChangedListener(listener);
};

gc.databind.internal.expressionParser.AbstractLookupOperator.prototype.getStatus = function()
{
	var status = this.lookupBinding.getStatus();
	for(var i = 0; status === null && i < this.indexBindings.length; i++)
	{
		status = this.indexBindings[i].getStatus();
	}
	return status;
};

gc.databind.internal.expressionParser.AbstractLookupOperator.prototype.setStatus = function(status)
{
	this.lookupBinding.setStatus(status);
};

gc.databind.internal.expressionParser.AbstractLookupOperator.prototype.addStatusListener = function(listener)
{
	this.lookupBinding.addStatusListener(listener);
	
	for(var i = this.indexBindings.length; i-- > 0; )
	{
		 this.indexBindings[i].addStatusListener(listener);
	}
};

gc.databind.internal.expressionParser.AbstractLookupOperator.prototype.removeStatusListener = function(listener)
{
	this.lookupBinding.removeStatusListener(listener);

	for(var i = this.indexBindings.length; i-- > 0; )
	{
		this.indexBindings[i].removeStatusListener(listener);
	}
};
		
gc.databind.internal.expressionParser.AbstractLookupOperator.prototype.dispose = function()
{
	if (this.lookupBinding.dispose !== undefined)
	{
		this.lookupBinding.dispose();
	}
	
	for(var i = this.indexBindings.length; i-- > 0; )
	{
		var indexBinding = this.indexBindings[i];
		indexBinding.removeChangedListener(this);
		if (indexBinding.dispose !== undefined)
		{
			indexBinding.dispose();
		}
	}
};
		
gc.databind.internal.expressionParser.AbstractLookupOperator.prototype.getType = function()
{
	return this.lookupBinding.getType();
};
		
gc.databind.internal.expressionParser.AbstractLookupOperator.prototype.isStale = function()
{
	var result = this.lookupBinding.isStale();
	
	for(var i = this.indexBindings.length; result === false && i-- > 0; )
	{
		result = this.indexBindings[i].isStale();
	}
	return result;
};
		
gc.databind.internal.expressionParser.AbstractLookupOperator.prototype.addStaleListener = function(listener)
{
	this.lookupBinding.addStaleListener(listener);
	
	for(var i = this.indexBindings.length; i-- > 0; )
	{
		this.indexBindings[i].addStaleListener(listener);
	}
};
		
gc.databind.internal.expressionParser.AbstractLookupOperator.prototype.removeStaleListener = function(listener)
{
	this.lookupBinding.removeStaleListener(listener);
	
	for(var i = this.indexBindings.length; i-- > 0; )
	{
		this.indexBindings[i].removeStaleListener(listener);
	}
};
		
gc.databind.internal.expressionParser.AbstractLookupOperator.prototype.isReadOnly = function()
{
	return this.lookupBinding.isReadOnly();
};
		
gc.databind.internal.expressionParser.AbstractLookupOperator.prototype.setName = function(name)
{
	this.fName = name;
};
		
gc.databind.internal.expressionParser.AbstractLookupOperator.prototype.getName = function() 
{
	return this.fName;
};

gc.databind.internal.expressionParser.AbstractLookupOperator.prototype.onStaleChanged = function()
{
	// remove listener
	this._staleIndexBinding.removeStaleListener(this);
	this._staleIndexBinding = undefined;
	
	// attempt to setIndex again
	this.setIndex.apply(this, this._cachedIndecies);
};

gc.databind.internal.expressionParser.AbstractLookupOperator.prototype.setIndex = function()
{
	var indecies = [];
	
	for(var i = 0; i < this.indexBindings.length; i++)
	{
		var indexBinding = this.indexBindings[i];
		if (indexBinding.isStale())
		{
			// postpone calling setIndex on lookupBinding until all indecies have 
			// non stale values.
			if (this._staleIndexBinding === undefined)
			{
				this._staleIndexBinding = indexBinding;
				indexBinding.addStaleListener(this);
			}
			this._cachedIndecies = arguments;
			return;
		}
		indecies.push(indexBinding.getValue());
	}
	for(i = 0; i < arguments.length; i++)
	{
		indecies.push(arguments[i]);
	}
	
	this.lookupBinding.setIndex.apply(this.lookupBinding, indecies);
};

gc.databind.internal.expressionParser.AbstractLookupOperator.prototype.getValue = function()
{
	return this.lookupBinding.getValue();
};

gc.databind.internal.expressionParser.AbstractLookupOperator.prototype.setValue = function(value, progress, forceWrite)
{
	this.lookupBinding.setValue(value, progress, forceWrite);
};

gc.databind.internal.expressionParser.AbstractLookupOperator.prototype.onValueChanged = function(oldValue, newValue, progress)
{
	this.setIndex();
};

gc.databind.internal.expressionParser.AbstractLookupOperator.prototype.toString = function()
{
	var result = this.lookupBinding.toString() + this.operator.charAt(0) + this.indexBindings[0].toString();
	
	for(var i = 1; i < this.indexBindings.length; i++)
	{
		result += ', ' + this.indexBindings[i].toString();
	}
	return result + this.operator.charAt(1);
};


/*****************************************************************
 * Copyright (c) 2013-2014 Texas Instruments and others
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
gc.databind.internal = gc.databind.internal || {};
gc.databind.internal.expressionParser = gc.databind.internal.expressionParser || {};

(function() 
{
	var OP = "+";
	
	gc.databind.internal.expressionParser.AdditionOperator = function()
	{
		gc.databind.internal.expressionParser.AbstractBinaryOperator.call(this);
	};
	
	gc.databind.internal.expressionParser.AdditionOperator.prototype = new gc.databind.internal.expressionParser.AbstractBinaryOperator(OP);
	
	gc.databind.internal.expressionParser.AdditionOperator.factory = (function()
	{
		var Factory = function()
		{
		};
		
		Factory.prototype = new gc.databind.internal.expressionParser.AbstractBinaryOperator.Factory(OP);
		
		Factory.prototype.createOperator = function()
		{
			return new gc.databind.internal.expressionParser.AdditionOperator();
		};
		
		return new Factory();
	}());

	gc.databind.internal.expressionParser.AdditionOperator.prototype.evalArray = function(left, right)
	{
		var result;
		
		if (left.length === 0)
		{
			result = right;
		}
		else if (right.length === 0)
		{
			result = left;
		}
		else
		{
			result = [];
			
			for(var i = 0; i < left.length; i++)
			{
				result.push(left[i]);
			}
			for(i = 0; i < right.length; i++)
			{
				result.push(right[i]);
			}
		}
		return result;
	};

	gc.databind.internal.expressionParser.AdditionOperator.prototype.evalString = 
		gc.databind.internal.expressionParser.AdditionOperator.prototype.evalNumber = function(left, right)
	{
		return left + right;
	};
	
	gc.databind.internal.expressionParser.AdditionOperator.prototype.doSetValue = function(value, constant, isLeftParamConstant)
	{
		var type = this.getType();
		if (type == "string")
		{
			var match = constant.toString();
			if (isLeftParamConstant)
			{
				if (value.indexOf(match) === 0)
				{
					return value.substring(match.length);
				}
			}
			else if (value.lastIndexOf(match) + match.length == value.length)
			{
				return value.substring(0, value.length- match.length);
			}
		}
		else if (type == "number")
		{
			return value - constant;
		}
		return value;
	};

}());

/*****************************************************************
 * Copyright (c) 2013-2014 Texas Instruments and others
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
gc.databind.internal = gc.databind.internal || {};
gc.databind.internal.expressionParser = gc.databind.internal.expressionParser || {};

(function()
{
	var OP = "~";
	gc.databind.internal.expressionParser.ArithmeticNotOperator = function()
	{
	};
	
	gc.databind.internal.expressionParser.ArithmeticNotOperator.prototype = new gc.databind.internal.expressionParser.AbstractUnaryOperator(OP);
	
	gc.databind.internal.expressionParser.ArithmeticNotOperator.factory = (function()
	{
		var Factory = function()
		{
		};
		
		Factory.prototype = new gc.databind.internal.expressionParser.AbstractUnaryOperator.Factory(OP);

		Factory.prototype.createOperator = function()
		{
			return new gc.databind.internal.expressionParser.ArithmeticNotOperator();
		};
		
		return new Factory();
	}());

	gc.databind.internal.expressionParser.ArithmeticNotOperator.prototype.evalNumber = function(value, write)
	{
		return ~value;
	};
}());

/*****************************************************************
 * Copyright (c) 2013-2014 Texas Instruments and others
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
gc.databind.internal = gc.databind.internal || {};
gc.databind.internal.expressionParser = gc.databind.internal.expressionParser || {};

(function() 
{
	var openingBracket = "[";
	var closingBracket = "]";
	var separator = ",";
	
	gc.databind.internal.expressionParser.ArrayLiteral = function(valueArray)
	{
		this.literalValue = valueArray;
	};
	
	gc.databind.internal.expressionParser.ArrayLiteral.prototype = new gc.databind.internal.expressionParser.AbstractLiteralBinding();
	
	gc.databind.internal.expressionParser.ArrayLiteral.prototype.getType = function()
	{
		return "array";
	};

	gc.databind.internal.expressionParser.ArrayLiteral.prototype.toString = function()
	{
		var text = openingBracket + this.literalValue.length === 0 ? '' : this.literalValue[0].toString();
		
		for(var i = 1; i < this.literalValue.length; i++)
		{
			text += separator + this.literalValue[i].toString();
		}
		
		return text + closingBracket;
	};
	
	gc.databind.internal.expressionParser.ArrayLiteral.parseLiteral = function(uri)
	{
		var values = uri.split(separator);
		
		if (values === null || values.length === 0)
		{
			return new gc.databind.internal.expressionParser.ArrayLiteral([]);
		}
		else if (values.length == 1)
		{
			return new gc.databind.internal.expressionParser.ArrayLiteral([values[0]]);
		}
		
		var numberLiterals = [];
		var stringLiterals = [];
		var booleanLiterals = [];
		
		for(var i = 0; i < values.length; i++)
		{
			var value = values[i].trim();
			if (value.length > 0)
			{
				stringLiterals.push(value);
				if (booleanLiterals !== undefined)
				{
					var booleanLiteral = gc.databind.internal.expressionParser.BooleanLiteral.parse(value);
					if (booleanLiteral !== null)
					{
						booleanLiterals.push(booleanLiteral);
					}
					else
					{
						booleanLiterals = undefined; 
					}
				}
				if (numberLiterals !== undefined)
				{
					var numberLiteral = gc.databind.internal.expressionParser.NumberLiteral.parse(value);
					if (numberLiteral !== null)
					{
						numberLiterals.push(numberLiteral);
					}
					else 
					{
						numberLiterals = undefined;
					}
				}
			}
			else
			{
				// empty item
				stringLiterals.push('');
				if (numberLiterals !== undefined)
				{
					numberLiterals.push(0);
				}
				if (booleanLiterals !== undefined)
				{
					booleanLiterals.push(false);
				}
			}
		}
	
		return new gc.databind.internal.expressionParser.ArrayLiteral(
				booleanLiterals || numberLiterals || stringLiterals);
	};
}());

/*****************************************************************
 * Copyright (c) 2013-2014 Texas Instruments and others
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
gc.databind.internal = gc.databind.internal || {};
gc.databind.internal.expressionParser = gc.databind.internal.expressionParser || {};

gc.databind.internal.expressionParser.BooleanLiteral = function(literal)
{
	this.literalValue = literal;
};

gc.databind.internal.expressionParser.BooleanLiteral.prototype = new gc.databind.internal.expressionParser.AbstractLiteralBinding();

gc.databind.internal.expressionParser.BooleanLiteral.prototype.toString = function()
{
	return literalValue.toString();
};

gc.databind.internal.expressionParser.BooleanLiteral.parse = function(literal)
{
	var upperCaseValue = literal.toUpperCase();
	if (upperCaseValue == "TRUE" || upperCaseValue == "FALSE")
	{
		return upperCaseValue == "TRUE";
	}
	return null;
};

gc.databind.internal.expressionParser.BooleanLiteral.parseLiteral = function(literal)
{
	var booleanValue = gc.databind.internal.expressionParser.BooleanLiteral.parse(literal);
	if (booleanValue !== null)
	{
		return new gc.databind.internal.expressionParser.BooleanLiteral(booleanValue);
	}
	return null;
};


/*****************************************************************
 * Copyright (c) 2013-2014 Texas Instruments and others
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
gc.databind.internal = gc.databind.internal || {};
gc.databind.internal.expressionParser = gc.databind.internal.expressionParser || {};

(function() 
{
	gc.databind.internal.expressionParser.StringLiteral = function(literal)
	{
		this.literalValue = literal.split("\\'").join(singleQuote);
		this.literalValue = this.literalValue.split("\\\\").join("\\");
	};

	gc.databind.internal.expressionParser.StringLiteral.prototype = new gc.databind.internal.expressionParser.AbstractLiteralBinding();
	
	var singleQuote = "'";
	
	gc.databind.internal.expressionParser.StringLiteral.prototype.toString = function()
	{
		return literalValue;
	};
	
	gc.databind.internal.expressionParser.StringLiteral.parseLiteral = function(uri)
	{
		if (uri.indexOf(singleQuote) === 0)
		{
			// find end pos skipping escaped quotes preceded by backslash character.
			
			var endPos = 0;
			var escaped;
			do
			{
				endPos = uri.indexOf(singleQuote, endPos+1);
				escaped = false;
				
				for(var i = endPos; i > 0 && uri.charAt(i-1) == '\\'; i-- )
				{
					escaped = !escaped;
				}
			}
			while(escaped);
			
			if (endPos <= 0)
			{
				gc.databind.internal.expressionParser.AbstractUriBindingFactory.composeMissingClosingBraceErrMsg(uri, "single quote");
			}
			else if (endPos != uri.length-1)
			{
				gc.databind.internal.expressionParser.AbstractUriBindingFactory.composeMissingOperatorErrMsg(uri.substring(endPos+1));
			}
			else
			{
				// strip quotes
				uri = uri.substring(1, uri.length-1);
				return new gc.databind.internal.expressionParser.StringLiteral(uri);
			}
		}
		return null;
	};
}());

/*****************************************************************
 * Copyright (c) 2013-2014 Texas Instruments and others
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
gc.databind.internal = gc.databind.internal || {};
gc.databind.internal.expressionParser = gc.databind.internal.expressionParser || {};

gc.databind.internal.expressionParser.NumberLiteral = function(literal)
{
	this.literalValue = literal;
};

gc.databind.internal.expressionParser.NumberLiteral.prototype = new gc.databind.internal.expressionParser.AbstractLiteralBinding();


gc.databind.internal.expressionParser.NumberLiteral.prototype.toString = function()
{
	return this.literalValue.toString();
};
	
gc.databind.internal.expressionParser.NumberLiteral.parse = function(literal)
{
	var value = Number(literal);
	if (!isNaN(value))
	{
		return value;
	}
	return null;
};

gc.databind.internal.expressionParser.NumberLiteral.parseLiteral = function(uri)
{
	var result = gc.databind.internal.expressionParser.NumberLiteral.parse(uri);
	return result === null ? null : new gc.databind.internal.expressionParser.NumberLiteral(result);
};

/*****************************************************************
 * Copyright (c) 2013-2014 Texas Instruments and others
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
gc.databind.internal = gc.databind.internal || {};
gc.databind.internal.expressionParser = gc.databind.internal.expressionParser || {};

(function() 
{
	var OP = '[]';
	
	gc.databind.internal.expressionParser.ArrayOperator = function(lookupBinding, indexBinding)
    {
        if (lookupBinding && indexBinding) 
        {
            this.lookupBinding = lookupBinding;
            this.indexBindings = [indexBinding];
                
            // add listener to index changes.
            indexBinding.addChangedListener(this);
        }
    };
    
	gc.databind.internal.expressionParser.ArrayOperator.prototype = new gc.databind.internal.expressionParser.AbstractLookupOperator(OP);

	gc.databind.internal.expressionParser.ArrayOperator.factory = (function() 
	{
		var Factory = function()
		{
		};
		
		Factory.prototype = new gc.databind.internal.expressionParser.AbstractLookupOperator.Factory(OP);
		
		Factory.prototype.createOperator = function()
		{
			return new gc.databind.internal.expressionParser.ArrayOperator();
		};
		
		Factory.prototype.parseLiteral = function(uri, factory, precedence)
		{
			return gc.databind.internal.expressionParser.ArrayLiteral.parseLiteral(uri);
		};
		
		return new Factory();
	}());
}());

/*****************************************************************
 * Copyright (c) 2013-2014 Texas Instruments and others
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
gc.databind.internal = gc.databind.internal || {};
gc.databind.internal.expressionParser = gc.databind.internal.expressionParser || {};

(function() 
{
	var operator = '()';
	
	gc.databind.internal.expressionParser.FunctionOperator = function()
	{
	};

	gc.databind.internal.expressionParser.FunctionOperator.prototype = new gc.databind.internal.expressionParser.AbstractLookupOperator(operator);

	gc.databind.internal.expressionParser.FunctionOperator.factory = (function() 
	{
		var Factory = function()
		{
		};
		
		Factory.prototype = new gc.databind.internal.expressionParser.AbstractLookupOperator.Factory(operator);

		Factory.prototype.createOperator = function()
		{
			return new gc.databind.internal.expressionParser.FunctionOperator();
		};
		
		Factory.prototype.parseLiteral = function(uri, factory, precedence)
		{
			return factory.parseExpression(uri, 0); // reset precedence to look for operators inside parentheses.
		};
		
		return new Factory();
	}());
}());

/*****************************************************************
 * Copyright (c) 2013-2014 Texas Instruments and others
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
gc.databind.internal = gc.databind.internal || {};
gc.databind.internal.expressionParser = gc.databind.internal.expressionParser || {};

gc.databind.internal.expressionParser.ConditionalOperator = function()
{
};

gc.databind.internal.expressionParser.ConditionalOperator.prototype = new gc.databind.IBindValue();

gc.databind.internal.expressionParser.ConditionalOperator.factory = (function()
{
	var openingBrace = "?";
	var closingBrace = ":";
	
	var Factory = function()
	{
	};
	
	Factory.prototype = new gc.databind.internal.expressionParser.IOperator.Factory();
	
	Factory.prototype.parse = function(uri, factory, precedence)
	{
		var pos = factory.findFirstIndexOf(uri, openingBrace, 0);
		if (pos === 0)
		{
			// empty condition paramenter
			throw "I found a '?' operator but nothing in front of it.  " +
				"To be honest, I was expecting to find something before the '?' in the following text: " + uri;
		}
		else if (pos > 0)
		{
			var conditionText = uri.substring(0, pos);
			var remainingText = uri.substring(pos + 1);
			
			pos = factory.findMatchingBrace(remainingText, openingBrace, closingBrace);
			
			if (pos < 0)  
			{
				// missing matching ':' operator.
				throw "I found a '?' operator, but I couldn't find the matching ':' operator.  " +
					"To be honest I was expecting one in the following text: " + remainingText;
			}
			else if (pos === 0)
			{
				// empty middle paramenter
				throw "I found a ':' imediately following a '?' operator.  To be honest, I was expecting to find something between them.";
			}
			else if (pos >= remainingText.length-1)
			{
				// empty right paramenter
				throw "I found a '?' operator a with matching ':', but nothing after the ':' operator.  " +
					"To be honest, I was expecting to find something after the ':' in the following text: " + remainingText;
			}
			else
			{
				var trueText = remainingText.substring(0, pos);
				var falseText = remainingText.substring(pos+1);
				
				var result = new gc.databind.internal.expressionParser.ConditionalOperator();
				
				result.condition = factory.parseExpression(conditionText, precedence);
				result.trueOperand = factory.parseExpression(trueText, precedence);
				result.falseOperand = factory.parseExpression(falseText, precedence);
				return result;
			}
		}
		return null;
	};
	
	Factory.prototype.getOperator = function()
	{
		return openingBrace;
	};

	return new Factory();
}());

gc.databind.internal.expressionParser.ConditionalOperator.prototype.addChangedListener = function(listener)
{
	this.condition.addChangedListener(listener);
	this.trueOperand.addChangedListener(listener);
	this.falseOperand.addChangedListener(listener);
};

gc.databind.internal.expressionParser.ConditionalOperator.prototype.removeChangedListener = function(listener)
{
	this.condition.removeChangedListener(listener);
	this.trueOperand.removeChangedListener(listener);
	this.falseOperand.removeChangedListener(listener);
};

gc.databind.internal.expressionParser.ConditionalOperator.prototype.addStatusListener = function(listener)
{
	this.condition.addStatusListener(listener);
	this.trueOperand.addStatusListener(listener);
	this.falseOperand.addStatusListener(listener);
};

gc.databind.internal.expressionParser.ConditionalOperator.prototype.removeStatusListener = function(listener)
{
	this.condition.removeStatusListener(listener);
	this.trueOperand.removeStatusListener(listener);
	this.falseOperand.removeStatusListener(listener);
};
	
gc.databind.internal.expressionParser.ConditionalOperator.prototype.dispose = function()
{
	if (this.condition.dispose !== undefined)
	{
		this.condition.dispose();
	}
	if (this.trueOperand.dispose !== undefined)
	{
		this.trueOperand.dispose();
	}
	if (this.falseOperand.dispose !== undefined)
	{
		this.falseOperand.dispose();
	}
};

var getConditionalBranch = function(self)
{
	var value = self.condition.getValue();
	
	return (value ? self.trueOperand : self.falseOperand);
};

gc.databind.internal.expressionParser.ConditionalOperator.prototype.getValue = function()
{
	return getConditionalBranch(this).getValue();
};
	
gc.databind.internal.expressionParser.ConditionalOperator.prototype.setValue = function(value, progress)
{
	getConditionalBranch(this).setValue(value, progress);
};
	
gc.databind.internal.expressionParser.ConditionalOperator.prototype.getType = function()
{
	return getConditionalBranch(this).getType();
};

gc.databind.internal.expressionParser.ConditionalOperator.prototype.getStatus = function()
{
	return getConditionalBranch(this).getStatus();
};

gc.databind.internal.expressionParser.ConditionalOperator.prototype.setStatus = function(status)
{
	getConditionalBranch(this).setStatus(status);
};

gc.databind.internal.expressionParser.ConditionalOperator.prototype.toString = function()
{
	return " ? " + this.trueOperand.toString() + " : " + this.falseOperand.toString();
};

gc.databind.internal.expressionParser.ConditionalOperator.prototype.isStale = function()
{
	return this.condition.isStale() || getConditionalBranch(this).isStale();
};

gc.databind.internal.expressionParser.ConditionalOperator.prototype.addStaleListener = function(listener)
{
	this.condition.addStaleListener(listener);
	this.trueOperand.addStaleListener(listener);
	this.falseOperand.addStaleListener(listener);
};

gc.databind.internal.expressionParser.ConditionalOperator.prototype.removeStaleListener = function(listener)
{
	this.condition.removeStaleListener(listener);
	this.trueOperand.removeStaleListener(listener);
	this.falseOperand.removeStaleListener(listener);
};

gc.databind.internal.expressionParser.ConditionalOperator.prototype.isReadOnly = function()
{
	return getConditionalBranch(this).isReadOnly();
};
	
gc.databind.internal.expressionParser.ConditionalOperator.prototype.setName = function(name)
{
	this.fName = name;
};
	
gc.databind.internal.expressionParser.ConditionalOperator.prototype.getName = function()
{
	return this.fName;
};

gc.databind.internal.expressionParser.ConditionalOperator.prototype.addStreamingListener = function(listener)
{
    var streamingOperand = getConditionalBranch(this);
    streamingOperand.addStreamingListener(listener);
    
    this.condition.addChangedListener(
        { 
            onValueChanged: function()
            {
                streamingOperand.removeStreamingListener(listener);
                streamingOperand = getConditionalBranch(this);
                streamingOperand.addStreamingListener(listener);
            }.bind(this)
       });
};

gc.databind.internal.expressionParser.ConditionalOperator.prototype.removeStreamingdListener = function(listener)
{
    this.trueOperand.removeChangedListener(listener);
    this.falseOperand.removeChangedListener(listener);
};


/*****************************************************************
 * Copyright (c) 2013-2014 Texas Instruments and others
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
gc.databind.internal = gc.databind.internal || {};
gc.databind.internal.expressionParser = gc.databind.internal.expressionParser || {};

(function() 
{
	gc.databind.internal.expressionParser.DivisionOperator = function()
	{
		gc.databind.internal.expressionParser.AbstractBinaryOperator.call(this);
	};
	
	var OP = "/";
	
	gc.databind.internal.expressionParser.DivisionOperator.prototype = new gc.databind.internal.expressionParser.AbstractBinaryOperator(OP);
	
	gc.databind.internal.expressionParser.DivisionOperator.factory = (function()
	{
		var Factory = function()
		{
		};
		
		Factory.prototype = new gc.databind.internal.expressionParser.AbstractBinaryOperator.Factory(OP);

		Factory.prototype.createOperator = function()
		{
			return new gc.databind.internal.expressionParser.DivisionOperator();
		};
		
		return new Factory();
	}());
	
	gc.databind.internal.expressionParser.DivisionOperator.prototype.evalNumber = function(left, right) 
	{
		return left / right;
	};
	
	gc.databind.internal.expressionParser.DivisionOperator.prototype.doSetValue = function(value, constant, isLeftParamConstant)
	{
		return isLeftParamConstant ? value / constant : value * constant; 
	};

	gc.databind.internal.expressionParser.DivisionOperator.prototype.getType = function()
	{
		return "number";
	};
}());
/*****************************************************************
 * Copyright (c) 2013-2014 Texas Instruments and others
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
gc.databind.internal = gc.databind.internal || {};
gc.databind.internal.expressionParser = gc.databind.internal.expressionParser || {};

gc.databind.internal.expressionParser.DotOperator = function(lookupBinding, fieldNameBinding)
{
	this.lookupBinding = lookupBinding;
	this.indexBindings = [ new gc.databind.internal.expressionParser.StringLiteral(fieldNameBinding) ];
};

gc.databind.internal.expressionParser.DotOperator.prototype = new gc.databind.internal.expressionParser.AbstractLookupOperator();

gc.databind.internal.expressionParser.DotOperator.prototype.toString = function()
{
	return this.lookupBinding.toString() + '.' + this.indexBinding[0];
};

gc.databind.internal.expressionParser.DotOperator.factory = (function()
{
	var Factory = function()
	{
	    this._qualifiers = new gc.databind.internal.QualifierFactoryMap();
	};
	
	Factory.prototype = new gc.databind.internal.expressionParser.AbstractLookupOperator.Factory('.');
	
	var createDotOperatorHelper = function(operandText)
	{
	    var leftOperand = this;
	    return (operandText.length > 1) ? new gc.databind.internal.expressionParser.DotOperator(leftOperand, operandText.substring(1)) : leftOperand;
    };
	
	Factory.prototype.parse = function(uri, factory, precedence)
	{
		// dot operator is only allowed after array or function syntax.  Otherwise it is just part of the identifier for the model binding.
		var pos = factory.findLastIndexOf(uri, '].', true);
		if (pos < 0)
		{
			pos = factory.findLastIndexOf(uri, ').', true);
		}
		
		if (pos > 0 && pos < uri.length-1) // can't be first or last character, because it's not a unary operator
		{
			pos++; 
			var operandText = uri.substring(0, pos);
			var leftOperand = factory.parseLookupExpression(operandText, precedence);
			leftOperand.setName(operandText);
			this.testLookupBinding(leftOperand);  // throw exception if invalid binding found.
			operandText = uri.substring(pos + this.operator.length);
			factory.testIdentifier(operandText, 'in dot operator field name');  // throws exception if invalid identifier.
			
			return this._qualifiers.parseQualifiers('.'+operandText, createDotOperatorHelper, leftOperand);
		}
		return null;
	};

	Factory.prototype.createOperator = function()
	{
		return new gc.databind.internal.expressionParser.DotOperator();
	};
	
	return new Factory();
}());

/*****************************************************************
 * Copyright (c) 2013-2014 Texas Instruments and others
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
gc.databind.internal = gc.databind.internal || {};
gc.databind.internal.expressionParser = gc.databind.internal.expressionParser || {};

(function() 
{
	var OP = "==";
	
	gc.databind.internal.expressionParser.EqualsOperator = function()
	{
		gc.databind.internal.expressionParser.AbstractComparisonOperator.call(this);
	};
	
	gc.databind.internal.expressionParser.EqualsOperator.prototype = new gc.databind.internal.expressionParser.AbstractComparisonOperator(OP);
	
	gc.databind.internal.expressionParser.EqualsOperator.factory = (function()
	{
		var Factory = function()
		{
		};
		
		Factory.prototype = new gc.databind.internal.expressionParser.AbstractComparisonOperator.Factory(OP);
		
		Factory.prototype.createOperator = function()
		{
			return new gc.databind.internal.expressionParser.EqualsOperator();
		};
		
		return new Factory();
	}());
	
	gc.databind.internal.expressionParser.EqualsOperator.prototype.evalNumber = 
		gc.databind.internal.expressionParser.EqualsOperator.prototype.evalBoolean = 
			gc.databind.internal.expressionParser.EqualsOperator.prototype.evalString = function(left, right)
	{
		return left == right;
	};
}());

/*****************************************************************
 * Copyright (c) 2013-2014 Texas Instruments and others
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
gc.databind.internal = gc.databind.internal || {};
gc.databind.internal.expressionParser = gc.databind.internal.expressionParser || {};

(function() 
{
	var OP = ">";
	
	gc.databind.internal.expressionParser.GreaterThanOperator = function()
	{
		gc.databind.internal.expressionParser.AbstractComparisonOperator.call(this);
	};
	
	gc.databind.internal.expressionParser.GreaterThanOperator.prototype = new gc.databind.internal.expressionParser.AbstractComparisonOperator(OP);
	
	gc.databind.internal.expressionParser.GreaterThanOperator.factory = (function()
	{
		var Factory = function()
		{
		};
		
		Factory.prototype = new gc.databind.internal.expressionParser.AbstractComparisonOperator.Factory(OP);

		Factory.prototype.createOperator = function()
		{
			return new gc.databind.internal.expressionParser.GreaterThanOperator();
		};
		
		return new Factory();
	}());
	
	gc.databind.internal.expressionParser.GreaterThanOperator.prototype.evalNumber = 
		gc.databind.internal.expressionParser.GreaterThanOperator.prototype.evalString = function(left, right)
	{
		return left > right;
	};
}());

/*****************************************************************
 * Copyright (c) 2013-2014 Texas Instruments and others
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
gc.databind.internal = gc.databind.internal || {};
gc.databind.internal.expressionParser = gc.databind.internal.expressionParser || {};

(function() 
{
	var OP = ">=";

	gc.databind.internal.expressionParser.GreaterThanOrEqualsOperator = function()
	{
		gc.databind.internal.expressionParser.AbstractComparisonOperator.call(this);
	};
	
	gc.databind.internal.expressionParser.GreaterThanOrEqualsOperator.prototype = new gc.databind.internal.expressionParser.AbstractComparisonOperator(OP);

	gc.databind.internal.expressionParser.GreaterThanOrEqualsOperator.factory = (function()
	{
		var Factory = function()
		{
		};
		
		Factory.prototype = new gc.databind.internal.expressionParser.AbstractComparisonOperator.Factory(OP);

		Factory.prototype.createOperator = function()
		{
			return new gc.databind.internal.expressionParser.GreaterThanOrEqualsOperator();
		};
		
		return new Factory();
	}());
	
	gc.databind.internal.expressionParser.GreaterThanOrEqualsOperator.prototype.evalNumber = 
		gc.databind.internal.expressionParser.GreaterThanOrEqualsOperator.prototype.evalString = function(left, right) 
	{
		return left >= right;
	};
}());

/*****************************************************************
 * Copyright (c) 2013-2014 Texas Instruments and others
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
gc.databind.internal = gc.databind.internal || {};
gc.databind.internal.expressionParser = gc.databind.internal.expressionParser || {};

(function()
{
	var OP = "<";
	
	gc.databind.internal.expressionParser.LessThanOperator = function()
	{
		gc.databind.internal.expressionParser.AbstractComparisonOperator.call(this);
	};
	
	gc.databind.internal.expressionParser.LessThanOperator.prototype = new gc.databind.internal.expressionParser.AbstractComparisonOperator(OP);

	gc.databind.internal.expressionParser.LessThanOperator.factory = (function()
	{
		var Factory = function()
		{
		};
		
		Factory.prototype = new gc.databind.internal.expressionParser.AbstractComparisonOperator.Factory(OP);

		Factory.prototype.createOperator = function()
		{
			return new gc.databind.internal.expressionParser.LessThanOperator();
		};
		
		return new Factory();
	}());
	
	gc.databind.internal.expressionParser.LessThanOperator.prototype.evalNumber = 
		gc.databind.internal.expressionParser.LessThanOperator.prototype.evalString = function(left, right)
	{
		return left < right;
	};
}());

/*****************************************************************
 * Copyright (c) 2013-2014 Texas Instruments and others
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
gc.databind.internal = gc.databind.internal || {};
gc.databind.internal.expressionParser = gc.databind.internal.expressionParser || {};

(function()
{
	var OP = "<=";
	
	gc.databind.internal.expressionParser.LessThanOrEqualsOperator = function()
	{
		gc.databind.internal.expressionParser.AbstractComparisonOperator.call(this);
	};
	
	gc.databind.internal.expressionParser.LessThanOrEqualsOperator.prototype = new gc.databind.internal.expressionParser.AbstractComparisonOperator(OP);
	
	gc.databind.internal.expressionParser.LessThanOrEqualsOperator.factory = (function()
	{
		var Factory = function()
		{
		};
		
		Factory.prototype = new gc.databind.internal.expressionParser.AbstractComparisonOperator.Factory(OP);
		
		Factory.prototype.createOperator = function()
		{
			return new gc.databind.internal.expressionParser.LessThanOrEqualsOperator();
		};
		
		return new Factory();
	}());
	
	gc.databind.internal.expressionParser.LessThanOrEqualsOperator.prototype.evalNumber = 
		gc.databind.internal.expressionParser.LessThanOrEqualsOperator.prototype.evalString = function(left, right) 
	{
		return left <= right;
	};
}());

/*****************************************************************
 * Copyright (c) 2013-2014 Texas Instruments and others
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
gc.databind.internal = gc.databind.internal || {};
gc.databind.internal.expressionParser = gc.databind.internal.expressionParser || {};

(function()
{
	var OP = "!=";
	
	gc.databind.internal.expressionParser.NotEqualsOperator = function()
	{
		gc.databind.internal.expressionParser.AbstractComparisonOperator.call(this);
	};
	
	gc.databind.internal.expressionParser.NotEqualsOperator.prototype = new gc.databind.internal.expressionParser.AbstractComparisonOperator(OP);
	
	gc.databind.internal.expressionParser.NotEqualsOperator.factory = (function()
	{
		var Factory = function()
		{
		};
		
		Factory.prototype = new gc.databind.internal.expressionParser.AbstractComparisonOperator.Factory(OP);

		Factory.prototype.createOperator = function()
		{
			return new gc.databind.internal.expressionParser.NotEqualsOperator();
		};
		
		return new Factory();
	}());
	
	gc.databind.internal.expressionParser.NotEqualsOperator.prototype.evalNumber = 
		gc.databind.internal.expressionParser.NotEqualsOperator.prototype.evalBoolean = 
			gc.databind.internal.expressionParser.NotEqualsOperator.prototype.evalString = function(left, right) 
	{
		return left != right;
	};
}());

/*****************************************************************
 * Copyright (c) 2013-2014 Texas Instruments and others
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
gc.databind.internal = gc.databind.internal || {};
gc.databind.internal.expressionParser = gc.databind.internal.expressionParser || {};

(function()
{
	var OP = "!";
	
	gc.databind.internal.expressionParser.LogicalNotOperator = function()
	{
	};
	
	gc.databind.internal.expressionParser.LogicalNotOperator.prototype = new gc.databind.internal.expressionParser.AbstractUnaryOperator(OP);
	
	gc.databind.internal.expressionParser.LogicalNotOperator.factory = (function()
	{
		var Factory = function()
		{
		};
		
		Factory.prototype = new gc.databind.internal.expressionParser.AbstractUnaryOperator.Factory(OP);
		
		Factory.prototype.createOperator = function()
		{
			return new gc.databind.internal.expressionParser.LogicalNotOperator();
		};
		
		return new Factory();
	}());

	gc.databind.internal.expressionParser.LogicalNotOperator.prototype.getType = function()
	{
		return "boolean";
	};

	gc.databind.internal.expressionParser.LogicalNotOperator.prototype.evalBoolean = function(value, write)
	{
		return !value; 
	};
	
	gc.databind.internal.expressionParser.LogicalNotOperator.prototype.evalNumber = function(value, write)
	{
		if (write)
		{
			return value ? 0 : 1;
		}
		return !value;
	};
}());
/*****************************************************************
 * Copyright (c) 2013-2014 Texas Instruments and others
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
gc.databind.internal = gc.databind.internal || {};
gc.databind.internal.expressionParser = gc.databind.internal.expressionParser || {};

(function()
{
	var OP = "&&";
	
	gc.databind.internal.expressionParser.LogicalAndOperator = function()
	{
		gc.databind.internal.expressionParser.AbstractComparisonOperator.call(this);
	};
	
	gc.databind.internal.expressionParser.LogicalAndOperator.prototype = new gc.databind.internal.expressionParser.AbstractComparisonOperator(OP);
	
	gc.databind.internal.expressionParser.LogicalAndOperator.factory = (function()
	{
		var Factory = function()
		{
		};
		
		Factory.prototype = new gc.databind.internal.expressionParser.AbstractComparisonOperator.Factory(OP);
		
		Factory.prototype.createOperator = function()
		{
			return new gc.databind.internal.expressionParser.LogicalAndOperator();
		};
		
		return new Factory();
	}());

	gc.databind.internal.expressionParser.LogicalAndOperator.prototype.evalBoolean = function(left, right)
	{
		return left && right;
	};
	
	gc.databind.internal.expressionParser.LogicalAndOperator.prototype.evalNumber = function(left, right)
	{
		return left != 0 && right != 0;
	};
	
}());

/*****************************************************************
 * Copyright (c) 2013-2014 Texas Instruments and others
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
gc.databind.internal = gc.databind.internal || {};
gc.databind.internal.expressionParser = gc.databind.internal.expressionParser || {};

(function()
{
	var OP = "||";
	
	gc.databind.internal.expressionParser.LogicalOrOperator = function()
	{
		gc.databind.internal.expressionParser.AbstractBinaryOperator.call(this);
	};
	
	gc.databind.internal.expressionParser.LogicalOrOperator.prototype = new gc.databind.internal.expressionParser.AbstractBinaryOperator(OP);
	
	gc.databind.internal.expressionParser.LogicalOrOperator.factory = (function()
	{
		var Factory = function()
		{
		};
		
		Factory.prototype = new gc.databind.internal.expressionParser.AbstractBinaryOperator.Factory(OP);
		
		Factory.prototype.createOperator = function()
		{
			return new gc.databind.internal.expressionParser.LogicalOrOperator();
		};
		
		return new Factory();
	}());

	gc.databind.internal.expressionParser.LogicalOrOperator.prototype.evalBoolean = function(left, right)
	{
		return left || right;
	};
	
	gc.databind.internal.expressionParser.LogicalOrOperator.prototype.evalNumber = function(left, right)
	{
		return left != 0 || right != 0;
	};
	
	gc.databind.internal.expressionParser.LogicalOrOperator.prototype.getType = function()
	{
		return "boolean";
	};
}());

/*****************************************************************
 * Copyright (c) 2013-2014 Texas Instruments and others
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
gc.databind.internal = gc.databind.internal || {};
gc.databind.internal.expressionParser = gc.databind.internal.expressionParser || {};

(function()
{
	var OP = "*";
	
	gc.databind.internal.expressionParser.MultiplicationOperator = function()
	{
		gc.databind.internal.expressionParser.AbstractBinaryOperator.call(this);
	};
	
	gc.databind.internal.expressionParser.MultiplicationOperator.prototype = new gc.databind.internal.expressionParser.AbstractBinaryOperator(OP);
	
	gc.databind.internal.expressionParser.MultiplicationOperator.factory = (function()
	{
		var Factory = function()
		{
		};
		
		Factory.prototype = new gc.databind.internal.expressionParser.AbstractBinaryOperator.Factory(OP);
		
		Factory.prototype.createOperator = function()
		{
			return new gc.databind.internal.expressionParser.MultiplicationOperator();
		};
		
		return new Factory();
	}());

	gc.databind.internal.expressionParser.MultiplicationOperator.prototype.evalNumber = function(left, right)
	{
		return left * right;
	};
	
	gc.databind.internal.expressionParser.MultiplicationOperator.prototype.doSetValue = function(value, constant, isLeftParamConstant)
	{
		return value / constant; 
	};

	gc.databind.internal.expressionParser.MultiplicationOperator.prototype.getType = function()
	{
		return "number";
	};

}());
/*****************************************************************
 * Copyright (c) 2013-2014 Texas Instruments and others
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
gc.databind.internal = gc.databind.internal || {};
gc.databind.internal.expressionParser = gc.databind.internal.expressionParser || {};

(function()
{
	var OP = "-";

	gc.databind.internal.expressionParser.NegationOperator = function()
	{
	};
	
	gc.databind.internal.expressionParser.NegationOperator.prototype = new gc.databind.internal.expressionParser.AbstractUnaryOperator(OP);
	
	gc.databind.internal.expressionParser.NegationOperator.factory = (function()
	{
		var Factory = function()
		{
		};
		
		Factory.prototype = new gc.databind.internal.expressionParser.AbstractUnaryOperator.Factory(OP);

		Factory.prototype.createOperator = function()
		{
			return new gc.databind.internal.expressionParser.NegationOperator();
		};
		
		return new Factory();
	}());

	gc.databind.internal.expressionParser.NegationOperator.prototype.evalNumber = function(value)
	{
		return -value;
	};
}());

/*****************************************************************
 * Copyright (c) 2013-2014 Texas Instruments and others
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
gc.databind.internal = gc.databind.internal || {};
gc.databind.internal.expressionParser = gc.databind.internal.expressionParser || {};

gc.databind.internal.expressionParser.OperatorList = function(args)
{
	this.samePrecedenceOperators = [];
	for(var i = 0; i < args.length; i++)
	{
		this.samePrecedenceOperators.push(args[i]);
	}
};

gc.databind.internal.expressionParser.OperatorList.prototype = new gc.databind.internal.expressionParser.IOperator.Factory();
	
gc.databind.internal.expressionParser.OperatorList.prototype.parse = function(uri, factory, precedence)
{
	// search for first operator from right to left order 
	var firstOperator = -1;
	var operator = null;
	for(var i = 0; i < this.samePrecedenceOperators.length; i++)
	{
		var parser = this.samePrecedenceOperators[i];
		var pos = factory.findLastIndexOf(uri, parser.getOperator());
		if (pos > firstOperator)
		{
			firstOperator = pos;
			operator = parser;
		}
	}
	if (operator !== null)
	{
		return operator.parse(uri, factory, precedence);
	}
	return null;
};

gc.databind.internal.expressionParser.OperatorList.prototype.getOperator = function()
{
	return this.samePrecedenceOperators.get(0).getOperator();
};


/*****************************************************************
 * Copyright (c) 2013-2014 Texas Instruments and others
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
gc.databind.internal = gc.databind.internal || {};
gc.databind.internal.expressionParser = gc.databind.internal.expressionParser || {};

(function()
{
	var OP = "%";
	
	gc.databind.internal.expressionParser.RemainderOperator = function()
	{
		gc.databind.internal.expressionParser.AbstractBinaryOperator.call(this);
	};
	
	gc.databind.internal.expressionParser.RemainderOperator.prototype = new gc.databind.internal.expressionParser.AbstractBinaryOperator(OP);
	
	gc.databind.internal.expressionParser.RemainderOperator.factory = (function()
	{
		var Factory = function()
		{
		};
		
		Factory.prototype = new gc.databind.internal.expressionParser.AbstractBinaryOperator.Factory(OP);
		
		Factory.prototype.createOperator = function()
		{
			return new gc.databind.internal.expressionParser.RemainderOperator();
		};
		
		return new Factory();
	}());
	
	gc.databind.internal.expressionParser.RemainderOperator.prototype.evalNumber = function(left, right)
	{
		return left % right;
	};
	
	gc.databind.internal.expressionParser.DivisionOperator.prototype.getType = function()
	{
		return "number";
	};
	
}());

/*****************************************************************
 * Copyright (c) 2013-2014 Texas Instruments and others
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
gc.databind.internal = gc.databind.internal || {};
gc.databind.internal.expressionParser = gc.databind.internal.expressionParser || {};

(function()
{
	var OP = "-";
	
	gc.databind.internal.expressionParser.SubtractionOperator = function()
	{
		gc.databind.internal.expressionParser.AbstractBinaryOperator.call(this);
	};
	
	gc.databind.internal.expressionParser.SubtractionOperator.prototype = new gc.databind.internal.expressionParser.AbstractBinaryOperator(OP);
	
	gc.databind.internal.expressionParser.SubtractionOperator.factory = (function()
	{
		var Factory = function()
		{
		};
		
		Factory.prototype = new gc.databind.internal.expressionParser.AbstractBinaryOperator.Factory(OP);
		
		Factory.prototype.createOperator = function()
		{
			return new gc.databind.internal.expressionParser.SubtractionOperator();
		};
		
		return new Factory();
	}());
	
	gc.databind.internal.expressionParser.SubtractionOperator.prototype.evalNumber = function(left, right)
	{
		return left - right;
	};
	
	gc.databind.internal.expressionParser.SubtractionOperator.prototype.doSetValue = function(value, constant, isLeftParamConstant)
	{
		return isLeftParamConstant ? constant - value : value + constant; 
	};

	gc.databind.internal.expressionParser.SubtractionOperator.prototype.getType = function()
	{
		return "number";
	};
	
}());
/*****************************************************************
 * Copyright (c) 2013-2014 Texas Instruments and others
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
gc.databind.internal = gc.databind.internal || {};
gc.databind.internal.expressionParser = gc.databind.internal.expressionParser || {};

gc.databind.internal.expressionParser.ExpressionParser = function(bindingProvider)
{
	this.bindProvider = bindingProvider;
	
	// add brackets that exclude operators
	this.addBraces('[', ']');  // array operator
	this.addBraces("'", "'"); // string literal single quotes
	
	// add operator factories for parser here in reverse precedence order
	// Priority 13: conditional ?: operator
	this.addOperatorFactory(gc.databind.internal.expressionParser.ConditionalOperator.factory);
	
	// Priority 12: logical or || operator.
	this.addOperatorFactory(gc.databind.internal.expressionParser.LogicalOrOperator.factory);
	
	// Priority 11: logical and && operator.
	this.addOperatorFactory(gc.databind.internal.expressionParser.LogicalAndOperator.factory);
	
	// Priority 10: bit wise or | operator.
	// Priority 9: bit wise xor ^ operator.
	// Priority 8: bit wise and & operator.
	// Priority 7: equality == and != operators
	this.addOperatorFactory(
			gc.databind.internal.expressionParser.EqualsOperator.factory,
			gc.databind.internal.expressionParser.NotEqualsOperator.factory);
	
	// Priority 6: comparison >, >=, <, <= operators
	this.addOperatorFactory(
			gc.databind.internal.expressionParser.GreaterThanOrEqualsOperator.factory,
			gc.databind.internal.expressionParser.LessThanOrEqualsOperator.factory,
			gc.databind.internal.expressionParser.GreaterThanOperator.factory,
			gc.databind.internal.expressionParser.LessThanOperator.factory);

	// Priority 5: shift >>, <<, >>> operators
	// Priority 4: arithmetic +, - operators
	this.addOperatorFactory(
			gc.databind.internal.expressionParser.AdditionOperator.factory,
			gc.databind.internal.expressionParser.SubtractionOperator.factory);
	
	// Priority 3: arithmetic *, /, % operators
	this.addOperatorFactory(
			gc.databind.internal.expressionParser.MultiplicationOperator.factory,
			gc.databind.internal.expressionParser.DivisionOperator.factory,
			gc.databind.internal.expressionParser.RemainderOperator.factory);
	
	// Priority 2: unary operators
	this.addOperatorFactory(
			gc.databind.internal.expressionParser.NegationOperator.factory, 
			gc.databind.internal.expressionParser.ArithmeticNotOperator.factory,
			gc.databind.internal.expressionParser.LogicalNotOperator.factory);

	// Priority 1: array index [] operator, and function() operator
	this.addOperatorFactory(gc.databind.internal.expressionParser.ArrayOperator.factory);
	this.addOperatorFactory(gc.databind.internal.expressionParser.FunctionOperator.factory);
};

gc.databind.internal.expressionParser.ExpressionParser.prototype = new gc.databind.internal.expressionParser.AbstractUriBindingFactory();

gc.databind.internal.expressionParser.ExpressionParser.prototype.bindValue = function(uri, isLookupBinding)
{
	if (uri.length === 0)
	{
		throw "Empty Param";
	}
	
	var modelFactory;
	var pos = uri.indexOf('.');
	if (pos > 0)
	{
		var modelName = uri.substring(0, pos);
		if (modelName === 'widget' || modelName ==='$')
		{
		    var endPos = uri.indexOf('.', pos+1);
		    if (endPos > 0)
		    {
		        var widgetModelName = uri.substring(pos+1, endPos);
		        if (this.bindProvider.getModel(widgetModelName))
		        {
		            modelName = widgetModelName;
		            pos = endPos;
		        }
		    }
		}
		
	    modelFactory = this.bindProvider.getModel(modelName);

	    if (modelFactory !== null && modelFactory !== undefined)
	    {
	        uri = uri.substring(pos+1);
	    }
	}

    modelFactory = modelFactory || this.bindProvider.getModel();
    if (modelFactory)
    {
        if (isLookupBinding)
        {
            return modelFactory.createNewBind(uri);  
        }
        return modelFactory.parseModelBinding(uri);
	}
    else
    {
        throw "There is no default model for bindings";
    }
};

gc.databind.internal.expressionParser.ExpressionParser.prototype.parseExpression = function(expression, precedence)
{
	return this.bindProvider.getBinding(expression, precedence);
};

/*****************************************************************
 * Copyright (c) 2017 Texas Instruments and others
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
gc.databind.internal = gc.databind.internal || {};
gc.databind.internal.expressionParser = gc.databind.internal.expressionParser || {};

(function()
{
	gc.databind.internal.expressionParser.QFunctionOperator = function()
	{
		gc.databind.internal.expressionParser.AbstractBinaryOperator.call(this);
	};
	
	gc.databind.internal.expressionParser.QFunctionOperator.prototype = new gc.databind.internal.expressionParser.AbstractBinaryOperator('Q()');
	
    gc.databind.internal.expressionParser.QFunctionOperator.factory = (function()
    {
        var Factory = function()
        {
        };
        
        Factory.prototype = new gc.databind.internal.expressionParser.AbstractBinaryOperator.Factory(',');

        Factory.prototype.parse = function(uri, factory, precedence)
        {
            var pos = factory.findFirstIndexOf(uri, ',');
            if (pos <= 0 || pos >= uri.length-1 || pos !== factory.findLastIndexOf(uri, ','))
            {
                throw "Invalid number of paramters for Q() function.  The Q() function requires two and only two parameters separated by a single comma."; 
            }
            
            var operandText = uri.substring(0, pos);
            var leftOperand = factory.parseExpression(operandText, precedence);
            operandText = uri.substring(pos + this.operator.length); 
            var rightOperand = factory.parseExpression(operandText, precedence);
            
            var result = this.createOperator();
            result.leftOperand = leftOperand;
            result.rightOperand = rightOperand;
            return result;
        };
        
        Factory.prototype.createOperator = function()
        {
            return new gc.databind.internal.expressionParser.QFunctionOperator();
        };
        
        return new Factory();
    }());

	gc.databind.internal.expressionParser.AbstractBinaryOperator.prototype.getType = function()
	{
		return "number";
	};
	
	var formatValue = function(value, q)
	{
        if (isNaN(value))
        {
            return value;
        }
        if (isNaN(q))
        {
            return q;
        }
        
        return value / (Math.pow(2, q));
	};
	
	var unFormatValue = function(value, q)
	{
        if (isNaN(q))
        {
            value = q;
        }
        else if (!isNaN(value))
        {
            value = Math.round(value * Math.pow(2, q));
        }
        return value;
	};
	
	gc.databind.internal.expressionParser.QFunctionOperator.prototype.getValue = function()
	{
		var value = +this.leftOperand.getValue();
		var q = +this.rightOperand.getValue();
		
		return formatValue(value, q);
	};
	
	gc.databind.internal.expressionParser.QFunctionOperator.prototype.setValue = function(newValue, progress)
	{
		newValue = +newValue;
		var q = +this.rightOperand.getValue();
		
		this.leftOperand.setValue(unFormatValue(newValue, q), progress);
	};
	
	gc.databind.internal.expressionParser.QFunctionOperator.prototype.toString = function()
	{
	    return 'Q(' + this.leftOperand.toString() + ', ' + this.rightOperand.toString() + ')';
	};
	
	gc.databind.DataConverter.register({ convert: formatValue }, 'q');
	gc.databind.DataConverter.register({ convert: unFormatValue }, 'number', 'q');
	
	var QFormatQualifierFactory = function(bind, qValue)
	{
	    var result = new gc.databind.internal.expressionParser.QFunctionOperator();
	    result.leftOperand = bind;
	    result.rightOperand = new gc.databind.internal.expressionParser.NumberLiteral(+qValue);
	    return result;
	};
	
    gc.databind.internal.QualifierFactoryMap.add('q', QFormatQualifierFactory);

}());
/*******************************************************************************
 * Copyright (c) 2013-2014 Texas Instruments and others All rights reserved.
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v1.0 which accompanies this distribution,
 * and is available at http://www.eclipse.org/legal/epl-v10.html
 * 
 * Contributors: Paul Gingrich, Dobrin Alexiev - Initial API and implementation
 ******************************************************************************/
var gc = gc || {};
gc.databind = gc.databind || {};
gc.databind.internal = gc.databind.internal || {};

(function()
{
    var StreamingListener = function(srcBinding, destBinding, computeValue)
    {
        this.srcBinding = srcBinding;
        this.destBinding = destBinding;
        this.computeValue = computeValue;
    };

    StreamingListener.prototype.enable = function()
    {
        this.srcBinding.addStatusListener(this);
        this.srcBinding.addStreamingListener(this);
    };

    StreamingListener.prototype.disable = function()
    {
        this.srcBinding.removeStatusListener(this);
        this.srcBinding.removeStreamingListener(this);
    };

    StreamingListener.prototype.onStatusChanged = function(status)
    {
        this.destBinding.setStatus(status);
    };

    StreamingListener.prototype.onDataReceived = function(newValue)
    {
        newValue = this.srcBinding.getValue();  // always calculate new value in case srcBinding is an expression that needs to be evaluated.
        var srcType = this.srcBinding.getType();
        if (this.computeValue)
        {
            newValue = this.computeValue(newValue);
            srcType = undefined;
        }
        newValue = gc.databind.DataConverter.convert(newValue, srcType, this.destBinding.getType());
        this.destBinding.onStreamingDataReceived(newValue);
    };

    StreamingListener.prototype.onValueChanged = function()
    {
    };
    
    StreamingListener.prototype.getStatus = function()
    {
        return this.srcBinding.getStatus();
    };
    
    StreamingListener.prototype.dispose = function(bindings)
    {
        bindings[this.srcBinding.getName()] = undefined;
        bindings[this.destBinding.getName()] = undefined;
    };

    var BindingListener = function(srcBinding, destBinding, computeValue)
    {
        this.srcBinding = srcBinding;
        this.destBinding = destBinding;
        this.computeValue = computeValue;
    };

    BindingListener.prototype = new gc.databind.BindListenerAdapter();

    BindingListener.prototype.onValueChanged = function(prevValue, nextValue, progress)
    {
        if (this.srcBinding.isStale())
        {
            // defer passing the data along until the value has fully changed.
            this.srcBinding.addStaleListener(this);
        }
        else
        {
            var newValue = this.srcBinding.getValue();
            var oldValue = this.destBinding.getValue();

            var srcType = this.srcBinding.getType();
            if (this.computeValue)
            {
                newValue = this.computeValue(newValue);
                srcType = undefined;
            }
            var destType = this.destBinding.getType();

            // protect against writing back values changed solely due to their
            // conversion to and back again.
            if (newValue != gc.databind.DataConverter.convert(oldValue, destType, srcType))
            {
                newValue = gc.databind.DataConverter.convert(newValue, srcType, destType);
                this.destBinding.setValue(newValue, progress);
            }
        }
    };

    BindingListener.prototype.onStatusChanged = function(status)
    {
        this.destBinding.setStatus(status);
    };

    BindingListener.prototype.onStaleChanged = function(isStale)
    {
        if (!this.srcBinding.isStale())
        {
            this.srcBinding.removeStaleListener(this);
            this.onValueChanged(); // force the value to be synced
        }
    };

    BindingListener.prototype.enable = function()
    {
        this.srcBinding.addStatusListener(this);
        this.srcBinding.addChangedListener(this);
    };

    BindingListener.prototype.disable = function()
    {
        this.srcBinding.removeStatusListener(this);
        this.srcBinding.removeChangedListener(this);
    };

    BindingListener.prototype.getStatus = function()
    {
        return this.srcBinding.getStatus();
    };
    
    BindingListener.prototype.dispose = function(bindings)
    {
        bindings[this.srcBinding.getName()] = undefined;
        bindings[this.destBinding.getName()] = undefined;
    };

    var nullListener = new gc.databind.BindListenerAdapter();
    nullListener.enable = function()
    {
    };
    nullListener.disable = function()
    {
    };
    nullListener.dispose = function()
    {
    };

    var createListener = function(srcBinding, targetBinding, computeValue)
    {
        if (srcBinding.addStreamingListener && targetBinding.onStreamingDataReceived)
        {
            return new StreamingListener(srcBinding, targetBinding, computeValue);
        }
        else
        {
            return new BindingListener(srcBinding, targetBinding, computeValue);
        }
    };

    var Binder = function(targetBinding, modelBinding, getter, setter)
    {
        // support for readOnly bindings, don't write values.
        if (getter && !setter)
        {
            this.targetListener = nullListener;
            this.modelListener = createListener(modelBinding, targetBinding, getter);
        }
        else if (setter && !getter)
        {
            // switch model and target, so model gets initialized from the
            // target.
            this.targetListener = nullListener;
            this.modelListener = createListener(targetBinding, modelBinding, setter);
        }
        else
        // two-way binding support (with both getter or setter, or neither
        // getter or setter (no computation)
        {
            this.targetListener = createListener(targetBinding, modelBinding, setter);
            this.modelListener = createListener(modelBinding, targetBinding, getter);
        }
    };

    Binder.prototype = new gc.databind.IDataBinder();

    Binder.prototype.enable = function(enable)
    {
        if (enable === undefined)
        {
            return this._enabled;
        }
        else if (this._enabled != enable)
        {
            this._enabled = enable;

            if (enable)
            {
                this.targetListener.enable();
                this.modelListener.enable();

                // force model to sync the target value in case it changed
                // between disable() and subsequent enable() calls.
                this.modelListener.onValueChanged();

                // force status to be reflected in target as it now is in the
                // model, in case it change between time.
                this.modelListener.onStatusChanged(this.modelListener.getStatus());
            }
            else
            {
                this.targetListener.disable();
                this.modelListener.disable();
            }
            return this;
        }
    };

    Binder.prototype.dispose = function(bindings) 
    {
        this.enable(false);
        if (bindings && typeof bindings === 'object') 
        {
            this.modelListener.dispose(bindings);
            this.targetListener.dispose(bindings);
        }
    };
    
    gc.databind.internal.DataBinder = function()
    {
    };

    gc.databind.internal.DataBinder.bind = function(targetBinding, modelBinding, getter, setter)
    {
        if ((targetBinding !== null && modelBinding !== null) && 
            (targetBinding instanceof gc.databind.IBindValue || targetBinding instanceof gc.databind.AbstractBindValue) && 
            (modelBinding instanceof gc.databind.IBindValue || modelBinding instanceof gc.databind.AbstractBindValue))
        {
            var binder = new Binder(targetBinding, modelBinding, getter, setter);
            binder.enable(true);

            return binder;
        }
        ti_logger.error(gc.databind.name, "Cannot bind target and model bindings together because one of them is not an IBindValue.");
        return null;
    };
}());
/*******************************************************************************
 * Copyright (c) 2015 Texas Instruments and others All rights reserved. This
 * program and the accompanying materials are made available under the terms of
 * the Eclipse Public License v1.0 which accompanies this distribution, and is
 * available at http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors: Paul Gingrich - Initial API and implementation
 ******************************************************************************/
var gc = gc || {};
gc.widget = gc.widget || {};
gc.widget.internal = gc.widget.internal || {};

(function()
{

    gc.widget.internal.StatusIndicator = function(targetWidget, locationHint)
    {
        this.messages =
        {
            error : [],
            warning : [],
            information : []
        };
        this.targetWidget = targetWidget;
        this.locationHint = locationHint;
    };

    gc.widget.internal.StatusIndicator.prototype = new gc.widget.IStatusIndicator();

    var addVisibleListener = function(targetWidget, statusWidget)
    {
        var observer = new MutationObserver(function(mutations)
        {
            mutations.forEach(function(mutation)
            {
                if (targetWidget.style.display === 'none' || targetWidget.style.visibility === 'hidden')
                {
                    statusWidget.style.visibility = 'hidden';
                }
                else
                {
                    statusWidget.style.visibility = 'visible';
                }
            });
        });
        observer.observe(targetWidget,
        {
            attributes : true,
            attributeFilter :
            [
                'style'
            ]
        });
        return observer;
    };

    var createStatusWidget = function(elem, message, type, locationHint)
    {
        var parentElem = Polymer.dom ? Polymer.dom(elem).parentNode : elem.parentElement;
        var elemStyle = getComputedStyle(elem);
        var positionStyle = elemStyle.position;
        var styles = null;
        if (parentElem && positionStyle)
        {
            var div = document.createElement('div');
            if (positionStyle === 'absolute')
            {
                // calculate relative size and position in pixels w.r.t parent
                // element.
                var elemRect =
                {
                    left : elem.offsetLeft,
                    right : elem.clientWidth + elem.offsetLeft,
                    top : elem.offsetTop,
                    bottom : elem.clientHeight + elem.offsetTop
                };

                // set styles including position
                styles = getRelativeIndicatorPosition(elemRect, locationHint);
                styles.divStyle = 'position: absolute; ' + styles.divStyle;
            }
            else if (positionStyle === 'static' || positionStyle === 'relative')
            {
                styles =
                {
                    divStyle : 'position: relative; ',
                    imgStyle : 'left: 0px; top: 0px;'
                };
            }
            else
            // 'fixed'
            {
                styles = getRelativeIndicatorPosition(elem.getBoundingClientRect(), locationHint);
                styles.divStyle = 'position: fixed; ' + styles.divStyle;
            }
            div.setAttribute('style', styles.divStyle + 'overflow: visible; display: inline-block');

            var img = document.createElement('img');
            img.src = getStatusIndicatorIcon(type, elem);
            img.setAttribute('style', 'position: absolute; width: 0.8em; height: 0.8em; z-index:275;' + styles.imgStyle);
            img.setAttribute('title', message);

            div.appendChild(img);
            if (gc && !gc.designer)
            {
                // don't show status indicators in designer, because the
                // indicator becomes part of the gist.
                parentElem.insertBefore(div, elem);
            }

            return div;
        }
        return null;
    };

    gc.widget.internal.StatusIndicator.prototype.addMessage = function(newMessage, type)
    {
        type = type || gc.widget.StatusIndicatorType.ERROR;
        if (newMessage && newMessage.length > 0)
        {
            this.removeMessage(newMessage, true);
            this.messages[type].push(newMessage);

            if (this.statusWidget)
            {
                updateStatusIndication(getStatusMessage(this.messages), this.statusWidget);
            }
            else
            {
                this.statusWidget = createStatusWidget(this.targetWidget, newMessage, type, this.locationHint);
                if (this.statusWidget)
                {
                    this.visibilityObserver = addVisibleListener(this.targetWidget, this.statusWidget);
                }
            }
        }
    };

    var updateStatusIndication = function(nextMessage, statusWidget)
    {
        if (statusWidget && nextMessage)
        {
            var img = statusWidget.children[0];
            if (img && img.title != nextMessage.message)
            {
                // update the status text with new message.
                img.title = nextMessage.message;
                var iconLocation = getStatusIndicatorIcon(nextMessage.type);
                if (img.src.indexOf(iconLocation) < 0)
                {
                    img.src = iconLocation;
                }
            }
        }
    };

    var statusTypes =
    [
        gc.widget.StatusIndicatorType.ERROR, gc.widget.StatusIndicatorType.WARNING, gc.widget.StatusIndicatorType.INFO
    ];
    var getStatusMessage = function(messages)
    {
        var newMessage;

        for (var i = 0; i < statusTypes.length; i++)
        {
            var statusType = statusTypes[i];
            var messageList = messages[statusType];
            if (messageList && messageList.length > 0)
            {
                return (
                {
                    message : messageList[messageList.length - 1],
                    type : statusType
                });
            }
        }
        return null;
    };

    gc.widget.internal.StatusIndicator.prototype.removeMessage = function(oldMessage, preventUpdate)
    {
        if (!oldMessage || oldMessage.length === 0)
        {
            return;
        }

        for (var i = 0; i < statusTypes.length; i++)
        {
            var statusType = statusTypes[i];
            var messageList = this.messages[statusType];
            for (var j = messageList.length; j-- > 0;)
            {
                if (messageList[j] === oldMessage)
                {
                    messageList.splice(j, 1);

                    if (!preventUpdate)
                    {
                        var nextMessage = getStatusMessage(this.messages);
                        if (nextMessage)
                        {
                            updateStatusIndication(nextMessage, this.statusWidget);
                        }
                        else
                        // no more status messages, so lets get rid or the
                        // status indicator widget.
                        {
                            var parentElem = this.statusWidget && this.statusWidget.parentElement;
                            if (parentElem)
                            {
                                parentElem.removeChild(this.statusWidget);
                            }
                            if (this.visibilityObserver)
                            {
                                this.visibilityObserver.disconnect();
                            }
                            this.visibilityObserver = undefined;
                            this.statusWidget = undefined;
                        }
                    }
                }
            }
        }
    };

    var getRelativeIndicatorPosition = function(rect, hint)
    {
        hint = hint || 'middle-left';
        var divStyle = "";
        var imgStyle = "";
        var edge = false;

        var fields = hint.split('-');
        if (fields.length != 2)
        {
            fields =
            [
                'left', 'middle'
            ];
        }
        for (var i = 0; i < 2; i++)
        {
            switch (fields[i].trim().toLowerCase())
            {
                // horizontal positions
                case 'left':
                    divStyle += 'left: ' + rect.left + 'px; ';
                    imgStyle += (edge ? 'left: 0px; ' : 'right: 0px; ');
                    edge = true;
                    break;
                case 'right':
                    divStyle += 'left: ' + rect.right + 'px; ';
                    imgStyle += (edge ? 'right :0px;' : 'left :0px; ');
                    edge = true;
                    break;
                case 'center':
                    divStyle += 'left: ' + (rect.left + rect.right) / 2 + 'px; ';
                    imgStyle += 'left: -0.4em; ';
                    break;
                // vertical positions
                case 'top':
                    divStyle += 'top: ' + rect.top + 'px; ';
                    imgStyle += (edge ? 'top: 0px; ' : 'bottom: 0px; ');
                    edge = true;
                    break;
                case 'bottom':
                    divStyle += 'top: ' + rect.bottom + 'px; ';
                    imgStyle += (edge ? 'bottom: 0px;' : 'top: 0px; ');
                    edge = true;
                    break;
                case 'middle':
                    divStyle += 'top: ' + (rect.top + rect.bottom) / 2 + 'px; ';
                    imgStyle += 'top: -0.4em; ';
                    break;
                default:
                    ti_logger.error(gc.databind.name, 'Invalid position found in status indicator location hint = ' + hint);
                    break;
            }
        }
        return (
        {
            divStyle : divStyle,
            imgStyle : imgStyle
        });
    };

    var getStatusIndicatorIcon = function(type, elem)
    {
        var result = 'components/ti-core-databind/images/' + type + '.png';
        var widget = document.querySelector('ti-core-stylesheets') || elem;
        if (widget) {
            result = widget.resolveUrl('../ti-core-databind/images/' + type + '.png');
        }
        return encodeURI(result);
    };

    var activeStatusIndicators = {};
    gc.widget.internal.StatusIndicator.factory =
    {
        get : function(widget)
        {
            var statusIndicator = activeStatusIndicators[widget.id];
            if (statusIndicator === undefined)
            {
                if (widget)
                {
                    var locationHint = widget._statusIndicatorLocationHint;
                    if (locationHint && typeof locationHint === 'function')
                    {
                        locationHint = locationHint.call(widget);
                    }
                    statusIndicator = new gc.widget.internal.StatusIndicator(widget, locationHint);
                    activeStatusIndicators[widget.id] = statusIndicator;
                }
            }
            else
            {
                // update target widget in case it has changed, and we need to
                // create a new statusWidget
                statusIndicator.targetWidget = widget;
            }
            return statusIndicator;
        }
    };
}());

/*******************************************************************************
 * Copyright (c) 2013-2014 Texas Instruments and others All rights reserved.
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v1.0 which accompanies this distribution,
 * and is available at http://www.eclipse.org/legal/epl-v10.html
 * 
 * Contributors: Paul Gingrich, Dobrin Alexiev - Initial API and implementation
 ******************************************************************************/
var gc = gc || {};
gc.databind = gc.databind || {};

if (window.parent.gc)
{
    // take the designer from the parent iframe, if available.
    gc.designer = gc.designer || window.parent.gc.designer;
}
else if (window.global && global.document && global.document.gc)
{
    // take the designer from the global node-webkit document if available
    gc.designer = gc.designer || global.document.gc.designer;
}

(function() // closure for private static methods and data.
{
    /**
     * Singleton class where all bindings, and binding expressions are
     * registered. This is also where data model {gc.databind.IBindFactory}
     * instances are registered.
     * 
     * @constructor
     * @implements {gc.databind.IBindProvider}
     */
    gc.databind.BindingRegistry = function()
    {
    };

    gc.databind.BindingRegistry.prototype = new gc.databind.IBindProvider();

    var models = {};
    var bindings = {};
    var bindCount = 0;
    var expressionParser = null;
    var defaultModelName;
    var dataBinder = new gc.databind.internal.DataBinder();

    var instance = null;
    /**
     * Method to get the singleton DataConverter instance.
     * 
     * @returns {BindingRegistry} the singleton DataConverter instance.
     */
    gc.databind.BindingRegistry.getSingleton = function()
    {
        if (instance === null)
        {
            instance = new gc.databind.BindingRegistry();
            expressionParser = new gc.databind.internal.expressionParser.ExpressionParser(instance);
        }
        return instance;
    };

    // below is a regular expression. It has three alternatives to match
    // 1. ^\s+ this matches all leading spaces
    // 2. this matches two alternatives plus the optional spaces around it
    // 2a. [^A-Za-z0-9$_ ']+ this matches anything that is not an identifier or
    // anything in quotes.
    // The space is a terminator for the character group. Dots are not included
    // because we can
    // remove the spaces around them.
    // 2b. '[^']' this matches quoted text and includes spaces in between quotes
    // 3. \s+$ this matches trailing spaces
    // Atlernative 1 & 3 have an empty capture group, and alternative 2's
    // capture group excludes the
    // surrounding spaces.
    var stripSpacesMatchString = /^\s+|\s*([^A-Za-z0-9$_ ']+|'[^']*')\s*|\s+$/g;

    /**
     * If the cache contains an object with the given name, this method will
     * returns it. Otherwise the binding is created by first evaluating any
     * expression then by using the registered models to create the appropriate
     * bindings to satisfy the binding expression.
     * 
     * @param {string} name - the name of the bindable object.
     * @return {gc.databind.IBind} the object if found in the cache or created,
     *         null otherwise.
     */
    gc.databind.BindingRegistry.prototype.getBinding = function(name, hint)
    {
        if (hint === undefined)
        {
            // first time strip extra spaces in the expression so that
            // expressions that
            // differ only in extra spaces can be matched by string compares.
            // second time (called from expressionParser) there will be a hint
            // provided.
            name = name.replace(stripSpacesMatchString, "$1");
        }
        var bind = bindings[name]; // lookup an existing binding for the same
        // expression
        if (bind === undefined) // if not created yet, use expressionParser to
        // create the new
        // binding.
        {
            // pass hint to expressionParser so skip operators already tested
            // for in
            // sub-expressions.
            bind = expressionParser.parse(name, hint) || null;
            if (bind !== null)
            {
                bind.setName(name);
            }
            bindings[name] = bind;
            bindCount++;

        }
        return bind;
    };

    /**
     * Register a data model with the binding registry. At least one model must
     * be registered in order for this class to be able to create bindings.
     * 
     * @param {gc.databind.IBindFactory} model - the models binding factory to
     *        create new bindings.
     * @param {boolean} [makedefault] - optional flag to make this the new
     *        default model.
     * @param {string} [alias] - optional alias that can be used in place of the model name, for example, $ for widget
     */
    gc.databind.BindingRegistry.prototype.registerModel = function(model, makeDefault, alias)
    {
        var name = model.getName();
        defaultModelName = defaultModelName || name; // use first registered
        // model as default, if
        // not already specified.
        if (makeDefault)
        {
            defaultModelName = name;
        }
        models[name] = model;
        if (alias)
        {
            models[alias] = models[alias] || model;  // don't overwrite a real model name with an alias.
        }
    };

    gc.databind.BindingRegistry.prototype.getModel = function(name)
    {
        name = name || defaultModelName; // use default if not specified.
        return models[name];
    };

    /**
     * Combined Getter/Setter for the default model name. Called without
     * parameters and it will return the name of the current default model.
     * E.g., var name = registry.defaultModel(); Pass in a model name and it
     * will change the default model to the one specified; for example,
     * registry.defaultModel("widget"); Usually binding names start with the
     * model identifier; for example, "widget.widgetid.property". However, if
     * the default model is set to "widget", then users can omit the model
     * identifier and use binding names like "widgetid.property" as a short cut.
     * 
     * @param {string} [name] - identifier for the new default model when used
     *        as a setter function. E.g. widget.
     * @param {gc.databind.IBindFactory} model - the name of the default model
     *        when used as getter, or the this pointer when used as a setter.
     */
    gc.databind.BindingRegistry.prototype.defaultModel = function(name)
    {
        if (name === undefined)
        {
            return defaultModelName;
        }
        defaultModelName = name;
        return this;
    };

    /**
     * Method to delete and dispose of all bindings and models in the binding
     * registry.
     */
    gc.databind.BindingRegistry.prototype.dispose = function()
    {
        for ( var name in bindings)
        {
            if (bindings.hasOwnProperty(name))
            {
                var bind = bindings[name];
                if (bind.dispose !== undefined)
                {
                    bind.dispose();
                }
            }
        }
        bindings = {};

        for (name in models)
        {
            if (models.hasOwnProperty(name))
            {
                var model = models[name];
                if (model.dispose !== undefined)
                {
                    model.dispose();
                }
            }
        }
        models = {};
    };
    
    /**
     * Method to disable a binding previously created using the bind() method.
     * This will also unregister the two bind values that are being bound together.
     * If no other binding or expression is using the bind values, then garbage collection
     * will dispose of them.  Otherwise, new bindings may create additional bindValues 
     * and you will end up with multiple bindValues for the same model or target data.
     * This will not cause problems, but is less efficient.
     * 
     * @param {gc.databind.IDataBinder} binder - the binding to delete.
     *        as a setter function. E.g. widget.
     * @param {gc.databind.IBindFactory} model - the name of the default model
     *        when used as getter, or the this pointer when used as a setter.
     */
    gc.databind.BindingRegistry.prototype.unbind = function(binder)
    {
        binder.enable(false);
        if (binder.dispose)
        {
            binder.dispose(bindings);
        }
    };

    var createBindingCollection = function(registry, bindings)
    {
        if (typeof bindings === 'object')
        {
            var result = {};
            for (var bindName in bindings)
            {
                if (bindings.hasOwnProperty(bindName))
                {
                    var binding;
                    try 
                    {
                        binding = gc.databind.registry.getBinding(bindings[bindName]);
                    }
                    catch(e)
                    {
                        throw "Can't parse binding \"" + bindName + '".  \n' + e; 
                    }
                    if (binding !== null)
                    {
                        result[bindName] = binding;
                    }
                    else
                    {
                        throw 'Binding "' + bindName + '" could not be found.';
                    }
                }
            }
            return new gc.databind.CollectionBindValue(result);
        }
        else
        {
            try 
            {
                return registry.getBinding(bindings);
            }
            catch(message)
            {
                throw "Can't parse binding \"" + bindings + '".  \n' + message; 
            }
        }
    };

    /**
     * <p>
     * Method to bind together a target and a model binding.
     * </p>
     * <p>
     * The difference between the target binding and the model binding is
     * subtle. The modelBinding contains the initial value. Otherwise there is
     * no distinction between model and target. Once the bindings are bound
     * together, their value and status will forever be the same. If either
     * value of status changes on one binding, the other will be updated to
     * reflect the change. This is typically used to keep widget and model data
     * in sync.
     * </p>
     * <p>
     * This method returns a binder object that can be used to control the
     * enabled disabled state of this two-way data binding between target and
     * model bindings.
     * </p>
     * 
     * @param {string|object} targetBinding - name or expression for the target
     *        binding.
     * @param {string|object} modelBinding - name or expression for the model
     *        binding.
     * @param {function} [getter] - getter/preprocessing for a computed value
     * @param {function} [setter] - setter/postprocessing for a computed value
     * @returns {IDataBinder} - interface to control the binding created between
     *          the the target and model bindings.
     */
    gc.databind.BindingRegistry.prototype.bind = function(targetBinding, modelBinding, getter, setter)
    {
        var targetBind, modelBind;
        try 
        {
            targetBind = createBindingCollection(this, targetBinding);
            modelBind = createBindingCollection(this, modelBinding);
            return gc.databind.internal.DataBinder.bind(targetBind, modelBind, getter, setter);
        }
        catch(e)
        {
            var errorStatus = gc.databind.AbstractStatus.createErrorStatus(e);
            if (targetBind)
            {
                targetBind.setStatus(errorStatus);
            }
            else 
            {
                try
                {
                    if (!modelBind)
                    {
                        modelBind = typeof modelBinding === 'object' ? createBindingCollection(modelBinding) : this.getBinding(modelBinding);
                    }
                    if (modelBind) 
                    {
                        modelBind.setStatus(errorStatus);
                    }
                }
                catch(err)
                {
                }
            }

            ti_logger.error(gc.databind.name, e);
            return new gc.databind.IDataBinder();
        }
    };

    gc.databind.BindingRegistry.prototype.getBindingCount = function()
    {
        return bindCount;
    };

    var getDefaultBindingFile = function()
    {
        try 
        {
            var path = window.location.pathname;            
            var pos = path.lastIndexOf('/');
            
            if (pos !== path.length-1) {
	            path = path.substring(pos+1);
	            return path.replace('.html', '.json');
            }
        }
        catch(e) {/* do nothing */ }
        
        return 'index.json';
    };

    var getDefaultPropertyFile = function()
    {
        return 'index_prop.json';
    };

    var BinderCollection = function()
    {
        this._binders = [];
        this._enabled = true;
    };

    BinderCollection.prototype = new gc.databind.IDataBinder();

    BinderCollection.prototype.enable = function(enable, filterFn)
    {
        if (enable === undefined)
        {
            return this._enabled;
        }
        else if (this._enabled != enable)
        {
            this._enabled = enable;

            for (var i = this._binders.length; i-- > 0;)
            {
                if (!filterFn || filterFn(this.__wb))
                {
                    this._binders[i].enable(enable);
                }
            }
        }
        return this;
    };

    BinderCollection.prototype.add = function(binder)
    {
        if (binder)
        {
            this._binders.push(binder);
            binder.enable(this._enabled);
        }
    };

    var bindingCollections = {};
    gc.databind.BindingRegistry.prototype.unloadBindingsFromFile = function(jsonFile, filterFn)
    {
        jsonFile = jsonFile || getDefaultBindingFile();

        var binder = bindingCollections[jsonFile];
        if (binder)
        {
            binder.enable(false, filterFn);
        }
    };

    gc.databind.BindingRegistry.prototype.loadBindingsFromFile = function(jsonFile, filterFn)
    {
        jsonFile = jsonFile || getDefaultBindingFile();

        var bindings = bindingCollections[jsonFile];
        if (bindings)
        {
            return Q.Promise(function(resolve)
            {
                setTimeout(function()
                {
                    bindings.enable(true, filterFn);
                }, 100);
                resolve(bindings);
            });
        }

        var promise = gc.fileCache.readJsonFile(jsonFile).then(function(data)
        {
            var results = new BinderCollection();
            bindingCollections[jsonFile] = results;
            if (data)
            {
                var bindingProvider = gc.databind.registry;
                for ( var prop in data.widgetBindings)
                {
                    if (data.widgetBindings.hasOwnProperty(prop))
                    {
                        var wb = data.widgetBindings[prop];
                        var i = 0;

                        // set the default type for the widget
                        // binding
                        if (wb.options && wb.options.dataType)
                        {
                            var widgetBind = bindingProvider.getBinding('widget.' + wb.widgetId + '.' + wb.propertyName);
                            var defaultType = wb.options.dataType.toLowerCase();
                            if (defaultType === 'long' || defaultType === 'short' || defaultType === "int" || defaultType === 'double' || defaultType === 'float')
                            {
                                defaultType = 'number';
                            }
                            widgetBind.setDefaultType(defaultType);
                        }

                        // Binding records with no widgetId are used
                        // to
                        // initialize backplane bindings.
                        if (!(wb.widgetId) && wb.serverBindName && wb.options && (typeof wb.options.defaultValue !== 'undefined'))
                        {
                            var bind = bindingProvider.getBinding(wb.serverBindName);
                            bind.setValue(wb.options.defaultValue);
                        }
                        else
                        {
                            var binder = bindingProvider.bind('widget.' + wb.widgetId + '.' + wb.propertyName, wb.serverBindName);
                            binder.__wb = wb;
                            results.add(binder);
                        }
                    }
                }
            }
            return results;
        }).fail(function(error)
        {
            ti_logger.error(gc.databind.name, error);
            return new gc.databind.IDataBinder();
        });

        return promise;
    };

    gc.databind.BindingRegistry.prototype.loadPropertiesFromFile = function(model, jsonFile)
    {
        jsonFile = jsonFile || getDefaultPropertyFile();

        return gc.fileCache.readJsonFile(jsonFile).then(function(jsonData)
        {
            return jsonData ? jsonData[model] : undefined;
        }).fail(function(error)
        {
            ti_logger.error(gc.databind.name, error);
            return undefined;
        });
    };

    var matchIDRegEx = /\s+id="([^"]+)"/;
    gc.databind.BindingRegistry.prototype.parseBindingsFromGist = function(modelName, arrayOfLines, modelID)
    {
        var re = new RegExp('\\s+(\\w+)\\s*=\\s*"\\s*{{\\s*\\$\\.' + modelName + '\\.([a-zA-Z0-9_\\.$]+)', 'g');
        var bindingsData = [];
        if (this.defaultModel() == modelID)
        {
            modelID = "";
        }
        else
        {
            modelID = modelID + '.';
        }
        for (var i = 0; i < arrayOfLines.length; i++)
        {
            var pos = arrayOfLines[i].indexOf('$.' + modelName + '.');
            if (pos >= 0)
            {
                // parse binding expression and property name
                var widgetID = arrayOfLines[i].match(matchIDRegEx);
                if (widgetID)
                {
                    widgetID = widgetID[1];
                    var match = re.exec(arrayOfLines[i]);
                    while (match)
                    {
                        var bindingExpression = match[2];
                        var propertyName = match[1];

                        bindingsData.push(
                        {
                            propertyName : propertyName,
                            serverBindName : modelID + bindingExpression,
                            widgetId : widgetID
                        });

                        match = re.exec(arrayOfLines[i]);
                    }
                }
            }
        }
        return bindingsData;
    };

    var saveJsonFile = function(jsonFile, jsonObject)
    {
        return gc.fileCache.writeJsonFile(jsonFile, jsonObject);
    };

    gc.databind.BindingRegistry.prototype.savePropertiesToFile = function(jsonFile, properties)
    {
        jsonFile = jsonFile || getDefaultPropertyFile();

        return saveJsonFile(jsonFile, properties);
    };

    gc.databind.BindingRegistry.prototype.saveBindingsToFile = function(jsonFile, bindings)
    {
        var jsonObject = bindings;
        if (bindings instanceof Array)
        {
            jsonObject =
            {
                widgetBindings : bindings
            };
        }
        jsonFile = jsonFile || getDefaultBindingFile();

        return saveJsonFile(jsonFile, jsonObject);
    };

    /**
     *  Singleton BindingRegistry instance.  Use this to access the singleton BindingRegistry instance. 
     *  
     *  @type {gc.databind.BindingRegistry}
     */
    gc.databind.registry = gc.databind.BindingRegistry.getSingleton();
    
    var _modelsReady = Q.defer();
    gc.databind.modelsReady = new gc.databind.ProgressCounter(function() { _modelsReady.resolve(); });
    gc.databind.modelsReady.then = _modelsReady.promise.then.bind(_modelsReady.promise);

}());
/*****************************************************************
 * Copyright (c) 2017 Texas Instruments and others
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
gc.databind.internal = gc.databind.internal || {};

(function()
{
    gc.databind.internal.AbstractDataFormatter = function(operator, operand)
    {
        gc.databind.internal.expressionParser.AbstractUnaryOperator.call(this, operator);
        
        if (operand)
        {
            this.operand = operand;
            if (operand.addQualifier)
            {
                this.addQualifier = operand.addQualifier.bind(operand);
            }
        }
    };
    
    gc.databind.internal.AbstractDataFormatter.prototype = new gc.databind.internal.expressionParser.AbstractUnaryOperator("<fmt>");
    
    gc.databind.internal.AbstractDataFormatter.prototype.formattedType = "string";
    
    gc.databind.internal.AbstractDataFormatter.prototype.getType = function()
    {
        return this.formattedType;
    };
    
    gc.databind.internal.AbstractDataFormatter.prototype.getValue = function()
    {
        var value = this.operand.getValue();
        if (value !== null && value !== undefined)
        {
            if (this.unFormattedType)
            {
                value = gc.databind.DataConverter.convert(value, this.operand.getType(), this.unFormattedType);
            }
            value = this.formatValue(value, this._precision);
        }
        return value;
    };
    
    gc.databind.internal.AbstractDataFormatter.prototype.setValue = function(value, progress)
    {
        if (value !== null && value !== undefined)
        {
            if (this.unFormatValue)
            {
                value = this.unFormatValue(value, this._precision);
            }
            value = gc.databind.DataConverter.convert(value, undefined, this.operand.getType());
        }
        this.operand.setValue(value, progress);
    };
    
    gc.databind.internal.AbstractDataFormatter.prototype.formatValue = gc.databind.DataConverter.getConverter(undefined, 'string').convert;
    
    gc.databind.internal.AbstractDataFormatter.prototype.toString = function()
    {
        return this.operand.toString() + '.$' + this.operator;
    };
            
    var HexFormatter = function(operand, precision)
    {
        gc.databind.internal.AbstractDataFormatter.call(this, undefined, operand);
        this._precision = precision;
    };
    
    var doPrecision = function(value, precision)
    {
        if (precision > 0)
        {
            if (value.length > precision)
            {
                value = value.substring(value.length-precision);
            }
            else
            {
                for(var len = value.length; len < precision; len++ )
                {
                    value = '0' + value;
                }
            }
        }
        return value;
    };
    
    HexFormatter.prototype = new gc.databind.internal.AbstractDataFormatter('hex');
    
    HexFormatter.prototype.formatValue = function(input, precision)  
    {
        input = +input;
        if (isNaN(input))
        {
            return '0x'+input;
        }
        if (input < 0)
        {
            input = 0xFFFFFFFF + input + 1;
        }
        input = input.toString(16).toUpperCase();
        return '0x' + doPrecision(input, precision);
    };
    
    var HexFormatFactory = function(bind, precision)
    {
        return new HexFormatter(bind, precision);
    };

    gc.databind.DataConverter.register({ convert: HexFormatter.prototype.formatValue }, 'hex');
    
    gc.databind.internal.QualifierFactoryMap.add('hex', HexFormatFactory);
    
    var DecimalFormatter = function(operand, precision)
    {
        gc.databind.internal.AbstractDataFormatter.call(this, undefined, operand);
        
        this._precision = precision;
    };
    
    DecimalFormatter.prototype = new gc.databind.internal.AbstractDataFormatter('dec');
    
    DecimalFormatter.prototype.formatValue = function(input, precision)  
    {
        input = +input;
        if (isNaN(input))
        {
            return "" + input;
        }
        return input.toFixed(precision);
    };
    
    var DecimalFormatFactory = function(bind, precision)
    {
        return new DecimalFormatter(bind, precision);
    };
    
    gc.databind.DataConverter.register({ convert: DecimalFormatter.prototype.formatValue }, 'dec');
    
    gc.databind.internal.QualifierFactoryMap.add('dec', DecimalFormatFactory);
    
    var ScientificFormatter = function(operand, precision)
    {
        gc.databind.internal.AbstractDataFormatter.call(this, undefined, operand);
        
        this._precision = precision;
    };
    
    ScientificFormatter.prototype = new gc.databind.internal.AbstractDataFormatter('exp');
    
    ScientificFormatter.prototype.formatValue = function(input, precision)  
    {
        input = +input;
        if (isNaN(input))
        {
            return "" + input;
        }
        return input.toExponential(precision);
    };
    
    var ScientificFormatFactory = function(bind, precision)
    {
        return new ScientificFormatter(bind, precision);
    };
    
    gc.databind.DataConverter.register({ convert: ScientificFormatter.prototype.formatValue }, 'exp');
    
    gc.databind.internal.QualifierFactoryMap.add('exp', ScientificFormatFactory);
        
    var BinaryFormatter = function(operand, precision)
    {
        gc.databind.internal.AbstractDataFormatter.call(this, undefined, operand);
        
        this._precision = precision;
    };
    
    BinaryFormatter.prototype = new gc.databind.internal.AbstractDataFormatter('binary');
    
    BinaryFormatter.prototype.formatValue = function(input, precision)  
    {
        input = +input;
        if (isNaN(input))
        {
            return "" + input;
        }
        if (input < 0)
        {
            input = 0xFFFFFFFF + input + 1;
        }
        
        return doPrecision(input.toString(2), precision);
    };
    
    BinaryFormatter.prototype.unFormattedType = "number";
    
    BinaryFormatter.prototype.unFormatValue = function(input)
    {
        return Number.parseInt(input, 2);
    };
    
    var BinaryFormatFactory = function(bind, precision)
    {
        return new BinaryFormatter(bind, +precision);
    };
    
    gc.databind.DataConverter.register({ convert: BinaryFormatter.prototype.formatValue }, 'binary');
    gc.databind.DataConverter.register({ convert: BinaryFormatter.prototype.unFormatValue }, 'number', 'binary');
    
    gc.databind.internal.QualifierFactoryMap.add('binary', BinaryFormatFactory);
    
    gc.databind.registry.addDataFormatter = function(name, destType, src2destFormatter, srcType, dest2srcFormatter)
    {
        var DataFormatter = function(operand, precision) 
        {
            gc.databind.internal.AbstractDataFormatter.call(this, undefined, operand);
            if (precision)
            {
                this._precision = precision;
            }
        };
        
        DataFormatter.prototype = new gc.databind.internal.AbstractDataFormatter(name);
        
        if (destType)
        {
            DataFormatter.prototype.formattedType = destType;
        }
        
        if (srcType)
        {
            DataFormatter.prototype.unFormattedType = srcType;
        }
        
        if (src2destFormatter)
        {
            DataFormatter.prototype.formatValue = src2destFormatter;
        }
        
        if (dest2srcFormatter)
        {
            DataFormatter.prototype.unFormatValue = dest2srcFormatter;
        }
         
        if (name)
        {
            gc.databind.internal.QualifierFactoryMap.add(name, function(operand, precision) 
            {
                return new DataFormatter(operand, precision);
            });
        }
    };

}());
/*******************************************************************************
 * Copyright (c) 2015 Texas Instruments and others All rights reserved. This
 * program and the accompanying materials are made available under the terms of
 * the Eclipse Public License v1.0 which accompanies this distribution, and is
 * available at http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors: Paul Gingrich - Initial API and implementation
 ******************************************************************************/
var gc = gc || {};
gc.databind = gc.databind || {};

(function()
{
    var IDLE = 0;
    var READ = 1;
    var WRITE = 2;
    var DELAYED_WRITE = 3;
    var DELAYED_READ = 4;
    var ERROR_STATE = 99;
    var nullProgressCounter = new gc.databind.IProgressCounter();

    // qualifiers
    var READONLY = 'readonly'; // do not write to target, and therefore no need
    // to read back the value.
    var WRITEONLY = 'writeonly'; // only write to target, do not read
    var NONVOLATILE = 'nonvolatile'; // no need to poll the target for
    // changes
    var CONST = 'const'; // no polling or writing to the target.
    var INTERRUPT = 'interrupt'; // no polling or writing to the target.

    /**
     * Abstract class that implements IBindValue interface for clients that need
     * asynchronous access to values for the purposes of reading and writing.
     * This class assumes polling is required to read the value. If this is not
     * the case, you probably do not need to derive from this abstract class.
     * This class implements a IDLE/READ/WRITE/DELAYED_WRITE state machine to
     * keep reads and write synchronous and to prevent a build up of pending
     * operations if the backend process cannot keep up. Clients need only
     * implement readValue() and writeValue() to perform the asynchronous
     * actions and use the callbacks provided to signal when operation is
     * complete. To trigger a refresh of the read value there is an onRefresh()
     * api to call. This should be called in the constructor as well to kick
     * start the state machine to read the initial value. This constructor needs
     * to be called from the derived classes constructor as well. For example,
     * gc.databind.AbstractAsyncBindValue.call(this);
     *
     * @constructor
     * @extends gc.databind.AbstractLookupBindValue
     * @implements gc.databind.IDisposable
     */
    gc.databind.AbstractAsyncBindValue = function(defaultType)
    {
        gc.databind.AbstractLookupBindValue.call(this, defaultType);

        this.setStale(true);
        this._state = IDLE;
        this._hasListeners = false;
    };

    gc.databind.AbstractAsyncBindValue.prototype = new gc.databind.AbstractLookupBindValue('string');

    gc.databind.AbstractAsyncBindValue.prototype.DEBUG_BINDING = undefined;

    gc.databind.AbstractAsyncBindValue.prototype._readable = true;
    gc.databind.AbstractAsyncBindValue.prototype._writable = true;
    gc.databind.AbstractAsyncBindValue.prototype._volatile = true;

    /**
     * Method to add a qualifier to this binding.  Valid qualifiers for AbstractAsyncBindValue are:
     * <ul>
     * <li>const - assumes the binding will not change so read once, and prevent modification.</li>
     * <li>readonly - assumes the binding will change, but prevent modification.</li>
     * <li>writeonly - assumes the binding value cannot be read back, and allow modification</li>
     * <li>nonvolatile - assumes the binding can only be modified by the user, so read once and allow modification.</li>
     * </ul>
     *
     * @protected
     * @param {string} qualifier - the name of the qualifier to add: 'readonly', 'const', 'writeonly', or 'nonvolatile'.
     *        called when the read operation has finished.
     */
    gc.databind.AbstractAsyncBindValue.prototype.addQualifier =
        function(qualifier)
        {
            // const = readable
            // readOnly = readable, volatile
            // writeOnly = writable
            // nonvolatile = readable, writable
            // interrupt = readable

            var wasVolatileBefore = this._volatile;

            if (qualifier === CONST || qualifier === READONLY || qualifier === INTERRUPT)
            {
                this._writable = false;
            }

            if (qualifier === WRITEONLY)
            {
                this._readable = false;
            }

            if (qualifier === NONVOLATILE || qualifier === CONST || qualifier === WRITEONLY || qualifier === INTERRUPT)
            {
                this._volatile = false;
            }

            // validate multiple qualifiers haven't created an invalid state
            if (!(this._readable || this._writable))
            {
                // can't read or write the target
                gc.console.error(gc.databind.name, 'Invalid qualifier .$writeonly added to binding "' + this.getName() +
                    '" that already has an exisiting .$readonly or .$const qualifier.');
            }

            // kick start the read-once option
            if (wasVolatileBefore)
            {
                this.kickStartAReadOperation();
            }
        };

    /**
     * Abstract method to read the binding value asynchronously. The derived
     * class must implement this method and call the callback method with the
     * value as its first argument. This method will be called as a response to
     * the onRefresh() method being called as well as following a writeValue()
     * operation to read back the written value in case it is not the same. The
     * default implementation of this method does nothing.
     *
     * @abstract
     * @protected
     * @param {gc.databind.AbstractAsyncBindValue#onReadValue} callback - to be
     *        called when the read operation has finished.
     */
    gc.databind.AbstractAsyncBindValue.prototype.readValue = function(callback)
    {
    };

    /**
     * Callback used by readValue.
     *
     * @callback gc.databind.AbstractAsyncBindValue#onReadValue
     * @param {Object} newValue the bind value read asynchronously from
     *        somewhere.
     */

    /**
     * Abstract method to write the binding value asynchronously. The derived
     * class must implement this method and call the callback method when the
     * write operation has finished. This method will be called as a response to
     * the onValueChanged() or if another write operation has completed and
     * there is a delayed write operation pending. The default implementation of
     * this method does nothing.
     *
     * @abstract
     * @protected
     * @param {gc.databind.AbstractAsyncBindValue#onWriteValue} callback - to be
     *        called when the write operation has finished.
     */
    gc.databind.AbstractAsyncBindValue.prototype.writeValue = function(callback)
    {
    };

    /**
     * Callback used by writeValue.
     *
     * @callback gc.databind.AbstractAsyncBindValue#onWriteValue
     */

    var onDone = function(that, newValue)
    {
        if (that._state === DELAYED_WRITE)
        {
            that.changeState(WRITE);
            var deferredValue = that.fCachedValue;    // save the deferred write value
            that.fCachedValue = that.fCommittedValue;  // make sure we write the lastWrittenValue instead of the deferred value
            that.writeValue(function()
            {
                if (that._delayedProgress)
                {
                    that._delayedProgress.done();
                    that._delayedProgress = null;
                }
                onDone(that);
            });
            that.fCachedValue = deferredValue;      // restore deferred value
        }
        else if (that._state === WRITE || that._state === DELAYED_READ || (that._state === READ && that.isConnected() === false))
        {
            if (that._readable && !that.isDeferredWritePending())
            {
                // read back the value to see if the value we wrote stuck.
                that.changeState(READ);
                that.readValue(function(newValue)
                {
                    if (that._delayedProgress)
                    {
                        that._delayedProgress.done();
                        that._delayedProgress = null;
                    }
                    onDone(that, newValue);
                });
            }
            else
            {
                that.changeState(IDLE);
            }
        }
        else if (that._state === READ)
        {
            that.changeState(IDLE, newValue);
            // ignore newly read value if a deferred value is pending to be written
            if (!that.isDeferredWritePending())
            {
                // Ensure readValue() implementation is not reusing array buffers which will cause problems.
                if (newValue === that.fCachedValue && Array.isArray(newValue))
                {
                    gc.console.error(gc.databind.name, 'An array buffer is being reused for readValue() operations.  Please call slice() on the array before returning it.');
                }

                that.fCommittedValue = newValue;  // make sure fCachedValue === fCommittedValue is maintained.
                that.updateValue(newValue);
                that.setStale(false);
            }
        }
    };

    gc.databind.AbstractAsyncBindValue.prototype.changeState = function(newState, newValue)
    {
        this._state = newState;
        if (this.DEBUG_BINDING && this.getName().indexOf(this.DEBUG_BINDING) >= 0)
        {
            // the following code convertes state number to a readable description, but it also
            // provides an opportunity to set breakpoints when entering particular states for a particular binding.
            var stateName = "Unknown";
            switch(newState) {
                case IDLE:
                    stateName = "IDLE";
                    break;
                case READ:
                    stateName = "READ";
                    break;
                case WRITE:
                    stateName = "WRITE";
                    break;
                case DELAYED_WRITE:
                    stateName = "DELAYED WRITE";
                    break;
                case DELAYED_READ:
                    stateName = "DELAYED READ";
                    break;
                case ERROR_STATE:
                    stateName = "ERROR_STATE";
                    break;
            }
            gc.console.log(gc.databind.name, this.getName() + ' state = ' + stateName + ' value = ' + (newValue || this.fCachedValue));
        }
    };

    gc.databind.AbstractAsyncBindValue.prototype.onValueChanged = function(oldValue, newValue, progress)
    {
        var that = this;
        that.setStale(false); // ensure no longer stale if value set first
        // before reading from target.

        var allowWriteOperation = true;
        if (this.parentModel && this.parentModel._ignoreWriteOperationsWhenDisconnected)
        {
            // when _ignoreWriteOperationsWhenDisconnected is true, allow write operation only when connected.
            allowWriteOperation = this.isConnected();
        }

        if (this._writable && !that.fDeferredMode && allowWriteOperation)
        {
            /* dispatch a custom event to log the write command for script script recording */
            document.dispatchEvent(new CustomEvent('scripting-log-command', { detail: {
                command: 'write',
                modelId: that.parentModel.getName(),
                arguments: [that.uri, newValue]
            }}));

            this.fCommittedValue = this.fCachedValue;
            if (that._state === IDLE || that._state === ERROR_STATE)
            {
                that.changeState(WRITE);
                progress.wait();
                that.writeValue(function()
                {
                    progress.done();
                    onDone(that);
                });
            }
            else
            {
                that.changeState(DELAYED_WRITE);
                if (that._delayedProgress)
                {
                    that._delayedProgress.done();
                }
                progress.wait();
                that._delayedProgress = progress;
            }
        }
    };

    /**
     * Method meant to wrap the onRefresh method with script recording support.
     * Widget that support manual refresh should call this method.
     *
     * @param {gc.databind.IProgressCounter} [progress] - a progress counter
     *        used to monitor asynchronous operations.
     */
    gc.databind.AbstractAsyncBindValue.prototype.onRefreshAndLog = function(progress) {
        /* dispatch a custom event to log the read command for script script recording */
        document.dispatchEvent(new CustomEvent('scripting-log-command', { detail: {
            command: 'read',
            modelId: this.parentModel.getName(),
            arguments: [this.uri]
        }}));

        this.onRefresh(progress);
    };

    /**
     * Helper method to test if this binding can be refreshed.  For example,
     * is it volatile, does it have listeners, etc...
     *
     * @param {boolean} [force] - flag to force a read operation.
     * @protected
     */
    gc.databind.AbstractAsyncBindValue.prototype.isRefreshable = function(force)
    {
        // volatile implies readable, so we don't have to test for this._readable as well here.
        return this._state === IDLE && (force || this._hasListeners) && this._volatile && !this.isDeferredWritePending();
    };

    /**
     * Method meant to be an event handler for a refresh event. This method
     * kicks off a read operation if idle. If this object is busy with other
     * operations, then it is ignored because the refresh will happen as a
     * result of those operations. This method is designed to be used with
     * gc.databind.RefreshIntervalBindValue to provide a periodic polling event
     * to refresh the read value of this asynchronous binding. Simply attach
     * this object as a listener and onRefresh() will periodically be called.
     *
     * @param {gc.databind.IProgressCounter} [progress] - a progress counter
     *        used to monitor asynchronous operations.
     * @param {boolean} [force] - flag to force a read operation.
     */
    gc.databind.AbstractAsyncBindValue.prototype.onRefresh = function(progress, force)
    {
        var that = this;
        if (that.isRefreshable(force))
        {
            that.changeState(READ);
            progress = progress || nullProgressCounter;
            progress.wait();
            that.readValue(function(newValue)
            {
                onDone(that, newValue);
                progress.done();
            });
        }
    };

    /**
     * Method to initiate a read operation, if appropriate, separate from onRefresh() handling.
     * This is use, for example, to read nonvolatile values once at the start, or when critical
     * errors have been cleared for example.
     *
	 * @protected
     * @param {boolean} [force] - flag to force a read operation.
     */
    gc.databind.AbstractAsyncBindValue.prototype.kickStartAReadOperation = function(force)
    {
        // kick start the read for nonvolatile readable bindings.
        if (force || (this._state === IDLE && !this._volatile && this._readable && !this.isDeferredWritePending()))
        {
            var that = this;
            // we need to read this variable at least once in the beginning,
            // because it will
            // not be triggered by adding listeners or refresh timeouts.
            that.changeState(READ);
            that.readValue(function(newValue)
            {
                onDone(that, newValue);
            });
        }
    };

    gc.databind.AbstractAsyncBindValue.prototype.onDisconnected = function()
    {
        // clear any critical errors, which should restart the state machine
        this.reportCriticalError(null);
        this.kickStartAReadOperation();
    };


    /**
     * Method to set critical errors on this binding.  Critical errors are handled
     * differently in that the polling of a binding that has a critical error is suspended.
     * Normal errors do not suspend polling and therefore the error may get cleared when
     * the problem goes away.  This method is also used to clear critical errors when they are no
     * longer a problem by passing in a null or undefined parameter.
     *
     * @param {gc.databind.IStatus} [criticalError] - an error status to report as critical,
     * if absent or null, the previous critical error is cleared.
     */
    gc.databind.AbstractAsyncBindValue.prototype.reportCriticalError = function(criticalError)
    {
        if (criticalError)
        {
            // prevent further target access until the critical error is
            // cleared.
            this.changeState(ERROR_STATE);
        }
        else if (this._state === ERROR_STATE)
        {
            this.changeState(IDLE);
            this.kickStartAReadOperation(this._readable);
        }
        this.setStatus(criticalError);
    };

    /**
     * Query method to determine if the model is connected or disconnected from a target through a transport.
     * The default implementation of this method simply returns true, assuming the binding is connected.  Derived
     * implementations should override this method and return the true connected state of the model through a transport.
     *
     * @return {boolean} - true if the model is connected to a target through a transport, otherwise false.
     */
    gc.databind.AbstractAsyncBindValue.prototype.isConnected = function()
    {
        return true;
    };

    gc.databind.AbstractAsyncBindValue.prototype.onFirstValueChangedListenerAdded = function()
    {
        if (!this._hasListeners)
        {
            this._hasListeners = true;
            if (this.isRefreshable())
            {
                this.kickStartAReadOperation(true); // kick start an update
            }
        }
    };

    gc.databind.AbstractAsyncBindValue.prototype.onFirstDataReceivedListenerAdded =
        gc.databind.AbstractAsyncBindValue.prototype.onFirstValueChangedListenerAdded;

    gc.databind.AbstractAsyncBindValue.prototype.onLastValueChangedListenerRemoved = function()
    {
        this._hasListeners = this.fEvents.hasAnyListeners('ValueChanged') || this.fEvents.hasAnyListeners('DataReceived');
    };

    gc.databind.AbstractAsyncBindValue.prototype.onLastDataReceivedListenerRemoved =
        gc.databind.AbstractAsyncBindValue.prototype.onLastValueChangedListenerRemoved;

    gc.databind.AbstractAsyncBindValue.prototype.isReadOnly = function()
    {
        return !this._writable;
    };

    gc.databind.AbstractAsyncBindValue.prototype.onIndexChanged = function()
    {
        if (this._hasListeners && this._volatile)
        {
            if (this._state === READ)
            {
                this.changeState(DELAYED_READ);
            }
            else
            {
                this.onRefresh();
            }
        }
    };

    var applyQualifierHelper = function(bind)
    {
        bind.addQualifier(this);
        return bind;
    };

    var qualifierList = [READONLY, WRITEONLY, NONVOLATILE, CONST, INTERRUPT];

    /**
     * Method to register the following qualifier factories to a model.
     * <ul>
     * <li>const - assumes the binding will not change so read once, and prevent modification.</li>
     * <li>readonly - assumes the binding will change, but prevent modification.</li>
     * <li>writeonly - assumes the binding value cannot be read back, and allow modification</li>
     * <li>nonvolatile - assumes the binding can only be modified by the user, so read once and allow modification.</li>
     * <li>interrupt - same as readonly, except binding value changes are pushed, not polled.</li>
     * </ul>
     * By default, this method is not called.  Derived implementations should call this method if they wish the above
     * qualifiers factories to be registered.  Otherwise, the derived implementations can still call addQualifier() method
     * to apply the above qualifiers to this binding if necessary.
     *
     * @protected
     * @param {gc.databind.IFactoryBind} model - the model to add qualifier factories to.
     */
    gc.databind.AbstractAsyncBindValue.addQualifiersToModel = function(model)
    {
        for(var i = qualifierList.length; i --> 0; )
        {
            model.addQualifier(qualifierList[i], applyQualifierHelper.bind(qualifierList[i]));
        }
    };

    gc.databind.AbstractAsyncBindValue.prototype.setDeferredMode = function(deferredMode, forceWrite)
    {
        deferredMode = deferredMode || false;
        if (deferredMode !== this.fDeferredMode)
        {
            var oldValue = this.fCommittedValue;
            var newValue = this.fCachedValue;

            var doWrite = !deferredMode && (forceWrite || this.isValueNotEqualTo(oldValue));

            gc.databind.AbstractLookupBindValue.prototype.setDeferredMode.call(this, deferredMode);

			// write deferred value when transitioning out of deferred mode, if appropriate.
            if (doWrite)
            {
                this.onValueChanged(oldValue, newValue, nullProgressCounter);
            }
        }
    };

    /**
     * Set a new refresh interval provider to control the polling interval.  The refresh interval provider should
     * be obtained from the model associated with this binding using the prefix '$refresh_interval.' followed by
     * a name to identify each separate refresh interval provider.  See the example below.
     *
     * @example
     * var refreshInterval = gc.databind.registry.getBinding("<model>.$refresh_interval.<name>");
     * refreshInterval.setValue(2500);  // the value is in milliseconds, so in this case every 2.5 seconds.
     * var myBinding = gc.databind.registry.getBinding("<model>.<URI>");
     * myBinding.setRefreshIntervalProvider(refreshInterval);
     *
     * @param {gc.databind.RefreshIntervalBindValue} refreshIntervalProvider - new refresh binding to use for polling interval.
     *
     */
    gc.databind.AbstractAsyncBindValue.prototype.setRefreshIntervalProvider = function(refreshIntervalProvider)
    {
        // remove listener from existing provider, if there is one.
        if (this._refreshIntervalProvider)
        {
            this._refreshIntervalProvider.removeRefreshListener(this);
        }

        // assign new provider
        this._refreshIntervalProvider = refreshIntervalProvider;

        // add listener for new provider, if there is one.
        if (this._refreshIntervalProvider)
        {
            this._refreshIntervalProvider.addRefreshListener(this);
        }
    };

    gc.databind.AbstractAsyncBindValue.prototype.dispose = function()
    {
        // clear any refresh interval providers if there are any.
        this.setRefreshIntervalProvider();
    };

}());

/*****************************************************************
 * Copyright (c) 2015 Texas Instruments and others
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *  Paul Gingrich - Initial API and implementation
 *  Brian Cruickshank - Added preRefresh functionality.
 *****************************************************************/
var gc = gc || {};
gc.databind = gc.databind || {};

/**
 * Listener interface that provides the client with notification when 
 * its time to refresh something.    
 * 
 * @interface
 */ 
gc.databind.IRefreshListener = function()
{
};

/**
 * This method is called when its time to refresh something
 * 
 * @param {gc.databind.IProgressCounter} [progress] - interface for the client to indicate progress of
 * asynchronous operations so the client can determine when the refresh operation is fully completed.
 */
gc.databind.IRefreshListener.prototype.onRefresh = function(progress)
{
};

/**
 * This method is called some amount of time prior to the refresh event.  The amount of time before the 
 * refresh that this event is called is set using the RefreshIntervaleBindValue.setPreRefreshInterval() method.  If no
 * pre-refresh interval is set, then no pre-refresh event is fired.
 *
 * @param {gc.databind.IProgressCounter} [progress] - interface for the client to indicate progress of
 * asynchronous operations so the client can determine when the pre-refresh operation is fully completed.
 */
gc.databind.IRefreshListener.prototype.onPreRefresh = function()
{
};
/** 
 * Class that implements IBindValue for a refresh interval value.  Clients can 
 * set the interval (in milliseconds) by calling setValue().  Also, clients can
 * register for onRefresh() listeners that will be called periodically based on
 * the current refresh interval.  This class is useful for providing the polling
 * events other bindings that need to poll to detect changes. 
 * 
 * @constructor
 * @extends gc.databind.VariableBindValue
 * @implements gc.databind.IValueBind
 */
gc.databind.RefreshIntervalBindValue = function(defaultValue) 
{
	var that = this;
	
	gc.databind.VariableBindValue.call(that, defaultValue || that.fCachedValue);

	that._hasListeners = false;
	
	this._updateListener = function() 
	{
		if (that._preRefreshInterval)
		{
			that.onPreRefresh();
            that._preRefreshTimer = setTimeout(that.onRefresh.bind(that), that._preRefreshInterval);
		} 
		else 
		{
            that.onRefresh();
        }
	};
	
	this._resetTimer = function()
	{
		if (that._preRefreshInterval) 
		{
            clearTimeout(that._preRefreshTimer);
            that._preRefreshTimer = undefined;
        }

		// only restart the timer if we have listeners and a timer is not pending.
		if (that._timer === undefined && that._hasListeners)
		{
		    var delay = that.getValue();
		    if (delay >= 0)
		    {
		        that._timer = setTimeout(that._updateListener, delay);
		    }
		}
	};
}; 

gc.databind.RefreshIntervalBindValue.prototype = new gc.databind.VariableBindValue(100);

/**
 * This method sets the pre-refresh interval.  When set, a pre-refresh event is fired before the actual refresh event. 
 *
 * @param {Number} timeInMs - the amount of time prior to the refresh interval to fire the pre-refresh notification.
 */
gc.databind.RefreshIntervalBindValue.prototype.setPreRefreshInterval = function(timeInMs)
{
	this._preRefreshInterval = timeInMs;
    clearTimeout(this._preRefreshTimer);
    this._preRefreshTimer = undefined;
};

gc.databind.RefreshIntervalBindValue.prototype.excludeFromStorageProviderData = true;

gc.databind.RefreshIntervalBindValue.prototype.onValueChanged = function()
{
	this.excludeFromStorageProviderData = undefined;
	this._resetTimer();  // kick start timer in case new value is not negative.
};

/**
 * Add a preRefresh listener for this bindable object.  Listeners will be notified at some time prior to the 
 * refresh event.  The amount of time prior can be set using the setPreRefreshInterval() method.  If no such interval
 * has been set, then the preRefresh listeners are not called.
 *
 * @param {gc.databind.IRefreshListener} listener - callback that will be called for a pre-refresh event.
 */
gc.databind.RefreshIntervalBindValue.prototype.addPreRefreshListener = function(listener)
{
    this.fEvents.addListener('PreRefresh', listener);
};

/**
 * Add a refresh listener for this bindable object.  Listeners will be notified 
 * periodically based on the refresh interval assigned. 
 *  
 * @param {gc.databind.IRefreshListener} listener - callback that will be notified when it time to refresh.  
 */
gc.databind.RefreshIntervalBindValue.prototype.addRefreshListener = function(listener)
{
	this.fEvents.addListener('Refresh', listener);
};

gc.databind.RefreshIntervalBindValue.prototype.onFirstRefreshListenerAdded = function()
{
	this._hasListeners = true;
	this._resetTimer();  // kick start the timer, if needed.
};

gc.databind.RefreshIntervalBindValue.prototype.onLastRefreshListenerRemoved = function()
{
	this._hasListeners = false;
};

gc.databind.RefreshIntervalBindValue.prototype.dispose = function()
{
	if (this._timer !== undefined)
	{
		clearTimeout(this._timer);
		this._timer = undefined;
	}
    if (this._preRefreshTimer !== undefined)
    {
        clearTimeout(this._preRefreshTimer);
        this._preRefreshTimer = undefined;
    }

};

/**
 * Remove a preRefresh listener for this bindable object that was previously added using
 * addPreRefreshListener() api.
 *
 * @param {gc.databind.IRefreshListener} listener - callback to be removed.
 */
gc.databind.RefreshIntervalBindValue.prototype.removePreRefreshListener = function(listener)
{
    this.fEvents.removeListener('preRefresh', listener);
};
/**
 * Remove a refresh listener for this bindable object that was previously added using
 * addRefreshListener() api.   
 *  
 * @param {gc.databind.IRefreshListener} listener - callback to be removed.  
 */
gc.databind.RefreshIntervalBindValue.prototype.removeRefreshListener = function(listener)
{
	this.fEvents.removeListener('Refresh', listener);
};

gc.databind.RefreshIntervalBindValue.prototype.onPreRefresh = function()
{
    this._preRefreshTimer = undefined; // clear timer for next _resetTimer() call
    this.fEvents.fireEvent('PreRefresh');
};

gc.databind.RefreshIntervalBindValue.prototype.onRefresh = function()
{
	this._timer = undefined; // clear timer for next _resetTimer() call
	var progress = new gc.databind.ProgressCounter(this._resetTimer);
	this.fEvents.fireEvent('Refresh', progress);
	progress.done();
};

gc.databind.RefreshIntervalBindValue.prototype.onDisconnected = function() 
{
    if (this._timer === undefined && this._hasListeners) 
    {
        var delay = this.getValue();
        if (delay < 0) 
        {
            // kick start a refresh in case we aren't polling, and we need to queue up one read operation for the next 
            // time we connect. 
            this._updateListener();
        }
    }
};

/*******************************************************************************
 * Copyright (c) 2015 Texas Instruments and others All rights reserved. This
 * program and the accompanying materials are made available under the terms of
 * the Eclipse Public License v1.0 which accompanies this distribution, and is
 * available at http://www.eclipse.org/legal/epl-v10.html
 * 
 * Contributors: Paul Gingrich - Initial API and implementation
 ******************************************************************************/
var gc = gc || {};
gc.databind = gc.databind || {};
gc.databind.internal = gc.databind.internal || {};

(function()
{
    var EditOperation = function(bind, oldValue, newValue, time)
    {
        this.newValue = newValue;
        this.oldValue = oldValue;
        this.bind = bind;
        this.time = time;
    };

    EditOperation.prototype.undo = function()
    {
        this.bind.setValue(this.oldValue);
    };

    EditOperation.prototype.redo = function()
    {
        this.bind.setValue(this.newValue);
    };

    EditOperation.prototype.toString = function()
    {
        return "edit";
    };

    var WidgetBindValue = function(widget, widgetProperty, initialValue)
    {
        gc.databind.AbstractBindValue.call(this);
        this.fCachedValue = initialValue;
        this.widgetId = widget.id;
        this._widget = widget;
        this._widgetProperty = widgetProperty;
    };

    WidgetBindValue.prototype = new gc.databind.AbstractBindValue();
    
    WidgetBindValue.prototype.excludeFromStorageProviderData = true;

    WidgetBindValue.prototype.onValueChanged = function(oldValue, newValue, progress)
    {
        this.value = newValue;
        this.excludeFromStorageProviderData = true;

        if (this._observer === undefined)
        {
            // must propagate values manually, since observer is not available
            var widget = this.getWidget();
            if (widget)
            {
                // widget available, so update property
                widget[this._widgetProperty] = newValue;
            }
        }
    };

    WidgetBindValue.prototype.getWidget = function()
    {
        this._widget = this._widget || (Polymer.dom ? Polymer.dom(document) : document).querySelector('#' + this.widgetId);
        return this._widget;
    };

    WidgetBindValue.prototype.onStatusChanged = function(oldStatus, newStatus)
    {
        if (newStatus && gc.widget)
        {
            var newMessage = newStatus.getMessage();

            var type = newStatus.getType();
            if (type === gc.databind.StatusType.WARNING)
            {
                type = gc.widget.StatusIndicatorType.WARNING;
            }
            else
            {
                type = gc.widget.StatusIndicatorType.ERROR;
            }
            gc.widget.StatusIndicator.Factory.get(this.getWidget()).addMessage(newMessage, type);
        }
        if (oldStatus && gc.widget)
        {
        	var oldMessage = oldStatus.getMessage();
        	var newMessage = newStatus && newStatus.getMessage();
        	if (oldMessage != newMessage) // don't remove old message if it matches new message because we already removed it during addMessage() above.
        	{
        		gc.widget.StatusIndicator.Factory.get(this.getWidget()).removeMessage(oldMessage);
        	}
        }
    };

    var doUserEditOperation = function(bind, newValue)
    {
        var oldValue = bind.getValue();
        if (oldValue != newValue)
        {
            if (gc.history && gc.history.push)
            {
                var now = Date.now();
                var lastOperation = gc.history.getLastUndoOperation();
                // make sure it's also different from original value; e.g.,
                // checkbox toggled quickly.
                if (lastOperation instanceof EditOperation && now - lastOperation.time < 250 && lastOperation.bind === bind && lastOperation.oldValue !== newValue)
                {
                    // not enough time has elapsed, so just modify the top of
                    // history stack with new value
                    lastOperation.newValue = newValue;
                    lastOperation.time = now;
                    lastOperation.redo(); // perform action now.
                }
                else
                {
                    if (oldValue !== undefined && newValue !== undefined && !gc.databind.blockNewEditUndoOperationCreation)
                    {
                        var operation = new EditOperation(bind, oldValue, newValue, now);
                        gc.history.push(operation);
                        operation.redo();
                    }
                    else
                    {
                        bind.setValue(newValue);
                    }
                }
            }
            else
            {
                bind.setValue(newValue);
            }
            bind.excludeFromStorageProviderData = undefined;
        }
    };
    
    WidgetBindValue.prototype.onFirstValueChangedListenerAdded = function()
    {
        var widget = this.getWidget();
        var widgetProperty = this._widgetProperty;
        if (widget)
        {
            var bind = this;
            if (widget.bind && widget.bindProperty)  // test for Polymer 0.5 support
            {
                var observer = new window.PathObserver(bind, 'value');
                observer.setValue = function(newValue)
                {
                    doUserEditOperation(bind, newValue);
                    window.PathObserver.prototype.setValue.call(this, newValue);
                };
    
                widget.bind(widgetProperty.toLowerCase(), observer);
                this._observer = observer;
            }
            else // assume Polymer 1.x supported
            {
                this._changedPropertyEventName = Polymer.CaseMap.camelToDashCase(widgetProperty) + '-changed';
                this._propertyChangedListener = function(event) 
                {
                    doUserEditOperation(bind, event.detail.value);
                };
                
                widget.addEventListener(this._changedPropertyEventName, this._propertyChangedListener);
            }

            var oldStatus = this.getStatus();
            if (oldStatus)
            {
                // restore status indicators for the new widget.
                gc.widget.StatusIndicator.Factory.get(widget).addMessage(oldStatus.getMessage());
            }
        }
    };

    WidgetBindValue.prototype.onLastValueChangedListenerRemoved = function()
    {
        if (this._observer)
        {
            this._observer.close();
            this._observer = undefined;
        }
        if (this._widget)
        {
            if (this._propertyChangedListener) 
            {
                this._widget.removeEventListener(this._changedPropertyEventName, this._propertyChangedListener);
                this._propertyChangedListener = undefined;
                this._changedPropertyEventName = undefined;
            }
            
            var oldStatus = this.getStatus();
            if (oldStatus)
            {
                // remove status indicators that are tied to this widget
                gc.widget.StatusIndicator.Factory.get(this._widget).removeMessage(oldStatus.getMessage());
            }
            this._widget = undefined;
        }
    };

    var WidgetModel = function()
    {
        gc.databind.AbstractBindFactory.call(this);
        this.init();
    };

    WidgetModel.prototype = new gc.databind.AbstractBindFactory('widget');

    WidgetModel.prototype.createNewBind = function(name)
    {
        var bind = null;
        var pos = name.lastIndexOf('.');
        if (pos > 0)
        {
            var widgetName = name.substring(0, pos);

            var widgetProperty = name.substring(pos + 1);

            var widget = (Polymer.dom ? Polymer.dom(document) : document).querySelector('#' + widgetName);
            if (widget)
            {
                bind = new WidgetBindValue(widget, widgetProperty, widget[widgetProperty]);

                if (widget.propertyForAttribute)
                {
                    widgetProperty = widget.propertyForAttribute(widgetProperty) || widgetProperty;
                }
                var streamingListener = widget[widgetProperty + 'StreamingDataListener'];
                if (streamingListener && typeof streamingListener === 'function')
                {
                    bind.onStreamingDataReceived = streamingListener.bind(widget);
                }
            }
            else
            {
                ti_logger.error(gc.databind.name, "Failed to find widget #" + widgetName);
            }
        }
        return bind;
    };

    gc.databind.registry.registerModel(new WidgetModel(), false, '$');

}());

/*****************************************************************
 * Copyright (c) 2015 Texas Instruments and others
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
gc.databind.internal = gc.databind.internal || {};

gc.databind.internal.PropertyModel = function()
{
    gc.databind.AbstractBindFactory.call(this);
    this.init();
};

gc.databind.internal.PropertyModel.prototype = new gc.databind.AbstractBindFactory('prop');

gc.databind.internal.PropertyModel.prototype.createNewBind = function(name)
{
    return new gc.databind.VariableBindValue();
};

gc.databind.registry.registerModel(new gc.databind.internal.PropertyModel());


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

(function() {
	
	var MathModel = function()
	{
	    gc.databind.AbstractBindFactory.call(this);
	    this.init();
	};

	MathModel.prototype = new gc.databind.AbstractBindFactory('Math');
	
	MathModel.prototype.createNewBind = function(name)
	{
		if (Math.hasOwnProperty(name))
		{
			var result = Math[name];
			
			if (typeof result == 'function')
			{
				return new gc.databind.FunctionBindValue(result, Math);
			}
			else
			{
				return new gc.databind.ConstantBindValue(result);
			}
		}
	};
	
	gc.databind.registry.registerModel(new MathModel());
	
}());

/*****************************************************************
 * Copyright (c) 2016 Texas Instruments and others
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
 * Callback interface for encoding and decoding data to and from packets.
 * 
 * @interface
 */
gc.databind.IPacketCodec = function()
{
};

/**
 * Encodes data into a packet for sending.
 *    
 * @param target - call back function for passing encoded packets for sending to.
 * @param data {Object} - The data object to encode into a packet for sending.
 */
gc.databind.IPacketCodec.prototype.encode = function(target, data) {};

/**
 * Decodes packets into data objects.  One object for each packet of data.  The packet data is not framed,
 * so this method is responsible for decoding partial packets as well as multiple packets.  Partial packets
 * should not be decoded, but deferred until the next method call with more raw data to process.  This method
 * should return a flag indicating if it is receiving valid packet data or not.  This return flag will drive
 * the connected/disconnected state of the transport layer. 
 *    
 * @param target - callback function to pass the decoded object received to.   
 * @param data {Number[]} - The raw data received that needs to be decoded from packets into objects.
 * @return {boolean} true if packet decoding is receiving valid data or false if the packet decoding is receiving invalid data.  
 */
gc.databind.IPacketCodec.prototype.decode = function(target, data) {};

/*****************************************************************
 * Copyright (c) 2018 Texas Instruments and others
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
 * Interface for reading and writing values from a target by encoding and decoding 
 * packets over a transport.  This interface is generally used by polling models to
 * perform periodic read and write operations, instead of pushing data as it changes.
 * 
 * @interface
 * @extends gc.databind.IPacketCodec
 */
gc.databind.IPollingPacketCodec = function()
{
};

gc.databind.IPollingPacketCodec.prototype = new gc.databind.IPacketCodec();

/**
 * Start a read operation to read a value from the target.
 *    
 * @param {Object} entity  - model specific info identifying which value to read from the target.
 * @param {Object} model - a reference to the model requesting this read operation.
 * @param {number} [coreIndex]  - for device arrays: -1 for all cores (returns an array of values), or
 *     0-based core index (returns a single value for the specified core)
 * @return {Promise} - A promise that is resolved with the value read from the target.
 */
gc.databind.IPollingPacketCodec.prototype.readValue = function(entity, model, coreIndex)
{
};

/**
 * Start a write operation to write a value to the target.
 *    
 * @param {object} entity - model specific info identifying which value to write to the target.
 * @param {Object} value - The value to write to the target
 * @param {Object} model - A reference to the model requesting this write operation.
 * @param {number} [coreIndex] - for device arrays: -1 for all cores (value is an array of values), or
 *     0-based core index (value is a single value to be written to the specified core)
 * @returns {Promise} - A promise when the writeValue operation has completed. 
 */
gc.databind.IPollingPacketCodec.prototype.writeValue = function(entity, value, model, coreIndex)
{
};

/**
 * Connect method that is called when the transport is connected.  This method provides
 * a means for performing protocol handshaking with the target before reading or writing values.
 *    
 * @param {object} settings - model specific info containing settings for parameterizing the codec.
 * @returns {Promise} - A promise when the connection has been completed. 
 */
gc.databind.IPollingPacketCodec.prototype.connect = function(settings)
{
};

/**
 * Disconnect method that is called when the transport disconnects.  This method provides
 * a means of performing clean up when the target disconnects.     
 *    
 */
gc.databind.IPollingPacketCodec.prototype.disconnect = function()
{
};

/**
 * Implmentation of encode() method that passed data through to the next codec.
 * For a polling packet codec, the readValue and writeValue methods send packets
 * by calling this.encoder(packet).  The encoder function will already be bound to
 * the next codec in the chain, but it calls the encode method on this codec first.
 * So, an implementation of encode() is required to pass the packet to the target codec.     
 *    
 */
gc.databind.IPollingPacketCodec.prototype.encode = function(target, data)
{
    target(data); 
};

/*****************************************************************
 * Copyright (c) 2016-17 Texas Instruments and others
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
gc.databind.internal = gc.databind.internal || {};

(function() 
{
    var codecAliases = {};
    var codecRegistry = {};
    var serialFrameDecoderRegistry = {};
    var nullFunction = function() {};
    var nullPromiseFunction = function() { return Q(); };

    /**
     * @namespace
     */
    gc.databind.PacketCodecFactory = 
    {
        /** 
         * Method for creating Packet protocol chains.  
         * 
         * @param {string} codecName - the name identifying the protocol or packet codec chain to create.
         * @param {function} encoder - the transport method used to send packets of data after encoding.
         * @param {function} [decoder] - the model's handler to receive the target values after decoding.
         * @param {boolean} [useSerialFrameDecoder] - if true, add the registered serial frame decoder to detect 
         * the start and end of packets; otherwise, do not. 
         * @returns {object} the first codec in the chain with added encoder() and decoder() helper functions 
         * for pushing data through the codec chain.
         */
        create: function(codecName, encoder, decoder, useSerialFrameDecoder)
        {
            var aliasNames = codecName.toLowerCase().split('+');
            codecName = codecAliases[aliasNames[0]] || aliasNames[0]; 
            for(var j = 1; j < aliasNames.length; j++)
            {
                codecName = codecName + '+' + (codecAliases[aliasNames[j]] || aliasNames[j]);
            }
            
            var codecs = codecName.toLowerCase().split('+');
            encoder = encoder || nullFunction;
            decoder = decoder || nullFunction;
            
            // construct codes
            var codec;
            for(var i = codecs.length; i-- > 0; )
            {
                codec = codecs[i];
                codec = codecRegistry[codec.toLowerCase()];
                codec = codec && new codec();
                codecs[i] = codec;
            }
            
            // add serial frame decoder if necessary for serial links
            if (useSerialFrameDecoder)
            {
                var serialFrameDecoder = serialFrameDecoderRegistry[aliasNames[aliasNames.length-1]];
                if (serialFrameDecoder && (serialFrameDecoder instanceof String || typeof serialFrameDecoder === 'string')) 
                {
                    serialFrameDecoder = codecRegistry[serialFrameDecoder.toLowerCase()];
                }
                serialFrameDecoder = serialFrameDecoder && new serialFrameDecoder();
                if (serialFrameDecoder)
                {
                    codecs.push(serialFrameDecoder);
                }
            }
            
            // create encoder chain
            for(i = codecs.length; i-- > 0; )
            {
                codec = codecs[i];
                if (codec)
                {
                    encoder = codec.encode.bind(codec, encoder);
                }
            }
            
            // create decoder chain
            for(i = 0; i < codecs.length; i++ )
            {
                codec = codecs[i];
                if (codec)
                {
                    decoder = codec.decode.bind(codec, decoder);
                }
            }
            
            // attach bound encoder and decoder methods to first codec in the chain.
            var result = null;
            if (codecs && codecs.length > 0 && codecs[0]) {
                result = codecs[0];
                result.encoder = encoder;
                result.decoder = decoder;
                result.connect = result.connect || nullPromiseFunction;
                result.disconnect = result.disconnect || nullPromiseFunction;
            }
            return result;
        },
        
        /** 
         * Method for registering custom codec's for use by the create() method.
         *    
         * @param {string} name - the name identifying the packet codec.
         * @param {function} constructor - the constructor functon for for the packet codec.
         * @param {string} [baseCodecs] - List of base codec names, separated by a plus '+' character that are
         * to be chained on the end of the codec when is is created. 
         * @param {function} [serialFrameDecoder] - the constructor for a frame decoder to detect beginning and 
         * end of each packet over a serial streaming transport, like USB.   
         */
        registerCustomCodec: function(name, constructor, baseCodecs, serialFrameDecoder)
        {
            name = name.toLowerCase();
            codecRegistry[name] = constructor;
            if (baseCodecs)
            {
                codecAliases[name] = name + '+' + baseCodecs;
            }
            if (serialFrameDecoder)
            {
                serialFrameDecoderRegistry[name] = serialFrameDecoder;
            }
        },
        
        /** 
         * Method for retrieving the constructor for a particular codec.  This is useful
         * if you wish to just create an instance of one codec without creating an entire
         * protocol chain, or if you wish to access static members through the prototype
         * member of a codec.
         *    
         * @param {string} name - the name identifying the packet codec.
         * @returns {function} the constructor for the named codec. 
         */
        getConstructor: function(name)
        {
            return codecRegistry[name.toLowerCase()];
        }
    };
    
    // aliases for backward compatability
    gc.databind.registerCustomCodec = gc.databind.PacketCodecFactory.registerCustomCodec;
    gc.databind.internal.PacketCodecFactory = gc.databind.PacketCodecFactory;
    
    var _codecsReady = Q.defer();
    gc.databind.codecsReady = new gc.databind.ProgressCounter(function() { _codecsReady.resolve(); });
    gc.databind.codecsReady.then = _codecsReady.promise.then.bind(_codecsReady.promise);
}());


/*****************************************************************
 * Copyright (c) 2016 Texas Instruments and others
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
gc.databind.internal = gc.databind.internal || {};

(function() {
    
    gc.databind.internal.DelimitedTextPacketCodec = function(delimiter, escapeChar)
    {
        this._delimiter = this.delimiter || '\n';
        this._escapeChar = escapeChar;
        this._partialMessage = '';
        this._isConnected = false;
    };
    
    gc.databind.internal.DelimitedTextPacketCodec.prototype = new gc.databind.IPacketCodec();
    
    gc.databind.internal.DelimitedTextPacketCodec.prototype.encode = function(target, value) 
    {
        if (this._escapeChar)
        {
            value = value.split(this._escapeChar).join(this._escapeChar + this._escapeChar);
            value = value.split(this._delimiter).join(this._escapeChar + this._delimiter);
        }
        target(value + this._delimiter);
    };
    
    gc.databind.internal.DelimitedTextPacketCodec.prototype.decode = function(target, rawdata)
    {
        try
        {
            var message = typeof rawdata === 'string' ? rawdata : String.fromCharCode.apply(null, rawdata);
            var packets = (this._partialMessage + message).split(this._delimiter);
            var size = packets.length - 1;
            for (var i = 0; i < size; i++)
            {
                var packet = packets[i];
                if (this._escapeChar)
                {
                    packet = packet.split(this._escapeChar + this._delimiter).join(this._delimiter);
                    packet = packet.split(this._escapeChar + this._escapeChar).join(this._escapeChar);
                }
                this._isConnected = target(packets[i]);
            }
            this._partialMessage = packets[size];
        }
        catch(ex)
        {
            console.log('DelimitedTextPacketCodec: Exception converting buffer to text string');
        }
        return this._isConnected;
    };

    var CRDelimitedTextPacketCodec = function() 
    {
        
    };
    CRDelimitedTextPacketCodec.prototype = new gc.databind.internal.DelimitedTextPacketCodec('\n');

    gc.databind.registerCustomCodec('CR', CRDelimitedTextPacketCodec);

}());

/*****************************************************************
 * Copyright (c) 2018 Texas Instruments and others
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
gc.databind.internal = gc.databind.internal || {};

(function() 
{
    /** 
     * Abstract class for a packet frame decoder.  A frame decoder is used to detect/align the start of packets
     * in a stream of data received over a transport like USB.  The derived class must implement the getPacketLength()
     * method to validate and calculate the length of each possible packet of data.  The base implementations of decode() 
     * method will repeatedly call this method to test for possible packets.  Optionally, the derived class can provide
     * a start byte, which the base implementation will use to skip past packets that do not start with the exact byte
     * automatically.   
     *    
     * @constructor
     * @param {Number} [startByte] - the first byte used to identify the start of a packet header.
     * @implements gc.databind.IPacketCodec
     */
    gc.databind.AbstractFrameDecoder = function(startByte, getLengthMethod)
    {
        this.isConnected = false;
        this.partialPacket = [];
        this.frameStart = startByte;
        if (getLengthMethod)
        {
            this.getPacketLength = getLengthMethod;
        }
    };

    gc.databind.AbstractFrameDecoder.prototype = new gc.databind.IPacketCodec();

    /**
     * Implementation of the encode() method that does not do any additional process
     * on the outgoing data packets. 
     */
    gc.databind.AbstractFrameDecoder.prototype.encode = function(target, value) 
    {
        target(value);
    };
    
    /**
     * Implementation of the decode() method that attempts to detect and align a valid packet.  This
     * method relies on the getPacketLength() method implemented by the derived class to 
     * perform this function.  
     */
    gc.databind.AbstractFrameDecoder.prototype.decode = function(target, rawData)
    {
        if (this._partialPacket)
        {
            // concatentate new data with saved partial data
            rawData = this._partialPacket.concat(rawData);
            this._partialPacket = null; 
        }
        var i = 0;
        var length = rawData.length;
        
        // process one or more packets (whether valid of not).
        while(i < length)
        {   
            // if provided, test for the start of packet.
            if (this.frameStart)
            {
                // skip till first delimiter
                while(i < length && rawData[i] !== this.frameStart)
                {
                    i++;
                    this.isConnected = false; // discarding data.
                }
            }
            
            if (i < length)
            {
                // calculate the length of the packet, zero if not enough data to determine, and -1 for error packets  
                var packetLength = this.getPacketLength(rawData, i);
                if (packetLength > 0 && packetLength + i <= length)
                {
                    // enough data to decode a packet.
                    this.isConnected = target((i === 0 && length === packetLength) ? rawData : rawData.slice(i, i + packetLength));
                    if (this.isConnected)
                    {
                        // valid packet processed, skip forward
                        i += packetLength;
                    }
                    else  // invalid packet decoded, skip forward only by one byte to search for start of valid packet.
                    { 
                        i++;
                    }
                }
                else if (packetLength < 0)
                {
                    // invalid packet already, skip forward one or more bytes.
                    i -= packetLength;
                    this.isConnected = false; // discarding data.
                }
                else if (i === 0)
                {
                    // no data consumed, save all data for next pass.
                    this._partialPacket = rawData; 
                    break;
                }
                else if (i < length)
                {
                    // not enough data remaining for a single packet, defer the partial packet until more data has arrived.
                    this._partialPacket = rawData.slice(i);
                    break;
                }
            }
        }
        return this.isConnected;
    };
    
    /** 
     * Abstract method that the derived class must implement.  The implementation of this method should first verify that
     * there is enough data to determine that the packet is valid and the specific length of the packet.  If there is not
     * enough data, this method should return zero.  If there is enough data, and the packet is invalid, then return -1.
     * Otherwise, the return value is the number of bytes in the packet, and the base implementation will use this to
     * detect the end of the packet.
     *    
     * @param {Number[]} buffer - a byte buffer containing the data received from the target.
     * @param {Number} offset - zero based offset into the buffer of data where a possible packet may start.
     */
    gc.databind.AbstractFrameDecoder.prototype.getPacketLength = function(buffer, offset)
    {
        return -1;
    };
    
    // alias for backward compatability
    gc.databind.internal.GenericFrameDecoder = gc.databind.AbstractFrameDecoder;
}());

/*****************************************************************
 * Copyright (c) 2016 Texas Instruments and others
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

(function() 
{
    var JsonCodec = function()
    {
        this.numPacketsReceived = 0;
        this._isConnected = false;
    };

    JsonCodec.prototype = new gc.databind.IPacketCodec();

    JsonCodec.prototype.encode = function(target, value) 
    {
        target(JSON.stringify(value));
    };

    JsonCodec.prototype.decode = function(target, rawdata)
    {
        try
        {
            var cleanPacket = "";
            var message = typeof rawdata === 'string' ? rawdata : String.fromCharCode.apply(null, rawdata);

            try
            {
                // remove any leading or trailing garbage characters
                cleanPacket = message.substring(message.indexOf('{'), message.lastIndexOf('}') + 1);
                // remove any spaces between : and the value
                while (cleanPacket.indexOf(': ') > 0)
                {
                    cleanPacket = cleanPacket.substring(0, cleanPacket.indexOf(': ') + 1) + cleanPacket.substring(cleanPacket.indexOf(': ') + 2).trim();
                }
                this._isConnected = target(JSON.parse(cleanPacket));
            }
            catch(e)
            {
                this._isConnected = false;
                if (this.numPacketsReceived > 0) 
                {
                    console.log('JsonCodec: received non JSON data string:[' + cleanPacket + ']');
                }
            }
            if (this.numPacketsReceived === 0) 
            {
                console.log("Put breakpoint here to debug problems with serial I/O bindings");
            }
            this.numPacketsReceived++;
        }
        catch(ex)
        {
            console.log('JsonCodec: Exception converting buffer to text string');
            this._isConnected = false;
        }
        return this._isConnected;
    };

    gc.databind.registerCustomCodec('json', JsonCodec, null, 'cr');
    
}());

/*****************************************************************
 * Copyright (c) 2020 Texas Instruments and others
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *  Winnie Lai - Initial API and implementation
 *****************************************************************/
/*****************************************************************
 * The implementation of serialzie and desrialzie of MessagePack
 * is from https://github.com/ygoe/msgpack.js
 * 
 * Copyright (c) 2019, Yves Goergen, https://unclassified.software/source/msgpack-js
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
 * associated documentation files (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge, publish, distribute,
 * sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all copies or
 * substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT
 * NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
 * DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 ******************************************************************/

var gc = gc || {};
gc.databind = gc.databind || {};

(function() 
{
	// Serializes a value to a MessagePack byte array.
	// 
	// data: The value to serialize. This can be a scalar, array or object.
	function serialize(data, options) {
		var pow32 = 0x100000000;   // 2^32
		var floatBuffer, floatView;
		var array = new Uint8Array(128);
		var length = 0;
		append(data);
		return array.subarray(0, length);

		function append(data) {
			switch (typeof data) {
				case "undefined":
					appendNull(data);
					break;
				case "boolean":
					appendBoolean(data);
					break;
				case "number":
					appendNumber(data);
					break;
				case "string":
					appendString(data);
					break;
				case "object":
					if (data === null)
						appendNull(data);
					else if (data instanceof Date)
						appendDate(data);
					else if (Array.isArray(data))
						appendArray(data);
					else if (data instanceof Uint8Array || data instanceof Uint8ClampedArray)
						appendBinArray(data);
					else if (data instanceof Int8Array || data instanceof Int16Array || data instanceof Uint16Array ||
						data instanceof Int32Array || data instanceof Uint32Array ||
						data instanceof Float32Array || data instanceof Float64Array)
						appendArray(data);
					else
						appendObject(data);
					break;
			}
		}

		function appendNull(data) {
			appendByte(0xc0);
		}

		function appendBoolean(data) {
			appendByte(data ? 0xc3 : 0xc2);
		}

		function appendNumber(data) {
			if (isFinite(data) && Math.floor(data) === data) {
				// Integer
				if (typeof options.encodeInteger === 'function') {
					appendBytes(options.encodeInteger(data));
				}
				else if (options.encodeIntegerBitsize === 32) {
					if (data >= 0) {   // uint32
						appendBytes([0xce, data >>> 24, data >>> 16, data >>> 8, data]);
					}
					else {   // int32
						appendBytes([0xd2, data >>> 24, data >>> 16, data >>> 8, data]);
					}
				}
				else if (options.encodeIntegerBitsize === 16) {
					if (data >= 0) {  // uint16
						appendBytes([0xcd, data >>> 8, data]);
					}
					else {   // int16
						appendBytes([0xd1, data >>> 8, data]);
					}
				}
				else if (options.encodeIntegerBitsize === 8) {
					if (data >= 0) {  // uint8
						appendBytes([0xcc, data]);
					}
					else {   // int8
						appendBytes([0xd0, data]);;
					}
				}
				else if (data >= 0 && data <= 0x7f) {
					appendByte(data);
				}
				else if (data < 0 && data >= -0x20) {
					appendByte(data);
				}
				else if (data > 0 && data <= 0xff) {   // uint8
					appendBytes([0xcc, data]);
				}
				else if (data >= -0x80 && data <= 0x7f) {   // int8
					appendBytes([0xd0, data]);
				}
				else if (data > 0 && data <= 0xffff) {   // uint16
					appendBytes([0xcd, data >>> 8, data]);
				}
				else if (data >= -0x8000 && data <= 0x7fff) {   // int16
					appendBytes([0xd1, data >>> 8, data]);
				}
				else if (data > 0 && data <= 0xffffffff) {   // uint32
					appendBytes([0xce, data >>> 24, data >>> 16, data >>> 8, data]);
				}
				else if (data >= -0x80000000 && data <= 0x7fffffff) {   // int32
					appendBytes([0xd2, data >>> 24, data >>> 16, data >>> 8, data]);
				}
				else if (data > 0 && data <= 0xffffffffffffffff) {   // uint64
					// Split 64 bit number into two 32 bit numbers because JavaScript only regards
					// 32 bits for bitwise operations.
					var hi = data / pow32;
					var lo = data % pow32;
					appendBytes([0xd3, hi >>> 24, hi >>> 16, hi >>> 8, hi, lo >>> 24, lo >>> 16, lo >>> 8, lo]);
				}
				else if (data >= -0x8000000000000000 && data <= 0x7fffffffffffffff) {   // int64
					appendByte(0xd3);
					appendInt64(data);
				}
				else if (data < 0) {   // below int64
					appendBytes([0xd3, 0x80, 0, 0, 0, 0, 0, 0, 0]);
				}
				else {   // above uint64
					appendBytes([0xcf, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]);
				}
			}
			else {
				// Float
				if (!floatView) {
					floatBuffer = new ArrayBuffer(8);
					floatView = new DataView(floatBuffer);
				}
				floatView.setFloat64(0, data);
				appendByte(0xcb);
				appendBytes(new Uint8Array(floatBuffer));
			}
		}

		function appendString(data) {
			var bytes = encodeUtf8(data);
			var length = bytes.length;

			if (length <= 0x1f)
				appendByte(0xa0 + length);
			else if (length <= 0xff)
				appendBytes([0xd9, length]);
			else if (length <= 0xffff)
				appendBytes([0xda, length >>> 8, length]);
			else
				appendBytes([0xdb, length >>> 24, length >>> 16, length >>> 8, length]);

			appendBytes(bytes);
		}

		function appendArray(data) {
			var length = data.length;

			if (length <= 0xf)
				appendByte(0x90 + length);
			else if (length <= 0xffff)
				appendBytes([0xdc, length >>> 8, length]);
			else
				appendBytes([0xdd, length >>> 24, length >>> 16, length >>> 8, length]);

			for (var index = 0; index < length; index++) {
				append(data[index]);
			}
		}

		function appendBinArray(data) {
			var length = data.length;

			if (length <= 0xf)
				appendBytes([0xc4, length]);
			else if (length <= 0xffff)
				appendBytes([0xc5, length >>> 8, length]);
			else
				appendBytes([0xc6, length >>> 24, length >>> 16, length >>> 8, length]);

			appendBytes(data);
		}

		function appendObject(data) {
			var length = 0;
			for (var key in data) length++;

			if (length <= 0xf)
				appendByte(0x80 + length);
			else if (length <= 0xffff)
				appendBytes([0xde, length >>> 8, length]);
			else
				appendBytes([0xdf, length >>> 24, length >>> 16, length >>> 8, length]);

			for (var key in data) {
				append(key);
				append(data[key]);
			}
		}

		function appendDate(data) {
			var sec = data.getTime() / 1000;
			if (data.getMilliseconds() === 0 && sec >= 0 && sec < 0x100000000) {   // 32 bit seconds
				appendBytes([0xd6, 0xff, sec >>> 24, sec >>> 16, sec >>> 8, sec]);
			}
			else if (sec >= 0 && sec < 0x400000000) {   // 30 bit nanoseconds, 34 bit seconds
				var ns = data.getMilliseconds() * 1000000;
				appendBytes([0xd7, 0xff, ns >>> 22, ns >>> 14, ns >>> 6, ((ns << 2) >>> 0) | (sec / pow32), sec >>> 24, sec >>> 16, sec >>> 8, sec]);
			}
			else {   // 32 bit nanoseconds, 64 bit seconds, negative values allowed
				var ns = data.getMilliseconds() * 1000000;
				appendBytes([0xc7, 12, 0xff, ns >>> 24, ns >>> 16, ns >>> 8, ns]);
				appendInt64(sec);
			}
		}

		function appendByte(byte) {
			if (array.length < length + 1) {
				var newLength = array.length * 2;
				while (newLength < length + 1)
					newLength *= 2;
				var newArray = new Uint8Array(newLength);
				newArray.set(array);
				array = newArray;
			}
			array[length] = byte;
			length++;
		}

		function appendBytes(bytes) {
			if (array.length < length + bytes.length) {
				var newLength = array.length * 2;
				while (newLength < length + bytes.length)
					newLength *= 2;
				var newArray = new Uint8Array(newLength);
				newArray.set(array);
				array = newArray;
			}
			array.set(bytes, length);
			length += bytes.length;
		}

		function appendInt64(value) {
			// Split 64 bit number into two 32 bit numbers because JavaScript only regards 32 bits for
			// bitwise operations.
			var hi, lo;
			if (value >= 0) {
				// Same as uint64
				hi = value / pow32;
				lo = value % pow32;
			}
			else {
				// Split absolute value to high and low, then NOT and ADD(1) to restore negativity
				value++;
				hi = Math.abs(value) / pow32;
				lo = Math.abs(value) % pow32;
				hi = ~hi;
				lo = ~lo;
			}
			appendBytes([hi >>> 24, hi >>> 16, hi >>> 8, hi, lo >>> 24, lo >>> 16, lo >>> 8, lo]);
		}
	}

	// Deserializes a MessagePack byte array to a value.
	//
	// array: The MessagePack byte array to deserialize. This must be an Array or Uint8Array containing bytes, not a string.
	function deserialize(array, posHint) { // TI change: add posHint
		var pow32 = 0x100000000;   // 2^32
		// let pos = 0;
		var pos = posHint || 0; // TI change: add posHint
		if (array instanceof ArrayBuffer) {
			array = new Uint8Array(array);
		}
		if (typeof array !== "object" || typeof array.length === "undefined") {
			throw new Error("Invalid argument type: Expected a byte array (Array or Uint8Array) to deserialize.");
		}
		if (!array.length) {
			throw new Error("Invalid argument: The byte array to deserialize is empty.");
		}
		if (pos >= array.length) { // TI change: add one more check of insufficent data
			throw new Error("Invalid argument: The byte array has no enough data to start at posHint.");
		}
		if (!(array instanceof Uint8Array)) {
			array = new Uint8Array(array);
		}
		var startPos = pos;
		var data = read();
		if (pos < array.length) {
			// Junk data at the end
		}
		// return data;
		return { data: data, nextIndex: pos }; // TI change: also return pos to indicate unconsumed data, which can be next partial data 

		function read() {
			hasData(array, pos, 1);
			const byte = array[pos++];
			if (byte >= 0x00 && byte <= 0x7f) return byte;   // positive fixint
			if (byte >= 0x80 && byte <= 0x8f) return readMap(byte - 0x80);   // fixmap
			if (byte >= 0x90 && byte <= 0x9f) return readArray(byte - 0x90);   // fixarray
			if (byte >= 0xa0 && byte <= 0xbf) return readStr(byte - 0xa0);   // fixstr
			if (byte === 0xc0) return null;   // nil
			if (byte === 0xc1) throw new Error(InvalidByteCodeHexC1);   // never used
			if (byte === 0xc2) return false;   // false
			if (byte === 0xc3) return true;   // true
			if (byte === 0xc4) return readBin(-1, 1);   // bin 8
			if (byte === 0xc5) return readBin(-1, 2);   // bin 16
			if (byte === 0xc6) return readBin(-1, 4);   // bin 32
			if (byte === 0xc7) return readExt(-1, 1);   // ext 8
			if (byte === 0xc8) return readExt(-1, 2);   // ext 16
			if (byte === 0xc9) return readExt(-1, 4);   // ext 32
			if (byte === 0xca) return readFloat(4);   // float 32
			if (byte === 0xcb) return readFloat(8);   // float 64
			if (byte === 0xcc) return readUInt(1);   // uint 8
			if (byte === 0xcd) return readUInt(2);   // uint 16
			if (byte === 0xce) return readUInt(4);   // uint 32
			if (byte === 0xcf) return readUInt(8);   // uint 64
			if (byte === 0xd0) return readInt(1);   // int 8
			if (byte === 0xd1) return readInt(2);   // int 16
			if (byte === 0xd2) return readInt(4);   // int 32
			if (byte === 0xd3) return readInt(8);   // int 64
			if (byte === 0xd4) return readExt(1);   // fixext 1
			if (byte === 0xd5) return readExt(2);   // fixext 2
			if (byte === 0xd6) return readExt(4);   // fixext 4
			if (byte === 0xd7) return readExt(8);   // fixext 8
			if (byte === 0xd8) return readExt(16);   // fixext 16
			if (byte === 0xd9) return readStr(-1, 1);   // str 8
			if (byte === 0xda) return readStr(-1, 2);   // str 16
			if (byte === 0xdb) return readStr(-1, 4);   // str 32
			if (byte === 0xdc) return readArray(-1, 2);   // array 16
			if (byte === 0xdd) return readArray(-1, 4);   // array 32
			if (byte === 0xde) return readMap(-1, 2);   // map 16
			if (byte === 0xdf) return readMap(-1, 4);   // map 32
			if (byte >= 0xe0 && byte <= 0xff) return byte - 256;   // negative fixint
			// console.debug("msgpack array:", array);
			throw new Error("Invalid byte value '" + byte + "' at index " + (pos - 1) + " in the MessagePack binary data (length " + array.length + "): Expecting a range of 0 to 255. This is not a byte array.");
		}

		function hasData(ary, testPos, testSize) {
			if (testPos + testSize > ary.length)
				throw new Error(NotEnoughData);
			return true;
		}

		function readInt(size) {
			hasData(array, pos, size);
			var value = 0;
			var first = true;
			while (size-- > 0) {
				if (first) {
					var byte = array[pos++];
					value += byte & 0x7f;
					if (byte & 0x80) {
						value -= 0x80;   // Treat most-significant bit as -2^i instead of 2^i
					}
					first = false;
				}
				else {
					value *= 256;
					value += array[pos++];
				}
			}
			return value;
		}

		function readUInt(size) {
			hasData(array, pos, size);
			var value = 0;
			while (size-- > 0) {
				value *= 256;
				value += array[pos++];
			}
			return value;
		}

		function readFloat(size) {
			hasData(array, pos, size);
			var view = new DataView(array.buffer, pos + array.byteOffset, size);
			pos += size;
			if (size === 4)
				return view.getFloat32(0, false);
			if (size === 8)
				return view.getFloat64(0, false);
		}

		function readBin(size, lengthSize) {
			if (size < 0) size = readUInt(lengthSize);
			hasData(array, pos, size);
			var data = array.subarray(pos, pos + size);
			pos += size;
			return data;
		}

		function readMap(size, lengthSize) {
			if (size < 0) size = readUInt(lengthSize);
			var data = {};
			while (size-- > 0) {
				var key = read();
				data[key] = read();
			}
			return data;
		}

		function readArray(size, lengthSize) {
			if (size < 0) size = readUInt(lengthSize);
			var data = [];
			while (size-- > 0) {
				data.push(read());
			}
			return data;
		}

		function readStr(size, lengthSize) {
			if (size < 0) size = readUInt(lengthSize);
			hasData(array, pos, size);
			var start = pos;
			pos += size;
			return decodeUtf8(array, start, size);
		}

		function readExt(size, lengthSize) {
			if (size < 0) size = readUInt(lengthSize);
			var type = readUInt(1);
			var data = readBin(size);
			switch (type) {
				case 255:
					return readExtDate(data);
			}
			return { type: type, data: data };
		}

		function readExtDate(data) {
			if (data.length === 4) {
				var sec = ((data[0] << 24) >>> 0) +
					((data[1] << 16) >>> 0) +
					((data[2] << 8) >>> 0) +
					data[3];
				return new Date(sec * 1000);
			}
			if (data.length === 8) {
				var ns = ((data[0] << 22) >>> 0) +
					((data[1] << 14) >>> 0) +
					((data[2] << 6) >>> 0) +
					(data[3] >>> 2);
				var sec = ((data[3] & 0x3) * pow32) +
					((data[4] << 24) >>> 0) +
					((data[5] << 16) >>> 0) +
					((data[6] << 8) >>> 0) +
					data[7];
				return new Date(sec * 1000 + ns / 1000000);
			}
			if (data.length === 12) {
				var ns = ((data[0] << 24) >>> 0) +
					((data[1] << 16) >>> 0) +
					((data[2] << 8) >>> 0) +
					data[3];
				pos -= 8;
				var sec = readInt(8);
				return new Date(sec * 1000 + ns / 1000000);
			}
			throw new Error("Invalid data length for a date value.");
		}
	}

	// Encodes a string to UTF-8 bytes.
	function encodeUtf8(str) {
		// Prevent excessive array allocation and slicing for all 7-bit characters
		var ascii = true, length = str.length;
		for (var x = 0; x < length; x++) {
			if (str.charCodeAt(x) > 127) {
				ascii = false;
				break;
			}
		}
		
		// Based on: https://gist.github.com/pascaldekloe/62546103a1576803dade9269ccf76330
		var i = 0, bytes = new Uint8Array(str.length * (ascii ? 1 : 4));
		for (var ci = 0; ci !== length; ci++) {
			var c = str.charCodeAt(ci);
			if (c < 128) {
				bytes[i++] = c;
				continue;
			}
			if (c < 2048) {
				bytes[i++] = c >> 6 | 192;
			}
			else {
				if (c > 0xd7ff && c < 0xdc00) {
					if (++ci >= length)
						throw new Error("UTF-8 encode: incomplete surrogate pair");
					var c2 = str.charCodeAt(ci);
					if (c2 < 0xdc00 || c2 > 0xdfff)
						throw new Error("UTF-8 encode: second surrogate character 0x" + c2.toString(16) + " at index " + ci + " out of range");
					c = 0x10000 + ((c & 0x03ff) << 10) + (c2 & 0x03ff);
					bytes[i++] = c >> 18 | 240;
					bytes[i++] = c >> 12 & 63 | 128;
				}
				else bytes[i++] = c >> 12 | 224;
				bytes[i++] = c >> 6 & 63 | 128;
			}
			bytes[i++] = c & 63 | 128;
		}
		return ascii ? bytes : bytes.subarray(0, i);
	}

	// Decodes a string from UTF-8 bytes.
	function decodeUtf8(bytes, start, length) {
		// Based on: https://gist.github.com/pascaldekloe/62546103a1576803dade9269ccf76330
		var i = start, str = "";
		length += start;
		while (i < length) {
			var c = bytes[i++];
			if (c > 127) {
				if (c > 191 && c < 224) {
					if (i >= length)
						throw new Error("UTF-8 decode: incomplete 2-byte sequence");
					c = (c & 31) << 6 | bytes[i++] & 63;
				}
				else if (c > 223 && c < 240) {
					if (i + 1 >= length)
						throw new Error("UTF-8 decode: incomplete 3-byte sequence");
					c = (c & 15) << 12 | (bytes[i++] & 63) << 6 | bytes[i++] & 63;
				}
				else if (c > 239 && c < 248) {
					if (i + 2 >= length)
						throw new Error("UTF-8 decode: incomplete 4-byte sequence");
					c = (c & 7) << 18 | (bytes[i++] & 63) << 12 | (bytes[i++] & 63) << 6 | bytes[i++] & 63;
				}
				else throw new Error("UTF-8 decode: unknown multibyte start 0x" + c.toString(16) + " at index " + (i - 1));
			}
			if (c <= 0xffff) str += String.fromCharCode(c);
			else if (c <= 0x10ffff) {
				c -= 0x10000;
				str += String.fromCharCode(c >> 10 | 0xd800)
				str += String.fromCharCode(c & 0x3FF | 0xdc00)
			}
			else throw new Error("UTF-8 decode: code point 0x" + c.toString(16) + " exceeds UTF-16 reach");
		}
		return str;
    }
    
    var MessagePackCodec = function() {
		this.isConnected = false;
		this.partialData = [];
		// In normal case, the partial data grows when not receiving a complete packet,
		// and shrinks when a complete packet is received and decoded.
		// If the partial data ever grows, the app will crash, and it is better
		// to log this warning. The lastPartialDataWarningSize is set to a high mark (400K),
		// and is doubled after each warning to avoid flood of warnings.
		this.lastPartialDataWarningSize = 400000;
		this.codecOptions = {};
	};

	var InvalidByteCodeHexC1 = "Invalid byte code 0xc1 found.";
	var NotEnoughData = "Not enough data";

    MessagePackCodec.prototype = new gc.databind.IPacketCodec();

    MessagePackCodec.prototype.encode = function(target, value) {
        const encodedData = serialize(value, this.codecOptions);
        target(Array.from(encodedData)); // encodedData is Uint8Array, need to change it to number[] for going through cloudagent ws
    };

    MessagePackCodec.prototype.decode = function(target, data) {
		// if upstream decoder changes byte[] to string, e.g. CR decoder uses String.fromCharCode to do it,
		// we need to change string back to byte[]
		var bytes = data;
		if (typeof data === 'string') {
			bytes = [];
			for (var i=0; i<data.length; i++) {
				bytes.push(data.charCodeAt(i));
			}
		}
		this.partialData = this.partialData.concat(bytes);
		var posHint = 0;
		while (posHint < this.partialData.length) {
			var decodedResult;
			try {
				decodedResult = deserialize(this.partialData, posHint);
				posHint = decodedResult.nextIndex;
				if (decodedResult !== undefined) {
					// get at least one packet and we can mark connected since last connect
					this.isConnected = true;
					target(decodedResult.data);
				}
			} catch(error) {
				// It could be not enough data, and wait for next cycle to get more data
				// It could be the data does not conform to messagePacket protocol, and log error anyway.
				if (error.message && error.message === InvalidByteCodeHexC1) {
					this.partialData = this.partialData.slice(posHint+1);
					posHint = 0;
				} else if (error.message && error.message === NotEnoughData) {
					break;
				} else {
					gc.console.error('MessagePackCodec', function() {
						return error;
					});
					posHint++;
				}
			}
		}
		if (posHint > 0) {
			this.partialData = this.partialData.slice(posHint);
		} else if (posHint === 0 && this.partialData.length > this.lastPartialDataWarningSize) {
			// posHint 0 indicates the so-far partial data is not decodable due to incomplete packet.
			// If partialData.length is really big at the same time and keeps growing, it could be
			// the received data does not conform to messagePacket protocol.
			gc.console.warning('MessagePackCodec', 'Received data but cannot decode it. Please check the content of data.')
			this.lastPartialDataWarningSize = 2 * this.lastPartialDataWarningSize;
		}
		return this.isConnected;
	};
	
	var messagePackBaseCodecName = 'messagePackDelimiter'; // standard name of baseCodecs of messagePackCodec
	gc.databind.registerCustomCodec('messagePack', MessagePackCodec, messagePackBaseCodecName);

	// Register a codec under messagePackBaseCodecName.
	// The drawback of using any text delimited codec, like CR, is
	// that codec converts number[] to string, and outputs string.
	// This forces messagePackCodec to perform an extra step of converting
	// string back to number[] before the actual decoding.
	// GC app can override the bulit-in baseCodec of messagePackCodec by registering its own custom codec
	// under the same name messagePackBaseCodecName. Such codec can be
	// a binary decoder, i.e. its decode() takes in number[], find the packet, and output
	// the packet as number[]. It will save MessagePackCodec from coverting string to number[].
	var baseCodec = function() {
		this._isConnected = false;
	};
	baseCodec.prototype = new gc.databind.IPacketCodec();

	baseCodec.prototype.encode = function(target, value) {
		// value is number[]
		// have [c1, rest of data]?
		// target([0xc1].concat(value));
		// or have [data, followed by 0xa]?
		value.push(0xa);
		target(value);
	};

	baseCodec.prototype.decode = function(target, value) {
		// value is number[]
		// if (value.length > 0 && value[0] === 0xc1) {
		// 	value.shift();
		// }
		this._isConnected = target(value);
		return this._isConnected;
	};

	gc.databind.registerCustomCodec(messagePackBaseCodecName, baseCodec);

}());

/*****************************************************************
 * Copyright (c) 2016 Texas Instruments and others
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

(function() 
{
    var RawPacketCodec = function()
    {
    };

    RawPacketCodec.prototype = new gc.databind.IPacketCodec();

    RawPacketCodec.prototype.encode = function(target, value)
    {
        target(value);
    };
    
    RawPacketCodec.prototype.decode = function(target, rawdata) 
    {
        return target(rawdata);
    };

    gc.databind.registerCustomCodec('raw', RawPacketCodec);
    
}());

/*****************************************************************
 * Copyright (c) 2016 Texas Instruments and others
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
gc.databind.internal = gc.databind.internal || {};

gc.databind.internal.Base64PacketCodec = function()
{
};

gc.databind.internal.Base64PacketCodec.prototype.encode = function(target, arrayBuffer) 
{
    var message = arrayBuffer;
    if (arrayBuffer instanceof window.ArrayBuffer)
    {
        var buffer = new window.Uint8Array(arrayBuffer);
        message = String.fromCharCode.apply(null, buffer);
    }
    if (arrayBuffer instanceof Array)
    {
        message = String.fromCharCode.apply(null, arrayBuffer);
    }
    return target(window.btoa(message));
};

gc.databind.internal.Base64PacketCodec.prototype.decode = function(target, rawdata)
{
    try
    {
        var message = typeof rawdata === 'string' ? rawdata : String.fromCharCode.apply(null, rawdata);
        message = window.atob(message);
        
        var buffer = new window.ArrayBuffer(message.length); 
        var byteBuffer = new window.Uint8Array(buffer);
        for (var i = message.length; i-- > 0; ) 
        {
            byteBuffer[i] = message.charCodeAt(i);
        }
        return target(buffer);
    }
    catch(ex)
    {
        console.log('Base64PacketCodec: Exception converting base64 string to binary');
        return false;
    }
};

gc.databind.registerCustomCodec('Base64', gc.databind.internal.Base64PacketCodec);


/*****************************************************************
 * Copyright (c) 2018 Texas Instruments and others
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
gc.databind.internal = gc.databind.internal || {};

(function() 
{
    var MAX_PACKET_SIZE = 64; // size, in bytes, of a USB packet
    var HID_RESERVED = 2; // packet bytes reserved by HID

    var HidPacketcodec = function()
    {
        this._isConnected = false;
    };

    HidPacketcodec.prototype = new gc.databind.IPacketCodec();

    HidPacketcodec.prototype.encode = function(target, value) 
    {
        target([0x3f, value.length].concat(value));
    };

    HidPacketcodec.prototype.decode = function(target, rawData)
    {
        try
        {
            var nRead = rawData.length;
            if (nRead > MAX_PACKET_SIZE)
            {
                throw "Too much data";
            }
            else if (rawData[0] === 0x3F)
            {
                rawData.shift();
                rawData.shift();
                this._isConnected = target(rawData);
            }
        }
        catch(ex)
        {
            console.log('HidPacketcodec error: ' + ex);
            this._isConnected = false;
        }
        return this._isConnected;
    };

    gc.databind.registerCustomCodec('hid', HidPacketcodec);
    
}());

/*******************************************************************************
 * Copyright (c) 2015 Texas Instruments and others All rights reserved. This
 * program and the accompanying materials are made available under the terms of
 * the Eclipse Public License v1.0 which accompanies this distribution, and is
 * available at http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors: Gingrich, Paul - Initial API and implementation
 ******************************************************************************/
var gc = gc || {};
gc.databind = gc.databind || {};

(function() // closure for private static methods and data.
{
    var StreamingDataBind = function(parent, fieldName)
    {
        gc.databind.VariableLookupBindValue.call(this);

        this.setStale(true);

        this.parentBind = parent;
        this.fieldName = fieldName;

        parent.addStreamingListener(this);
    };

    StreamingDataBind.prototype = new gc.databind.VariableLookupBindValue();

    StreamingDataBind.prototype.onDataReceived = function(newValue)
    {
        try
        {
            var value = newValue[this.fieldName];
            if (value !== undefined)
            {
                this.setData(value);
                this.setStale(false);
            }
        }
        catch (e)
        {
        }
    };

    StreamingDataBind.prototype.onValueChanged = function(oldValue, newValue, progress)
    {
        this.sendValue(newValue, progress);
    };

    StreamingDataBind.prototype.sendValue = function(value, progress)
    {
        var data = {};
        data[this.fieldName] = value;
        this.parentBind.sendValue(data, progress);
    };

    /**
     * Abstract class that provides default implementation of IBindFactory for a streaming data model.  This class
     * implements the createNewBind() method for IBindFactory.  This model provides a $rawData binding that
     * stores the raw decoded object data received over the transport, and it provides value bindings to nested members within
     * that structure.  Binding names represent members within the raw data, and nested members are supported with the dot operator;
     * for example, "parent.child" would bind to a child member of the parent member within the raw data object.
     * Bindings are only updated when the member exists in the raw data.  That means that the transport does not need to send the
     * entire raw data structure every time, and can only send a raw data structure that only contains the changed members if it
     * so chooses.  However, if the data needs to be plotted against time, then that data needs to be transmitted on a periodic basis
     * regardless of whether or not it has changed.
     *
     * @constructor
     * @extends gc.databind.AbstractBindFactory
     * @param {string} name - uniquely identifiable name for this bind factory.
     * @param {object} codec - pointer to the codec chain for encoding and decoding messages over the transport.
    */
    gc.databind.AbstractStreamingDataModel = function(name, codec)
    {
        gc.databind.AbstractBindFactory.call(this, name);

        this._codec = codec;
    };

    gc.databind.AbstractStreamingDataModel.prototype = new gc.databind.AbstractBindFactory();

    gc.databind.AbstractStreamingDataModel.prototype.init = function()
    {
        gc.databind.AbstractBindFactory.prototype.init.call(this);

        this.createStorageProvider();

        this._streamingDataBind = new gc.databind.VariableLookupBindValue({});
        this._streamingDataBind.setIndex();
        var that = this;
        this._streamingDataBind.sendValue = function(value)
        {
            that.sendValue(value);
        };
    };

    gc.databind.AbstractStreamingDataModel.prototype.createNewBind = function(name)
    {
        if (name === '$rawData')
        {
            return this._streamingDataBind;
        }

        var pos = name.lastIndexOf('.');
        var parentBind;
        if (pos > 0)
        {
            parentBind = this.getBinding(name.substring(0, pos));
            name = name.substring(pos + 1);
        }
        else
        {
            parentBind = this._streamingDataBind;
        }
        return new StreamingDataBind(parentBind, name);
    };

    gc.databind.AbstractStreamingDataModel.prototype.sendValue = function(nextValue)
    {
        if (this._codec)
        {
            this._codec.encoder(nextValue);
        }
    };

    gc.databind.AbstractStreamingDataModel.prototype.encoder = function(nextValue)
    {
        this.sendPacket(nextValue);
    };
    gc.databind.AbstractStreamingDataModel.prototype.decoder = function(nextValue)
    {
        this._streamingDataBind.updateValue(nextValue);
        return true;
    };
    gc.databind.AbstractStreamingDataModel.prototype.receiveData = gc.databind.AbstractStreamingDataModel.prototype.decode;

    gc.databind.AbstractStreamingDataModel.prototype.createCodec = function(name)
    {
        var result = new gc.databind.internal.PacketCodecFactory.create(name, this.encoder.bind(this), this.decoder.bind(this));
        if (!result)
        {
            console.error('Codec Registry: missing codec for data format: ' + name);
        }
        return result;
    };

    gc.databind.AbstractStreamingDataModel.prototype.setCodec = function(codec)
    {
        this._codec = codec;
    };
    gc.databind.AbstractStreamingDataModel.prototype.getCodec = function()
    {
        return this._codec;
    };

    gc.databind.AbstractStreamingDataModel.prototype._scriptRead = function(uri) {
        var binding = this.getBinding(uri);
        if (binding) {
            var defer = Q.defer();
            var listener = {
                onDataReceived: function(value) {
                    binding.removeStreamingListener(listener);
                    defer.resolve(value);
                }
            }
            binding.addStreamingListener(listener);
            return defer.promise;
        } else {
            return Promise.reject('Failed to read value since bind ' + uri + ' does not exist.');
        }
    };
}());

/*******************************************************************************
 * Copyright (c) 2017-18 Texas Instruments and others All rights reserved. This
 * program and the accompanying materials are made available under the terms of
 * the Eclipse Public License v1.0 which accompanies this distribution, and is
 * available at http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors: Gingrich, Paul - Initial API and implementation
 ******************************************************************************/
var gc = gc || {};
gc.databind = gc.databind || {};

(function() // closure for private static methods and data.
{
    /**
     * Abstract class that provides default implementation of IBindFactory for a polling data model.  This class
     * provides a "$refresh_interval" binding can be used to control the polling interval any bindings that are created.
     * Alternatively, each binding could have it's own polling interval as needed.  The $refresh_interval is available
     * to app developers so that they could allow end users to control the polling interval.  The refresh interval represents
     * a delay between polling cycles, and does not reflect real time constraints.  This way if refresh interval is too short
     * it doesn't backlog polling operations, instead it simply polls as fast as possible.
     *
     * @constructor
     * @extends gc.databind.AbstractBindFactory
     * @param {string} name - uniquely identifiable name for this bind factory.
    */
    gc.databind.AbstractPollingDataModel = function(name)
    {
        gc.databind.AbstractBindFactory.call(this, name);
    };

    gc.databind.AbstractPollingDataModel.prototype = new gc.databind.AbstractBindFactory();

    gc.databind.AbstractPollingDataModel.prototype.init = function()
    {
        gc.databind.AbstractBindFactory.prototype.init.call(this);

        this._modelBindings.$refresh_interval = new gc.databind.RefreshIntervalBindValue();
        this.createStorageProvider();
    };

    gc.databind.AbstractPollingDataModel.prototype.createNewBind = function(uri)
    {
        var result;

        if (uri.indexOf("$refresh_interval.") === 0)
        {
            result = new gc.databind.RefreshIntervalBindValue();

            this._refreshIntervalBindList = this._refreshIntervalBindList || [];
            this._refreshIntervalBindList.push(result);
        }
        return result;
    };

    /**
     * Helper method to refresh, or re-read, all bindings associated with this model.  This method goes through
     * all refresh interval providers created by this model and forces them to refresh all their bindings that are
     * registered with them.
     *
     */
    gc.databind.AbstractPollingDataModel.prototype.doRefreshAllBindngs = function()
    {
        this._modelBindings.$refresh_interval.onRefresh(); // refresh the default interval provider

        if (this._refreshIntervalBindList)
        {
            for(var i = this._refreshIntervalBindList.length; i-- > 0; )
            {
                this._refreshIntervalBindList[i].onRefresh();  // refresh any app specific interval providers
            }
        }
    };

    gc.databind.AbstractPollingDataModel.prototype._scriptRead = function(uri) {
        var binding = this.getBinding(uri);
        if (binding && binding.onRefresh) {
            var defer = Q.defer();
            var progress = new gc.databind.ProgressCounter(function() {
                defer.resolve(binding.getValue());
            });
            binding.onRefresh(progress, true);
            progress.done();

            return defer.promise;

        } else {
            return gc.databind.AbstractBindFactory.prototype._scriptRead.call(this, uri);
        }
    };
}());

var gc = gc || {};
gc.databind = gc.databind || {};

(function()
{
    var FIFOCommandResponseQueue = function(name)
    {
        this.name = name;
        this.first = this.last = {};
    };

    FIFOCommandResponseQueue.prototype.addCommand = function(command, sequenceNumber)
    {
        var deferred = Q.defer();
        
        this.last.next =
        {
            seqNo : sequenceNumber,
            command: command,
            deferred: deferred
        };
        this.last = this.last.next;
        
        return deferred.promise;
    };
    
    FIFOCommandResponseQueue.prototype.addResponse = function(response, command, sequenceNumber, isError)
    {
        var step = -1;
        var cur = this.first;
        while (cur !== this.last && step < 0)
        {
            var prev = cur;
            cur = cur.next;
            step = sequenceNumber === undefined ? 0 : cur.seqNo - sequenceNumber;
            if (step < -100) 
            {
                step += 255;
            }
            else if (step > 100)
            {
                step -= 255;
            }
                
            if (step < -2)
            {
                cur.deferred.reject(this.name + ' error: missing response for command sequence #' + cur.seqNo);
                this.first = cur;
            }
            else if (step === 0)
            {
                if (cur.command !== command)
                {
                    cur.deferred.reject(this.name + ' error: Command Mismatch.  Expected ' + cur.command + ', but received ' + command);
                }
                else if (isError)
                {
                    cur.deferred.reject(response);
                }
                else 
                {
                    cur.deferred.resolve(response);
                }
                prev.next = cur.next;  // remove item from list
                if (this.last === cur)
                {
                    this.last = prev;  // move end pointer when removing the last element.
                }
            }
        }
    };
    
    FIFOCommandResponseQueue.prototype.clearAll = function()
    {
        while (this.first !== this.last)
        {
            this.first = this.first.next;
            
            this.first.deferred.reject('Skipping response from ' + this.name + ' due to reset operation');
        }
        this.first = this.last = {};
    };
    
    FIFOCommandResponseQueue.prototype.isEmpty = function()
    {
        return this.first === this.last;
    };
    
    /** 
     * Abstract class for command/response, message based, packet codecs.  This class manages messages
     * sent and received from a controller/firmware.  This class provides helper methods for adding 
     * commands to a queue waiting for responses from the controller/firmware and associating responses with
     * the appropriate command.  Messages can optionally have command id's as well as sequence numbers to aid in
     * matching up responses to commands.  If not provided, all commands are expected to have responses, and then must
     * be processed in order.  If sequence numbers are provided, commands will be matched up by sequence number, but 
     * they still must be processed in order.  Out of order responses, with sequence numbers, are not supported. 
     *    
     * @constructor
     * @implements gc.databind.IPollingPacketCodec
     */
    gc.databind.AbstractMessageBasedCodec = function(name)
    {
        this.name = name;
        this.commandQueue = new FIFOCommandResponseQueue(name);
        this.disconnect();
    };

    gc.databind.AbstractMessageBasedCodec.prototype = new gc.databind.IPollingPacketCodec();

    /**
     * Default implementation of the connect method that does nothing.  If initialization is  
     * required, derived implementations should implement their own version of this method and 
     * return a promise to indicate when the connection is completed. 
     */
    gc.databind.AbstractMessageBasedCodec.prototype.connect = function()
    {
        this._isCodecConnected = true;
        return Q();
    };

    /**
     * Implementation of the disconnect method.  This method clears the commad/response queue on disconnect.
     * If you override this method, be sure to call this base method in addition to other cleanup activities.  
     */
    gc.databind.AbstractMessageBasedCodec.prototype.disconnect = function()
    {
        this._isCodecConnected = false;
        this.commandQueue.clearAll();
        this._pendingTransmissions = undefined;
    };
    
    var logPacket = function(name, message,  buffer, len)
    {
        gc.console.debug(name, function() 
        {
            len = len || buffer.length;
            for(var i = 0; i < len; i++)
            {
                message = message + buffer[i].toString(16) + ', ';
            }
            return message;
        });
    };

    /**
     * Implementation of the IPacketCodec.encode() method.  This implementation logs the encoded packet using 
     * gc.console.debug() method for debug purposes before forwarding the packet to the next 
     * encoder in the packet encoding chain.  The derived implementation should call this 
     * method to send packets to the target.
     * 
     * @param {function} target - the target encoder to call with the encoded packet for transmission.
     * @param {object} value - the packet for transmission.
     */
    gc.databind.AbstractMessageBasedCodec.prototype.encode = function(target, value)
    {
        if (this._pendingTransmissions)
        {
            this._pendingTransmissions.push(value);
        }
        else if (this.shouldPauseTransmission(value))
        {
            gc.console.log(this.name, "pausing transmissions"); 
            this._pendingTransmissions = [ value ];
        }
        else
        {
            logPacket(this.name, 'send    ', value);
            target(value);
        }
    };
    
    /**
     * Implementation of the IPacketCodec.decode() method.  This implementation logs the incoming packet 
     * to gc.console.debug().  The derived implementation should override this method to implement the 
     * necessary decoding of incomping packet, and it should call this base method first to perform the 
     * logging function, before decoding the incoming and passing it along to the target decoder/model.
     * 
     * @param {function} target - the target decoder to call with the decoded packet received.
     * @param {object} value - the packet received for decoding.
     */
    gc.databind.AbstractMessageBasedCodec.prototype.decode = function(target, value)
    {
        logPacket(this.name, 'receive ', value);
        
        if (this._pendingTransmissions)
        {
            var pending = this._pendingTransmissions;
            this._pendingTransmissions = undefined;
            
            while(!this.shouldPauseTransmission(pending[0]))
            {
                this.encoder(pending.shift());
                if (pending.length <= 0)
                {
                    gc.console.log(this.name, "resuming transmissions"); 
                    pending = undefined;
                    break;
                }
            }
            
            this._pendingTransmissions = pending;
        }
    };

    /**
     * Helper method to add a command to the command/response queue.  This method returns a promise that can be used
     * to process the response received by this method.  Only messages that require response handling need be 
     * added to the command/response queue.  Messages that are sent that do not require handling may be omitted. 
     * 
     * @param [Number|String] command - the specific command sent that requires a response.
     * @param [Number] sequence - the sequence number of the packet that requires a response.
     */
    gc.databind.AbstractMessageBasedCodec.prototype.addCommand = function(command, sequenceNumber)
    {
        if (this._isCodecConnected === false)
        {
            return Q.reject("Connection to target is lost.");
        }
        return this.commandQueue.addCommand(command, sequenceNumber);
    };
    
    /**
     * Helper method to process responses in command/response queue.  This method will find the appropriate 
     * command in the command/response queue and reject any pending commands that did not receive a response, based
     * on the optional sequence numbers provided. 
     * 
     * @param {Array|String} response - the raw response message received.
     * @param [Number|String] command - the specific command that this response is for.
     * @param [Number] sequence - the sequence number of the packet received, if there is one.
     */
    gc.databind.AbstractMessageBasedCodec.prototype.addResponse = function(response, toCommand, sequenceNumber)
    {
        if (this._isCodecConnected === false)
        {
            return Q.reject("Connection to target is lost.");
        }
        return this.commandQueue.addResponse(response, toCommand, sequenceNumber);
    };
    
    /**
     * Helper method to process error responses in command/response queue.  This method will find the appropriate 
     * command in the command/response queue and reject it.  Any pending commands that did not receive a response, 
	 * based on the optional sequence numbers provided, will also be rejected. 
     * 
     * @param {String} response - the error message for the command.
     * @param [Number|String] command - the specific command that this error is for.
     * @param [Number] sequence - the sequence number of the packet received, if there is one.
     */
    gc.databind.AbstractMessageBasedCodec.prototype.addErrorResponse = function(response, toCommand, sequenceNumber)
    {
        return this.commandQueue.addResponse(response, toCommand, sequenceNumber, true);
    };
    
    /**
     * Method to determine if the target is still connected.  The ti-transport-usb calls this api to
     * determine if there has been a loss of connection when it has not received any data in a while.  This method returns
     * a promise that either resolves if there are no commands in the queue expecting a response; otherwise, if returns fails, indicating that
     * there are commands that have not been responded to.  Derived classes should call the base class, and if it succeeds, they should
     * attempt to ping the target to ensure that the connection is indeed valid.  Just because there are no outstanding messages
     * does not imply the connection is good.  
     * 
     * @returns promise that resolves if still connected, or fails if the connection is lost with an error message.
     */
    gc.databind.AbstractMessageBasedCodec.prototype.isStillConnected = function()
    {
        if (!this.commandQueue.isEmpty())
        {
            return Q.reject('No response from ' + this.name + ' controller');
        }
        return Q(true);
    };
    
    /**
     * Abstract method to determine if the transmission of packets should be paused or not.  
     * This method is optional, and if implemented can return true to temporarily pause transmission of packets.
     * Each packet sent by the base classes encode() method will be test to see if transmission should be paused.
     * Once paused, the decode() method will test if the pending packet(s) should remain paused, or if transmission
     * can resume.  In other words, each packet sent will be tested repeatedly until this method returns false, at which point the 
     * packet is transmitted to the target.
     *
     * @params packet the packet to test if it should be paused/delayed before sending to the target.  
     * @returns {boolean} 
     */
    gc.databind.AbstractMessageBasedCodec.prototype.shouldPauseTransmission = function(packet)
    {
        return false;
    };
    
    /**
     * Helper method to perform a multiRegisterRead operation by using single readValue() calls.  This method is 
     * convenient to use if a particular codec finds itself in a position where it can't perform a particular multiple read
     * register operation. 
     *
     * @param startRegInfo register information about the starting register for the multiple register read
     * @param count the number of registers to read.
     * @param registerModel the register model for the device
     * @param [coreIndex] (for device arrays only) - the 0-based core index for the selected core. -1 for all cores.
     * @returns {promise} a promise that will resolve with an array of register values read from the target. 
     */
    gc.databind.AbstractMessageBasedCodec.prototype.doMultiRegisterRead = function(startRegInfo, count, registerModel, coreIndex)
    {
        var promises = [];
        var info = Object.create(startRegInfo);
        for(var i = 0; i < count; i++)
        {
            promises.push(this.readValue(info, registerModel, coreIndex));
            info.addr++;
        }
        return Q.all(promises);
    };
    
    /**
     * Helper method for multi-device register model use case to read a single register across all cores and return 
     * a promise that resolves to an array of register values corresponding to each device or core.  This method
     * can be used by a derived codec to implement readValue() when coreIndex is -1 (read all cores), and it is not capable
     * of reading all the cores with a single operation.
     *
     * @param regInfo {object} register information about the register to read on all devices or cores.
     * @param numCores {number} the number of registers to read.
     * @param registerModel {object} the register model for the device
     * 
     * @returns {promise} a promise that will resolve with an array of register values read from the target. 
     */
    gc.databind.AbstractMessageBasedCodec.prototype.doReadAllRegisters = function(regInfo, registerModel, numCores)
    {
        var promises = [];
        for(var i = 0; i < numCores; i++)
        {
            promises.push(this.readValue(regInfo, registerModel, i));
        }
        return Q.all(promises);
    };

    /**
     * Helper method for multi-device register model use case to write a single register values across all cores.  This method
     * can be used be a derived codec to implement writeValue() when coreIndex is -1 (write all cores), when it is not capable
     * of writing all the cores with a single operation.
     *
     * @param regInfo {object} register information about the register to write on all devices or cores.
     * @param registerModel {object} the register model for the device
     * @param values {array} array of values to write to each devices or cores register.
     * 
     * @returns {promise} a promise that will resolve when all values are written to all cores. 
     */
    gc.databind.AbstractMessageBasedCodec.prototype.doWriteAllRegisters = function(regInfo, registerModel, values)
    {
        var promises = [];
        for(var i = 0; i < values.length; i++)
        {
            promises.push(this.writeValue(regInfo, values[i], registerModel, i));
        }
        return Q.all(promises);
    };

}());
/*****************************************************************
 * Copyright (c) 2018 Texas Instruments and others
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
gc.databind.internal = gc.databind.internal || {};

/**
 * Concrete Class for a Trigger that fires a user callback when a condition is met. 
 * 
 * @constructor
 * @implements {gc.databind.ITrigger}
 */ 

gc.databind.internal.Trigger = function(callback, condition)
{
    this._triggerEventCallback = callback;
    if (condition)
    {
        this.setCondition(condition);
    }
};

gc.databind.internal.Trigger.prototype = new gc.databind.ITrigger();
gc.databind.internal.Trigger.prototype._enabled = true;

gc.databind.internal.Trigger.prototype.enable = function(enable)
{
    if (enable === undefined)
    {
        return this._enabled;
    }
    enable = !!enable;
    if (this._enabled !== enable)
    {
        if (enable && this._conditionBind)
        {
            this._conditionBind.addChangedListener(this);
        }
        else if (this._conditionBind)
        {
             this._conditionBind.removeChangedListener(this);
        }
        this._enabled = enable;
    }
};

gc.databind.internal.Trigger.prototype.onValueChanged = function(oldValue, newValue, progress)
{
    newValue = !!this._conditionBind.getValue();
    if (this.fCachedValue !== newValue)
    {
        this.fCachedValue = newValue;
        if (newValue && this._enabled)
        {
            this._triggerEventCallback(progress);
        }
    }
};

/**
 * Sets the condition for this trigger to call the users callback method.
 * The trigger will fire when this condition transitions from false to true, and the trigger is enabled.  
 * 
 * @param {string} condition - A binding expression, that evaluates to a boolean result, to be used as the condition. 
 * @returns {boolean|object} - if getter then the enabled state; otherwise, the this pointer. 
 */
gc.databind.internal.Trigger.prototype.setCondition = function(condition)
{
    // remove listener from old condition if there was one.
    if (this._conditionBind && this._enabled)
    {
        this._conditionBind.reamoveChangedListener(this);
    }
    
    // get new condition binding
    this._conditionBind = condition && gc.databind.registry.getBinding(condition);
    
    // add listener if we are enabled
    if (this._conditionBind && this._enabled) 
    {
        this._conditionBind.addChangedListener(this);
    }
    
    // initialize fCachedValue so we can detect changes going forward in order to fire events.  
    this.fCachedValue = !!(this._conditionBind && this._conditionBind.getValue());
};

gc.databind.internal.Trigger.prototype.dispose = function()
{
    if (this._conditionBind)
    {
        this._conditionBind.removeChangedListener(this);
        this._conditionBind = undefined;
    }
};

