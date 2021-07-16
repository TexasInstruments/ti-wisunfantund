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
    var RawPacketCodec = function()
    {
    };

    RawPacketCodec.prototype = new gc.databind.IPacketCodec();

    RawPacketCodec.prototype.encode = function(target, value)
    {
        target(value);
    };
    
    RawPacketCodec.prototype.decode = function(target, rawdata) 
    {
        return target(rawdata);
    };

    gc.databind.registerCustomCodec('raw', RawPacketCodec);
    
}());
