/***************************************************************************************************
 Copyright (c) 2019, Texas Instruments Incorporated
 All rights reserved.

 Redistribution and use in source and binary forms, with or without
 modification, are permitted provided that the following conditions
 are met:

 *   Redistributions of source code must retain the above copyright
 notice, this list of conditions and the following disclaimer.
 notice, this list of conditions and the following disclaimer in the
 documentation and/or other materials provided with the distribution.
 *   Neither the name of Texas Instruments Incorporated nor the names of
 its contributors may be used to endorse or promote products derived
 from this software without specific prior written permission.

 THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
 THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR
 CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS;
 OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR
 OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
 EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 **************************************************************************************************/
var gc = gc || {};
gc.utils = gc.utils || {};

if (window.parent != window)
{
    window.parent.gc = window.parent.gc || {};
    window.parent.gc.app = gc;
}

if (window.parent.gc)
{
    // take the designer from the parent iframe, if available.
    gc.designer = gc.designer || window.parent.gc.designer;
}
if (window.global && global.document && global.document.gc)
{
    // take the designer from the global node-webkit document if available
    gc.designer = gc.designer || global.document.gc.designer;
}

if (gc.utils.getValueFromHexString === undefined)
{
    (function() // closure for private static methods and data.
    {
        gc.utils.getDesigner = function() {
            if (window.parent && window.parent.document) {
                return Polymer.dom(window.parent.document).querySelector('ti-guicomposer-app');
            }
            return Polymer.dom(document).querySelector('ti-guicomposer-app');
        };
        gc.utils.isInDesigner = function(){
            return (gc.utils.getDesigner() !== null);
        };
        gc.utils.string2value = function(value)
        {
            if (typeof value === 'string' || value instanceof String)
            {
                value = value.trim();
                if (value.indexOf('"') === 0 || value.indexOf("'") === 0)
                {
                    // literal string - remove quotes
                    value = value.substring(1, value.length - 1);
                }
                else if (!isNaN(value))
                {
                    // numberic input
                    value = +value;
                }
                else if (value === 'true')
                {
                    value = true;
                }
                else if (value === 'false')
                {
                    value = false;
                }
            }
            return value;
        };

        gc.utils.value2string = function(value)
        {
            if (typeof value === 'object')
            {
                return JSON.stringify(value);
            }
            else
            {
                return "" + value;
            }
        };

        gc.utils.getValueFromHexString = function (hexString, returnBigInt) {
            var result = hexString;
            var zero = 0;
            if (returnBigInt) {
                zero = eval('0n');
            }
            if (hexString === undefined) {
                hexString = zero;
            }
            if (!hexString.indexOf) {
                return hexString;
            }
            try {
                var temp = hexString.trim().toLowerCase();
                if (temp.indexOf("0x") >= 0) {
                    result = parseInt(temp, 16);
                } else {
                    result = parseInt(temp, 10);
                }
                if (returnBigInt) {
                    result = BigInt(result);
                } else {
                    result = Number(result);
                }
            }
            catch(ex){
                console.log("gc.utils.getValueFromHexString("+hexString+"): ex="+ex);
                result = Number(result);
            }

            return result;
        };
        gc.utils.getHexString = function(valueArg,wordSizeInBits,prefix) {
            var value;
            if (valueArg === undefined) {
                valueArg = 0;
                gc.console.warning('gcUtils','getHexString called with valueArg = undefined');
            }
            var zero = 0;
            var one = 1;
            try {
                zero = eval('0n');
                one = eval('1n');
                value = BigInt(valueArg);
            } catch(ex) {
                // avoid problems caused by e.g. trying to convert an array into a hex value
                try {
                    value = +valueArg;
                }
                catch(ex){
                    gc.console.warning('gcUtils','getHexString exception = '+ex);
                    value = 0;
                }
            }
            var padChar = "0";
            if (value < zero ){
                // take 2's complement
                value = ~value + one;
                padChar = "F";
            }
            if ((!wordSizeInBits) || (isNaN(wordSizeInBits))){
                wordSizeInBits = 8;
            }
            var numHexChars = wordSizeInBits >> 2;
            if ((wordSizeInBits % 4) > 0){
                numHexChars++;
            }

            var valueStr = value.toString(16);
            while (valueStr.length < numHexChars) {
                valueStr = padChar+valueStr;
            }
            var prefixStr = "0x";
            if (prefix !== undefined){
                prefixStr = prefix;
            }
            valueStr = prefixStr+valueStr.toUpperCase();
            return valueStr;
        };
        gc.utils.getBinaryStr = function(intValue,numBits){
            var result = parseInt(intValue).toString(2);
            while (result.length < numBits){
                result = '0'+result;
            }
            return  "b"+result;
        };
        /**
         * Get the value of a single bit within a word.
         * @param bitIndex - indicates which bit to get
         * @param dataValue - value of the word the bit is to be extracted from
         * @param wordSizeInBits - number of bits in the word
         * @param returnBigInt - false: returns a Number, true: returns a bigint
         * @returns value of the bit (if !returnBigInt, returns value as a string for backwards compatibility)
         */
        gc.utils.getBitValue = function(bitIndex, dataValue, wordSizeInBits, returnBigInt){
            if (dataValue === undefined) {
                gc.console.warning('gcUtils','getBitValue called with dataValue = undefined');
                return "0";
            }
            if ((bitIndex === undefined)||(bitIndex === null)){
                bitIndex = 0;
            }
            var one = 1;
            bitIndex = +bitIndex;
            if (wordSizeInBits && (bitIndex >= +wordSizeInBits)) {
                return "";
            }
            try {
                dataValue = BigInt(dataValue);
                bitIndex = BigInt(+bitIndex);
                one = eval('1n');
            } catch(ex) {
                returnBigInt = false;
            }
            var result = (dataValue >> bitIndex) & one;
            if (returnBigInt) {
                return result;
            }
            return Number(result).toString();
        };
        /**
         * Set the value of a single bit within a word.
         * @param bitIndex - indicates which bit to set
         * @param dataValue - value of the word to be updated
         * @param bitValue - value of the bit (0 or 1)
         * @param returnBigInt - false: returns a Number, true: returns a bigint
         * @returns updated value of the word
         */
        gc.utils.setBitValue = function(bitIndex,dataValue,bitValue,returnBigInt) {
            if ((bitIndex === undefined)||(bitIndex === null)){
                bitIndex = 0;
            }
            if (dataValue === undefined) {
                dataValue = 0;
                gc.console.warning('gcUtils','setBitValue called with dataValue = undefined');

            }
            if (bitValue === undefined) {
                bitValue = 0;
            }
            var one = 1;
            var mask;
            bitIndex = +bitIndex;
            try {
                bitIndex = BigInt(bitIndex);
                dataValue = BigInt(dataValue);
                bitValue = BigInt(bitValue);
                one = eval('1n');
                mask = eval('0xFFFFFFFFFFFFFFFFn') ^ (one << bitIndex);
            } catch(ex) {
                returnBigInt = false;
                mask = 0xFFFFFFFF ^ (1 << bitIndex);
            }
            var result = (dataValue & mask) | ((bitValue & one)<< bitIndex);
            if (returnBigInt) {
                return result;
            }
            return Number(result);
        };
        /**
         * Gets a range of bits (a 'field') within a word (typically a register value)
         * @param dataValue - the value of the word
         * @param startBit - lsb of the field
         * @param stopBit - msb of the field
         * @param doNotShiftResult - if true, do not right justify the field value to have lsb = b0
         * @param returnBigInt - false: returns a Number, true: returns a bigint
         * @param signed - boolean flag indicating the bitField represents a signed integer, and therefore we need to return negative numbers where appropriate.
         * @returns value of the bitfield
         */
        gc.utils.getBitfieldValue = function(dataValue, startBit, stopBit, doNotShiftResult, returnBigInt, signed) {
            var useBigInt = true;
            if (dataValue === undefined) {
                dataValue = 0;
                gc.console.warning('gcUtils','getBitfieldValue called with dataValue = undefined');
            }
            try {
                startBit = BigInt(startBit);
                stopBit = BigInt(stopBit);
                dataValue = BigInt(dataValue);
            } catch(ex) {
                startBit = +startBit;
                stopBit = +stopBit;
                returnBigInt = false;
                useBigInt = false;
            }
            var result = dataValue & gc.utils.getMask(startBit, stopBit, useBigInt);

            if (signed) {
                var negativeBit = gc.utils.getMask(stopBit, stopBit, useBigInt);
                if (result >= negativeBit) {
                    result = result - negativeBit - negativeBit;
                }
            }
            
            if (!doNotShiftResult) {
                result >>= startBit;
            }
            if (returnBigInt) {
                return result;
            }
            return Number(result);
        };
        /**
         * Sets a range of bits (a 'field') within a word (typically a register value)
         * @param dataValue - value of the word to be updated
         * @param startBit - lsb of the field
         * @param stopBit - msb of the field
         * @param wordSizeInBits - number of bits in the word
         * @param bitfieldValue - value of the field to be set (with lsb = b0)
         * @param returnBigInt - false: returns a Number, true: returns a bigint
         * @returns updated value of the word
         */
        gc.utils.setBitfieldValue = function(dataValue, startBit, stopBit, wordSizeInBits, bitfieldValue, returnBigInt) {
            if (dataValue === undefined) {
                dataValue = 0;
                gc.console.warning('gcUtils','setBitfieldValue called with dataValue = undefined');
            }
            bitfieldValue = Math.round(bitfieldValue);
            var hexValueStr = ""+dataValue;
            var hexValue = gc.utils.getValueFromHexString(hexValueStr);
            var numBits = wordSizeInBits;
            if (!numBits) {
                numBits = 8;
            }
            var mask;
            var useBigInt = true;
            try {
                startBit = BigInt(startBit);
                stopBit = BigInt(stopBit);
                hexValue = BigInt(hexValue);
                numBits = BigInt(numBits);
                bitfieldValue = BigInt(bitfieldValue);
                mask = eval('(2n ** numBits) - 1n');
            } catch(ex) {
                startBit = +startBit;
                stopBit = +stopBit;
                returnBigInt = false;
                useBigInt = false;
                mask = (1 << numBits) - 1;
            }
            var orMask = gc.utils.getMask(startBit, stopBit, useBigInt);
            var andMask = mask & ~(orMask);
            var newValue = (hexValue & andMask) | ((bitfieldValue << startBit) & orMask);
            if (returnBigInt) {
                return newValue;
            }
            return Number(newValue);
        };
        /**
         * Returns a bitmask with the bits from startBit to stopBit set to 1
         * and all other bits set to 0.  For numbers > 56b wide, set returnBigInt to true
         * @param startBit - lsb of the mask
         * @param stopBit - msb of the mask
         * @param returnBigInt - false: returns a Number, true: returns a bigint
         * @returns mask value
         */
        gc.utils.getMask = function(startBit, stopBit, returnBigInt){
            var one = 1;
            try {
                startBit = BigInt(startBit);
                stopBit = BigInt(stopBit);
                one = eval('1n');  //TODO: eval is only needed until all browsers natively support BigInt
            } catch(ex) {
                startBit = +startBit;
                stopBit = +stopBit;
                returnBigInt = false;
            }
            var result = ((one << (stopBit + one)) - one) & ~( (one << startBit) - one);
            if (returnBigInt) {
                return result;
            }
            return Number(result);
        };
        /**
         * returns the max value allowed for a bitfield
         * @param bitwidth - number of bits in the bitfield
         * @returns maximum value allowed for this bitfield
         */
        gc.utils.getBitfieldMaxValue = function(bitwidth){
            var result;
            if (bitwidth === undefined) {
                bitwidth = 0;
            }
            try {
                bitwidth = BigInt(bitwidth);
                result = Number(eval('(2n ** bitwidth) - 1n'));
            } catch(ex) {
                result = (1 << bitwidth) - 1;
            }
            return result;
        };
        gc.utils.strPrefixSeparator = "__";
        /**
         * removes any characters up to and including the gc.utils.strPrefixSeparator
         * from the id string that is passed in
         *
         * @param id - the id string to have the prefix removed from
         * @return id string with prefix removed
         */
        gc.utils.removePrefixFromId = function(id){
            var result = id;
            var sep = gc.utils.strPrefixSeparator;
            var indexSeparator = id.indexOf(sep);
            if ((indexSeparator >= 0) && (id.length > indexSeparator + sep.length)) {
                result = id.substring(indexSeparator+sep.length);
            }
            return result;
        };
        /**
         * updates the ids in the html fragment that is passed in to use the specified idPrefix.
         *
         * @param idPrefix - a string to use as a unique prefix.  Set to "" or null to remove any existing prefixes from the ids.
         * @param gistSection - a part of the gist that contains either CSS style definitons or element tags
         * @param isStyleSection - true if gistSection contains CSS style definitions, false if it contains element tags
         * @return the updated gistSection
         */
        gc.utils.updateIdPrefixes = function(idPrefix,gistSection,isStyleSection){
            var separator = gc.utils.strPrefixSeparator;
            var hasIdPrefix = ((idPrefix) && (idPrefix.length > 0));
            if (isStyleSection) {
                // remove any existing prefixes from style element ids that have a prefix already specified (as indicated by the presence
                // of 2 underscores in a row)
                // See https://regex101.com/ for a useful tool to understand better how this works.
                //var regExp1 = new RegExp('(?!#'+idPrefix+')#',"g");
                var regExp1 = new RegExp('#.+__',"g");
                result = gistSection.trim().replace(regExp1, '#');
                if (hasIdPrefix) {
                    // add a prefix to all style element ids
                    var regExp3 = new RegExp('#', "g");
                    result = result.replace(regExp3, '#' + idPrefix + separator);
                }
            } else {
                // remove the prefix from any tag ids
                var regExp2 = new RegExp(' id=\".+__',"g");
                result = gistSection.trim().replace(regExp2,' id="');
                if (hasIdPrefix) {
                    // add a prefix to all tag ids
                    var regExp4 = new RegExp('id=\"',"g");
                    result = result.replace(regExp4,' id="'+idPrefix+separator);
                }
            }
            return result;
        };
        /**
         * returns the separator used between items in a multi-item property value.
         * Separator must be either | ; or ,
         * If one of these characters is found as the last character in the string, it is used as the separator
         * @param strMultiItem
         * @returns delimiter string used as the separtor between item values in
         */
        gc.utils.getSeparator = function(strMultiItem){
            if (strMultiItem) {
                // support using terminating charater as a delimiter if one of [,;|].
                // this means that if you want a blank element at the end of the list, you have to use a double terminator; for example, A|B|C||
                if (strMultiItem.length > 1) {
                    var lastCharacter = strMultiItem.charAt(strMultiItem.length - 1);
                    if (lastCharacter === '|' || lastCharacter === ',' || lastCharacter === ';') {
                        return lastCharacter;
                    }
                }
                if (strMultiItem.indexOf("|") > 0) {
                    return "|";
                }
                if (strMultiItem.indexOf(";") > 0) {
                    return ";";
                }
            }
            return ",";
        };
    }());
}
