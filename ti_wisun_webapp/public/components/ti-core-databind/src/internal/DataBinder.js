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