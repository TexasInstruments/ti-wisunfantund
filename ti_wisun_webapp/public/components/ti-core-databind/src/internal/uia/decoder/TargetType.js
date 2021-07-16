/*
 *  ======== TargetType ========
 *  This class simply defines an enum to represent target endianess.
 */
 
var gc = gc || {};
gc.uia = gc.uia || {}; 
gc.uia.TargetType = gc.uia.TargetType || 
{
	Endianess: 
	{
		LITTLE: 0,
		BIG: 1
	},
	
    /*
     *  ======== strToEndianess ========
     *  Helper function for converting the strings "big" and "little" into
     *  the appropriate enum value.
     */
	strToEndianess: function(endian)
	{
        if (endian.toUpperCase() === 'BIG') 
        {
            return this.Endianess.BIG;
        }
        else if (endian.toUpperCase() === "LITTLE") 
        {
            return (this.Endianess.LITTLE);
        }
        else 
        {
            throw "Unrecognized target endianess: " + endian;
        }
	}
};

