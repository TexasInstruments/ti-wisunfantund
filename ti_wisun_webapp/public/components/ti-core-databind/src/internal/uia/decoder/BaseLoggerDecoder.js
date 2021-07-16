/*
 * Base LoggerBuff2 type decoder. LoggerBuff2, LoggerSTM & LoggerFile use the same data structure.
 */
 
var gc = gc || {};
gc.uia = gc.uia || {};

(function() 
{
	var assert = function(test)
	{
		if (!test)
		{
			debugger;
			console.log('assert failed');
		}
	};

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

	var wordSize = 4;
	var wordBytes = newArray(wordSize);
	var longBytes = newArray(wordSize*2);

	var ByteBuffer = function(dec, parent, capacity) 
	{
	    this.dec = dec;
		if (capacity)
		{
			this.buff = newArray(capacity);
		}
	};
		
	ByteBuffer.prototype.offset = 0;
		
	/*
	 * Caller have to call init() before using the object.
	 */
	ByteBuffer.prototype.init = function(buff, offset) 
	{
		this.buff = buff;
		this.offset = offset;
	};
	
	ByteBuffer.prototype.checkCapacity = function(len) 
	{
		if(!this.buff || this.buff.length < len) 
		{
			// grow
			this.buff = newArray(len);
		}
	};
	
	ByteBuffer.prototype.extract = function(to) 
	{
		var available = this.buff.length-(this.offset);
		var needed = to.length;
		if( available < needed ) 
		{
			throw 'InsufficientDataException(' + needed + ',' + available + ')';
		}
		for( var i=0, j=this.offset; i<needed; i++, j++ ) 
		{
			to[i] = this.buff[j];
		}
		return to;
	};
	/**
	 * @return the buff
	 */
	ByteBuffer.prototype.getBuff = function() 
	{
		return this.buff;
	};
	/**
	 * @return the offset
	 */
	ByteBuffer.prototype.getOffset = function() 
	{
		return this.offset;
	};
	ByteBuffer.prototype.readInt = function() 
	{
		this.extract(wordBytes);
		var x = this.dec.decodeBytes(wordBytes, 0, wordSize, false);
		this.offset += wordBytes.length;
		return x;
	};
	ByteBuffer.prototype.readLong = function() 
	{
		this.extract(longBytes);
		var lo = this.dec.decodeBytes(longBytes, 0, wordSize, false);
		var hi = this.dec.decodeBytes(longBytes, wordSize, wordSize, false);
		var x = hi << (wordSize*8) | lo;
		this.offset += longBytes.length;
		return x;
	};
	
	var PingPongRecords = function() 
	{
		this.ping = true;
		this.recPing = new gc.uia.EventRecord();
		this.recPong = new gc.uia.EventRecord();
	};
	
	PingPongRecords.prototype.getCurrRecord = function() 
	{
		if(this.ping) 
		{
			return this.recPing;
		}
		return this.recPong;
	};
	
	PingPongRecords.prototype.switchRec = function() 
	{
		this.ping = this.ping ? false : true;
	};
	
	var mask = function(val, mask, offset) 
	{
		return (val >> offset) & mask;
	};
	
	var BaseLoggerDecoder = function() 
	{
		this.dualRecords = new PingPongRecords();
	};
	
	BaseLoggerDecoder.prototype = new gc.uia.ILoggerDecoder();
	
	BaseLoggerDecoder.prototype.maxArgs = 8;

	/* 
	 * Version 0.1 : event record format
     *   3 3 2 2 2 2 2 2 2 2 2 2 1 1 1 1 1 1 1 1 1 1 0 0 0 0 0 0 0 0 0 0
     *   1 0 9 8 7 6 5 4 3 2 1 0 9 8 7 6 5 4 3 2 1 0 9 8 7 6 5 4 3 2 1 0
     *  |---------------------------------------------------------------|
	 *  |T T T T T L L L L L L L L L L L S S S S S S S S S S S S S S S S|
     *  |---------------------------------------------------------------|
	 *
	 *  T = Header Type,      5 bits, [31..27]
	 *  L = Length,          11 bits, [26..16]
	 *  S = Sequence Number, 16 bits, [15..00]
	 */
	var Ver01Rec = {
		// Bit fields
		T_MASK   : 0x0001F,
		T_OFFSET : 27,
		L_MASK   : 0x07FF,
		L_OFFSET : 16,
		S_MASK   : 0xFFFF,
		S_OFFSET : 0,
	};
	/* 
	 * Version 0.2 : event record format
     *   3 3 2 2 2 2 2 2 2 2 2 2 1 1 1 1 1 1 1 1 1 1 0 0 0 0 0 0 0 0 0 0
     *   1 0 9 8 7 6 5 4 3 2 1 0 9 8 7 6 5 4 3 2 1 0 9 8 7 6 5 4 3 2 1 0
     *  |---------------------------------------------------------------|
	 *  |T T T T T L L L L L L L L L L L M P P P S S S S S S S S S S S S|
     *  |---------------------------------------------------------------|
	 *
	 *  T = Header Type,      5 bits, [31..27]
	 *  L = Length,          11 bits, [26..16]
	 *  M = Timestamp flag,   1 bit,  [15..15]
	 *  P = Priority,         3 bits, [14..12]  
	 *  S = Sequence Number, 12 bits, [11..00]
	 */
	var Ver02Rec = {
		// Bit fields
		T_MASK   : 0x001F,
		T_OFFSET : 27,
		L_MASK   : 0x07FF,
		L_OFFSET : 16,
		M_MASK   : 0x0001,
		M_OFFSET : 15,
		P_MASK   : 0x0007,
		P_OFFSET : 12,
		S_MASK   : 0x0FFF,
		S_OFFSET : 0
	};
	// Types (T field)
	BaseLoggerDecoder.prototype.Type_Event = 0;
	BaseLoggerDecoder.prototype.Type_Event_64TS = 1;
	BaseLoggerDecoder.prototype.Type_EventWithSnapshotID = 2;
	BaseLoggerDecoder.prototype.Type_EventWithSnapshotID_64TS = 3;
	BaseLoggerDecoder.prototype.Type_EventWithEndpointID = 4;
	BaseLoggerDecoder.prototype.Type_EventWithEndpointID_64TS = 5;
	BaseLoggerDecoder.prototype.Type_EventWithSnapshotIDAndEndpointID = 6;
	BaseLoggerDecoder.prototype.Type_EventWithSnapshotIDAndEndpointID_64TS = 7;
	BaseLoggerDecoder.prototype.Type_Event_MinSeq = 8;
	BaseLoggerDecoder.prototype.Type_Event_MinSeq_32TS = 9;
	BaseLoggerDecoder.prototype.Type_Event_MinSeq_64TS = 10;
	BaseLoggerDecoder.prototype.Type_EventWithSnapshotID_MinSeq = 11;
	BaseLoggerDecoder.prototype.Type_EventWithSnapshotID_MinSeq_64TS = 12;
	BaseLoggerDecoder.prototype.Type_Reserved_Ex = 31;
	
	var readHeader = function(ver, inputByteBuffer, eventRecord)
	{
		if(ver !== 0x0001) 
		{
			assert(false);
			return;
		}
		
		var recLenInBytes;
		var dataWord;

		// read first word
		dataWord = inputByteBuffer.readInt();
		
		if(ver === 0x0001) {
			/*
		     *   3 3 2 2 2 2 2 2 2 2 2 2 1 1 1 1 1 1 1 1 1 1 0 0 0 0 0 0 0 0 0 0
		     *   1 0 9 8 7 6 5 4 3 2 1 0 9 8 7 6 5 4 3 2 1 0 9 8 7 6 5 4 3 2 1 0
		     *  |---------------------------------------------------------------|
			 *  |H H H H H L L L L L L L L L L L S S S S S S S S S S S S S S S S|
		     *  |---------------------------------------------------------------|
			 *
			 *  H = Header type,   5 bits [31..27]
			 *  L = Event Length, 11 bits [26..16]
			 *  S = Sequence No,  16 bits [15..00]
			 *  
			 */
			
			// 16 bits seqNo [15..0]
			eventRecord.sequenceNum = mask(dataWord, Ver01Rec.S_MASK, Ver01Rec.S_OFFSET);	
			// 11 bits size [26..16]
			recLenInBytes = mask(dataWord, Ver01Rec.L_MASK, Ver01Rec.L_OFFSET);	
			// 5 bits header type [31..27]
			eventRecord.type = mask(dataWord, Ver01Rec.T_MASK, Ver01Rec.T_OFFSET);
			// no priority
			eventRecord.priority = 0;
			
			eventRecord.recLength = recLenInBytes;
			eventRecord.payloadSize = recLenInBytes - wordSize;	// subtract first word from argument block
		}
		else {
			// future versions
			assert(false);	
		}
		
	};
	var adjustMinSeq = function(eventRecord) 
	{
		// TODO
		eventRecord.sequenceNum &= 0x1F;	// mask lower 5 bits
	};
	var readTimestamp = function(inputByteBuffer, eventRecord, bytes)
	{
		if(bytes === 32) 
		{
			// 32 bits time stamp
			eventRecord.timestamp = inputByteBuffer.readInt();
			eventRecord.timestamp &= 0xFFFFFFFF;
			eventRecord.payloadSize -= wordSize;		// subtract 1 word from argument block
		}
		else if(bytes === 64) 
		{
			// 64 bits time stamp
			eventRecord.timestamp = inputByteBuffer.readLong();
			eventRecord.payloadSize -= 2*wordSize;		// subtract 2 words from argument block
		}
		else 
		{
			assert(false);
		}
		// TODO - handle wrap around
	};
	var readEvent = function(inputByteBuffer, eventRecord)
	{
		/*
	     *   3 3 2 2 2 2 2 2 2 2 2 2 1 1 1 1 1 1 1 1 1 1 0 0 0 0 0 0 0 0 0 0
	     *   1 0 9 8 7 6 5 4 3 2 1 0 9 8 7 6 5 4 3 2 1 0 9 8 7 6 5 4 3 2 1 0
	     *  |---------------------------------------------------------------|
		 *  |E E E E E E E E E E E E E E E E M M M M M M M M M M M M M M M M|
	     *  |---------------------------------------------------------------|
		 *
		 *  E = Event ID  16 bits, [31..16]
		 *  M = Module ID,  16 bits, [15..00]
		 *  
		 */
		var dataWord;
		dataWord = inputByteBuffer.readInt();
		eventRecord.payloadSize -= wordSize;		// subtract 1 word from argument block
		
		// 16 bits module ID
		eventRecord.moduleID = mask(dataWord, 0xFFFF, 0);
		// 16 bits event ID
		eventRecord.eventID = mask(dataWord, 0xFFFF, 16);
	};
	var readEndpoint = function(inputByteBuffer, eventRecord)
	{
		/*
	     *   3 3 2 2 2 2 2 2 2 2 2 2 1 1 1 1 1 1 1 1 1 1 0 0 0 0 0 0 0 0 0 0
	     *   1 0 9 8 7 6 5 4 3 2 1 0 9 8 7 6 5 4 3 2 1 0 9 8 7 6 5 4 3 2 1 0
	     *  |---------------------------------------------------------------|
		 *  |R R R R R R R R R R R R R R R R E E E E E E E E E E E E E E E E|
	     *  |---------------------------------------------------------------|
		 *
		 *  R = Reserved,     16 bits, [31..16]
		 *  E = Endpoint ID,  16 bits, [15..00]
		 *  
		 *  
	     *   3 3 2 2 2 2 2 2 2 2 2 2 1 1 1 1 1 1 1 1 1 1 0 0 0 0 0 0 0 0 0 0
	     *   1 0 9 8 7 6 5 4 3 2 1 0 9 8 7 6 5 4 3 2 1 0 9 8 7 6 5 4 3 2 1 0
	     *  |---------------------------------------------------------------|
		 *  |P P P P P P P P P P P P P P P P P P P P P P P P P P P P P P P P|
	     *  |---------------------------------------------------------------|
		 *
		 *  P = Process ID,   32 bits, [31..00]
		 *  
		 */
		var dataWord;
		dataWord = inputByteBuffer.readInt();
		eventRecord.endpointID = mask(dataWord, 0xFFFF, 0);
		dataWord = inputByteBuffer.readInt();
		eventRecord.processID = dataWord;
		
		// These 2 words are part of the payload, no need to adjust payloadSize.
	};
	var readSnapshot = function(inputByteBuffer, eventRecord) 
	{
		/*
		 *    word1: filename pointer
		 *    word2: linenum
		 *    word3: snapshotId
		 *    word4: address where the data was located
		 *    word5: total length of data (top 16-bits)
		 *           length for this record (bottom 16 bits)
		 *    word6: format pointer
		 */
		
		// do nothing, leave decoder to take care of the rest
	};

	var decode = function(dec, eventRecord, buff, offset)
	{
		var recLenInBytes;
		var inputByteBuffer = new ByteBuffer(dec);

		inputByteBuffer.init(buff, offset);

		eventRecord.reset();

		var ver = 0x0001;	// default version = 0.1

		// Read header (first 4 bytes)
		readHeader(ver, inputByteBuffer, eventRecord);

		/*
		 * Check if sufficient data available for a full record.
		 * If the record length bits are not common to all versions 
		 * then have to move the codes into version specific block.
		 */
		recLenInBytes = eventRecord.recLength;
		if( recLenInBytes - wordSize > buff.length - offset ) 
		{
			throw 'InsufficientDataException(' + recLenInBytes + ',' +  buff.length - offset + wordSize + ')';
		}
		if(recLenInBytes < wordSize) 
		{
			throw 'RuntimeException("Corrupted or unrecognized data.")';
		}
		
		switch(eventRecord.type) 
		{
		case this.Type_Event:	// 0
			readEvent(inputByteBuffer, eventRecord);			// 32 bits Module & Event
			break;
		case this.Type_Event_64TS:	// 1
			readTimestamp(inputByteBuffer, eventRecord, 64);	// 64 bits time stamp
			readEvent(inputByteBuffer, eventRecord);			// 32 bits Module & Event
			break;
		case this.Type_EventWithSnapshotID:	// 2
			readSnapshot(inputByteBuffer, eventRecord);
			readEvent(inputByteBuffer, eventRecord);			// 32 bits Module & Event
			break;
		case this.Type_EventWithSnapshotID_64TS:	// 3
			readTimestamp(inputByteBuffer, eventRecord, 64);	// 64 bits time stamp
			readSnapshot(inputByteBuffer, eventRecord);
			readEvent(inputByteBuffer, eventRecord);			// 32 bits Module & Event
			break;
		case this.Type_EventWithEndpointID:	// 4
			readEndpoint(inputByteBuffer, eventRecord);
			readEvent(inputByteBuffer, eventRecord);			// 32 bits Module & Event
			break;
		case this.Type_EventWithEndpointID_64TS:	// 5
			readTimestamp(inputByteBuffer, eventRecord, 64);	// 64 bits time stamp
			readEndpoint(inputByteBuffer, eventRecord);
			readEvent(inputByteBuffer, eventRecord);			// 32 bits Module & Event
			break;
		case this.Type_EventWithSnapshotIDAndEndpointID:	// 6
			readEndpoint(inputByteBuffer, eventRecord);
			readSnapshot(inputByteBuffer, eventRecord);
			readEvent(inputByteBuffer, eventRecord);			// 32 bits Module & Event
			break;
		case this.Type_EventWithSnapshotIDAndEndpointID_64TS:	// 7
			readTimestamp(inputByteBuffer, eventRecord, 64);	// 64 bits time stamp
			readEndpoint(inputByteBuffer, eventRecord);
			readSnapshot(inputByteBuffer, eventRecord);
			readEvent(inputByteBuffer, eventRecord);			// 32 bits Module & Event
			break;
		case this.Type_Event_MinSeq:	// 8
			readEvent(inputByteBuffer, eventRecord);			// 32 bits Module & Event
			adjustMinSeq(eventRecord);
			break;
		case this.Type_Event_MinSeq_32TS:	// 9
			readTimestamp(inputByteBuffer, eventRecord, 32);	// 32 bits time stamp
			readEvent(inputByteBuffer, eventRecord);			// 32 bits Module & Event
			adjustMinSeq(eventRecord);
			break;
		case this.Type_Event_MinSeq_64TS:	// 10
			readTimestamp(inputByteBuffer, eventRecord, 64);	// 64 bits time stamp
			readEvent(inputByteBuffer, eventRecord);			// 32 bits Module & Event
			adjustMinSeq(eventRecord);
			break;
		case this.Type_EventWithSnapshotID_MinSeq:	// 11
			readSnapshot(inputByteBuffer, eventRecord);
			readEvent(inputByteBuffer, eventRecord);			// 32 bits Module & Event
			adjustMinSeq(eventRecord);
			break;
		case this.Type_EventWithSnapshotID_MinSeq_64TS:	// 12
			readTimestamp(inputByteBuffer, eventRecord, 64);	// 64 bits time stamp
			readSnapshot(inputByteBuffer, eventRecord);
			readEvent(inputByteBuffer, eventRecord);			// 32 bits Module & Event
			adjustMinSeq(eventRecord);
			break;
		case this.Type_Reserved_Ex:
			readEvent(inputByteBuffer, eventRecord);			// 32 bits Module & Event
			break;
		default:
			assert(false);
			break;
		}
		
		// arguments
		var dataWord, i;
		eventRecord.args = null;
		if(eventRecord.payloadSize < 0) 
		{
			throw 'RuntimeException("Data corruption? Invalid payloadSize.")';
		}
		if(eventRecord.payloadSize <= this.maxArgs * wordSize) // less then maximum arguments
		{
			if((eventRecord.payloadSize % wordSize) === 0)	// whole number of word arguments
			{
				var numArgs = eventRecord.payloadSize / wordSize;
				if(numArgs < 0) {
					throw 'RuntimeException("Data corruption? Invalid numArgs.")';
				}
				eventRecord.args = [];
				for(i=0; i<numArgs; i++) 
				{
					dataWord = inputByteBuffer.readInt();
					eventRecord.args.push(dataWord); 
				}
			}
		}
		else {
			// fill the max args, anyway
			eventRecord.args = [];
			for(i=0; i<this.maxArgs; i++) {
				dataWord = inputByteBuffer.readInt();
				eventRecord.args.push(dataWord); 
			}
		}
		
		// copy raw bytes
		eventRecord.payload = [];
		System.arraycopy(buff, offset+recLenInBytes-eventRecord.payloadSize, eventRecord.payload, 0, eventRecord.payloadSize);
		
		return eventRecord.recLength;
	};
	
	BaseLoggerDecoder.prototype.decode = function(buff, offset) 
	{
		var eventRecord = this.dualRecords.getCurrRecord();
		decode(this.dec, eventRecord, buff, offset);
		this.dualRecords.switchRec();
		return eventRecord;
	};
	
	BaseLoggerDecoder.prototype.setDec = function(dec) 
	{
		this.dec = dec;
	};
	
	gc.uia.BaseLoggerDecoder = BaseLoggerDecoder;
}());
