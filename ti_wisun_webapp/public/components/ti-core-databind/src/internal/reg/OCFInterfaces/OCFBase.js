/*************************************************************************************************************
 * (Abstract) OCF Base Interface module.
 *************************************************************************************************************/
(function() {
    /**
     * OCF base interface constructor.
     * 
     * @param {RegisterPacketParser} packetParser the register packet parser
     * @param {Function} sendPacket the send packet callback function
     */
    function OCFBase(packetParser, sendPacket) {
        this.packetParser = packetParser;
        this.sendPacket = sendPacket;
    }

    OCFBase.prototype._analytics_info = {};

    /**
     * Initialize the symbols for device, and it should invoked by GC framework only.
     * This is a class method, that has no conept of instance data
     *
     * @param {Object} settings the necessary info to initialize this interface
     * @param {RegisterModel} registerModel the model being used for this interface
     */
    OCFBase.prototype.initSymbolsForDevice = function(settings, registerModel) {
        settings._registerModel  = registerModel;

        try {
            //var localhost = window.location.hostname == 'localhost' || window.location.hostname == '127.0.0.1'
            var pathname = window.location.pathname.replace(/(^\/)|(\/$)/g, '');
            var desktop = gc.desktop && gc.desktop.isDesktop();
            var x = 'gallery/view/';
            if (desktop === false && pathname && pathname.indexOf(x) === 0) {
                OCFBase.prototype._analytics_info.action = 'gc_app_aevm_usb2any';
                x = pathname.slice(x.length).split('/');
                OCFBase.prototype._analytics_info.data = {
                    view_url: window.location.href,
                    app_owner: x[0],
                    app_name: x[1],
                    app_ver: x.length >= 3 ? x[3] : '1.0.0'
                }
            }
        } catch (e) {
        };

        // Use registerModel to addPseudoRegister (see gpio), or addUserPreference
        // The pseudoRegister's registerInfo must be {comm: undefined, uri: 'aevm.'+settings.name+'.'+config.name, ...}
        // The comm property is used by AEVM to call read/write. The comm field should be undefined
        // at this point because this is a class method.
        // When addPseudoRegister, should consider to use qualifier for readonly, writeonly, or interrupt when necessary.

        // An instance of interface module's init should update the comm property to point to the instance itself,
        // because that is the only point the instance is already created. Note the sequence of interface modules
        // for this method and init method is the same, so it implicitly matches the correct instance.
        // Use registerModel.getBinding(registerInfo.uri) to updateValue or setValue
        // To get notifying of data on the other end of binding, consider one of these:
        // registerModel.getBinding(registerInfo.uri).addChangedListener({onValueChanged: function(oldValue, newValue) {
        // }});
        // registerModel.getBinding(registerInfo.uri).addStreamingListener({onDataReceived: function(data) {
        // }});

        // client.js: to get notifying of data on the other end of binding, consdier one of these,
        // e.g. the pseudoRegister's uri is 'aevm.gpio.PK7', and the id of register model is regtemp,
        // gc.databind.createTrigger(function() { }, 'regtemp.aevm.gpio.PK7');
        // gc.databind.registry.getBinding('regtemp.aevm.gpio.PK7').addChangedListener();
        // gc.databind.registry.getBinding('regtemp.aevm.gpio.PK7').addStreamingListener();
    };

    /**
     * Initialize the interface instance, and it should invoked by GC framework only.
     * 
     * @param {Object} info the information to initialize this interface instance
     * @returns a promise
     */
    OCFBase.prototype.init = function(info) {
        return Promise.reject('');
    };

    /**
     * Reset the interface instance, and it should invoked by GC framework only.
     * 
     * @returns a promise
     */
    OCFBase.prototype.reset = function() {
        return Promise.reject('');
    };

    /**
     * Handles the incoming packet, and it should invoked by GC framework only.
     *
     * @param {*} packet the incoming packet
     * @returns true if handled, otherwise false
     */
    OCFBase.prototype.handlePacket = function(packet) {
        return false;
    };

    /**
     * This read function is designed with the intent used by Register GUI/Model layer
     * for reading a value from a register. GC internally assumes this is for I2C and SPI.
     *
     * In order to fullfil Register GUI layer, if the promise is resolved to a value,
     * that value must be a javascript number, interpreted as integral data type.
     *
     * @param {Object} regInfo the register info
     * @return a promise.
     */
    OCFBase.prototype.read = function(regInfo) {
        return Promise.reject('');
    };

    /**
     * This write function is designed with the intent used by Register GUI/Model layer
     * for writing a value to a register. GC internally assumes this is for I2C and SPI.
     *
     * @param {Object} regInfo the register info
     * @param {Number} data value to write, It must be a javascript number, interpreted as integral data type
     * @returns a promise
     */
    OCFBase.prototype.write = function(regInfo, data) {
        return Promise.reject('');
    };

    /** Internal function */
    OCFBase.prototype._send_analytics = function(data) {
        if (!OCFBase.prototype._analytics_info.action) return;
        var req = new XMLHttpRequest();
        req.open('POST', '/analytics');
        req.setRequestHeader("Content-Type", "application/json");
        // add viewurl, appname, action here
        var x = {
            action: OCFBase.prototype._analytics_info.action,
            data: Object.assign({}, OCFBase.prototype._analytics_info.data, data)
        }
        req.send(JSON.stringify(x));
    };

    /** Internal function */
    OCFBase.prototype.uint32_leb4 = function(val) {
        return [val & 0xff, (val >> 8) & 0xff, (val >> 16) & 0xff, (val >> 24) & 0xff];
    };

    /** Internal function */
    OCFBase.prototype.leb4_uint32 = function(val) {
        return (val[3]&0xff)*16777216 + (val[2]&0xff)*65536 + (val[1]&0xff)*256 + (val[0]&0xff);
    };

    /** Internal function */
    OCFBase.prototype.uint16_leb2 = function(val) {
        return [val & 0xff, (val >> 8) & 0xff];
    };

    /** Internal function */
    OCFBase.prototype.leb2_uint16 = function(val) {
        return (val[1]&0xff)<<8 | (val[0]&0xff);
    };

    /** Internal function */
    OCFBase.prototype.uint16_leb4 = function(val) {
        return [val & 0xff, (val >> 8) & 0xff, 0x0, 0x0];
    };

    /** Internal function */
    OCFBase.prototype.leb4_uint16 = function(val) {
        return (val[1]&0xff)<<8 | (val[0]&0xff); // must ignore val[3] and val[2]
    };

    /**
     *  Convert a javascript number to an array of bytes
     *  @param {Number} value the value to be converted
     *  @param {Number} bit_size semantic bit size of the value
     *  @param {String} endian endianess, 'big' or 'little' (default)
     *  @param {Array} in_place_buf An optional provided in-place-buffer to store the result
     *  @return {Array} converted bytes
     */
    OCFBase.prototype.value_to_bytes = function(value, bit_size, endian, in_place_buf) {
        var buf = in_place_buf || [];
        if (bit_size <= 8) {
            buf.push(value);
        } else {
            var bs=(((bit_size-1)>>3)<<3);
            if (endian == 'big') {
                for (var b=bs; b>=0; b-=8) { buf.push( (value >> b) & 0xff ); }
            } else { // (endian == 'little')
                for (var b=0; b<=bs; b+=8) { buf.push( (value >> b) & 0xff ); }
            }
        }
        return buf;
    };

    /**
     *  Convert an array of bytes to a javascript number
     *  @param {Array} buf the array of bytes
     *  @param {String} endian endianess, 'big' or 'little' (default)
     *  @return {Number} converted number
     */
    OCFBase.prototype.bytes_to_value = function(buf, endian) {
        var value = 0;
        var bs = buf.length;
        if (endian == 'big') {
            for (var b=0; b<bs; b++) { value = (value * 256) + (buf[b] & 0xff); }
        } else { // (endian == 'little')
            for (var b=bs; --b >=0; ) { value = (value * 256) + (buf[b] & 0xff); }
        }
        return value;
    };

    /* Exports the OCFBase object */
    window.OCFBase = OCFBase;
})();
