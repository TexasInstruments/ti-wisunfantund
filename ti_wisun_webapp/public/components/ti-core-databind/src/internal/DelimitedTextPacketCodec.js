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
