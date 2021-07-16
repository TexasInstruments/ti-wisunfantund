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
    var URLCodec = function()
    {
        this._isConnected = false;
    };

    URLCodec.prototype = new gc.databind.IPacketCodec();

    URLCodec.prototype.encode = function(target, value) // value is an object
    {
        target(JSON.stringify(value));
    };

    URLCodec.prototype.decode = function(target, rawdata)
    {
        try
        {
            var message = typeof rawdata === 'string' ? rawdata : String.fromCharCode.apply(null, rawdata);

            this._isConnected = target(JSON.parse(message));
        }
        catch(ex)
        {
            console.log('URLCodec: Exception converting buffer to text string');
            this._isConnected = false;
        }
        return true;  // return false if URL is not encoded properly.
    };

    gc.databind.registerCustomCodec('URLCodec', URLCodec);
    
}());
