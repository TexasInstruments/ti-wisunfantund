(function() {
    function OCFSPI(packetParser, sendPacket) {
        OCFBaseEx.apply(this, arguments);
        this.handlers = [
            reply_SPI_Enable,
            reply_SPI_Config,
            reply_SPI_WriteAndRead,
            reply_SPI_CaptureSample,
            reply_SPI_DownStream_BufWrite,
            reply_SPI_Start_DownStream
        ];
    };
    OCFSPI.prototype = Object.create(OCFBaseEx.prototype);
    OCFSPI.prototype.constructor = OCFSPI;
    OCFBaseEx.prototype.add_interface('spi', OCFSPI);

    /**
     * Initialize the symbols for device, and it should invoked by GC framework only.
     * See its base method for description
     */
    OCFSPI.prototype.initSymbolsForDevice = function(settings, registerModel) {
        OCFBaseEx.prototype.initSymbolsForDevice.apply(this, arguments);
        //registerModel.addUserPreference('$cs_gpio', settings.cs_gpio); // should not be user preference that overwrites App intent.
    };

    // system.json properties.
    // {
    //     "name": a string, "spi" in this case
    //   , "unit": a number, inteface unit
    //   , "cs_gpio": a string, chip select gpio pin, e.g. 'PN2'; or a number as the pin mask of the gpio pin
    //   , "dataEndian": 'big', or 'little' (default), data endianess
    //   ,  "read_write_register_protocol": {
    //          "write_cmd": hex string or number, write command
    //        , "read_cmd": hex string or number, read command
    //        , "addr_bitshift": a number, address bit shift
    //        , "data_bitshift": a number, data bit shift
    //        , "parity": "odd" or "even"
    //        , "parity_bitshift": a number, parity bit shift
    //        , "payload_endian": 'big' or 'little', payload endianess
    //        , "payload_bitsize": a number, payload bit size
    //        , "reply_payload_data_start": a number, payload start index for register data, see JS array slice for pos/neg number
    //        , "reply_payload_data_end": a number, payload end index for register data, see JS array slice for pos/neg number
    //        , "dataEndian": 'big', or 'little' (default), data endianess
    //      }
    //    , "config" : [
    //        {
    //          "command": "enable" or "config"
    //          ,"unit": (Optiona) unit number for the command
    //
    //          ,"enable": 'enable' command - true (enable) or false (disable)
    //
    //          ,"bitrate" : 'config' command - bit rate
    //          ,"protocol" : 'config' command - a number indicating ssi protocol
    //          ,"datawidth" : 'config' command - data width
    //          ,"cs_mode" : 'config' command - SPI active mode, 1 active high; 0 active low
    //          ,"cs_change" : 'config' command - cs_mode change between SPI word. 0: no change; 1: change
    //        }
    //        , ... (etc.)
    //      ]
    // }

    /**
     * Initialize the interface instance, and it should invoked by GC framework only.
     * See its base method for description
     */
    OCFSPI.prototype.init = function(info) {
        this.cs_gpio = info.cs_gpio;
        var self = this;
        if (info.read_write_register_protocol) {
            info.read_write_register_protocol.write_cmd = parseInt(info.read_write_register_protocol.write_cmd) || 0;
            info.read_write_register_protocol.read_cmd = parseInt(info.read_write_register_protocol.read_cmd) || 0;
        }
        // should not do this as a binding nor user preferece nor prop binding nor pseudo register
        //if (info.cs_gpio_hdl === undefined) {
        //    info.cs_gpio_hdl = function(oldValue, newValue) {
        //        self.cs_gpio = newValue;
        //    }
        //    info._registerModel.getBinding('$cs_gpio').addChangedListener({onValueChanged: info.cs_gpio_hdl});
        //}
        return OCFBaseEx.prototype.init.apply(this, arguments);
    };

    /**
     * Construct packet payload for write or read
     * @param {Boolean} write write (true) or read (false)
     * @param {Object} regInfo register info
     * @param {Number} data data to write
     * @return {Array} packet payload as an array of bytes
     */
    OCFSPI.prototype.write_read_payload = function(write, regInfo, data) {
        var protocol = regInfo.read_write_register_protocol || this.info.read_write_register_protocol;
        var cmd = (write == true) ? protocol.write_cmd : protocol.read_cmd;
        var addr_bitshift = protocol.addr_bitshift;
        var data_bitshift = protocol.data_bitshift;
        var parity = protocol.parity;
        var parity_shift = protocol.parity_bitshift;
        var endian = protocol.payload_endian;
        var bitsize = protocol.payload_bitsize;
        var reg_addr = regInfo.writeAddr || regInfo.addr;
        var assembledCmd = cmd | (reg_addr << addr_bitshift) | (data << data_bitshift);
        if (parity !== undefined) {
            var ones = 0;
            var x = assembledCmd;
            while (x > 0) {
                if ((x & 0x1) == 1) ones++;
                x >>= 1;
            }
            if (parity == 'odd') {
                if ((ones & 0x1) == 0) assembledCmd |= (1<<parity_shift);
            } else {
                if ((ones & 0x1) == 1) assembledCmd |= (1<<parity_shift);
            }
        }
        return this.value_to_bytes(assembledCmd, bitsize, endian);
    };

    /** See its base method for description */
    OCFSPI.prototype.read = function(regInfo) {
        if (this._custom_cb && this._custom_cb.read) {
            return this._custom_cb.read(regInfo);
        }
        var self = this;
        var cs_gpio = regInfo.cs_gpio || this.cs_gpio;
        var payload = this.write_read_payload(false, regInfo, 0);
        var protocol = regInfo.read_write_register_protocol || this.info.read_write_register_protocol;
        return this.SPI_WriteAndRead(this.unit, cs_gpio, payload, payload.length)
        .then(function(payload) {
            if (payload && protocol) {
                payload = payload.slice(protocol.reply_payload_data_start, protocol.reply_payload_data_end);
            }
            return self.bytes_to_value(payload, protocol && protocol.dataEndian);
        });
    };

    /** See its base method for description */
    OCFSPI.prototype.write = function(regInfo, data) {
        if (this._custom_cb && this._custom_cb.write) {
            return this._custom_cb.write(regInfo, data);
        }
        var cs_gpio = regInfo.cs_gpio || this.cs_gpio;
        var payload = this.write_read_payload(true, regInfo, data);
        return this.SPI_WriteAndRead(this.unit, cs_gpio, payload, payload.length);
    };

    /**
     * Configure the inteface, and it should invoked by GC framework only.
     */
    OCFSPI.prototype.ensureConfigured = function(config_seq) {
        var promises = [];
        var seq_len = config_seq ? config_seq.length : 0;
        for (var i=0; i<seq_len; i++) {
            var config = config_seq[i];
            switch (config.command) {
                case 'enable':
                    promises.push(this.SPI_Enable(config.unit || this.unit, config.enable));
                    break;
                case 'config':
                    promises.push(this.SPI_Config(config.unit || this.unit, config.bitrate, config.protocol, config.datawidth, config.cs_mode, config.cs_change));
                    break;
            }
        }
        return Q.all(promises);
    };
    
    // Reference ocf_common.h
    //#define SPI_Interface       0x05
    //typedef enum
    //{
    //    ocCmd_SPI_Enable = 0x00,
    //    ocCmd_SPI_Config,
    //    ocCmd_SPI_WriteAndRead,
    //    ocCmd_SPI_CaptureSample,
    //    ocCmd_SPI_DownStream_BufWrite,
    //    ocCmd_SPI_Start_DownStream
    //} SPI_CMD;
    var SPI_Interface = 0x05;
    var ocCmd_SPI_Enable = 0x00;
    var ocCmd_SPI_Config = 0x01;
    var ocCmd_SPI_WriteAndRead = 0x02;
    var ocCmd_SPI_CaptureSample = 0x03;
    var ocCmd_SPI_DownStream_BufWrite = 0x4;
    var ocCmd_SPI_Start_DownStream = 0x5;
    var ocCmd_Sys_DevCtrl = 0xC;

    /** Get interface type */
    OCFSPI.prototype.get_interface_type = function() { return SPI_Interface; }

    /**
     * Enable or Disable the inteface
     * @param {Number} unit interface unit
     * @param {Boolean} enable enable if true, disable if false
     * @return {Promise}
     */
    OCFSPI.prototype.SPI_Enable = function(unit, enable) {
        //uint32_t unit, bool enable
        var params = [this.uint32_leb4(unit), this.uint32_leb4(enable ? 1 : 0)];
        return this.h2c_command(SPI_Interface, unit, ocCmd_SPI_Enable, params);
    };

    /** Internal function */
    var reply_SPI_Enable = function(self, qdef, unit, status, replypkt) {
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
     * @param {Number} bitrate bit rate
     * @param {Number} protocol
     * @param {Number} datawidth
     * @param {Number} cs_mode
     * @param {Number} cs_change
     * @return {Promise}
     */
    OCFSPI.prototype.SPI_Config = function(unit, bitrate, protocol, datawidth, cs_mode, cs_change) {
        //uint32_t unit, uint32_t bit_rate, uint32_t protocol (spi mode), uint32_t datawidth, uint32_t cs_mode, uint32_t cs_change
        // bitrate: in units of 1kHz; max rate is 60000 kHz
        // protocol: see ssi.h
        //  #define SSI_FRF_MOTO_MODE_0  0x00000000 // Moto fmt, polarity 0, phase 0
        //  #define SSI_FRF_MOTO_MODE_1  0x00000002 // Moto fmt, polarity 0, phase 1
        //  #define SSI_FRF_MOTO_MODE_2  0x00000001 // Moto fmt, polarity 1, phase 0
        //  #define SSI_FRF_MOTO_MODE_3  0x00000003 // Moto fmt, polarity 1, phase 1
        //  #define SSI_FRF_TI           0x00000010 // TI frame format
        //  #define SSI_FRF_NMW          0x00000020 // National microwire frame format
        //  #define SSI_ADV_MODE_BI_READ   0x00000140
        //  #define SSI_ADV_MODE_BI_WRITE  0x00000040
        // datawidth: word width between 4 and 16 bits
        // cs_mode: SPI active mode: 1 active high; 0 active low
        // cs_change: cs_mode change between SPI word. 0: no change; 1: change
        var params = [this.uint32_leb4(unit), this.uint32_leb4(bitrate), this.uint32_leb4(protocol),
                      this.uint32_leb4(datawidth), this.uint32_leb4(cs_mode), this.uint32_leb4(cs_change)];
        return this.h2c_command(SPI_Interface, unit, ocCmd_SPI_Config, params);
    };

    /** Internal function */
    var reply_SPI_Config = function(self, qdef, unit, status, replypkt) {
        if (status == 0) {
            self.unit_state[unit].current = 2;
            qdef && qdef.resolve(true);
        } else {
            qdef && qdef.reject(self.status_msg(status, replypkt.payload ? self.bytes_ascii(replypkt.payload) : 'Failed in Config'));
        }
    };

    /**
     * Write and Read
     * @param {Number} unit interface unit
     * @param {String} cs_gpio chip select gpio pin as pin port name (string) or pin mask (a number)
     * @param {Array} pWriteBuffer data to write
     * @param {Number} num_bytes number of bytes to write and read. 
     * @return {Promise}
     */
    OCFSPI.prototype.SPI_WriteAndRead = function(unit, cs_gpio, pWriteBuffer, num_bytes) {
        //uint8_t unit, uint32_t cs_gpio, uint16_t num_bytes,
        //cs_gpio: the gpio pin to be used as the chip select. value is 1<<n, where n=[0..15]
        //pWriteBuffer is uint8_t*, contains data to write
        //num_bytes is number of bytes to write and to read. By SPI design, both write and read bounds have the same number of bytes.
        // firmware 0.3.0.3, cs_gpio is port pin name e.g. 'PK1'
        // firmware 0.9, may not have cs_gpio. Review code for any change.
        var gpio;
        if (typeof cs_gpio == 'string') {
            gpio = cs_gpio.split('').map(v => {return v.charCodeAt(0);});
            while(gpio.length < 4) gpio.push(0);
        } else {
            gpio = this.uint32_leb4(cs_gpio); // in case it is a pin mask
        }
        var params = [this.uint32_leb4(unit), gpio, this.uint16_leb4(pWriteBuffer && pWriteBuffer.length || num_bytes)];
        return this.h2c_command(SPI_Interface, unit, ocCmd_SPI_WriteAndRead, params, pWriteBuffer);
    };

    /** Internal function */
    var reply_SPI_WriteAndRead = function(self, qdef, unit, status, replypkt) {
        if (!qdef) return;
        if (status == 0) {
            qdef.resolve(replypkt.payload);
        } else {
            qdef.reject(self.status_msg(status, replypkt.payload ? self.bytes_ascii(replypkt.payload) : 'Failed in WriteAndRead'));
        }
    };

    /**
     * Capture sample
     * @param {Number} unit interface unit
     * @param {Number} bytes_to_write each_frame_bytes, one_sample_output_bytes * channels
     * @param {Number} sample_size number of samples to capture for a channel
     * @param {Array} payload the output data for getting a sample for each channel
     * @return {Promise}
     */
    OCFSPI.prototype.SPI_CaptureSample = function(unit, bytes_to_write, sample_size, payload, options) {
        //uint8_t unit, uint16_t bytes_to_write, unit32_t sample_size
        // bytes_to_write: each_frame_bytes, one_sample_output_bytes * channels
        // sample_size: number of samples to capture for a channel
        // payload is the output data for getting a sample for each channel
        // so, total_output_bytes after capture done = sample_size * each_frame_bytes
        //
        // The following is not part of DLL APIs
        // options is {
        //     callback: <is a callback function of signature function(replypkt) > for streaming approach; undefined for buffering approach
        // }
        // Streaming approach is to address potential performance problems on browser side. If total_output_bytes
        // is 5K+ bytes, or if captue sample request is made at high rate regardless of the size of total_output_bytes,
        // it is better to use streaming approach.
        // Since some applications can do processing without waiting the entire capture, or may suffer performance
        // issues from allocating a huge buffer to hold data, this option is provided to enable applications to
        // make design decisioins.
        // In streaming approach, callback is invoked for each data packet received from firmware.
        // In buffering approach, application will get all the captured data through Q promise
        // after capture done packect is recieved.
        var params = [this.uint32_leb4(unit), this.uint32_leb4(bytes_to_write), this.uint32_leb4(sample_size)];
        this.capture_sample_options = options || {};
        this.capture_payload = [];
        return this.h2c_command(SPI_Interface, unit, ocCmd_SPI_CaptureSample, params, payload);
    };

    /** Internal function */
    var reply_SPI_CaptureSample = function(self, qdef, unit, status, replypkt, packet_type) {
        // SPI_interface.c, and ocf_common.h; status 1: capture in progress, 2: capture sample done
        // firmware version 0.3.0.3 first reply is status packet;
        // if capture is done without issues, firmware sends at least 1 data packet
        if (qdef) { self.capture_qdef = qdef; } // firmware 0.3.0.3 - unit for data packet is 0 for unknown reason
        if (status >= 1 && status <= 2) {
            // packet type: DATA_PACKET=0x0002, STATUS_PACKET=0x0003
            if (self.capture_sample_options.callback) {
                self.capture_sample_options.callback(replypkt);
            } else if (replypkt.payload) {
                if (packet_type == 0x2) {
                    if (self.leb2_uint16(replypkt.packet_num) == 0x1) self.capture_payload = [];
                    Array.prototype.push.apply(self.capture_payload, replypkt.payload);
                }
            }
            if (status == 2) {
                self.capture_qdef && self.capture_qdef.resolve(self.capture_payload);
                self.capture_qdef = self.capture_payload = undefined;
            }
        } else if (status != 0) {
            self.capture_qdef && self.capture_qdef.reject(self.status_msg(status, replypkt.payload ? self.bytes_ascii(replypkt.payload) : 'Failed in CaptureSample'));
            self.capture_qdef = self.capture_payload = undefined;
        }
    };

    /**
     * Down stream (host to controller) write data to buffer
     * @param {Number} unit interface unit
     * @param {Array} pWriteBuffer data to write
     * @return {Promise}
     */
    OCFSPI.prototype.SPI_DownStream_BufWrite = function(unit, pWriteBuffer) {
        //uint8_t unit, uint8_t* pWriteBuffer contains data to write
        var params = [this.uint32_leb4(unit)];
        return this.h2c_command(SPI_Interface, unit, ocCmd_SPI_DownStream_BufWrite, params, pWriteBuffer);
    };

    /** Internal function */
    var reply_SPI_DownStream_BufWrite = function(self, qdef, unit, status, replypkt) {
        if (!qdef) return;
        if (status == 0) {
            qdef.resolve(replypkt.payload);
        } else {
            qdef.reject(self.status_msg(status, replypkt.payload ? self.bytes_ascii(replypkt.payload) : 'Failed in DownStream_BufWrite'));
        }
    };

    /**
     * Start down stream (host to controller)
     * @param {Number} unit interface unit
     * @return {Promise}
     */
    OCFSPI.prototype.SPI_Start_DownStream = function(unit) {
        //no params
        var params = [];
        return this.h2c_command(SPI_Interface, unit, ocCmd_SPI_Start_DownStream, params);
    };

    /** Internal function */
    var reply_SPI_Start_DownStream = function(self, qdef, unit, status, replypkt) {
        if (!qdef) return;
        if (status == 0) {
            qdef.resolve(replypkt.payload);
        } else {
            qdef.reject(self.status_msg(status, replypkt.payload ? self.bytes_ascii(replypkt.payload) : 'Failed in Start_DownStream'));
        }
    };

    /**
     * Device control for capture sample or down stream
     * @param {Number} unit interface unit
     * @param {Number} active_mode
     * @param {Number} input_trigger_gpio_active
     * @param {Array} ctrl_pin_ary Array of max 3 object, each object is {gpio_pin, pin_type, control_level, invert_clk}
     * @param {Number} sample_rate
     * @param {Number} sample_bits
     * @param {Number} dma_arb_size
     * @return {Promise}
     */
    OCFSPI.prototype.SPI_DevCtrl = function(unit, active_mode, input_trigger_gpio_active, input_trigger_gpio,
        ctrl_pin_ary, sample_rate, sample_bits, dma_arb_size) {
        // params is unit, sizeof dev_ctrl; payload length is sizeof dev_ctrl, payload is dev_ctrl
        // dev_ctrl is a struct of
        //    uint8 active_mode, uint8 input_trigger_gpio_active, unit16 input_trigger_gpio,
        //    CTRL_PIN ctrl_pin[3],
        //    unit32 sample_rate, unit8 sample_bits, uint8 dma_arb_size
        // each CTRL_PIN is a struct of
        //    unit16 gpio_pin, uint16 pin_type, uint16 control_level, int16 invert_clk
        var payload = [active_mode & 0xff, input_trigger_gpio_active & 0xff];
        Array.prototype.push.apply(payload, this.uint16_leb2(input_trigger_gpio));
        for (var idx=0; idx<3; idx++) {
            if (idx < ctrl_pin_ary.length) {
                var gpio_pin = undefined;
                if (typeof ctrl_pin_ary[idx].gpio_pin == 'string') { // firmware version 0.3.0.3 gpio pin is string, e.g. 'K1'
                    gpio_pin = ctrl_pin_ary[idx].gpio_pin.split('').map(v => {return v.charCodeAt(0);});
                }
                Array.prototype.push.apply(payload, gpio_pin || this.uint16_leb2(ctrl_pin_ary[idx].gpio_pin) );
                Array.prototype.push.apply(payload, this.uint16_leb2(ctrl_pin_ary[idx].pin_type) );
                Array.prototype.push.apply(payload, this.uint16_leb2(ctrl_pin_ary[idx].control_level) );
                Array.prototype.push.apply(payload, this.uint16_leb2(ctrl_pin_ary[idx].invert_clk) );
            } else {
                Array.prototype.push.apply(payload, this.uint16_leb2(0) );
                Array.prototype.push.apply(payload, this.uint16_leb2(3) );// INVALID_PIN
                Array.prototype.push.apply(payload, this.uint16_leb2(0) );
                Array.prototype.push.apply(payload, this.uint16_leb2(0) );
            }
        }
        Array.prototype.push.apply(payload, this.uint32_leb4(sample_rate) );
        payload.push( sample_bits & 0xff );
        payload.push( dma_arb_size & 0xff  );
        var params = [this.uint32_leb4(unit), this.uint32_leb4(payload.length)];
        return this.h2c_command(SPI_Interface, unit, ocCmd_Sys_DevCtrl, params, payload);
    };

    /** Internal function */
    var reply_SPI_DevCtrl = function(self, qdef, unit, status, replypkt) {
        if (!qdef) return;
        if (status == 0) {
             qdef.resolve(replypkt.payload ? replypkt.payload : true);
        } else {
            qdef.reject(self.status_msg(status, replypkt.payload ? self.bytes_ascii(replypkt.payload) : 'Failed in DevCtrl'));
        }
    };

})();

