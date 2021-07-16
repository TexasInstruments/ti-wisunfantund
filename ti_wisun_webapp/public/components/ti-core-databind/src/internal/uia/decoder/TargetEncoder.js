/*
 *  ======== TargetEncoder ========
 *  This class provides an API for encoding a value into an array of bytes
 *  meant for the target.
 */
var gc = gc || {};
gc.uia = gc.uia || {}; 

(function() 
{
	var TargetType = gc.uia.TargetType;

    /*
     *  ======== TargetEncoder ========
     *  Constructor.
     *  
     *  endian - The endianness of the target.
     *  bitsPerChar - The target's minimum addressable unit (MAU) size in bits,
     *                i.e., the number of bits in a 'char', the target's
     *                 smallest type.
     */
    var TargetEncoder = function(endian, bitsPerChar)
    {
        this.endian = endian;
        this.bitsPerChar = bitsPerChar;
    };
    
    /*
     *  ======== encodeBytes ========
     *  Encodes the specified value into target bytes in the buffer.
     *  
     *  buffer - Buffer of target bytes where the encoded value will go.
     *  offset - Beginning index in 'buffer' where encoded value will go.
     *  value - Value to be encoded
     *  size - Size of the value in bytes (not MAUs) 
     */
    TargetEncoder.prototype.encodeBytes = function(buffer, offset, value, size)
    {
        /* Little endian */
        var i;
        if (this.endian === TargetType.Endianess.LITTLE) 
        {
            /* Copy the values in reverse order. */
            for (i = 0; i < size; i++) 
            {
                buffer[offset + i] = (value >> (i * 8)) & 255;
            }
        }
        /* Big endian */
        else if (this.endian === TargetType.Endianess.BIG) 
        {
            var shift = size - 1;
            for (i = 0; i < size; i++) {
                buffer[offset + i] = (value >> (shift * 8)) & 255;
                shift--;
            }
        }
    };
    
    gc.uia.TargetEncoder = TargetEncoder;
}());
