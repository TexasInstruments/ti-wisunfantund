/*****************************************************************
 * Copyright (c) 2017-2019 Texas Instruments and others
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
gc.databind.internal.reg = gc.databind.internal.reg || {};

(function()
{
    
    var doUpdateRegisterValue = function(skipStreamingListeners)
    {
        this.updateValue(this.parentBind.getValueFor(this.coreIndex), undefined, skipStreamingListeners);
        this.setStale(false);
    };
    
    gc.databind.internal.reg.RegisterBind = function(uri, model, refreshIntervalProvider, symbolData, registerAllBind)
    {
        gc.databind.AbstractAsyncBindValue.call(this);

        if (model)
        {
            var that = this;

            that.uri = uri;
            that.parentModel = model;

            that._onFailure = function(errMsg)
            {
                if (that.parentModel.isConnected())
                {
                    that.reportErrorStatus(errMsg);
                }
                var callback = that._callback;
                that._callback = undefined;
                if (callback)
                {
                    callback(that.fCachedValue);  // don't record a new value, keep the same value as before.
                }
            };
    
            that._onSuccess = function(result)
            {
                // clear errors on successful read
                that.reportCriticalError(null);
    
                if (that.coreCountBind)  // must be RegisterAllBind 
                {
                    // support single core case where readValue returns non array value, and we need to convert to array.
                    if (!Array.isArray(result)) 
                    {
                        result = [result];
                    }
                    // update the $cores.length binding as needed.
                    that.coreCountBind.updateValue(result.length); 
                }
                return result;
            };
    
            this.setRefreshIntervalProvider(refreshIntervalProvider);
    
            this.updateRegisterInfo(symbolData);
            
            this.parentBind = registerAllBind;
            if (registerAllBind)
            {
                var parentBindChangeHandler = { onValueChanged : doUpdateRegisterValue.bind(this, true) };
                
                registerAllBind.addChangedListener(parentBindChangeHandler);
                
                this.dispose = function() 
                {
                    gc.databind.AbstractAsyncBindValue.prototype.dispose.call(this);
                    registerAllBind.removeChangedListener(parentBindChangeHandler);
                };
            }
        }
    };
    
    gc.databind.internal.reg.RegisterBind.prototype = new gc.databind.AbstractAsyncBindValue('number');
    
    gc.databind.internal.reg.RegisterBind.prototype.coreIndex = 0;

	gc.databind.internal.reg.RegisterBind.prototype.onValueChanged = function(oldValue, newValue, progress)
    {
	    gc.databind.AbstractAsyncBindValue.prototype.onValueChanged.call(this, oldValue, newValue, progress);
	    
        if (this.parentBind)
        {
            this.parentBind.updateValueFor(this.coreIndex, newValue);
        }
    };
    
    gc.databind.internal.reg.RegisterBind.prototype.updateValue = function()
    {
        gc.databind.AbstractAsyncBindValue.prototype.updateValue.apply(this, arguments);
        
        if (this.parentBind)
        {
            this.parentBind.updateValueFor(this.coreIndex, this.getValue());
        }
    };
    
    gc.databind.internal.reg.RegisterBind.prototype.writeValue = function(callback)
    {
        this._callback = callback;
        this.parentModel.writeValue(this.uri, this.fCachedValue, this.coreIndex).then(callback).fail(this._onFailure);
    };

    gc.databind.internal.reg.RegisterBind.prototype.readValue = function(callback)
    {
        this._callback = callback;
        this.parentModel.readValue(this.uri, this.coreIndex).then(this._onSuccess).then(callback).fail(this._onFailure);
    };

    gc.databind.internal.reg.RegisterBind.prototype.reportErrorStatus = function(errorMessage)
    {
        var status = null;
        if (errorMessage && errorMessage.length > 0)
        {
            status = gc.databind.AbstractStatus.createErrorStatus(errorMessage, 'target');
        }
        this.reportCriticalError(status);
    };

    gc.databind.internal.reg.RegisterBind.prototype.updateRegisterInfo = function(symbolData)
    {
        if (symbolData)
        {
            this.fDefaultValue = gc.utils.string2value(symbolData.value || symbolData['default']);
            if (this.fDefaultValue !== undefined)  // restore default for the new device, before reading the actual value.
            {
                this.updateValue(this.fDefaultValue, undefined, true);
                this.setStale(false);
            }
            else
            {
                this.setStale(true);
            }
            
            // support for qualifiers in register symbol data
            if (!this._readable)              // remove existing qualifiers
            {
                this._readable = true;
            }
            if (!this._writable)
            {
                this._writable = true;
            }
            if (!this._volatile)
            {
                this._volatile = true;
            }

            var type = symbolData.mode || symbolData.type;
            if (type)
            {
                // add any new qualifiers
                if (type === 'R')
                {
                    type = 'readonly';
                }
                else if (type === 'W')
                {
                    type = 'writeonly';
                }
                this.addQualifier(type);
            }

            // clear errors on successful read
            this.reportCriticalError(null);
        }
        else
        {
            this.setStatus(gc.databind.AbstractStatus.createErrorStatus('Register named "' + this.uri + '" is not recognized for this device.'));
        }
    };
    
    gc.databind.internal.reg.RegisterBind.prototype.onIndexChanged = function()
    {
        var index = this.getIndex();
        if (index)
        {
            this.coreIndex = +index[0];
            
            if (this.parentBind && !this.parentBind.isStale()) 
            {
                // use parent bind to update value because it is not stale
                doUpdateRegisterValue.call(this, true);
            }
            else if (this.fDefaultValue !== undefined) 
            {
                // binding never stale if there is a default value defined.
                this.updateValue(this.fDefaultValue, undefined, true);
            }
            else // no default value and parent (it there is one) is stale.
            {
                this.setStale(true);
            }
            
            // discard any deferred write operations when index is changed.  The register view will
            // prompt user before switching active cores to allow the user to commit or clear the deferred writes.
            this.fCommittedValue = this.fCachedValue;
        }
    };
    
    gc.databind.internal.reg.RegisterBind.prototype.isConnected = function()
    {
        return this.parentModel.isConnected();
    };
    
    gc.databind.internal.reg.RegisterBind.prototype.getStatus = function() 
    {
        var status = gc.databind.AbstractBind.prototype.getStatus.call(this);
        if (!status && this.parentBind)
        {
            status = this.parentBind.getStatus();
        }
        return status;
    };
    
    gc.databind.internal.reg.RegisterBind.prototype.addStatusListener = function (listener)
    {
        gc.databind.AbstractBind.prototype.addStatusListener.call(this, listener);
        if (this.parentBind)
        {
            this.parentBind.addStatusListener(listener);
        }
    };
        
    gc.databind.internal.reg.RegisterBind.prototype.removeStatusListener = function(listener)
    {
        gc.databind.AbstractBind.prototype.removeStatusListener.call(this, listener);
        if (this.parentBind)
        {
            this.parentBind.removeStatusListener(listener);
        }
    };
    
    gc.databind.internal.reg.RegisterBind.prototype.kickStartAReadOperation = function(force)
    {
        // prevent automatic reads when there is a RegisterAll parent binding, but still allow manual onRefresh() calls.
        if (!this.parentBind)  
        {
            gc.databind.AbstractAsyncBindValue.prototype.kickStartAReadOperation.call(this, force);
        }
    };
    
    gc.databind.internal.reg.RegisterBind.prototype.onFirstDataReceivedListenerAdded = function()
    {
        if (this.parentBind)
        {
            this._onDataREceivedHandler = { onDataReceived : doUpdateRegisterValue.bind(this, false) };
            this.parentBind.addStreamingListener({ onDataReceived : doUpdateRegisterValue.bind(this, false) });
        }
    };

    gc.databind.internal.reg.RegisterBind.prototype.onLastDataReceivedListenerRemoved = function()
    {
        if (this.parentBind)
        {
            this.parentBind.removeStreamingListener(this._onDataREceivedHandler);
            this._onDataREceivedHandler = undefined;
        }
    };

    gc.databind.internal.reg.RegisterAllBind = function(uri, model, refreshIntervalProvider, symbolData)
    {
        gc.databind.internal.reg.RegisterBind.call(this, uri, model, refreshIntervalProvider, symbolData);
        
        this.coreCountBind = model.getBinding('$cores.length');
    };
    
    gc.databind.internal.reg.RegisterAllBind.prototype = new gc.databind.internal.reg.RegisterBind();

    gc.databind.internal.reg.RegisterAllBind.prototype.fDefaultType = 'array';
    
    gc.databind.internal.reg.RegisterAllBind.prototype.coreIndex = -1;

    gc.databind.internal.reg.RegisterAllBind.prototype.getValueFor = function(index)
    {
        return (this.fCachedValue && Array.isArray(this.fCachedValue) && this.fCachedValue[index]) || this.fDefaultValue || 0;
    };

    var updateValueInArrayByIndex = function(array, index, newValue, defaultValue)
    {
        var result = array ? array.slice() : [];
        for(var i = result.length; i < index; i++ )
        {
            result.push(defaultValue);
        }
        result[index] = newValue;
        return result;
    };
    
    gc.databind.internal.reg.RegisterAllBind.prototype.updateValueFor = function(index, newValue)
    {
        if (this.getType() === 'array' && newValue !== this.getValueFor(index))
        {
            var newValues = updateValueInArrayByIndex(this.fCachedValue, index, newValue, this.fDefaultValue);

            if (this.fDeferredMode)
            {
                this.fCommittedValue = updateValueInArrayByIndex(this.fCommittedValue, index, newValue, this.fDefaultValue);
            }
            
            this.updateValue(newValues, undefined, true); // skip streaming data listeners.
        }
    };
    
    gc.databind.internal.reg.RegisterArrayOperator = function(registerBind, indexBind) 
    {
        // binary operator adds listeners to figure out when either the registerBind or indexBind changes
        // when array operator changes it will call setIndex on the registerBind.  (the first param specifies the new index)
        gc.databind.internal.expressionParser.ArrayOperator.call(this, registerBind, indexBind);

        this.uri = registerBind.uri;
    };

    gc.databind.internal.reg.RegisterArrayOperator.prototype = new gc.databind.internal.expressionParser.ArrayOperator();
    
    var delegateMethods = ['onRefresh', 'onRefreshAndLog', 'setDeferredMode', 'isConnected', 'clearDeferredWrite', 'isRefreshable', 
                        'isReadOnly', 'isDeferredWritePending', 'getValueCommitted', 'updateRegisterInfo', 'onDisconnected',
                        'updateValue'];
    var createDelegateFn = function(name) 
    {
        gc.databind.internal.reg.RegisterArrayOperator.prototype[name] = function() 
        {
            return this.lookupBinding[name].apply(this.lookupBinding, arguments);
        };
    };
    
    for(var i = delegateMethods.length; i --> 0; )
    {
        createDelegateFn(delegateMethods[i]);
    }

    var typeParser = /\s*(unsigned\s|signed\s)?\s*(int|q(\d+))\s*/i;

    var onChangedListener = function()
    {
        var regValue = this.parentBind.getValue();
        var isArrayType = this.parentBind.getType() === 'array';
        if (!isArrayType)
        {
            regValue = [regValue];
        }
        var newValue = [];
        for(var i = 0; i < regValue.length; i++)
        {
            var value = gc.utils.getBitfieldValue(regValue[i], this._startBit, this._stopBit, false, false, this._isSigned);
            
            if (this._q && !isNaN(value))
            {
                value = value / (Math.pow(2, this._q));
            }
            
            if (this._getConvertedValue) 
            {
                value = this._getConvertedValue(value);
            }
            
            newValue[i] = value;
        }

        if (!isArrayType)
        {
            newValue = newValue[0];
        }
        this.updateValue(newValue, undefined, true);
    };

    gc.databind.internal.reg.FieldBind = function(name, registerBind, symbolData)
    {
        gc.databind.AbstractBindValue.call(this, registerBind.getType());

        this.parentBind = registerBind;
        this.uri = name;

        var parentChangedListener = new gc.databind.IChangedListener();
        parentChangedListener.onValueChanged = onChangedListener.bind(this);
        registerBind.addChangedListener(parentChangedListener);

        this.dispose = function()
        {
            registerBind.removeChangedListener(parentChangedListener);
        };
        if (symbolData && !symbolData.parentRegister && this.parentBind && this.parentBind.parentModel) {
            symbolData.parentRegister = this.parentBind.parentModel.getRegisterInfo(registerBind.uri);
        }
        this.updateRegisterInfo(symbolData);
    };

    gc.databind.internal.reg.FieldBind.prototype = new gc.databind.AbstractBindValue('number');

    gc.databind.internal.reg.FieldBind.prototype.excludeFromStorageProviderData = true;

    gc.databind.internal.reg.FieldBind.prototype._calcShiftMask = function(symbolData) {
        // setup default mask, shift and bitWidth for when no symbol data is available.
        var shift = 0;
        var mask = 1;
        var startBit = 0;
        var stopBit = 0;
        var regWidth = 8;
        if (symbolData) {
            startBit = gc.utils.string2value(symbolData.start);
            stopBit = gc.utils.string2value(symbolData.stop);
            if (symbolData.parentRegister) {
                regWidth = symbolData.parentRegister.size;
            }
            startBit = startBit || 0;
            stopBit = stopBit || startBit;
            mask = gc.utils.getMask(startBit,stopBit);
            shift = startBit;
        }

        var bitWidth = stopBit - startBit + 1;
        return {shift: shift, mask: mask, bitWidth: bitWidth, regWidth: regWidth, startBit: startBit, stopBit: stopBit};
    };

    gc.databind.internal.reg.FieldBind.prototype.updateRegisterInfo = function(symbolData)
    {
        try
        {
            var tmp = this._calcShiftMask(symbolData);
            var bitWidth = tmp.bitWidth;
            this._mask = tmp.mask;
            this._shift = tmp.shift;
            this._startBit = +tmp.startBit;
            this._stopBit = +tmp.stopBit;
            this._regWidth = +tmp.regWidth;

            if (symbolData)
            {
                var type = symbolData.type;
                if (type)
                {
                    var match = typeParser.exec(type);
                    if (match && match.index === 0)
                    {
                        this._isSigned = !(match[1] && match[1].trim().toLowerCase() === 'unsigned');
                        if (match[3] !== undefined) 
                        {
                            var q = +match[3];
                            if (q === undefined || isNaN(q) || q < 0)
                            {
                                throw "invalid type declaration for field: " + name;
                            }
                            else 
                            {
                                this._q = q;
                            }
                        }
                    }
                    else
                    {
                        throw "invalid type declaration for field: " + name;
                    }
                }
                
                if (symbolData.getter || symbolData.setter) {
                    var model = this.parentBind.parentModel;
                    this._getConvertedValue = function(value) { return model.getConvertedValue(value, symbolData.getter, symbolData.setter); };
                    this._setConvertedValue = function(value) { return model.getConvertedValue(value, symbolData.setter, symbolData.getter); };
                } 
                else
                {
                    this._getConvertedValue = undefined;
                    this._setConvertedValue = undefined;
                }

                // initialize value based on default register value.
                onChangedListener.call(this);

                this.fCachedStatus = undefined;
                this.setStatus(this.parentBind.getStatus());  // clear any errors,
            }
            else
            {
                throw 'Bit field "' + this.uri + '" is not recognized for this device.';
            }
        }
        catch(e)
        {
            this.setStatus(gc.databind.AbstractStatus.createErrorStatus(e));
        }
    };

    gc.databind.internal.reg.FieldBind.prototype.onValueChanged = function(oldValue, newValue, progress)
    {
        if (!Array.isArray(newValue)) 
        {
            newValue = [newValue];
        }

        var regValue = this.parentBind.getValue();
        var isArrayType = this.parentBind.getType() === 'array';
        if (isArrayType)
        {
            regValue = regValue ? regValue.slice() : [];
        }
        else 
        {
            regValue = [regValue];
        }
        
        for( var i = 0; i < regValue.length; i++) 
        {
            var value = newValue[i];
            if (value !== undefined)
            {
                if (this._setConvertedValue) 
                {
                    value = this._setConvertedValue(value);
                } 
                if (this._q && !isNaN(value))
                {
                    value = Math.round(value * Math.pow(2, this._q));
                }
                regValue[i] = gc.utils.setBitfieldValue(regValue[i], this._startBit, this._stopBit, this._regWidth, value, false);
            }
        }
        
        if (!isArrayType)
        {
            regValue = regValue[0];
        }
        
        this.parentBind.setValue(regValue);
    };
    
    gc.databind.internal.reg.FieldBind.prototype.onFirstDataReceivedListenerAdded = function()
    {
        this.parentBind.addStreamingListener(this);
    };

    /**
     * Method called when the last streaming listener is removed from the list.
     * Derived classes can override this method to be notified for this event.
     */
    gc.databind.internal.reg.FieldBind.prototype.onLastDataReceivedListenerRemoved = function()
    {
        this.parentBind.removeStreamingListener(this);
    };

    gc.databind.internal.reg.FieldBind.prototype.onDataReceived = function()
    {
        this.notifyDataReceivedListeners(this.fCachedValue);
    };

    gc.databind.internal.reg.FieldBind.prototype.isStale = function()
    {
        return this.parentBind.isStale();
    };

    gc.databind.internal.reg.FieldBind.prototype.addStaleListener = function(listener)
    {
        this.parentBind.addStaleListener(listener);
    };

    gc.databind.internal.reg.FieldBind.prototype.removeStaleListener = function(listener)
    {
        this.parentBind.removeStaleListener(listener);
    };
    
    gc.databind.internal.reg.FieldBind.prototype.getStatus = 
        gc.databind.internal.reg.RegisterBind.prototype.getStatus;

    gc.databind.internal.reg.FieldBind.prototype.addStatusListener = 
        gc.databind.internal.reg.RegisterBind.prototype.addStatusListener;
    
    gc.databind.internal.reg.FieldBind.prototype.removeStatusListener = 
        gc.databind.internal.reg.RegisterBind.prototype.removeStatusListener;

}());


