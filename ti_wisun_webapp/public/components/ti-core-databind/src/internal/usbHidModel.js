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
    gc.databind.UsbHidModel = function(name, usbHidService)
    {
        gc.databind.AbstractStreamingDataModel.call(this, name);
        
        this.init();

        this.usbHidService = usbHidService;

        this.usbHidRecievedHandler = {};
        this.throttleMsgCtr = 0;
        this.usbHidRecievedHandler.data = function(buffer)
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
                this.throttleMsgCtr++;
                if (this.throttleMsgCtr < 40) {
                    console.error('UsbHidModel: data received before decoder initialized');
                }
            }
        }.bind(this);
    };

    gc.databind.UsbHidModel.prototype = new gc.databind.AbstractStreamingDataModel('usbhid');

    gc.databind.UsbHidModel.prototype.sendValue = function(value, progress)
    {
        if (this._encoder)
        {
            this._encoder.encoder(value);
        }
        else
        {
            console.log('Discarded tx USB-HID data: ' + value);
        }
    };

    gc.databind.UsbHidModel.prototype.sendPacket = function(packet)
    {
        if (this.usbHidService)
        {
            this.usbHidService.serialSend(packet);
        }
        else
        {
            console.log('Discarded tx USB-HId data: ' + packet);
        }
    };

    gc.databind.UsbHidModel.prototype.connect = function(dataValidationCallback, rxPacketDataFormat, txPacketDataFormat)
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
    gc.databind.UsbHidModel.prototype.disconnect = function()
    {
        this.callbackForDataValidation = undefined;
        this._encoder = undefined;
        this._decoder = undefined;
        this.setConnectedState(false);
    };
}());
