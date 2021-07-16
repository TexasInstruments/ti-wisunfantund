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

/**
 * Callback interface for encoding and decoding data to and from packets.
 * 
 * @interface
 */
gc.databind.IPacketCodec = function()
{
};

/**
 * Encodes data into a packet for sending.
 *    
 * @param target - call back function for passing encoded packets for sending to.
 * @param data {Object} - The data object to encode into a packet for sending.
 */
gc.databind.IPacketCodec.prototype.encode = function(target, data) {};

/**
 * Decodes packets into data objects.  One object for each packet of data.  The packet data is not framed,
 * so this method is responsible for decoding partial packets as well as multiple packets.  Partial packets
 * should not be decoded, but deferred until the next method call with more raw data to process.  This method
 * should return a flag indicating if it is receiving valid packet data or not.  This return flag will drive
 * the connected/disconnected state of the transport layer. 
 *    
 * @param target - callback function to pass the decoded object received to.   
 * @param data {Number[]} - The raw data received that needs to be decoded from packets into objects.
 * @return {boolean} true if packet decoding is receiving valid data or false if the packet decoding is receiving invalid data.  
 */
gc.databind.IPacketCodec.prototype.decode = function(target, data) {};
