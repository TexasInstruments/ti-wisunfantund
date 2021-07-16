/*
 * Abstract class for UIA message. Each UIA message is sent/received in form of 
 * byte array. A message header must exist to identify and describe the message
 * body. A header type field must exist to identify the header type.
 * Usage of UIA message: 
 *   - extract the header type from the raw data byte array
 *   - extract the header with respect to the header type
 *   - interpret header and extract the message body.  
 */
 
 var gc = gc || {};
 gc.uia = gc.uia || {};
 
(function() 
{
	var AbstractMessage = function() 
	{
	};
	
	AbstractMessage.prototype.hdrType = 0; 

	/*
	 * Get the header byte size in the raw data stream.
	 */
	AbstractMessage.prototype.getRawSize = function() 
	{
		if(!this.raw) 
		{
			return 0;
		}
		return this.raw.length;	// bytes
	};
	
	AbstractMessage.prototype.read = function(msg, offset) {};

	AbstractMessage.prototype.getRaw = function() 
	{
		return this.raw;
	};

	AbstractMessage.prototype.getHdrType = function() 
	{
		return this.hdrType;
	};
	
	gc.uia.AbstractMessage = AbstractMessage;
}());
