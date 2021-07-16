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