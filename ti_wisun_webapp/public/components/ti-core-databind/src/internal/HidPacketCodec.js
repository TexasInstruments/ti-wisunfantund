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
