/*
 *  ======== EvtRecHeader ========
 *  Stores the values in a UIAPacket event record header. Also contains the 
 *  code for decoding these values from the target bytes.
 */
var gc = gc || {};
gc.uia = gc.uia || {};

(function() 
{
	var newArray = function(size) 
	{
		var result = [];
		for(var i = size; i-- > 0; )
		{
			result.push(0);
		}
		return result;
	};
	
	var System = 
	{
		arrayCopy: function(src, srcPos, dst, dstPos, len) 
		{
			while( len-- > 0 )
			{
				dst[dstPos + len] = src[srcPos + len];
			}
		}
	};

	/*
	 *  ========= Constructor ========
	 */
	var EvtRecHeader = function() 
	{
		// Allocate 4 words buffer
		this.raw = newArray(16);
	};
	
	EvtRecHeader.prototype = new gc.uia.UAPacket();

	EvtRecHeader.prototype.payloadLittleEndian = true;
	EvtRecHeader.hdrType = gc.uia.UAPacket.prototype.HDR_TYPE_EVENT_REC;
	 
	/* 
	 * Create the decoder and encoder. The packet is always big endian, and
	 * the MAU size doesn't matter because we only deal in bytes.
	 */
	EvtRecHeader.prototype.dec = new gc.uia.TargetDecoder(gc.uia.TargetType.Endianess.BIG, 8);
	EvtRecHeader.prototype.enc = new gc.uia.TargetEncoder(gc.uia.TargetType.Endianess.BIG, 8);
	
    /* Header word 1 values */	
    EvtRecHeader.prototype.payloadEndian = 0;
    EvtRecHeader.prototype.eventLength = 0;

    /* Header word 2 values */
    EvtRecHeader.prototype.seqNum = 0;
    EvtRecHeader.prototype.priority = 0;
    EvtRecHeader.prototype.reserved = 0;
    
    /* Header word 3 values */
    EvtRecHeader.prototype.loggerId = 0;
    
    /* Header word 4 values */
    EvtRecHeader.prototype.destAddr = 0;
    EvtRecHeader.prototype.srcAddr = 0;
    
	/*
     *  HdrType_EventRec word1     
     *   3 3 2 2 2 2 2 2 2 2 2 2 1 1 1 1 1 1 1 1 1 1 0 0 0 0 0 0 0 0 0 0
     *   1 0 9 8 7 6 5 4 3 2 1 0 9 8 7 6 5 4 3 2 1 0 9 8 7 6 5 4 3 2 1 0
     *  |---------------------------------------------------------------|
     *  |H H H H|E|L L L L L L L L L L L L L L L L L L L L L L L L L L L|
     *  |---------------------------------------------------------------|
     *
     *  H = HdrType         (4-bits)
     *  E = Payload endian   (1-bit)
     *  L = Event Length   (27-bits)
	 */
	EvtRecHeader.prototype.PAYLOAD_ENDIAN_MASK = 0x08000000;
	EvtRecHeader.prototype.EVENT_LENGTH_MASK = 0x07FFFFFF;
	
    /*
     *  HdrType_EventRec word2     
     *   3 3 2 2 2 2 2 2 2 2 2 2 1 1 1 1 1 1 1 1 1 1 0 0 0 0 0 0 0 0 0 0
     *   1 0 9 8 7 6 5 4 3 2 1 0 9 8 7 6 5 4 3 2 1 0 9 8 7 6 5 4 3 2 1 0
     *  |---------------------------------------------------------------|
     *  |S S S S S S S S S S S S S S S S|R R R R R R R R R R R R R R|P P|
     *  |---------------------------------------------------------------|
     *
     *  S = Sequence Number      (16-bits)
     *  R = Reserved             (14-bits)
     *  P = Priority             ( 2-bits)
     */
	EvtRecHeader.prototype.SEQ_NUM_MASK  = 0xFFFF0000;
	EvtRecHeader.prototype.PRIORITY_MASK = 0x00000003;
	EvtRecHeader.prototype.RESERVED_MASK = 0x0000FFFC;
	
    /*
     *   HdrType_EventRec word3
     *   3 3 2 2 2 2 2 2 2 2 2 2 1 1 1 1 1 1 1 1 1 1 0 0 0 0 0 0 0 0 0 0
     *   1 0 9 8 7 6 5 4 3 2 1 0 9 8 7 6 5 4 3 2 1 0 9 8 7 6 5 4 3 2 1 0
     *  |---------------------------------------------------------------|
     *  |D I I I I I I I I I I I I I I I M M M M M M M M M M M M M M M M|
     *  |---------------------------------------------------------------|
     *
     *  M - ModuleID            (16-bits)
     *  I - InstanceID          (16-bits, bit 31 used to flag dynamic logger)
     *  (*) All 32 bits used as a unique loggerID.	    
     */
	EvtRecHeader.prototype.LOGGER_ID_MASK  = 0xFFFFFFFF;
	EvtRecHeader.prototype.MODULE_ID_MASK  = 0x0000FFFF;
	EvtRecHeader.prototype.LOGGER_DYN_MASK  = 0x80000000;
	EvtRecHeader.prototype.LOGGER_INST_MASK  = 0x7FFF0000;
	
    /*
     *  HdrType_EventRec word4
     *   3 3 2 2 2 2 2 2 2 2 2 2 1 1 1 1 1 1 1 1 1 1 0 0 0 0 0 0 0 0 0 0
     *   1 0 9 8 7 6 5 4 3 2 1 0 9 8 7 6 5 4 3 2 1 0 9 8 7 6 5 4 3 2 1 0
     *  |---------------------------------------------------------------|
     *  |D D D D D D D D D D D D D D D D|S S S S S S S S S S S S S S S S|
     *  |---------------------------------------------------------------|
     *
     *  D - Destination Address (16-bits)    
     *  S - Source Address      (16-bits)
     */
	EvtRecHeader.prototype.DEST_ADDR_MASK = 0xFFFF0000;
	EvtRecHeader.prototype.RC_ADDR_MASK = 0x0000FFFF;	

	/*
	 *  ======== read ========
	 */
	EvtRecHeader.prototype.read = function(msg, offset) 
	{
	    /* 
	     * Throw an exception if 'msg' is null or if it does not contain
	     * enough bytes to be a header.
	     */
		if ((!msg) ||
		    ((msg.length - offset) < this.raw.length)) 
		{
			throw 'IllegalMessageException(new IllegalSize(' + msg.length - offset + '))';
		}
		
		/* Copy the header bytes from 'msg' into our buffer 'raw'. */
		System.arraycopy(msg, offset, this.raw, 0, this.raw.length);

		/* Decode the header. */
		this.unpack();
	};
		
	/* 
     *  ======== unpack ========
     *  Decode the packet header stored in this.buff.
     */
    EvtRecHeader.prototype.unpack = function() 
    {
        /* Decode each of the words from the byte array. */
        var word1 = this.dec.decodeBytes(this.raw, 0, 4, false);
        var word2 = this.dec.decodeBytes(this.raw, 4, 4, false);
        var word3 = this.dec.decodeBytes(this.raw, 8, 4, false);
        var word4 = this.dec.decodeBytes(this.raw, 12, 4, false);
        
        /* Extract the values from the words. */
        this.payloadEndian = this.readVal(word1, this.PAYLOAD_ENDIAN_MASK);
        this.eventLength = this.readVal(word1, this.EVENT_LENGTH_MASK);
    
        this.seqNum = this.readVal(word2, this.SEQ_NUM_MASK);
        this.priority = this.readVal(word2, this.PRIORITY_MASK);
        this.reserved = this.readVal(word2, this.RESERVED_MASK);
        
        this.loggerId = word3;
        
        this.destAddr = this.readVal(word4, this.DEST_ADDR_MASK);
        this.srcAddr = this.readVal(word4, this.SRC_ADDR_MASK);
    };

    /*
     *  ======== printHeader ========
     *  Prints the header and its values to the console for testing.
     */
    EvtRecHeader.prototype.printHeader = function()
    {
       console.log("======================================");
       console.log("Event Packet Header");
       console.log("  payloadEndian: " + this.payloadEndian +
                          " eventLength: " + this.eventLength);
       console.log("  seqNum: " + this.seqNum + " reserved: " + this.reserved);
       console.log("  loggerId: " + this.loggerId);
       console.log("  destAddr: " + this.destAddr + " srcAddr: " + this.srcAddr);
       console.log("======================================");
    };
    
    /* 
     *  ======== resetBuff ========
     *  Clear out the buffer before writing to it in 'pack'.
     */
	EvtRecHeader.prototype.resetBuff = function() 
	{
		for (var i=0; i<this.raw.length; i++) 
		{
			this.raw[i] = 0;
		}
	};
		
	EvtRecHeader.prototype.maskInt = function(value, mask) 
	{
		return ((value << this.getShiftCount(mask)) & mask);
	};
	/*
	 *  ======== pack ========
	 *  Encodes the header back into the buffer.
	 *  
	 */
	EvtRecHeader.prototype.pack = function() 
	{
		this.resetBuff();
		
		/* Encode the words */
		var word1 = this.maskInt(this.hdrType, this.HDR_TYPE_MASK) |
				    this.maskInt(this.payloadEndian, this.PAYLOAD_ENDIAN_MASK) |
				    this.maskInt(this.eventLength, this.EVENT_LENGTH_MASK);
		
		var word2 = this.maskInt(this.seqNum, this.SEQ_NUM_MASK) |
				    this.maskInt(this.priority, this.PRIORITY_MASK) |
				    this.maskInt(this.reserved, this.RESERVED_MASK);
		
		var word3 = this.maskInt(this.loggerId, this.LOGGER_ID_MASK);
    
		var word4 = this.maskInt(this.destAddr, this.DEST_ADDR_MASK) |
				    this.maskInt(this.srcAddr, this.SRC_ADDR_MASK);
		
		/* Encode the words into the byte array. */
		this.enc.encodeBytes(this.raw, 0, word1, 4);
		this.enc.encodeBytes(this.raw, 4, word2, 4);
		this.enc.encodeBytes(this.raw, 8, word3, 4);
		this.enc.encodeBytes(this.raw, 12, word4, 4);
	};
	
	/* Getters & Setters */
	EvtRecHeader.prototype.getEventLength = function() 
	{
		return this.eventLength;
	};

	EvtRecHeader.prototype.setEventLength = function(eventLength) 
	{
		this.eventLength = eventLength;
	};

	EvtRecHeader.prototype.getEventSequenceCount = function() {
		return this.seqNum;
	};

	EvtRecHeader.prototype.setEventSequenceCount = function(eventSequenceCount) {
		this.seqNum = eventSequenceCount;
	};
	
	EvtRecHeader.prototype.getPriority = function() {
		return this.priority;
	};
	
	EvtRecHeader.prototype.setPriority = function(priority) {
		this.priority = priority;
	};
	
	EvtRecHeader.prototype.getReverved = function() {
		return this.reserved;
	};
	
	EvtRecHeader.prototype.setReserved = function(reserved) {
		this.reserved = reserved;
	};
	
	EvtRecHeader.prototype.getLoggerId = function() {
		return this.loggerId;
	};

	EvtRecHeader.prototype.setLoggerId = function(loggerId) {
		this.loggerId = loggerId;
	};

	EvtRecHeader.prototype.getSenderAdrs = function() {
		return this.srcAddr;
	};

	EvtRecHeader.prototype.setSenderAdrs = function(senderAdrs) {
		this.srcAddr = senderAdrs;
	};

	EvtRecHeader.prototype.getDestAdrs = function() {
		return this.destAddr;
	};

	EvtRecHeader.prototype.setDestAdrs = function(destAdrs) {
		this.destAddr = destAdrs;
	};
	
	// Payload size = total event length - header
	EvtRecHeader.prototype.getPayloadSize = function() {
		return this.eventLength - 16;
	};

	EvtRecHeader.prototype.getDec = function() {
		return this.dec;
	};

	EvtRecHeader.prototype.getEnc = function() {
		return this.enc;
	};

	gc.uia.EvtRecHeader = EvtRecHeader;	
}());
