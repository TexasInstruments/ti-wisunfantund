/*****************************************************************
 * Copyright (c) 2013-2014 Texas Instruments and others
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *  Paul Gingrich, Dobrin Alexiev - Initial API and implementation
 *****************************************************************/
var gc = gc || {};
gc.databind = gc.databind || {};

(function()
{
	var nullConverter = { convert: function(input) { return input; } };

	var jsonStringifyConverter = function(input)
	{
		try
		{
			return JSON.stringify(input);
		}
		catch(e)
		{
			return "" + input;
		}
	};

	var converters =
	{
		"string" :
		{
			any : { convert: function(input) { return "" + input; } },
			"object" : { convert: jsonStringifyConverter }
		},
		"boolean" :
		{
		    any : { convert: function(input) { return !!input; } },
            "string" : { convert: function(input) { return isNaN(+input) ? input.toLowerCase().trim() === 'true' : +input !== 0; }}
		},
        "number" : { any : { convert: function(input) { return +input; } } },
        "array" : {
            any : { convert: function(input) { return input ? ("" + input).split(",").map(function(e) { return +e; }) : []; }}
        }
	};

	/**
	 * Singleton Class to register data converters that will be used by the DataBinder to
	 * convert data between bindings of different types.
	 *
	 * @class
	 */
	gc.databind.DataConverter = function()
	{
	};

	/**
	 * Method to register custom data converters to be used by the DataBindiner singleton
	 * to convert data between bindings of different types.
	 *
	 * @static
	 * @param {gc.databind.IDataConverter} converter - data converter to use to convert between the srcType and destType.
	 * @param {string} [srcType] - the type of the source that this converter is to be used on.  If not supplied, then it will
	 * be the default converter for all source types if a specific one cannot be found.
	 * @param {string} destType - the type of the output value from this converter.
	 */
	gc.databind.DataConverter.register = function(converter, destType, srcType)
	{
		if (destType !== null)
		{
			srcType = srcType || "any";

			var destConverters = converters[destType];
			if (!destConverters)
			{
				destConverters = {};
				converters[destType] = destConverters;
			}

			destConverters[srcType] = converter;
		}
	};

	/**
	 * Method to retrieve the converter for converting one source type to another destination type.
	 *
	 * @static
	 * @param {string} [srcType] - the type of the source that this converter is to be used on.  If not supplied, then it will
	 * be the default converter for all source types if a specific one cannot be found.
	 * @param {string} destType - the type of the output value from this converter.
	 * @return {gc.databind.IDataConverter} - the converter found or undefined if not found.
	 */
	gc.databind.DataConverter.getConverter = function(srcType, destType)
	{
		var converter = nullConverter;
		var destConverters = converters[destType];
		if (destConverters !== undefined)
		{
			converter = destConverters[srcType || "any"];
			if (converter === undefined)
			{
				converter = destConverters.any;
			}
		}
		return converter;
	};

	/**
	 * Method to convert an element of data from one data type to another.
	 *
	 * @static
	 * @param {string} [srcType] - the type of the source that this converter is to be used on.  If not supplied, then it will
	 * be the default converter for all source types if a specific one cannot be found.
     * @param {string} destType - the type of the output value required from this conversion.
     * @param {number} param - optional numeric parameter to control the conversion like the precision for decimal and q values.
	 * @return {*} - the converted data or undefined if no converter found.
	 */
	gc.databind.DataConverter.convert = function(data, srcType, destType, param)
	{
		if (data === null || data === undefined)
		{
			return data;  // null is null independent of type, so no conversion required.
		}
		srcType = srcType || typeof data;

		if (srcType === destType || destType === undefined || destType === null)
		{
			return data;
		}

		return this.getConverter(srcType, destType).convert(data, param);
	};

}());


