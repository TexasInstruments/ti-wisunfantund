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
