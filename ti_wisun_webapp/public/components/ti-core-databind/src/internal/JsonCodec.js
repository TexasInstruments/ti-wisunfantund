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

(function() 
{
    var JsonCodec = function()
    {
        this.numPacketsReceived = 0;
        this._isConnected = false;
    };

    JsonCodec.prototype = new gc.databind.IPacketCodec();

    JsonCodec.prototype.encode = function(target, value) 
    {
        target(JSON.stringify(value));
    };

    JsonCodec.prototype.decode = function(target, rawdata)
    {
        try
        {
            var cleanPacket = "";
            var message = typeof rawdata === 'string' ? rawdata : String.fromCharCode.apply(null, rawdata);

            try
            {
                // remove any leading or trailing garbage characters
                cleanPacket = message.substring(message.indexOf('{'), message.lastIndexOf('}') + 1);
                // remove any spaces between : and the value
                while (cleanPacket.indexOf(': ') > 0)
                {
                    cleanPacket = cleanPacket.substring(0, cleanPacket.indexOf(': ') + 1) + cleanPacket.substring(cleanPacket.indexOf(': ') + 2).trim();
                }
                this._isConnected = target(JSON.parse(cleanPacket));
            }
            catch(e)
            {
                this._isConnected = false;
                if (this.numPacketsReceived > 0) 
                {
                    console.log('JsonCodec: received non JSON data string:[' + cleanPacket + ']');
                }
            }
            if (this.numPacketsReceived === 0) 
            {
                console.log("Put breakpoint here to debug problems with serial I/O bindings");
            }
            this.numPacketsReceived++;
        }
        catch(ex)
        {
            console.log('JsonCodec: Exception converting buffer to text string');
            this._isConnected = false;
        }
        return this._isConnected;
    };

    gc.databind.registerCustomCodec('json', JsonCodec, null, 'cr');
    
}());
