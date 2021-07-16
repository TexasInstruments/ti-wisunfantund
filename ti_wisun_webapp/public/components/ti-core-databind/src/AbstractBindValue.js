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
