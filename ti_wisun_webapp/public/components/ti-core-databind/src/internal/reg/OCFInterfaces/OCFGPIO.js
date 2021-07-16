(function() {
    function OCFGPIO(packetParser, sendPacket) {
        OCFBaseEx.apply(this, arguments);
        this.handlers = [
            reply_GPIO_Enable,
            reply_GPIO_Config,
            reply_GPIO_Write,
            reply_GPIO_Read,
            reply_GPIO_RegisterInterrupt
        ];
    };
    OCFGPIO.prototype = Object.create(OCFBaseEx.prototype);
    OCFGPIO.prototype.constructor = OCFGPIO;
    OCFBaseEx.prototype.add_interface('gpio', OCFGPIO);

    /**
     * Initialize the symbols for device, and it should invoked by GC framework only.
     * See its base method for description
     */
    OCFGPIO.prototype.initSymbolsForDevice = function(settings, registerModel) {
        OCFBaseEx.prototype.initSymbolsForDevice.apply(this, arguments);
        (settings.config || []).forEach(function(config) {
            if (config.command == 'registerInt') {
                var registerInfo = {comm: undefined, uri: 'aevm.'+settings.name+'.'+config.name,
                    pseudo: true, pin_mask: config.pin_mask, pin_name: config.pin_name
                };
                registerModel.addPseudoRegister(registerInfo.uri, registerInfo, 'interrupt'); // because I need to bind name
                settings._interrupt_info = registerInfo;
            }
        });
    };

    /**
     * Initialize the interface instance, and it should invoked by GC framework only.
     * See its base method for description
     */
    OCFGPIO.prototype.init = function(info) {
        this.pin_mask = info.pin_mask;
        this.pin_name = info.pin_name;
        if (info._interrupt_info) info._interrupt_info.comm = this;
        return OCFBaseEx.prototype.init.apply(this, arguments);
    };

    /** See its base method for description */
    OCFGPIO.prototype.get_packet_handler = function(packet_type, command) {
        if (command == ocCmd_GPIO_Intr_Notify_Int) {
            return this.info._interrupt_info && function(self, qdef, unit, status, pkt) {
                self.info._registerModel.getBinding(self.info._interrupt_info.uri).updateValue(pkt.payload);
                self.info._registerModel.getBinding(self.info._interrupt_info.uri).updateValue(false);
            };
        }
        return OCFBaseEx.prototype.get_packet_handler.apply(this, arguments);
    };
    
    /** See its base method for description */
    OCFGPIO.prototype.read = function(info) {
        if (this._custom_cb && this._custom_cb.read) {
            return this._custom_cb.read(info);
        }
        return this.GPIO_Read(this.unit, info.pin_mask || this.pin_mask, info.pin_mask2 || this.pin_mask2);
    };

    /** See its base method for description */
    OCFGPIO.prototype.write = function(info, data) {
        if (this._custom_cb && this._custom_cb.write) {
            return this._custom_cb.write(info, data);
        }
        var pin_mask = info.pin_mask || this.pin_mask;
        return this.GPIO_Write(this.unit, pin_mask, data, info.pin_mask2 || this.pin_mask2, data);
    };

    /**
     * Configure the inteface, and it should invoked by GC framework only.
     */
    OCFGPIO.prototype.ensureConfigured = function(config_seq) {
        var promises = [];
        var seq_len = config_seq ? config_seq.length : 0;
        for (var i=0; i<seq_len; i++) {
            var config = config_seq[i];
            switch (config.command) {
                case 'enable': 
                    promises.push(this.GPIO_Enable(this.unit, config.pin_mask || this.pin_mask, config.enable, config.pin_mask2 || this.pin_mask2));
                    break;
                case 'config':
                    promises.push(this.GPIO_Config(this.unit, config.pin_mask || this.pin_mask, config.mode, config.pin_mask2 || this.pin_mask2));
                    break;
                case 'write':
                    promises.push(this.GPIO_Write(this.unit, config.pin_mask || this.pin_mask, config.value, config.pin_mask2 || this.pin_mask2, config.value2));
                    break;
                case 'registerInt':
                    promises.push(this.GPIO_RegisterInterrupt(this.unit, config.pin_mask || this.pin_mask, config.options, config.pin_mask2 || this.pin_mask2));
                    break;
            }
        }
        return Q.all(promises);
    };

    // Reference ocf_common.h
    //#define GPIO_Interface       0x04
    //typedef enum
    //{
    //    ocCmd_GPIO_Enable = 0x00,
    //    ocCmd_GPIO_Config,
    //    ocCmd_GPIO_Write,
    //    ocCmd_GPIO_Read,
    //    ocCmd_GPIO_RegisterInterrupt,
    //} GPIO_CMD;
    var GPIO_Interface = 0x04;
    var ocCmd_GPIO_Enable = 0x00;
    var ocCmd_GPIO_Config = 0x01;
    var ocCmd_GPIO_Write = 0x02;
    var ocCmd_GPIO_Read = 0x03;
    var ocCmd_GPIO_RegisterInterrupt = 0x04;
    var ocCmd_GPIO_Intr_Notify_Int = 0x5; // the command used by controller to notify us that an interrupt is occurred.

    /** Get interface type */
    OCFGPIO.prototype.get_interface_type = function() { return GPIO_Interface; }

    //var pin_name_payload = function(pin_name) {
        // pin_name is a list of names, separated by space, each pin_name is of form Pxn, where x is a char from [A-Q] except I,O,
        // and n is a number from [0..7].  The firmware code navigate each pin name by jumping 4 chars at a time, so it may not be
        // a big deal whether the delimiter is a space or not.
        //return pin_name && pin_name.split('').map(function(v) { return v.charCodeAt(0); });
    //}
    
    /**
     * Enable or Disable the inteface
     * @param {Number} unit interface unit
     * @param {Number} pin_mask
     * @param {Boolean} enable enable if true, disable if false
     * @param {Number} pin_mask2
     * @return {Promise}
     */
    OCFGPIO.prototype.GPIO_Enable = function(unit, pin_mask, enable, pin_mask2) {
        //uint32_t pin_mask, bool enable, uint32_t pin_mask2
        //var payload = pin_name_payload(pin_name);
        //var params = [this.uint32_leb4(pin_mask), this.uint32_leb4((payload.length+1) >> 2), this.uint32_leb4(enable ? 1 : 0)];
        var params = [this.uint32_leb4(pin_mask), this.uint32_leb4(enable ? 1 : 0)];
        if (pin_mask2 !== undefined) params.push(this.uint32_leb4(pin_mask2));
        return this.h2c_command(GPIO_Interface, unit, ocCmd_GPIO_Enable, params);
    };

    /** Internal function */
    var reply_GPIO_Enable = function(self, qdef, unit, status, replypkt) {
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
     * @param {Number} pin_mask
     * @param {Number} mode
     * @param {Number} pin_mask2
     * @return {Promise}
     */
    OCFGPIO.prototype.GPIO_Config = function(unit, pin_mask, mode, pin_mask2) {
        //uint32_t pin_mask, uint32_t mode, uint32_t pin_mask2
        //mode (ref ocf_defs.h): 1: GPIO_Output; 2: GPIO_InputNoResistor; 3: GPIO_InputPullup; 4: GPIO_InputPullDown; 5: GPIO_OutputOpenDrain
        var params = [this.uint32_leb4(pin_mask), this.uint32_leb4(mode)];
        if (pin_mask2 !== undefined) params.push(this.uint32_leb4(pin_mask2));
        return this.h2c_command(GPIO_Interface, unit, ocCmd_GPIO_Config, params);
    };

    /** Internal function */
    var reply_GPIO_Config = function(self, qdef, unit, status, replypkt) {
        if (status == 0) {
            self.unit_state[unit].current = 2;
            qdef && qdef.resolve(true);
        } else {
            qdef && qdef.reject(self.status_msg(status, replypkt.payload ? self.bytes_ascii(replypkt.payload) : 'Failed in Config'));
        }
    };

    /**
     * Write pin values
     * @param {Number} unit interface unit
     * @param {Number} pin_mask
     * @param {Number} pin_values
     * @param {Number} pin_mask2
     * @param {Number} pin_values2
     * @return {Promise}
     */
    OCFGPIO.prototype.GPIO_Write = function(unit, pin_mask, pin_values, pin_mask2, pin_values2) {
        //uint32_t pin_mask, uint32_t pin_values, uint32_t pin_mask2, uint32_t pin_values2
        var params = [this.uint32_leb4(pin_mask), this.uint32_leb4(pin_values)];
        if (pin_mask2 !== undefined && pin_values2 !== undefined) {
            params.push(this.uint32_leb4(pin_mask2));
            params.push(this.uint32_leb4(pin_values2));
        }
        return this.h2c_command(GPIO_Interface, unit, ocCmd_GPIO_Write, params);
    };

    /** Internal function */
    var reply_GPIO_Write = function(self, qdef, unit, status, replypkt) {
        if (!qdef) return;
        if (status == 0) {
            qdef.resolve(true);
        } else {
            qdef.reject(self.status_msg(status, replypkt.payload ? self.bytes_ascii(replypkt.payload) : 'Failed in Write'));
        }
    };

    /**
     * Read pin values
     * @param {Number} unit interface unit
     * @param {Number} pin_mask
     * @param {Number} pin_mask2
     * @return {Promise}
     */
    OCFGPIO.prototype.GPIO_Read = function(unit, pin_mask, pin_mask2) {
        //uint32_t pin_mask, uint32_t pin_mask2
        var params = [this.uint32_leb4(pin_mask)];
        if (pin_mask2 !== undefined) params.push(this.uint32_leb4(pin_mask2));
        return this.h2c_command(GPIO_Interface, unit, ocCmd_GPIO_Read, params);
    };

    /** Internal function */
    var reply_GPIO_Read = function(self, qdef, unit, status, replypkt) {
        if (!qdef) return;
        if (status == 0) {
            qdef.resolve(replypkt.payload);
        } else {
            qdef.reject(self.status_msg(status, replypkt.payload ? self.bytes_ascii(replypkt.payload) : 'Failed in Read'));
        }
    };

    /**
     * Register interrupt
     * @param {Number} unit interface unit
     * @param {Number} pin_mask
     & @param {Array} type_option_ary array of 1 to 3 elements, each element is {type: type_value, enable: enable_value} 
     * @param {Number} pin_mask2
     * @return {Promise}
     */
    OCFGPIO.prototype.GPIO_RegisterInterrupt = function(unit, pin_mask, type_option_ary, pin_mask2) {
        //uint32_t pin_mask, uint32_t int_type_0, uint32_t int_type_1, uint32_t int_type_2,
        //uint32_t enable_int_0, uint32_t enable_int_1, uint32_t enable_int_2, uint32_t pin_mask2
        // The pins need to be configured as input mode beforehand - GPIO_InputNoResistor, GPIO_InputPullup, or GPIO_InputPullDown
        // type_option_ary: an array of size [1..3], each element is {type: type_value, enable: enable_value}
        // type_value is one of the interrupt types, (ref gpio.h)
        //  RISING_EDGE: 0
        //  FALLING_EDGE: 1
        //  BOTH_EDGE: 2
        //  LEVEL_HIGH: 3
        //  LEVEL_LOW: 4
        // enable_value is one of the following operations (ref ofc_common.h CFG_GPIO_INT)
        //  REGISTER_GPIO_INT: 0  // register
        //  REGISTER_GPIO_INT_ENT: 1  // register and enable
        //  ENABLE_GPIO_INT: 2  // enable, needs to register it before     
        //  DISABLE_GPIO_INT: 3  // disable
        var params = [this.uint32_leb4(pin_mask)];
        for (var idx=0; idx<3; idx++) {
            if (idx < type_option_ary.length) {
                params[idx+1] = this.uint32_leb4(type_option_ary[idx].type);
                params[idx+4] = this.uint32_leb4(type_option_ary[idx].enable);
            } else {
                params[idx+1] = this.uint32_leb4(0);
                params[idx+4] = this.uint32_leb4(0);
            }
        }
        if (pin_mask2 !== undefined) params.push(this.uint32_leb4(pin_mask2));
        return this.h2c_command(GPIO_Interface, unit, ocCmd_GPIO_RegisterInterrupt, params);
    };

    /** Internal function */
    var reply_GPIO_RegisterInterrupt = function(self, qdef, unit, status, replypkt) {
        if (!qdef) return;
        if (status == 0) {
             qdef.resolve(replypkt.payload ? replypkt.payload : true);
        } else {
            qdef.reject(self.status_msg(status, replypkt.payload ? self.bytes_ascii(replypkt.payload) : 'Failed in RegisterInterrupt'));
        }
    };

})();

