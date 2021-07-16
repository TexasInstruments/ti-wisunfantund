/*****************************************************************
 * Copyright (c) 2020 Texas Instruments and others
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *  Winnie Lai - Initial API and implementation
 *****************************************************************/
/*****************************************************************
 * The implementation of serialzie and desrialzie of MessagePack
 * is from https://github.com/ygoe/msgpack.js
 * 
 * Copyright (c) 2019, Yves Goergen, https://unclassified.software/source/msgpack-js
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
 * associated documentation files (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge, publish, distribute,
 * sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all copies or
 * substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT
 * NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
 * DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 ******************************************************************/

var gc = gc || {};
gc.databind = gc.databind || {};

(function() 
{
	// Serializes a value to a MessagePack byte array.
	// 
	// data: The value to serialize. This can be a scalar, array or object.
	function serialize(data, options) {
		var pow32 = 0x100000000;   // 2^32
		var floatBuffer, floatView;
		var array = new Uint8Array(128);
		var length = 0;
		append(data);
		return array.subarray(0, length);

		function append(data) {
			switch (typeof data) {
				case "undefined":
					appendNull(data);
					break;
				case "boolean":
					appendBoolean(data);
					break;
				case "number":
					appendNumber(data);
					break;
				case "string":
					appendString(data);
					break;
				case "object":
					if (data === null)
						appendNull(data);
					else if (data instanceof Date)
						appendDate(data);
					else if (Array.isArray(data))
						appendArray(data);
					else if (data instanceof Uint8Array || data instanceof Uint8ClampedArray)
						appendBinArray(data);
					else if (data instanceof Int8Array || data instanceof Int16Array || data instanceof Uint16Array ||
						data instanceof Int32Array || data instanceof Uint32Array ||
						data instanceof Float32Array || data instanceof Float64Array)
						appendArray(data);
					else
						appendObject(data);
					break;
			}
		}

		function appendNull(data) {
			appendByte(0xc0);
		}

		function appendBoolean(data) {
			appendByte(data ? 0xc3 : 0xc2);
		}

		function appendNumber(data) {
			if (isFinite(data) && Math.floor(data) === data) {
				// Integer
				if (typeof options.encodeInteger === 'function') {
					appendBytes(options.encodeInteger(data));
				}
				else if (options.encodeIntegerBitsize === 32) {
					if (data >= 0) {   // uint32
						appendBytes([0xce, data >>> 24, data >>> 16, data >>> 8, data]);
					}
					else {   // int32
						appendBytes([0xd2, data >>> 24, data >>> 16, data >>> 8, data]);
					}
				}
				else if (options.encodeIntegerBitsize === 16) {
					if (data >= 0) {  // uint16
						appendBytes([0xcd, data >>> 8, data]);
					}
					else {   // int16
						appendBytes([0xd1, data >>> 8, data]);
					}
				}
				else if (options.encodeIntegerBitsize === 8) {
					if (data >= 0) {  // uint8
						appendBytes([0xcc, data]);
					}
					else {   // int8
						appendBytes([0xd0, data]);;
					}
				}
				else if (data >= 0 && data <= 0x7f) {
					appendByte(data);
				}
				else if (data < 0 && data >= -0x20) {
					appendByte(data);
				}
				else if (data > 0 && data <= 0xff) {   // uint8
					appendBytes([0xcc, data]);
				}
				else if (data >= -0x80 && data <= 0x7f) {   // int8
					appendBytes([0xd0, data]);
				}
				else if (data > 0 && data <= 0xffff) {   // uint16
					appendBytes([0xcd, data >>> 8, data]);
				}
				else if (data >= -0x8000 && data <= 0x7fff) {   // int16
					appendBytes([0xd1, data >>> 8, data]);
				}
				else if (data > 0 && data <= 0xffffffff) {   // uint32
					appendBytes([0xce, data >>> 24, data >>> 16, data >>> 8, data]);
				}
				else if (data >= -0x80000000 && data <= 0x7fffffff) {   // int32
					appendBytes([0xd2, data >>> 24, data >>> 16, data >>> 8, data]);
				}
				else if (data > 0 && data <= 0xffffffffffffffff) {   // uint64
					// Split 64 bit number into two 32 bit numbers because JavaScript only regards
					// 32 bits for bitwise operations.
					var hi = data / pow32;
					var lo = data % pow32;
					appendBytes([0xd3, hi >>> 24, hi >>> 16, hi >>> 8, hi, lo >>> 24, lo >>> 16, lo >>> 8, lo]);
				}
				else if (data >= -0x8000000000000000 && data <= 0x7fffffffffffffff) {   // int64
					appendByte(0xd3);
					appendInt64(data);
				}
				else if (data < 0) {   // below int64
					appendBytes([0xd3, 0x80, 0, 0, 0, 0, 0, 0, 0]);
				}
				else {   // above uint64
					appendBytes([0xcf, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]);
				}
			}
			else {
				// Float
				if (!floatView) {
					floatBuffer = new ArrayBuffer(8);
					floatView = new DataView(floatBuffer);
				}
				floatView.setFloat64(0, data);
				appendByte(0xcb);
				appendBytes(new Uint8Array(floatBuffer));
			}
		}

		function appendString(data) {
			var bytes = encodeUtf8(data);
			var length = bytes.length;

			if (length <= 0x1f)
				appendByte(0xa0 + length);
			else if (length <= 0xff)
				appendBytes([0xd9, length]);
			else if (length <= 0xffff)
				appendBytes([0xda, length >>> 8, length]);
			else
				appendBytes([0xdb, length >>> 24, length >>> 16, length >>> 8, length]);

			appendBytes(bytes);
		}

		function appendArray(data) {
			var length = data.length;

			if (length <= 0xf)
				appendByte(0x90 + length);
			else if (length <= 0xffff)
				appendBytes([0xdc, length >>> 8, length]);
			else
				appendBytes([0xdd, length >>> 24, length >>> 16, length >>> 8, length]);

			for (var index = 0; index < length; index++) {
				append(data[index]);
			}
		}

		function appendBinArray(data) {
			var length = data.length;

			if (length <= 0xf)
				appendBytes([0xc4, length]);
			else if (length <= 0xffff)
				appendBytes([0xc5, length >>> 8, length]);
			else
				appendBytes([0xc6, length >>> 24, length >>> 16, length >>> 8, length]);

			appendBytes(data);
		}

		function appendObject(data) {
			var length = 0;
			for (var key in data) length++;

			if (length <= 0xf)
				appendByte(0x80 + length);
			else if (length <= 0xffff)
				appendBytes([0xde, length >>> 8, length]);
			else
				appendBytes([0xdf, length >>> 24, length >>> 16, length >>> 8, length]);

			for (var key in data) {
				append(key);
				append(data[key]);
			}
		}

		function appendDate(data) {
			var sec = data.getTime() / 1000;
			if (data.getMilliseconds() === 0 && sec >= 0 && sec < 0x100000000) {   // 32 bit seconds
				appendBytes([0xd6, 0xff, sec >>> 24, sec >>> 16, sec >>> 8, sec]);
			}
			else if (sec >= 0 && sec < 0x400000000) {   // 30 bit nanoseconds, 34 bit seconds
				var ns = data.getMilliseconds() * 1000000;
				appendBytes([0xd7, 0xff, ns >>> 22, ns >>> 14, ns >>> 6, ((ns << 2) >>> 0) | (sec / pow32), sec >>> 24, sec >>> 16, sec >>> 8, sec]);
			}
			else {   // 32 bit nanoseconds, 64 bit seconds, negative values allowed
				var ns = data.getMilliseconds() * 1000000;
				appendBytes([0xc7, 12, 0xff, ns >>> 24, ns >>> 16, ns >>> 8, ns]);
				appendInt64(sec);
			}
		}

		function appendByte(byte) {
			if (array.length < length + 1) {
				var newLength = array.length * 2;
				while (newLength < length + 1)
					newLength *= 2;
				var newArray = new Uint8Array(newLength);
				newArray.set(array);
				array = newArray;
			}
			array[length] = byte;
			length++;
		}

		function appendBytes(bytes) {
			if (array.length < length + bytes.length) {
				var newLength = array.length * 2;
				while (newLength < length + bytes.length)
					newLength *= 2;
				var newArray = new Uint8Array(newLength);
				newArray.set(array);
				array = newArray;
			}
			array.set(bytes, length);
			length += bytes.length;
		}

		function appendInt64(value) {
			// Split 64 bit number into two 32 bit numbers because JavaScript only regards 32 bits for
			// bitwise operations.
			var hi, lo;
			if (value >= 0) {
				// Same as uint64
				hi = value / pow32;
				lo = value % pow32;
			}
			else {
				// Split absolute value to high and low, then NOT and ADD(1) to restore negativity
				value++;
				hi = Math.abs(value) / pow32;
				lo = Math.abs(value) % pow32;
				hi = ~hi;
				lo = ~lo;
			}
			appendBytes([hi >>> 24, hi >>> 16, hi >>> 8, hi, lo >>> 24, lo >>> 16, lo >>> 8, lo]);
		}
	}

	// Deserializes a MessagePack byte array to a value.
	//
	// array: The MessagePack byte array to deserialize. This must be an Array or Uint8Array containing bytes, not a string.
	function deserialize(array, posHint) { // TI change: add posHint
		var pow32 = 0x100000000;   // 2^32
		// let pos = 0;
		var pos = posHint || 0; // TI change: add posHint
		if (array instanceof ArrayBuffer) {
			array = new Uint8Array(array);
		}
		if (typeof array !== "object" || typeof array.length === "undefined") {
			throw new Error("Invalid argument type: Expected a byte array (Array or Uint8Array) to deserialize.");
		}
		if (!array.length) {
			throw new Error("Invalid argument: The byte array to deserialize is empty.");
		}
		if (pos >= array.length) { // TI change: add one more check of insufficent data
			throw new Error("Invalid argument: The byte array has no enough data to start at posHint.");
		}
		if (!(array instanceof Uint8Array)) {
			array = new Uint8Array(array);
		}
		var startPos = pos;
		var data = read();
		if (pos < array.length) {
			// Junk data at the end
		}
		// return data;
		return { data: data, nextIndex: pos }; // TI change: also return pos to indicate unconsumed data, which can be next partial data 

		function read() {
			hasData(array, pos, 1);
			const byte = array[pos++];
			if (byte >= 0x00 && byte <= 0x7f) return byte;   // positive fixint
			if (byte >= 0x80 && byte <= 0x8f) return readMap(byte - 0x80);   // fixmap
			if (byte >= 0x90 && byte <= 0x9f) return readArray(byte - 0x90);   // fixarray
			if (byte >= 0xa0 && byte <= 0xbf) return readStr(byte - 0xa0);   // fixstr
			if (byte === 0xc0) return null;   // nil
			if (byte === 0xc1) throw new Error(InvalidByteCodeHexC1);   // never used
			if (byte === 0xc2) return false;   // false
			if (byte === 0xc3) return true;   // true
			if (byte === 0xc4) return readBin(-1, 1);   // bin 8
			if (byte === 0xc5) return readBin(-1, 2);   // bin 16
			if (byte === 0xc6) return readBin(-1, 4);   // bin 32
			if (byte === 0xc7) return readExt(-1, 1);   // ext 8
			if (byte === 0xc8) return readExt(-1, 2);   // ext 16
			if (byte === 0xc9) return readExt(-1, 4);   // ext 32
			if (byte === 0xca) return readFloat(4);   // float 32
			if (byte === 0xcb) return readFloat(8);   // float 64
			if (byte === 0xcc) return readUInt(1);   // uint 8
			if (byte === 0xcd) return readUInt(2);   // uint 16
			if (byte === 0xce) return readUInt(4);   // uint 32
			if (byte === 0xcf) return readUInt(8);   // uint 64
			if (byte === 0xd0) return readInt(1);   // int 8
			if (byte === 0xd1) return readInt(2);   // int 16
			if (byte === 0xd2) return readInt(4);   // int 32
			if (byte === 0xd3) return readInt(8);   // int 64
			if (byte === 0xd4) return readExt(1);   // fixext 1
			if (byte === 0xd5) return readExt(2);   // fixext 2
			if (byte === 0xd6) return readExt(4);   // fixext 4
			if (byte === 0xd7) return readExt(8);   // fixext 8
			if (byte === 0xd8) return readExt(16);   // fixext 16
			if (byte === 0xd9) return readStr(-1, 1);   // str 8
			if (byte === 0xda) return readStr(-1, 2);   // str 16
			if (byte === 0xdb) return readStr(-1, 4);   // str 32
			if (byte === 0xdc) return readArray(-1, 2);   // array 16
			if (byte === 0xdd) return readArray(-1, 4);   // array 32
			if (byte === 0xde) return readMap(-1, 2);   // map 16
			if (byte === 0xdf) return readMap(-1, 4);   // map 32
			if (byte >= 0xe0 && byte <= 0xff) return byte - 256;   // negative fixint
			// console.debug("msgpack array:", array);
			throw new Error("Invalid byte value '" + byte + "' at index " + (pos - 1) + " in the MessagePack binary data (length " + array.length + "): Expecting a range of 0 to 255. This is not a byte array.");
		}

		function hasData(ary, testPos, testSize) {
			if (testPos + testSize > ary.length)
				throw new Error(NotEnoughData);
			return true;
		}

		function readInt(size) {
			hasData(array, pos, size);
			var value = 0;
			var first = true;
			while (size-- > 0) {
				if (first) {
					var byte = array[pos++];
					value += byte & 0x7f;
					if (byte & 0x80) {
						value -= 0x80;   // Treat most-significant bit as -2^i instead of 2^i
					}
					first = false;
				}
				else {
					value *= 256;
					value += array[pos++];
				}
			}
			return value;
		}

		function readUInt(size) {
			hasData(array, pos, size);
			var value = 0;
			while (size-- > 0) {
				value *= 256;
				value += array[pos++];
			}
			return value;
		}

		function readFloat(size) {
			hasData(array, pos, size);
			var view = new DataView(array.buffer, pos + array.byteOffset, size);
			pos += size;
			if (size === 4)
				return view.getFloat32(0, false);
			if (size === 8)
				return view.getFloat64(0, false);
		}

		function readBin(size, lengthSize) {
			if (size < 0) size = readUInt(lengthSize);
			hasData(array, pos, size);
			var data = array.subarray(pos, pos + size);
			pos += size;
			return data;
		}

		function readMap(size, lengthSize) {
			if (size < 0) size = readUInt(lengthSize);
			var data = {};
			while (size-- > 0) {
				var key = read();
				data[key] = read();
			}
			return data;
		}

		function readArray(size, lengthSize) {
			if (size < 0) size = readUInt(lengthSize);
			var data = [];
			while (size-- > 0) {
				data.push(read());
			}
			return data;
		}

		function readStr(size, lengthSize) {
			if (size < 0) size = readUInt(lengthSize);
			hasData(array, pos, size);
			var start = pos;
			pos += size;
			return decodeUtf8(array, start, size);
		}

		function readExt(size, lengthSize) {
			if (size < 0) size = readUInt(lengthSize);
			var type = readUInt(1);
			var data = readBin(size);
			switch (type) {
				case 255:
					return readExtDate(data);
			}
			return { type: type, data: data };
		}

		function readExtDate(data) {
			if (data.length === 4) {
				var sec = ((data[0] << 24) >>> 0) +
					((data[1] << 16) >>> 0) +
					((data[2] << 8) >>> 0) +
					data[3];
				return new Date(sec * 1000);
			}
			if (data.length === 8) {
				var ns = ((data[0] << 22) >>> 0) +
					((data[1] << 14) >>> 0) +
					((data[2] << 6) >>> 0) +
					(data[3] >>> 2);
				var sec = ((data[3] & 0x3) * pow32) +
					((data[4] << 24) >>> 0) +
					((data[5] << 16) >>> 0) +
					((data[6] << 8) >>> 0) +
					data[7];
				return new Date(sec * 1000 + ns / 1000000);
			}
			if (data.length === 12) {
				var ns = ((data[0] << 24) >>> 0) +
					((data[1] << 16) >>> 0) +
					((data[2] << 8) >>> 0) +
					data[3];
				pos -= 8;
				var sec = readInt(8);
				return new Date(sec * 1000 + ns / 1000000);
			}
			throw new Error("Invalid data length for a date value.");
		}
	}

	// Encodes a string to UTF-8 bytes.
	function encodeUtf8(str) {
		// Prevent excessive array allocation and slicing for all 7-bit characters
		var ascii = true, length = str.length;
		for (var x = 0; x < length; x++) {
			if (str.charCodeAt(x) > 127) {
				ascii = false;
				break;
			}
		}
		
		// Based on: https://gist.github.com/pascaldekloe/62546103a1576803dade9269ccf76330
		var i = 0, bytes = new Uint8Array(str.length * (ascii ? 1 : 4));
		for (var ci = 0; ci !== length; ci++) {
			var c = str.charCodeAt(ci);
			if (c < 128) {
				bytes[i++] = c;
				continue;
			}
			if (c < 2048) {
				bytes[i++] = c >> 6 | 192;
			}
			else {
				if (c > 0xd7ff && c < 0xdc00) {
					if (++ci >= length)
						throw new Error("UTF-8 encode: incomplete surrogate pair");
					var c2 = str.charCodeAt(ci);
					if (c2 < 0xdc00 || c2 > 0xdfff)
						throw new Error("UTF-8 encode: second surrogate character 0x" + c2.toString(16) + " at index " + ci + " out of range");
					c = 0x10000 + ((c & 0x03ff) << 10) + (c2 & 0x03ff);
					bytes[i++] = c >> 18 | 240;
					bytes[i++] = c >> 12 & 63 | 128;
				}
				else bytes[i++] = c >> 12 | 224;
				bytes[i++] = c >> 6 & 63 | 128;
			}
			bytes[i++] = c & 63 | 128;
		}
		return ascii ? bytes : bytes.subarray(0, i);
	}

	// Decodes a string from UTF-8 bytes.
	function decodeUtf8(bytes, start, length) {
		// Based on: https://gist.github.com/pascaldekloe/62546103a1576803dade9269ccf76330
		var i = start, str = "";
		length += start;
		while (i < length) {
			var c = bytes[i++];
			if (c > 127) {
				if (c > 191 && c < 224) {
					if (i >= length)
						throw new Error("UTF-8 decode: incomplete 2-byte sequence");
					c = (c & 31) << 6 | bytes[i++] & 63;
				}
				else if (c > 223 && c < 240) {
					if (i + 1 >= length)
						throw new Error("UTF-8 decode: incomplete 3-byte sequence");
					c = (c & 15) << 12 | (bytes[i++] & 63) << 6 | bytes[i++] & 63;
				}
				else if (c > 239 && c < 248) {
					if (i + 2 >= length)
						throw new Error("UTF-8 decode: incomplete 4-byte sequence");
					c = (c & 7) << 18 | (bytes[i++] & 63) << 12 | (bytes[i++] & 63) << 6 | bytes[i++] & 63;
				}
				else throw new Error("UTF-8 decode: unknown multibyte start 0x" + c.toString(16) + " at index " + (i - 1));
			}
			if (c <= 0xffff) str += String.fromCharCode(c);
			else if (c <= 0x10ffff) {
				c -= 0x10000;
				str += String.fromCharCode(c >> 10 | 0xd800)
				str += String.fromCharCode(c & 0x3FF | 0xdc00)
			}
			else throw new Error("UTF-8 decode: code point 0x" + c.toString(16) + " exceeds UTF-16 reach");
		}
		return str;
    }
    
    var MessagePackCodec = function() {
		this.isConnected = false;
		this.partialData = [];
		// In normal case, the partial data grows when not receiving a complete packet,
		// and shrinks when a complete packet is received and decoded.
		// If the partial data ever grows, the app will crash, and it is better
		// to log this warning. The lastPartialDataWarningSize is set to a high mark (400K),
		// and is doubled after each warning to avoid flood of warnings.
		this.lastPartialDataWarningSize = 400000;
		this.codecOptions = {};
	};

	var InvalidByteCodeHexC1 = "Invalid byte code 0xc1 found.";
	var NotEnoughData = "Not enough data";

    MessagePackCodec.prototype = new gc.databind.IPacketCodec();

    MessagePackCodec.prototype.encode = function(target, value) {
        const encodedData = serialize(value, this.codecOptions);
        target(Array.from(encodedData)); // encodedData is Uint8Array, need to change it to number[] for going through cloudagent ws
    };

    MessagePackCodec.prototype.decode = function(target, data) {
		// if upstream decoder changes byte[] to string, e.g. CR decoder uses String.fromCharCode to do it,
		// we need to change string back to byte[]
		var bytes = data;
		if (typeof data === 'string') {
			bytes = [];
			for (var i=0; i<data.length; i++) {
				bytes.push(data.charCodeAt(i));
			}
		}
		this.partialData = this.partialData.concat(bytes);
		var posHint = 0;
		while (posHint < this.partialData.length) {
			var decodedResult;
			try {
				decodedResult = deserialize(this.partialData, posHint);
				posHint = decodedResult.nextIndex;
				if (decodedResult !== undefined) {
					// get at least one packet and we can mark connected since last connect
					this.isConnected = true;
					target(decodedResult.data);
				}
			} catch(error) {
				// It could be not enough data, and wait for next cycle to get more data
				// It could be the data does not conform to messagePacket protocol, and log error anyway.
				if (error.message && error.message === InvalidByteCodeHexC1) {
					this.partialData = this.partialData.slice(posHint+1);
					posHint = 0;
				} else if (error.message && error.message === NotEnoughData) {
					break;
				} else {
					gc.console.error('MessagePackCodec', function() {
						return error;
					});
					posHint++;
				}
			}
		}
		if (posHint > 0) {
			this.partialData = this.partialData.slice(posHint);
		} else if (posHint === 0 && this.partialData.length > this.lastPartialDataWarningSize) {
			// posHint 0 indicates the so-far partial data is not decodable due to incomplete packet.
			// If partialData.length is really big at the same time and keeps growing, it could be
			// the received data does not conform to messagePacket protocol.
			gc.console.warning('MessagePackCodec', 'Received data but cannot decode it. Please check the content of data.')
			this.lastPartialDataWarningSize = 2 * this.lastPartialDataWarningSize;
		}
		return this.isConnected;
	};
	
	var messagePackBaseCodecName = 'messagePackDelimiter'; // standard name of baseCodecs of messagePackCodec
	gc.databind.registerCustomCodec('messagePack', MessagePackCodec, messagePackBaseCodecName);

	// Register a codec under messagePackBaseCodecName.
	// The drawback of using any text delimited codec, like CR, is
	// that codec converts number[] to string, and outputs string.
	// This forces messagePackCodec to perform an extra step of converting
	// string back to number[] before the actual decoding.
	// GC app can override the bulit-in baseCodec of messagePackCodec by registering its own custom codec
	// under the same name messagePackBaseCodecName. Such codec can be
	// a binary decoder, i.e. its decode() takes in number[], find the packet, and output
	// the packet as number[]. It will save MessagePackCodec from coverting string to number[].
	var baseCodec = function() {
		this._isConnected = false;
	};
	baseCodec.prototype = new gc.databind.IPacketCodec();

	baseCodec.prototype.encode = function(target, value) {
		// value is number[]
		// have [c1, rest of data]?
		// target([0xc1].concat(value));
		// or have [data, followed by 0xa]?
		value.push(0xa);
		target(value);
	};

	baseCodec.prototype.decode = function(target, value) {
		// value is number[]
		// if (value.length > 0 && value[0] === 0xc1) {
		// 	value.shift();
		// }
		this._isConnected = target(value);
		return this._isConnected;
	};

	gc.databind.registerCustomCodec(messagePackBaseCodecName, baseCodec);

}());
