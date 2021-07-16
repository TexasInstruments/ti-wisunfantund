/*
 *  ======== UAPacket ========
 *  This class contains constants and APIs which are generic to all UIA packet
 *  headers.
 *  
 *  This is the base class for the UAMsgHeader and the EvtRecHeader.
 */
 
var gc = gc || {};
gc.uia = gc.uia || {};

(function() 
{
	var UAPacket = function() {};
	
	UAPacket.prototype = new gc.uia.AbstractMessage();

    /* 
     * The current header types defined.
     * 
     * These are defined in ti.uia.runtime.UAPacket for the target. 
     */
	UAPacket.prototype.HDR_TYPE_MASK = 0xF0000000;
	
    UAPacket.prototype.HDR_TYPE_RESERVED_0 = 0; // reserved for future use
    UAPacket.prototype.HDR_TYPE_MSG_PID       = 1; // Message with PID, extending type_9
    UAPacket.prototype.HDR_TYPE_EVENT_REC_PID = 2; // Event with PID, extending type_10 
    UAPacket.prototype.HDR_TYPE_MIN_EVENT_REC = 3; // 2 words LoggerMin event record (vs regular 4 words)
    UAPacket.prototype.HDR_TYPE_RESERVED_4 = 4; // reserved for future use 
    UAPacket.prototype.HDR_TYPE_RESERVED_5 = 5; // reserved for future use
    UAPacket.prototype.HDR_TYPE_RESERVED_6 = 6; // reserved for future use
    UAPacket.prototype.HDR_TYPE_RESERVED_7 = 7; // reserved for future use
    UAPacket.prototype.HDR_TYPE_CHANNELIZED_DATA = 8; // Channelized data stream
    UAPacket.prototype.HDR_TYPE_MSG = 9; // Message  
    UAPacket.prototype.HDR_TYPE_EVENT_REC = 10; // Event record containing multiple events
    UAPacket.prototype.HDR_TYPE_CPU_TRACE = 11; // CPU Trace ETB data
    UAPacket.prototype.HDR_TYPE_STM_TRACE = 12; // STM Trace ETB data
    UAPacket.prototype.HDR_TYPE_USER1 = 13; // User defined header type 1
    UAPacket.prototype.HDR_TYPE_USER2 = 14; // User defined header type 2
    UAPacket.prototype.HDR_TYPE_USER3 = 15;  // User defined header type 3
        
    /* 
     * A static function to peek the header type.
     */
    UAPacket.prototype.peekHeaderType = function(word) 
    {
		return this.readVal(word, this.HDR_TYPE_MASK);
    };
    UAPacket.prototype.peekHeaderType = function(dec, b, offset) 
    {
		if(!dec) 
		{
			return -1;	
		}
		var word1 = dec.decodeBytes(b, offset, 4, false);
		return this.peekHeaderType(word1);
    };
    
    // need source & destination address for all UIA packet to do routing
	UAPacket.prototype.DEST_ADDR_MASK = 0xFFFF0000;
	UAPacket.prototype.SRC_ADDR_MASK = 0x0000FFFF;
    UAPacket.prototype.peekSrcAddr = function(dec, b, offset) 
    {
		if(!dec) 
		{
			return -1;	
		}
		var word4 = dec.decodeBytes(b, offset+12, 4, false);
		return this.readVal(word4, this.SRC_ADDR_MASK);
    };
    UAPacket.prototype.peekDestAddr = function(dec, b, offset) 
    {
		if(!dec) 
		{
			return -1;	
		}
		var word4 = dec.decodeBytes(b, offset+12, 4, false);
		return this.readVal(word4, this.DEST_ADDR_MASK);
    };
    UAPacket.prototype.REC_LEN_MASK = 0x07FFFFFF;
    UAPacket.prototype.peekRecLength = function(dec, b, offset) 
    {
		if(!dec) 
		{
			return -1;	
		}
		var word1 = dec.decodeBytes(b, offset, 4, false);
		return this.readVal(word1, this.REC_LEN_MASK);
    };

    /*
     *  ======== getShiftCount ========
     *  Computes the shift count necessary to appropriately shift over the
     *  value retrieved by 'mask'.
     */
     UAPacket.prototype.getShiftCount = function(mask) 
     {
        var shiftCount = 0;
        
        /* Keep shifting the mask over by 1 until we have a 1 in the LSB. */
        while ((mask & 1) === 0) 
        {
            mask = mask >> 1;
            shiftCount++;
        }
        
        return (shiftCount);
    };
    
    /*
     *  ======== readVal ========
     *  Uses the given 'mask' to retrieve the value from the given 'word'.
     *  
     *  Applies the mask to the word, then shifts the result over to get the
     *  value.
     */
    UAPacket.prototype.readVal = function(word, mask) 
    {
		var lword = word & 0xFFFFFFFF;
		return (lword & mask) >> this.getShiftCount(mask);
    };
    
    gc.uia.UAPacket = UAPacket;
}());
