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

gc.databind.internal.Base64PacketCodec = function()
{
};

gc.databind.internal.Base64PacketCodec.prototype.encode = function(target, arrayBuffer) 
{
    var message = arrayBuffer;
    if (arrayBuffer instanceof window.ArrayBuffer)
    {
        var buffer = new window.Uint8Array(arrayBuffer);
        message = String.fromCharCode.apply(null, buffer);
    }
    if (arrayBuffer instanceof Array)
    {
        message = String.fromCharCode.apply(null, arrayBuffer);
    }
    return target(window.btoa(message));
};

gc.databind.internal.Base64PacketCodec.prototype.decode = function(target, rawdata)
{
    try
    {
        var message = typeof rawdata === 'string' ? rawdata : String.fromCharCode.apply(null, rawdata);
        message = window.atob(message);
        
        var buffer = new window.ArrayBuffer(message.length); 
        var byteBuffer = new window.Uint8Array(buffer);
        for (var i = message.length; i-- > 0; ) 
        {
            byteBuffer[i] = message.charCodeAt(i);
        }
        return target(buffer);
    }
    catch(ex)
    {
        console.log('Base64PacketCodec: Exception converting base64 string to binary');
        return false;
    }
};

gc.databind.registerCustomCodec('Base64', gc.databind.internal.Base64PacketCodec);

