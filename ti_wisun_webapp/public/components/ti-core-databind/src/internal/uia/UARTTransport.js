/*
 * A serial port transport for UIA based on open source project RxTx.
 */
var gc = gc || {};
gc.uia = gc.uia || {};

(function() 
{
	var InputStream = function() {};
	
	InputStream.prototype.offset = 0;
	
	InputStream.prototype.push = function(newData)
	{
		var chunk = { data: newData };
		if (this.eos)
		{
			this.eos.next = chunk;
		}
		this.eos = chunk;
		this.tos = this.tos || chunk;
	};
	
	InputStream.prototype.available = function()
	{
		var result = -this.offset;
		for( var i = this.tos; i ; i = i.next )
		{
			result += i.data.length;
		}
		return result;
	};
	
	InputStream.prototype.skip = function(count)
	{
		this.offset += count;
		for( var i = this.tos; i; i = i.next )
		{
			if (i.data.length <= this.offset)
			{
				this.tos = i.next;
				this.offset -= i.data.length;
			}
			else
			{
				break;
			}
		}
	};
	
	InputStream.prototype.read = function(blk, srcOffset, count)
	{
		var chunk = this.tos;
		srcOffset += this.offset;
		var dstOffset = 0;
		var result = count;
		
		while(chunk && count > 0)
		{
			var len = Math.min(count, chunk.data.length - srcOffset);
			if (len > 0)
			{
				for( var i = 0; i < len; i++ )
				{
					blk[dstOffset + i] = chunk.data[srcOffset + i]; 
				}
				dstOffset += len;
				count -= len;
				srcOffset += len;
			}
			srcOffset -= chunk.data.length;
			chunk = chunk.next;
		}
		
		return result - count;
	};
	
	InputStream.prototype.processBlock = function(callback, length)
	{
		var chunk = this.tos;
		if (chunk && chunk.data.length >= this.offset + length)
		{
			callback(chunk.data, this.offset);
		}
		else
		{
			var buf = [];
			this.read(buf, 0, length);
			callback(buf, 0);
		}
		this.skip(length);
	};

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
	var ERHeader = function() {};
	
	ERHeader.prototype.type = 0;
	ERHeader.prototype.len = 0;
	ERHeader.prototype.seq = 0;
		
	ERHeader.readHeader = function(blk, offset) 
	{
		var header = new ERHeader();
		header.read(blk, offset);
		return header;
	};
	
	ERHeader.getByteSize = function() 
	{
		return 4;
	};
	
	ERHeader.prototype.read = function(blk, offset) 
	{
		this.type = ((blk[offset + 3]) >> 3 ) & 0x001F;
		//
		this.len  =  (blk[offset + 2])        & 0x00FF;
		this.len |= ((blk[offset + 3]) << 8 ) & 0x0700;
		// 
		this.seq  =  (blk[offset])        & 0x00FF;
		this.seq |= ((blk[offset + 1]) << 8 ) & 0xFF00;
	};
	
	ERHeader.prototype.getType = function() 
	{
		return this.type;
	};
	ERHeader.prototype.getLen = function() 
	{
		return this.len;
	};
	ERHeader.prototype.getSeq = function() 
	{
		return this.seq;
	};
	ERHeader.prototype.hasTimestamp = function() 
	{
		return (this.type & 0x01) !== 0;
	};
	
	var header = new ERHeader();
	var header2 = new ERHeader();

	var moduleID = 0;	// moduleID, must match metadata
	var loggerID = 0;	// loggerID, must match metadata
	
	/*
	 * SDSCM00051785 - Encountered cases with random byte loss.
	 *   Currently, we'll search for a valid record at the beginning based on:
	 *     1) No data loss
	 *     2) UIA host won't start with alignment with record, "data loss"
	 *        due to receiver not started.
	 *   Emulation team is investigating whether the byte loss can be avoided or not.
	 *   If no then we need some ways to recover, only if possible.
	 */
	var UARTTransport = function(name, srcAddr)
	{
		this.name = name;
		this.inputStream = new InputStream();
		this.hdrPacket = new gc.uia.EvtRecHeader();
		this.hdrPacket.setSenderAdrs(srcAddr);
		this.hdrPacket.setLoggerId(loggerID << 16 & moduleID);	// fixed loggerID, have to matched with the metadata. Lower 16 bits is the moduleID
		this.hdrPacket.setDestAdrs(-1);	// host address
	};
	
	UARTTransport.prototype.srcAddr = 0;   // single core target, always 0?
		
	// [ SDSCM00051785
	var SDSCM00051785_handleDataLoss = false;
	// ]
	
	UARTTransport.prototype.setTargetCodec = function(dec, enc) 
	{
		this.dec = dec;
		this.enc = enc;
	};
	
	UARTTransport.prototype.totalReceived = 0;
	UARTTransport.prototype.seqNum = 0;
	
	var maxSingleEventSize = 1024;
	var blk = [];
	
	UARTTransport.prototype.readEventRecord = function(inputStream)
	{
		var headerSize = ERHeader.getByteSize();
		
		var available = inputStream.available();
		if(available < headerSize) 
		{
			return 0;
		}
		
		inputStream.read(blk, 0, headerSize);
		
		// extract the record length from header
		header.read(blk, 0);
		var recLen = header.getLen();
		
		if(recLen > maxSingleEventSize || recLen <= 4) 
		{
			// unreasonable huge event size.
			inputStream.skip(1);	// discard a byte
			this.setConnected(false);
			
			return -1;
		}

		available -= recLen;
		
		if (available > 0 || !this.isConnected())
		{
			// verify next header, because there is one or we are disconnected right now. 
			if(available < headerSize ) 
			{
				// Not enough data to reach next record's header
				return 0;
			}

			inputStream.read(blk, recLen, headerSize);
			header2.read(blk, 0);
			
			if((header2.getLen() > maxSingleEventSize) ||			// unreasonable huge event size.	
				(header2.getLen() < 4) ||
			    (header2.getSeq() !== (header.getSeq()+1) ) ||			// not consecutive sequence number
			    (header.hasTimestamp() !== header2.hasTimestamp() ))	// timestamp flags no matched
			{
				inputStream.skip(1);	// discard a byte
				return -1;
			}
		}
		
		// valid
		this.setConnected(true);
		return recLen;
	};
	
	UARTTransport.prototype.run = function(message)
	{
		var pLen = -1;
		
		this.inputStream.push(message);
		while(pLen !== 0)
		{
			while(pLen < 0)
			{
				pLen = this.readEventRecord(this.inputStream);
			}
			if (pLen > 0)
			{
				this.hdrPacket.setEventSequenceCount(this.seqNum++);
				this.hdrPacket.setEventLength(this.hdrPacket.getRawSize() + pLen);	// header + received
				this.inputStream.processBlock(this.decodeEventRecord, pLen);
				
				this.totalReceived += pLen;	
				pLen = -1;  // try to decode another message 
			}
		}
	};
	
	UARTTransport.prototype.setConnected = function(connected) 
	{
		this.connected = connected;
	};
	UARTTransport.prototype.isConnected = function()
	{
		return this.connected;
	};
	
	gc.uia.UARTTransport = UARTTransport;
}());

