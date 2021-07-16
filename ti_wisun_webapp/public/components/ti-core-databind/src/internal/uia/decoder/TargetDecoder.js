/*
 *  ======== TargetDecoder ========
 *  This class provides two APIs for decoding values from arrays of target 
 *  data. It supports ROV and RTA, but is intended for use in any project.
 * 
 *  'decodeMAUs' takes an integer array of MAUs and takes the size of the value
 *  to decode in MAUs.
 *  'decodeBytes' takes a byte array and takes the size in bytes.
 * 
 *  Both APIs take a 'signed' field to indicate whether the decoded value should
 *  be treated as signed. For example, if the value to decode is a 'UInt', then
 *  'signed' should be false. If 'signed' is true, the target data will be 
 *  decoded using 2's complement.
 * 
 *  Java bytes always treat the data as signed. Integers, however, may be a 
 *  signed or unsigned representation of the target data. For example, on a
 *  target with 8-bit MAUs, the value 0xFF may be represented in an integer as
 *  either -1 or 255 depending on the memory read interface. Either 
 *  representation may be passed to decodeMAUs, and the result will have the 
 *  correct sign based on the 'signed' argument and the MSB of the value.
 *  
 *  decodeBytes does not require that the target have 8-bit MAUs.
 */
var gc = gc || {};
gc.uia = gc.uia || {};
 
(function() 
{
	var TargetType = gc.uia.TargetType;
	
    var TargetDecoder = function(endian, bitsPerChar)
    {
        this.endian = endian;
        this.bitsPerChar = bitsPerChar;
    };
    
    /*
     *  ======== decodeMAUs ========
     *  Decodes a target value from an integer array containing target MAUs.
     *  
     *  buffer - Buffer of target MAUs containing the data to decode.
     *  offset - Beginning index in 'buffer' of the data to decode.
     *  size - Size in MAUs (not bytes) of the value to decode.
     *  signed - Whether the value to decode is a signed type.
     *  
     *  The integers in 'buffer' must be MAUs. If the MAU size is 16-bits, then
     *  'buffer' should contain 16-bit values, not bytes.
     *  
     *  The buffer should be in the endianess of the target.
     *  
     *  The integers in 'buffer' may be the signed or unsigned representation
     *  of the target data. For example, if the MAU size is an 8-bit byte, then
     *  the target value 0xFF may have the integer value -1 or 255. 
     */
    TargetDecoder.prototype.decodeMAUs = function(buffer, offset, size, signed)
    {
        return this.decode(buffer, offset, size, this.bitsPerChar, signed);
    };
        
    /*
     *  ======== decodeBytes ========
     *  Decodes a target value from a bytes array.
     *  
     *  buffer - Buffer of target bytes containing the data to decode.
     *  offset - Beginning index in 'buffer' of the data to decode.
     *  size - Size in bytes (not MAUs) of the value to decode.
     *  signed - Whether the value to decode is a signed type.
     *  
     *  The buffer should be in the endianess of the target.
     */
    TargetDecoder.prototype.decodeBytes = function(buffer, offset, size, signed)
    {
        return this.decode(buffer, 0, size, 8, signed);        
    };
     
    /*
     *  ======== getSign ========
     *  Checks the value containing the MSB to determine the result's sign.
     *  This should only be called on the MSB and if the value being decoded
     *  is a signed type.
     */
    var getSign = function(msbVal, bitsPerInt)
    {
        /* If the MSB MAU is negative then the result is negative. */
        if (msbVal < 0) 
        {
            return(-1);
        }
        /* 
         * The integer representation may be signed or unsigned.
         * If the MSB MAU is greater than the maximum value of the signed
         * representation (e.g., 127 for an 8-bit MAU), the result is 
         * negative.
         */
        else if ((msbVal & (1 << (bitsPerInt - 1))) !== 0) 
        {
            return(-1);
        }
        else 
        {
            return(1);
        }
    };
    
    /*
     *  ======== decode ========
     *  This helper function does the common decoding work between decodeMAUs
     *  decodeBytes.
     *  
     *  The added field 'bitsPerInt' is the number of bits represented by each 
     *  integer in 'buffer'. This is required because decodeBytes may pass
     *  in an integer buffer which contains 8-bit bytes on a target with 16-bit
     *  MAUs; so bitsPerInt is not always equal to bitsPerChar.
     *  
     *  In other words, the values in buffer cannot be assumed to be bytes or
     *  MAUs.
     */
    TargetDecoder.prototype.decode = function(buffer, offset, size, bitsPerInt, signed)
    {
        var i, value; 
        var result = 0;
        
        /* 
         * First, add the MAUs or bytes together to get the unsigned
         * representation  of the value. 
         */

        /* 
         * Little endian
         * 
         * Value 0x12345678
         * Addr   Value
         *  0x0   0x78
         *  0x1   0x56
         *  0x2   0x34
         *  0x3   0x12
         *  Read in as [0x78, 0x56, 0x34, 0x12]     
         */
        if (this.endian === TargetType.Endianess.LITTLE) 
        {
            
            /* Little endian, so work through the values backwards */ 
            for (i = size - 1; i >= 0; i--) 
            {
                value = buffer[offset + i];
                
                /* If the integer representation is signed, convert to unsigned. */
                if (value < 0) 
                {
                    value += 1 << bitsPerInt;
                }

                /* Add the value to the result. */
                result = result << bitsPerInt;
                result += value;
            }
        }
        /* 
         * Big endian
         * 
         * Example value 0x12345678
         * Addr    Val
         *  0x0    0x12
         *  0x1    0x34
         *  0x2    0x56
         *  0x3    0x78
         * Read in as [0x12, 0x34, 0x56, 0x78] 
         */
        else if (this.endian === TargetType.Endianess.BIG) 
        {
            
            /* Big endian, so work through the values in order */
            for (i = 0; i < size; i++) 
            {
                value = buffer[offset + i];

                /* If the integer representation is signed, convert to unsigned. */
                if (value < 0) 
                {
                    value += 1 << bitsPerInt;
                }

                /* Add this value to the result. */
                result = result << bitsPerInt;
                result += value;
            }
        }
      
        /* 
         * Handle signed types.
         * 
         * Only look at the sign if:
         *   1. It's a signed type
         *   2. The size of the type is less than 64-bits
         * 
         * For a 64-bit signed type, we don't need to do anything to convert 
         * from unsigned to signed, because Java long can't hold a 64-bit
         * unsigned value.
         */
        if (signed && ((size * bitsPerInt) <= 32)) 
        {
            var msbInt;
            /* 
             * Determine the sign of the value (-1 or 1) by looking at the MSB. 
             * 
             * On little endian targets, the sign bit is the last bit. 
             */
            if (this.endian === TargetType.Endianess.LITTLE) 
            {
                msbInt = buffer[offset + size - 1];
            }
            /* On big endian targets, the sign bit is the first bit. */
            else 
            {
                msbInt = buffer[offset]; 
            }
            
            /* If the sign is negative, convert the result to negative. */
            if (getSign(msbInt, bitsPerInt) < 0) 
            {
                result = result - (1 << (size * bitsPerInt));
            }
        }
     
        return (result);
    };
    
    gc.uia.TargetDecoder = TargetDecoder;
    
}());
