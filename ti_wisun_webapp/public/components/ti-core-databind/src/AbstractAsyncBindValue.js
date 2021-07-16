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
