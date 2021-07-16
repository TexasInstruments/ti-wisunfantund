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
    gc.databind.SerialPortModel = function(name, serialIO)
    {
        gc.databind.AbstractStreamingDataModel.call(this, name);
        
        this.init();
        
        this.serialIO = serialIO;
        
        this.serialPortRecievedHandler = {};
        this.serialPortRecievedHandler.data = function(buffer)
        {
            var decoder = this._decoder;
            if (decoder)
            {
                var isConnected = decoder.decoder(buffer);
                this.setConnectedState(isConnected);
                if (this.callbackForDataValidation && isConnected)
                {
                    this.callbackForDataValidation();
                    this.callbackForDataValidation = undefined;
                }
            }
            else
            {
                console.error('SerialPortModel: data received before decoder initialized');
            }
        }.bind(this);
    };

    gc.databind.SerialPortModel.prototype = new gc.databind.AbstractStreamingDataModel('uart');

    gc.databind.SerialPortModel.prototype.sendValue = function(value, progress)
    {
        if (this._encoder)
        {
            this._encoder.encoder(value);
        }
        else
        {
            console.log('Discarded tx uart data: ' + value);
        }
    };
    
    gc.databind.SerialPortModel.prototype.sendPacket = function(packet)
    {
        if (this.serialIO)
        {
            this.serialIO.serialSend(packet);
        }
        else
        {
            console.log('Discarded tx uart data: ' + packet);
        }
    };

    gc.databind.SerialPortModel.prototype.connect = function(dataValidationCallback, rxPacketDataFormat, txPacketDataFormat)
    {
        
        if (rxPacketDataFormat.toLowerCase() === 'json')
        {
            rxPacketDataFormat += '+CR';
        }
        this._decoder = this.createCodec(rxPacketDataFormat); 
        this.callbackForDataValidation = dataValidationCallback;
        
        if (txPacketDataFormat.toLowerCase() === 'json')
        {
            txPacketDataFormat += '+CR';
        }
        this._encoder = this.createCodec(txPacketDataFormat); 
    };
    gc.databind.SerialPortModel.prototype.disconnect = function()
    {
        this.callbackForDataValidation = undefined;
        this._encoder = undefined;
        this._decoder = undefined;
        this.setConnectedState(false);
    };
}());
