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
    /** 
     * Abstract class for a packet frame decoder.  A frame decoder is used to detect/align the start of packets
     * in a stream of data received over a transport like USB.  The derived class must implement the getPacketLength()
     * method to validate and calculate the length of each possible packet of data.  The base implementations of decode() 
     * method will repeatedly call this method to test for possible packets.  Optionally, the derived class can provide
     * a start byte, which the base implementation will use to skip past packets that do not start with the exact byte
     * automatically.   
     *    
     * @constructor
     * @param {Number} [startByte] - the first byte used to identify the start of a packet header.
     * @implements gc.databind.IPacketCodec
     */
    gc.databind.AbstractFrameDecoder = function(startByte, getLengthMethod)
    {
        this.isConnected = false;
        this.partialPacket = [];
        this.frameStart = startByte;
        if (getLengthMethod)
        {
            this.getPacketLength = getLengthMethod;
        }
    };

    gc.databind.AbstractFrameDecoder.prototype = new gc.databind.IPacketCodec();

    /**
     * Implementation of the encode() method that does not do any additional process
     * on the outgoing data packets. 
     */
    gc.databind.AbstractFrameDecoder.prototype.encode = function(target, value) 
    {
        target(value);
    };
    
    /**
     * Implementation of the decode() method that attempts to detect and align a valid packet.  This
     * method relies on the getPacketLength() method implemented by the derived class to 
     * perform this function.  
     */
    gc.databind.AbstractFrameDecoder.prototype.decode = function(target, rawData)
    {
        if (this._partialPacket)
        {
            // concatentate new data with saved partial data
            rawData = this._partialPacket.concat(rawData);
            this._partialPacket = null; 
        }
        var i = 0;
        var length = rawData.length;
        
        // process one or more packets (whether valid of not).
        while(i < length)
        {   
            // if provided, test for the start of packet.
            if (this.frameStart)
            {
                // skip till first delimiter
                while(i < length && rawData[i] !== this.frameStart)
                {
                    i++;
                    this.isConnected = false; // discarding data.
                }
            }
            
            if (i < length)
            {
                // calculate the length of the packet, zero if not enough data to determine, and -1 for error packets  
                var packetLength = this.getPacketLength(rawData, i);
                if (packetLength > 0 && packetLength + i <= length)
                {
                    // enough data to decode a packet.
                    this.isConnected = target((i === 0 && length === packetLength) ? rawData : rawData.slice(i, i + packetLength));
                    if (this.isConnected)
                    {
                        // valid packet processed, skip forward
                        i += packetLength;
                    }
                    else  // invalid packet decoded, skip forward only by one byte to search for start of valid packet.
                    { 
                        i++;
                    }
                }
                else if (packetLength < 0)
                {
                    // invalid packet already, skip forward one or more bytes.
                    i -= packetLength;
                    this.isConnected = false; // discarding data.
                }
                else if (i === 0)
                {
                    // no data consumed, save all data for next pass.
                    this._partialPacket = rawData; 
                    break;
                }
                else if (i < length)
                {
                    // not enough data remaining for a single packet, defer the partial packet until more data has arrived.
                    this._partialPacket = rawData.slice(i);
                    break;
                }
            }
        }
        return this.isConnected;
    };
    
    /** 
     * Abstract method that the derived class must implement.  The implementation of this method should first verify that
     * there is enough data to determine that the packet is valid and the specific length of the packet.  If there is not
     * enough data, this method should return zero.  If there is enough data, and the packet is invalid, then return -1.
     * Otherwise, the return value is the number of bytes in the packet, and the base implementation will use this to
     * detect the end of the packet.
     *    
     * @param {Number[]} buffer - a byte buffer containing the data received from the target.
     * @param {Number} offset - zero based offset into the buffer of data where a possible packet may start.
     */
    gc.databind.AbstractFrameDecoder.prototype.getPacketLength = function(buffer, offset)
    {
        return -1;
    };
    
    // alias for backward compatability
    gc.databind.internal.GenericFrameDecoder = gc.databind.AbstractFrameDecoder;
}());
