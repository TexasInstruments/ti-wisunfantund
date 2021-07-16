(function() {
    function OCFPWM(packetParser, sendPacket) {
        OCFBaseEx.apply(this, arguments);
        this.handlers = [
            reply_PWM_Enable,
            reply_PWM_Config,
            reply_PWM_Start,
            reply_PWM_Stop
        ];
    };
    OCFPWM.prototype = Object.create(OCFBaseEx.prototype);
    OCFPWM.prototype.constructor = OCFPWM;
    OCFBaseEx.prototype.add_interface('pwm', OCFPWM);

    /**
     * Configure the inteface, and it should invoked by GC framework only.
     */
    OCFPWM.prototype.ensureConfigured = function(config_seq) {
        var promises = [];
        var seq_len = config_seq ? config_seq.length : 0;
        for (var i=0; i<seq_len; i++) {
            var config = config_seq[i];
            switch (config.command) {
                case 'enable':
                    promises.push(this.PWM_Enable(config.unit || this.unit, config.enable));
                    break;
                case 'config':
                    promises.push(this.PWM_Config(config.unit || this.unit, config.period_unit, config.period_value, config.duty_unit, config.duty_value, config.idle_level));
                    break;
            }
        }
        return Q.all(promises)
    };
    
    // Reference ocf_common.h
    //#define PWM_Interface       0x0B
    //typedef enum
    //{
    //    ocCmd_PWM_Enable = 0x00,
    //    ocCmd_PWM_Config,
    //    ocCmd_PWM_Start,
    //    ocCmd_PWM_Stop
    //} PWM_CMD;
    var PWM_Interface = 0x0B;
    var ocCmd_PWM_Enable = 0x00;
    var ocCmd_PWM_Config = 0x01;
    var ocCmd_PWM_Start = 0x02;
    var ocCmd_PWM_Stop = 0x03;

    /** Get interface type */
    OCFPWM.prototype.get_interface_type = function() { return PWM_Interface; }

    /**
     * Enable or Disable the inteface
     * @param {Number} unit interface unit
     * @param {Boolean} enable enable if true, disable if false
     * @return {Promise}
     */
    OCFPWM.prototype.PWM_Enable = function(unit, enable) {
        //uint32_t unit, bool enable
        var params = [this.uint32_leb4(unit), this.uint32_leb4(enable ? 1 : 0)];
        return this.h2c_command(PWM_Interface, unit, ocCmd_PWM_Enable, params);
    };

    /** Internal function */
    var reply_PWM_Enable = function(self, qdef, unit, status, replypkt) {
        if (status == 0) {
            var enable = self.leb4_uint32(replypkt.params[1]) == 1;
            self.unit_state[unit].current = enable ? 1 : 0;
            qdef && qdef.resolve(enable);
        } else {
            qdef && qdef.reject(self.status_msg(status, replypkt.payload ? self.bytes_ascii(replypkt.payload) : 'Failed in Enable/Disable'))
        }
    };

    /**
     * Configure the interface
     * @param {Number} unit interface unit
     * @param {Number} period_unit
     * @param {Number} period_value
     * @param {Number} duty_unit
     * @param {Number} duty_value
     * @param {Number} idle_level
     * @return {Promise}
     */
    OCFPWM.prototype.PWM_Config = function(unit, period_unit, period_value, duty_unit, duty_value, idle_level) {
        //uint32_t unit, uint32_t period_unit, uint32_t period_value,
        // uint32_t duty_unit, uint32_t duty_value, uint32 idle_level
        var params = [this.uint32_leb4(unit), this.uint32_leb4(period_unit), this.uint32_leb4(period_value),
                      this.uint32_leb4(duty_unit), this.uint32_leb4(duty_value), this.uint32_leb4(idle_level)];
        return this.h2c_command(PWM_Interface, unit, ocCmd_PWM_Config, params);
    };

    /** Internal function */
    var reply_PWM_Config = function(self, qdef, unit, status, replypkt) {
        if (status == 0) {
            self.unit_state[unit].current = 2;
            qdef && qdef.resolve(true);
        } else {
            qdef && qdef.reject(self.status_msg(status, replypkt.payload ? self.bytes_ascii(replypkt.payload) : 'Failed in Config'));
        }
    };

    /**
     * Start PWM
     * @param {Number} unit interface unit
     * @return {Promise}
     */
    OCFPWM.prototype.PWM_Start = function(unit) {
        //uint8_t unit
        var params = [this.uint32_leb4(unit)];
        return this.h2c_command(PWM_Interface, unit, ocCmd_PWM_Start, params);
    };

    /** Internal function */
    var reply_PWM_Start = function(self, qdef, unit, status, replypkt) {
        if (!qdef) return;
        if (status == 0) {
            qdef.resolve();
        } else {
            qdef.reject(self.status_msg(status, replypkt.payload ? self.bytes_ascii(replypkt.payload) : 'Failed in Start'));
        }
    };

    /**
     * Stop PWM
     * @param {Number} unit interface unit
     * @return {Promise}
     */
    OCFPWM.prototype.PWM_Stop = function(unit) {
        //uint8_t unit
        var params = [this.uint32_leb4(unit)];
        return this.h2c_command(PWM_Interface, unit, ocCmd_PWM_Stop, params);
    };

    /** Internal function */
    var reply_PWM_Stop = function(self, qdef, unit, status, replypkt) {
        if (!qdef) return;
        if (status == 0) {
            qdef.resolve();
        } else {
            qdef.reject(self.status_msg(status, replypkt.payload ? self.bytes_ascii(replypkt.payload) : 'Failed in Stop'));
        }
    };

})();

