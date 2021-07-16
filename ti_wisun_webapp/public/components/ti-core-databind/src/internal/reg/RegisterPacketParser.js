/*************************************************************************************************************
 * Register packet module - a module helper module to convert raw data from/to packet object.
 * 
 * packet: {
 *  type:           Number[2], 
 *  transfer_len:   Number[4], 
 *  packet_num:     Number[2], 
 *  payload_len:    Number[2], 
 *  if_type_unit:   Number[2], 
 *  command:        Number[2], 
 *  params:         Number[8][4],   // optional, will be auto fill
 *  payload:        Number[*]       // size <= payload_len
 * }
 *************************************************************************************************************/
(function() {
    const P_SIGNATURE_START             = 0;
    const P_SIGNATURE_END               = 2;
    const P_TYPE_START                  = 2;
    const P_TYPE_END                    = 4;
    const P_TRANSFER_LEN_START          = 4 +4;
    const P_TRANSFER_LEN_END            = 8+4;
    const P_PACKET_NUM_START            = 8+4;
    const P_PACKET_NUM_END              = 10+4;
    const P_STATUS_START                = 10-6;
    const P_STATUS_END                  = 14-6;
    const P_PAYLOAD_LEN_START           = 14;
    const P_PAYLOAD_LEN_END             = 16;
    const P_IF_TYPE_UNIT_START          = 16;
    const P_IF_TYPE_UNIT_END            = 18;
    const P_COMMAND_START               = 18;
    const P_COMMAND_END                 = 20;
    const P_RESERVED_START              = 20;
    const P_RESERVED_END                = 22;
    const P_PARAM_START                 = 22-2;
    const P_PARAM_END                   = 54-2;

    const PARAM_COUNT                   = 8;
    const PACKET_HEADER_LENGTH          = P_PARAM_END;//54;
    const MAX_PAYLOAD_LENGTH            = 2048;

    const P_SIGNATURE                   = [0x02, 0xD4];

    const ERR_BAD_PACKET_SIZE           = -1;
    const ERR_INVALID_PACKET_HEADER     = -2;
    const ERR_INVALID_PAYLOAD           = -3;

    /**
     * Returns the error string for the given error code.
     * 
     * @param {Number} code 
     * @returns the error string
     */
    function getErrorString(code) {
        switch (code) {
            case ERR_BAD_PACKET_SIZE:               return 'Invalid packet size';
            case ERR_INVALID_PACKET_HEADER:         return 'Invalid packet header';
            case ERR_INVALID_PAYLOAD_SIZE:          return 'Invalid payload size';
        }

        throw 'Unknown error (' + code + ')';
    }

    /**
     * Returns the number from a little endian byte array.
     * 
     * @param {Array} bytes the byte array
     * @returns the number
     */
    function getNumberFromBytes(bytes) {
        var swappedBytes = [].concat(bytes).reverse();

        var length = swappedBytes.length;
        var value = 0;
        for (var i = 0; i < length; ++i) {
            var shift = length - i - 1;
            value += swappedBytes[i] << (shift * 8);
        }

        return value;
    };

    /**
     * RegisterPacketParser constructor.
     */
    function RegisterPacketParser() {
    }

    /**
     * Returns whether the two arrays are equal.
     * 
     * @param {Array} arr1 array 1
     * @param {Array} arr2 array 2
     * @returns true if both arrrays are equal, otherwise false
     */
    RegisterPacketParser.prototype.isArrayEqual = function(arr1, arr2) {
        if (arr1 == null || arr2 == null || (arr1.length !== arr2.length)) {
            return false;
        } else {
            for (var i = 0; i < arr1.length; ++i) {
                if (arr1[i] !== arr2[i]) {
                    return false;
                }
            }
            return true;
        }
    };

    /**
     * Returns the packet interface value.
     * 
     * @param {*} packet 
     * @returns the packet interface value
     */
    RegisterPacketParser.prototype.getPacketInterface = function(packet) {
        // if_type_unit is 16 bit: if_type at upper byte, unit at lower byte (if_type<<8|unit)=> [unit, if_type] in low endianess
        return packet.if_type_unit[1];
    };

    /**
     * Encode the packet object into raw data.
     * 
     * @param {*} packet the packet object
     * @returns the raw data
     */
    RegisterPacketParser.prototype.encode = function(packet) {
        var result = []
            .concat(P_SIGNATURE)
            .concat(packet.type)
            .concat([0x00, 0x00, 0x00, 0x00])
            .concat(packet.transfer_len)
            .concat(packet.packet_num)
            .concat(packet.payload_len)
            .concat(packet.if_type_unit)
            .concat(packet.command);

        /* optional parameters, auto fill if not exist */
        if (packet.params) {
            result = result.concat(packet.params);
        } else {
            for (var i = 0; i < PARAM_COUNT; ++i) {
                result = result.concat([0x00, 0x00, 0x00, 0x00]);
            }
        }

        /* optional payload */
        if (packet.payload) {
            result = result.concat(packet.payload);
        }

        return result;
    };

    /**
     * Decode the raw data into a packet Object.
     * 
     * @param {*} rawData the raw data
     * @returns the packet object
     */
    RegisterPacketParser.prototype.decode = function(rawData) {
        var packetSignature = rawData.slice(P_SIGNATURE_START, P_SIGNATURE_END);
        var packetLength    = rawData.length;
        var payloadLength   = getNumberFromBytes(rawData.slice(P_PAYLOAD_LEN_START, P_PAYLOAD_LEN_END));
        
        /* validate packet header length */
        if (packetLength < PACKET_HEADER_LENGTH) {
            throw getErrorString(ERR_BAD_PACKET_SIZE);
        
        /* validate packet signature */
        } else if (!this.isArrayEqual(P_SIGNATURE, packetSignature)) {
            throw getErrorString(ERR_INVALID_PACKET_HEADER);
        
        /* validate payload length */
        } else if ((payloadLength > MAX_PAYLOAD_LENGTH) || (payloadLength + PACKET_HEADER_LENGTH > packetLength)) {
            throw getErrorString(ERR_INVALID_PAYLOAD_SIZE);

        } else {
            /* extract the params array */
            var paramData = rawData.slice(P_PARAM_START, P_PARAM_END);
            var params = [];
            for (var i = 0; i < PARAM_COUNT; ++i) {
                var start = i * 4;
                var end = start + 4;
                params[i] = paramData.slice(start, end);
            }

            /* extract the payload */
            var payload = [];
            if (payloadLength > 0) {
                payload = rawData.slice(PACKET_HEADER_LENGTH, PACKET_HEADER_LENGTH + payloadLength)
            }

            return {
                type:           rawData.slice(P_TYPE_START, P_TYPE_END),
                transfer_len:   rawData.slice(P_TRANSFER_LEN_START, P_TRANSFER_LEN_END),
                packet_num:     rawData.slice(P_PACKET_NUM_START, P_PACKET_NUM_END),
                status:         rawData.slice(P_STATUS_START, P_STATUS_END),
                payload_len:    rawData.slice(P_PAYLOAD_LEN_START, P_PAYLOAD_LEN_END),
                if_type_unit:   rawData.slice(P_IF_TYPE_UNIT_START, P_IF_TYPE_UNIT_END),
                command:        rawData.slice(P_COMMAND_START, P_COMMAND_END),
              /*reserved:       rawData.slice(P_RESERVED_START, P_RESERVED_END),*/
                params:         params,
                payload:        payload
            };
        }

    };

    RegisterPacketParser.prototype.getFramePacketLength = function(rawData, offset) {
        if (rawData.length >= offset + 1 && rawData[offset] === P_SIGNATURE[0]) {
            if (rawData.length >= offset + 2 && rawData[offset+1] === P_SIGNATURE[1]) {
                if (rawData.length >= offset + PACKET_HEADER_LENGTH) {
                    var len = PACKET_HEADER_LENGTH + OCFBase.prototype.leb2_uint16([rawData[offset + P_PAYLOAD_LEN_START], rawData[offset + P_PAYLOAD_LEN_END-1]]);
                    if (rawData.length >= offset + len) {
                        return len;
                    }
                }
                return 0;
            } else {
                return -2;
            }
        } else  {
            return -1;
        }
    };

    /* exports the RegisterPacketParser object */
    window.RegisterPacketParser = RegisterPacketParser;
})();
