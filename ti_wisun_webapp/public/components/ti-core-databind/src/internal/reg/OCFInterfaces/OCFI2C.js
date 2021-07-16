(function() {
    function OCFI2C(packetParser, sendPacket) {
        OCFBaseEx.apply(this, arguments);
        this.handlers = [
            reply_I2C_Enable,
            reply_I2C_Config,
            reply_I2C_Write,
            reply_I2C_Read,
            reply_I2C_WriteRegister,
            reply_I2C_ReadRegister,
            reply_I2C_BlockWriteBlockRead,
            reply_I2C_CaptureSample
        ];
    };
    OCFI2C.prototype = Object.create(OCFBaseEx.prototype);
    OCFI2C.prototype.constructor = OCFI2C;
    OCFBaseEx.prototype.add_interface('i2c', OCFI2C);

    /**
     * Initialize the symbols for device, and it should invoked by GC framework only.
     * See its base method for description
     */
    OCFI2C.prototype.initSymbolsForDevice = function(settings, registerModel) {
        OCFBaseEx.prototype.initSymbolsForDevice.apply(this, arguments);
        // Should use either deviceAddrs for single block or devcieAddrsMap for multiple blocks.
        if (settings.slave_addr !== undefined && settings.deviceAddrs === undefined && settings.deviceAddrsMap === undefined) {
            console.warn('The slave_addr property in system.json is deprecated. Please use deviceAddrs.');
            settings.deviceAddrs = settings.slave_addr; // just backward compatible to ads7142 gc app
        }
        registerModel.readDeviceAddrsMap('I2C', settings);
    };

    // system.json properties.
    // {
    //     "name": a string, "i2c" in this case
    //   , "unit": a number, inteface unit
    //   , "unitMap": (Optional unit map) {
    //          "<block unit 1 id>": a number
    //        , "<block unit 2 id>": a number
    //        , ... (etc.)
    //     }
    //   , "deviceAddrs": hex string e.g. '0x40' or a number, device address
    //   , "addrsBits": a number, bit size of register address
    //   , "addrsEndian": 'big' (default), or 'little', address endianess
    //   , "dataEndian": 'big', or 'little' (default), data endianess
    //   ,  "read_register_protocol": {
    //          "opcode_addr_format": "separated" or "combined"
    //        , "opcode": (Optional) hex string e.g. '0x20' or a number
    //        , "addr_bitshift": (Optional) a number, bit shift for register address in combined format
    //      }
    //   ,  "write_register_protocol": {
    //          "opcode_addr_format": "separated" or "combined"
    //        , "opcode": (Optional) hex string e.g. '0x40' or a number
    //        , "addr_bitshift": (Optional) a number, bit shift for register address in combined format
    //      }
    //    , "config" : [
    //        {
    //          "command": "enable" or "config"
    //          ,"unit": (Optional) unit number for the command
    //
    //          ,"enable": 'enable' command - true (enable) or false (disable)
    //
    //          ,"bitrate_enum" : 'config' command - bit rate enum
    //          ,"pullup" : 'config' command - true or false for pull-up
    //        }
    //        , ... (etc.)
    //      ]
    // }

    /**
     * Initialize the interface instance, and it should invoked by GC framework only.
     * See its base method for description
     */
    OCFI2C.prototype.init = function(info) {
        //this.i2c_mdr = this.parse_int(info.mdr);// || 0x8; // I2CMDR I2C Master Data Register for writeregister
        //this.i2c_mimr = this.parse_int(info.mimr);// || 0x10; //I2CMIMR I2C Master Interrupt Mask Register for blockwriteblockread
        info.addrsBits = this.parse_int(info.addrsBits);
        info.addrsEndian = info.addrsEndian || 'big';
        if (info.mimr == undefined) {
            info.read_register_protocol.opcode = this.parse_int(info.read_register_protocol.opcode);
            info.read_register_protocol.addr_bitshift = this.parse_int(info.read_register_protocol.addr_bitshift);
        } else {
            info.read_register_protocol = {
                opcode_addr_format: 'separated',
                opcode: this.parse_int(info.mimr),
                addr_bitshift: undefined
            };
            console.warn('The mimr property in system.json is deprecated. Please use read_register_protocol');
        }
        if (info.mdr == undefined) {
            info.write_register_protocol.opcode = this.parse_int(info.write_register_protocol.opcode);
            info.write_register_protocol.addr_bitshift = this.parse_int(info.write_register_protocol.addr_bitshift);
        } else {
            info.write_register_protocol = {
                opcode_addr_format: 'separated',
                opcode: this.parse_int(info.mdr),
                addr_bitshift: undefined
            };
            console.warn('The mdr property in system.json is deprecated. Please use write_register_protocol');
        }
        if (info.crc) {
            if (OCFBaseEx.prototype._crc_user_map[info.name] === undefined) {
                OCFBaseEx.prototype.register_crc_user(crc_user, info.name);
            }
        }
        return OCFBaseEx.prototype.init.apply(this, arguments);
    };

    /** Internal function */
    OCFI2C.prototype.get_qdef_key = function(pkt) {
        if (pkt.command[0] == ocCmd_I2C_CaptureSample) {
            return this.flatten([pkt.if_type_unit, pkt.command])
        }
        return OCFBaseEx.prototype.get_qdef_key.apply(this, arguments);
    };

    /** Deprecated - Internal function for initial prototype */
    OCFI2C.prototype.readDeviceId = function(regInfo) {
        // for reading back the ads7142 identification -
        // slave addr 0x51, reg addr 0x0, flags = 0x1 for 16 (10 underlying?) bit addr mode, length of 0x99 or more
        var unit = parseInt(regInfo.unit);
        var slaveaddr = parseInt(regInfo.slaveaddr);
        var addr = parseInt(regInfo.addr);
        var flags = parseInt(regInfo.flags);
        var sz = parseInt(regInfo.bytes);
        return this.I2C_ReadRegister(unit, slaveaddr, addr, flags, sz);
    };

    /** Internal function */
    OCFI2C.prototype.getDeviceAddress = function(regInfo) {
        var ans;
        if (regInfo.deviceAddrs && !isNaN(regInfo.deviceAddrs)) {
            ans = +regInfo.deviceAddrs;
        } else if (this.info._registerModel) {
            ans = this.info._registerModel.getDeviceAddrsForRegister(regInfo);
        }
        return ans;
    };

    /** See its base method for description */
    OCFI2C.prototype.read = function(regInfo) {
        if (!regInfo._num_read_bytes) {
            var sz = parseInt(regInfo.size);// size in bits
            regInfo._num_read_bytes = (sz+7)>>3; // size in bytes
        }
        if (this._custom_cb && this._custom_cb.read) {
            return this._custom_cb.read(regInfo);
        }
        var self = this;
        var protocol = regInfo.read_register_protocol || this.info.read_register_protocol;
        var write_content = [];
        if (protocol.opcode_addr_format == 'separated') {
            if (protocol.opcode !== undefined) write_content.push(protocol.opcode);
            if (regInfo.addr != undefined) {
                this.value_to_bytes(regInfo.addr, this.info.addrsBits, this.info.addrsEndian, write_content);
            }
        } else {
            var op_or_addr = protocol.opcode || 0;
            if (regInfo.addr != undefined) {
                op_or_addr = op_or_addr | (regInfo.addr << (protocol.addr_bitshift || 0));
            }
            write_content = [op_or_addr];
        }
        var deviceAddr = this.getDeviceAddress(regInfo);
        var unit = this.getPropForRegister('unit', regInfo, this.info._registerModel);
        var num_read_bytes = regInfo._num_read_bytes;
        if (this.crc_user) {
            var crc_ans = this.crc_user.embed_crc_data(this.crc, {write: false, deviceAddr: deviceAddr, payload: write_content, num_read_bytes:num_read_bytes});
            write_content = crc_ans.payload;
            num_read_bytes = crc_ans.num_read_bytes;
        }
        return this.I2C_BlockWriteBlockRead(unit, deviceAddr, write_content, num_read_bytes)
        .then(function(payload) {
            if (self.crc_user) {
                var crc_ans = self.crc_user.verify_crc_data(self.crc, {payload: payload});
                if (crc_ans.valid === false) {
                    return Promise.reject('Invalid CRC');
                }
                payload = crc_ans.payload;
            }
            if (payload && protocol) {
                payload = payload.slice(protocol.reply_payload_data_start, protocol.reply_payload_data_end);
            }
            return self.bytes_to_value(payload, self.info.dataEndian);
        });
    };

    /** See its base method for description */
    OCFI2C.prototype.write = function(regInfo, data) {
        if (!regInfo._bit_size) {
            regInfo._bit_size = parseInt(regInfo.size);
        }
        var reg_addr = regInfo.writeAddr || regInfo.addr;
        this._send_analytics({action: 'write_register', reg_name: regInfo.name, reg_addr: reg_addr, reg_value: data});
        if (this._custom_cb && this._custom_cb.write) {
            return this._custom_cb.write(regInfo, data);
        }
        var protocol = regInfo.write_register_protocol || this.info.write_register_protocol;
        var flags = regInfo.flags || (this.info.addrsBits+7)>>4;
        var op_or_addr, write_content = [];
        if (protocol.opcode_addr_format == 'separated') {
            if (protocol.opcode !== undefined) {
                op_or_addr = protocol.opcode;
                flags = 0x0;
                if (reg_addr != undefined) {
                    this.value_to_bytes(reg_addr, this.info.addrsBits, this.info.addrsEndian, write_content);
                }
            } else {
                op_or_addr = reg_addr;
            }
        } else {
            op_or_addr = protocol.opcode || 0;
            if (reg_addr != undefined) {
                op_or_addr = op_or_addr | (reg_addr << (protocol.addr_bitshift || 0));
            }
        }
        this.value_to_bytes(data, regInfo._bit_size, this.info.dataEndian, write_content);
        var deviceAddr = this.getDeviceAddress(regInfo);
        var unit = this.getPropForRegister('unit', regInfo, this.info._registerModel);
        var payload = this.flatten(write_content);
        if (this.crc_user) {
            payload = this.crc_user.embed_crc_data(this.crc, {write: true, deviceAddr: deviceAddr, opcode: op_or_addr, payload:payload}).payload;
        }
        return this.I2C_WriteRegister(unit, deviceAddr, op_or_addr, flags, payload);
    };

    var crc_user = {
        embed_crc_data: function(crc, arg) {
            var c = undefined;
            if (arg.deviceAddr !== undefined) c = crc.checksum([arg.deviceAddr]);
            if (arg.opcode !== undefined) c = crc.checksum([arg.opcode], c);
            if (arg.payload !== undefined) c = crc.checksum(arg.payload, c);
            arg.payload.push(c);
            return {payload: arg.payload, num_read_bytes: (arg.write===true) ? 0 : arg.num_read_bytes+1};
        }
        , verify_crc_data: function(crc, arg) {
            var d = arg.payload && arg.payload.slice(0, -1);
            return {valid: d && crc.checksum(d) == arg.payload[arg.payload.length-1], payload: d};
        }
    };

    /**
     * Configure the inteface, and it should invoked by GC framework only.
     */
    OCFI2C.prototype.ensureConfigured = function(config_seq) {
        var promises = [];
        var seq_len = config_seq ? config_seq.length : 0;
        for (var i=0; i<seq_len; i++) {
            var config = config_seq[i];
            switch (config.command) {
                case 'enable':
                    promises.push(this.I2C_Enable(config.unit || this.unit, config.enable));                        
                    break;
                case 'config':
                    promises.push(this.I2C_Config(config.unit || this.unit, config.bitrate_enum, config.pullup));
                    break;
            }
        }
        return Q.all(promises);
    };

    // Reference ocf_common.h
    //#define I2C_Interface       0x03
    //typedef enum
    //{
    //    ocCmd_I2C_Enable = 0x00,
    //    ocCmd_I2C_Config,
    //    ocCmd_I2C_Write,
    //    ocCmd_I2C_Read,
    //    ocCmd_I2C_WriteRegister,
    //    ocCmd_I2C_ReadRegister,
    //    ocCmd_I2C_BlkWriteBlkRead,
    //    ocCmd_I2C_CaptureSample
    //} I2C_CMD;
    var I2C_Interface = 0x03;
    var ocCmd_I2C_Enable = 0x00;
    var ocCmd_I2C_Config = 0x01;
    var ocCmd_I2C_Write = 0x02;
    var ocCmd_I2C_Read = 0x03;
    var ocCmd_I2C_WriteRegister = 0x04;
    var ocCmd_I2C_ReadRegister = 0x05;
    var ocCmd_I2C_BlkWriteBlkRead = 0x06;
    var ocCmd_I2C_CaptureSample = 0x07;

    /** Get interface type */
    OCFI2C.prototype.get_interface_type = function() { return I2C_Interface; }

    /**
     * Enable or Disable the inteface
     * @param {Number} unit interface unit
     * @param {Boolean} enable enable if true, disable if false
     * @return {Promise}
     */
    OCFI2C.prototype.I2C_Enable = function(unit, enable) {
        //uint32_t unit, bool enable
        var params = [this.uint32_leb4(unit), this.uint32_leb4(enable ? 1 : 0)];
        return this.h2c_command(I2C_Interface, unit, ocCmd_I2C_Enable, params);
    };

    /** Internal function */
    var reply_I2C_Enable = function(self, qdef, unit, status, replypkt) {
        if (status == 0) {
            var enable = self.leb4_uint32(replypkt.params[1]) == 1;
            self.unit_state[unit].current = enable ? 1 : 0;
            qdef && qdef.resolve(enable);
        } else {
            qdef && qdef.reject(self.status_msg(status, replypkt.payload ? self.bytes_ascii(replypkt.payload) : 'Failed in Enable/Disable'));
        }
    };

    /**
     * Configure the interface
     * @param {Number} unit interface unit
     * @param {Number} bit_rate bit rate enum
     * @param {Boolean} pull_ups pull-up (true) or not (false)
     * @return {Promise}
     */
    OCFI2C.prototype.I2C_Config = function(unit, bit_rate, pull_ups) {
        //uint32_t unit, bit_rate, bool pull_ups
        // bit rate Reference ocf_defs.h
        //#define I2C_100_KBPS        0   // 100 kbps
        //#define I2C_400_KBPS        1   // 400 kbps
        //#define I2C_1000_KBPS       2   // 1.0 kbps
        //#define I2C_3400_KBPS       3   // 3.4 kbps
        //if (bit_rate <0 || bit_rate>3) {
        //}
        // pull_ups: only some of i2c units for certain targets can be pulled up.
        var params = [this.uint32_leb4(unit), this.uint32_leb4(bit_rate), this.uint32_leb4(pull_ups ? 1 : 0)];
        return this.h2c_command(I2C_Interface, unit, ocCmd_I2C_Config, params);
    };

    /** Internal function */
    var reply_I2C_Config = function(self, qdef, unit, status, replypkt) {
        if (status == 0) {
            self.unit_state[unit].current = 2;
            qdef && qdef.resolve(true);
        } else {
            qdef && qdef.reject(self.status_msg(status, replypkt.payload ? self.bytes_ascii(replypkt.payload) : 'Failed in Config'));
        }
    };

    /**
     * Write data
     * @param {Number} unit interface unit
     * @param {Number} slaveAddr device address
     * @param {Array} pDataBuffer, data to write as a payload
     * @return {Promise}
     */
    OCFI2C.prototype.I2C_Write = function(unit, slaveAddr, pDataBuffer) {
        //uint8_t unit, uint8_t slaveAddr, uint16_t numBytes, uint8_t *pDataBuffer
        //uint16_t numBytes = pPacket->ph.payload_len;
        //Here, we deduce numBytes from pDataBuffer.length instead of an explicit argument
        var params = [this.uint32_leb4(unit), this.uint32_leb4(slaveAddr)];
        return this.h2c_command(I2C_Interface, unit, ocCmd_I2C_Write, params, pDataBuffer);
    };

    /** Internal function */
    var reply_I2C_Write = function(self, qdef, unit, status, replypkt) {
        if (!qdef) return;
        if (status == 0) {
            qdef.resolve(true);
        } else {
            qdef.reject(self.status_msg(status, replypkt.payload ? self.bytes_ascii(replypkt.payload) : 'Failed in Write'));
        }
    };

    /**
     * Read data
     * @param {Number} unit interface unit
     * @param {Number} slaveAddr device address
     * @param {Number} numBytes number of bytes to read
     * @return {Promise}
     */
    OCFI2C.prototype.I2C_Read = function(unit, slaveAddr, numBytes) {
        //uint8_t unit, uint8_t slaveAddr, uint16_t numBytes, uint8_t *pDataBuffer
        // we don't need the caller of this method to give pDataBuffer for host to controller bound,
        var params = [this.uint32_leb4(unit), this.uint32_leb4(slaveAddr), this.uint16_leb4(numBytes)];
        return this.h2c_command(I2C_Interface, unit, ocCmd_I2C_Read, params);
    };

    /** Internal function */
    var reply_I2C_Read = function(self, qdef, unit, status, replypkt) {
        if (!qdef) return;
        if (status == 0) {
            qdef.resolve(replypkt.payload);
        } else {
            qdef.reject(self.status_msg(status, replypkt.payload ? self.bytes_ascii(replypkt.payload) : 'Failed in Read'));
        }
    };

    /**
     * Write a register value
     * @param {Number} unit interface unit
     * @param {Number} slaveAddr device address
     * @param {Number} registerAddress register address
     * @param {Number} flags 8-bit regiser address (0) or 16-bit (1)
     * @param {Array} pDataBuffer, register value to write
     * @return {Promise}
     */
    OCFI2C.prototype.I2C_WriteRegister = function(unit, slaveAddr, registerAddress, flags, pDataBuffer) {
        //uint8_t unit, uint8_t slaveAddr, uint32_t registerAddress,
        //uint32_t flags, uint16_t numBytes, uint8_t *pDataBuffer
        //flags: 0: 8-bit register address, 1: 16-bit register address.
        //uint16_t numBytes = pPacket->ph.payload_len;
        //Here, we deduce numBytes from pDataBuffer.length instead of an explicit argument
        var params = [this.uint32_leb4(unit), this.uint32_leb4(slaveAddr), this.uint32_leb4(registerAddress), this.uint32_leb4(flags)];
        return this.h2c_command(I2C_Interface, unit, ocCmd_I2C_WriteRegister, params, pDataBuffer);
    };

    /** Internal function */
    var reply_I2C_WriteRegister = function(self, qdef, unit, status, replypkt) {
        if (!qdef) return;
        if (status == 0) {
            qdef.resolve(true);
        } else {
            qdef.reject(self.status_msg(status, replypkt.payload ? self.bytes_ascii(replypkt.payload) : 'Failed in WriteRegister'));
        }
    };

    /**
     * Read register (no repeated start)
     * @param {Number} unit interface unit
     * @param {Number} slaveAddr device address
     * @param {Number} registerAddress register address
     * @param {Number} flags 8-bit regiser address (0) or 16-bit (1)
     * @param {Number} numBytes number of bytes to read
     * @return {Promise}
     */
    OCFI2C.prototype.I2C_ReadRegister = function(unit, slaveAddr, registerAddress, flags, numBytes) {
        //uint8_t unit, uint8_t slaveAddr, uint32_t registerAddress,
        //uint16_t flags, uint16_t numBytes, uint8_t *pDataBuffer
        // we don't need the caller of this method to give pDataBuffer for holding the data obtained from controller,
        //flags: 0: 8-bit register address, 1: 16-bit register address;
        //       Use Repeated START: 0: No repeated start (separate write and read), 2: Use repeated start
        var params = [this.uint32_leb4(unit), this.uint32_leb4(slaveAddr), this.uint32_leb4(registerAddress), this.uint32_leb4(flags),
                      this.uint16_leb4(numBytes)];
        return this.h2c_command(I2C_Interface, unit, ocCmd_I2C_ReadRegister, params);
    };

    /** Internal function */
    var reply_I2C_ReadRegister = function(self, qdef, unit, status, replypkt) {
        if (!qdef) return;
        if (status == 0) {
            qdef.resolve(replypkt.payload);
        } else {
            qdef.reject(self.status_msg(status, replypkt.payload ? self.bytes_ascii(replypkt.payload) : 'Failed in ReadRegister'));
        }
    };

    /**
     * Block write and block read (with repeated start after write)
     * @param {Number} unit interface unit
     * @param {Number} slaveAddr device address
     * @param [Array} pWriteBuffer data to write, as packet payload
     * @param {Number} numReadBytes number of bytes to read
     * @return {Promise}
     */
    OCFI2C.prototype.I2C_BlockWriteBlockRead = function(unit, slaveAddr, pWriteBuffer, numReadBytes) {
        //uint8_t unit, uint8_t slaveAddr, uint16_t numWriteBytes,
        //uint8_t *pWriteBuffer, uint16_t numReadBytes, uint8_t *pReadBuffer
        //uint16_t numWriteBytes = pPacket->ph.payload_len
        //Here, we deduce numWriteBytes from pWriteBuffer.length instead of an explicit argument
        var params = [this.uint32_leb4(unit), this.uint32_leb4(slaveAddr), this.uint16_leb4(numReadBytes)];
        return this.h2c_command(I2C_Interface, unit, ocCmd_I2C_BlkWriteBlkRead, params, pWriteBuffer);
    };

    /** Internal function */
    var reply_I2C_BlockWriteBlockRead = function(self, qdef, unit, status, replypkt) {
        if (!qdef) return;
        if (status == 0) {
            qdef.resolve(replypkt.payload);
        } else {
            qdef.reject(self.status_msg(status, replypkt.payload ? self.bytes_ascii(replypkt.payload) : 'Failed in BlockWriteBlockRead'));
        }
    };

    /**
     * Capture sample (controller to host)
     * @param {Number} unit interface unit
     * @param {Number} slaveAddr device address
     * @param {Number} numReadBytes number of bytes to read
     * @return {Promise}
     */
    OCFI2C.prototype.I2C_CaptureSample = function(unit, slaveAddr, numReadBytes, options) {
        //uint8_t unit, uint8_t slaveAddr, uint32_t numReadBytes
        //
        // options is {
        //     callback: <is a callback function of signature function(replypkt) >
        // }
        // callback is invoked for each data packet received from firmware.
        var params = [this.uint32_leb4(unit), this.uint32_leb4(slaveAddr), this.uint32_leb4(numReadBytes)];
        this.capture_sample_options = options || {};
        return this.h2c_command(I2C_Interface, unit, ocCmd_I2C_CaptureSample, params);
    };

    /** Internal function */
    var reply_I2C_CaptureSample = function(self, qdef, unit, status, replypkt) {
        // I2C_interface.c, and ocf_common.h; status 1: capture in progress, 2: capture sample done
        if (qdef) { self.capture_qdef = qdef; }
        if (status >= 1 && status <= 2) {
            // packet type: DATA_PACKET=0x0002, STATUS_PACKET=0x0003
            if (self.capture_sample_options.callback) {
                self.capture_sample_options.callback(replypkt);
            }
            if (status == 2) {
                self.capture_qdef && self.capture_qdef.resolve(replypkt);
                self.capture_qdef = undefined;
            }
        } else if (status != 0) {
            self.capture_qdef && self.capture_qdef.reject(self.status_msg(status, replypkt.payload ? self.bytes_ascii(replypkt.payload) : 'Failed in CaptureSample'));
            self.capture_qdef = undefined;
        }
    };

})();

