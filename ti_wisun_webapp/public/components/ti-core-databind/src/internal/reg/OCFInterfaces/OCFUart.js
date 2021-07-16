(function() {
    function OCFUart(packetParser, sendPacket) {
        OCFBaseEx.apply(this, arguments);
        this.handlers = [
            reply_Uart_Enable,
            reply_Uart_Config,
            reply_Uart_Write,
            reply_Uart_Read,
            reply_Uart_DisableReceiver
        ];
    };
    OCFUart.prototype = Object.create(OCFBaseEx.prototype);
    OCFUart.prototype.constructor = OCFUart;
    OCFBaseEx.prototype.add_interface('uart', OCFUart);

    /** See its base method for description */
    OCFUart.prototype.read = function(regInfo) {
        if (this._custom_cb && this._custom_cb.read) {
            return this._custom_cb.read(regInfo);
        }
        var num_bytes = parseInt(regInfo.num_bytes);
        return this.Uart_Read(this.unit, num_bytes);
    };

    /** See its base method for description */
    OCFUart.prototype.write = function(regInfo, data) {
        if (this._custom_cb && this._custom_cb.write) {
            return this._custom_cb.write(regInfo, data);
        }
        return this.Uart_Write(this.unit, data);
    };

    /**
     * Configure the inteface, and it should invoked by GC framework only.
     */
    OCFUart.prototype.ensureConfigured = function(config_seq) {
        var promises = [];
        var seq_len = config_seq ? config_seq.length : 0;
        for (var i=0; i<seq_len; i++) {
            var config = config_seq[i];
            switch (config.command) {
                case 'enable':
                    promises.push(this.Uart_Enable(config.unit || this.unit, config.enable));
                    break;
                case 'config':
                    promises.push(this.Uart_Config(this.unit, config.baud_rate, config.parity, config.datawidth, config.stop));
                    break;
            }
        }
        return Q.all(promises);
    };
    
    // Reference ocf_common.h
    //#define Uart_Interface       0x06
    //typedef enum
    //{
    //    ocCmd_Uart_Enable = 0x00,
    //    ocCmd_Uart_Config,
    //    ocCmd_Uart_Write,
    //    ocCmd_Uart_Read,
    //    ocCmd_Uart_DisableReceiver,
    //} Uart_CMD;
    var Uart_Interface = 0x06;
    var ocCmd_Uart_Enable = 0x00;
    var ocCmd_Uart_Config = 0x01;
    var ocCmd_Uart_Write = 0x02;
    var ocCmd_Uart_Read = 0x03;
    var ocCmd_Uart_DisableReceiver = 0x04;

    /** Get interface type */
    OCFUart.prototype.get_interface_type = function() { return Uart_Interface; }
    
    /**
     * Enable or Disable the inteface
     * @param {Number} unit interface unit
     * @param {Boolean} enable enable if true, disable if false
     * @return {Promise}
     */
    OCFUart.prototype.Uart_Enable = function(unit, enable) {
        //uint32_t unit, bool enable
        var params = [this.uint32_leb4(unit), this.uint32_leb4(enable ? 1 : 0)];
        return this.h2c_command(Uart_Interface, unit, ocCmd_Uart_Enable, params);
    };

    /** Internal function */
    var reply_Uart_Enable = function(self, qdef, unit, status, replypkt) {
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
     * @param {Number} baud_rate baud rate
     * @param {Number} parity
     * @param {Number} datawidth number of data bits
     * @param {Number} stop stop bits
     * @return {Promise}
     */
    OCFUart.prototype.Uart_Config = function(unit, baud_rate, parity, datawidth, stop) {
        //uint32_t unit, uint32_t baud_rate, uint32_t parity, uint32_t datawidth, uint32_t stop
        // baud_rate: max baud rate 15000000
        // parity: see UART_interface.c, uart.h
        //  UART_PAR_NONE = 0 // no parity
        //  UART_PAR_EVEN = 1 // parity bit is even
        //  UART_PAR_ODD = 2  // parity bit is odd
        //  UART_PAR_ZERO = 3 // parity bit is always zero
        //  UART_PAR_ONE = 4  // parity bit is always one
        // datawidth: number of data bits
        //  UART_LEN_5 = 0, // 5 bit data
        //  UART_LEN_6 = 1, // 6 bit data
        //  UART_LEN_7 = 2, // 7 bit data
        //  UART_LEN_8 = 3, // 8 bit data
        // stop: stop bits
        //  UART_STOP_ONE = 0 // one stop bit
        //  UART_STOP_TWO = 1 // two stop bits
        var params = [this.uint32_leb4(unit), this.uint32_leb4(baud_rate), this.uint32_leb4(parity),
                      this.uint32_leb4(datawidth), this.uint32_leb4(stop)];
        return this.h2c_command(Uart_Interface, unit, ocCmd_Uart_Config, params);
    };

    /** Internal function */
    var reply_Uart_Config = function(self, qdef, unit, status, replypkt) {
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
     * @param {Array} pDataBuffer, data to write as a payload
     * @return {Promise}
     */
    OCFUart.prototype.Uart_Write = function(unit, pWriteBuffer) {
        //uint8_t unit, uint16_t num_bytes
        //pWriteBuffer is uint8_t*, contains data to write
        //num_bytes (ref c code) is uint16_t when extracting from params, and is uint32_t when calling internal function ocfUART_Write
        //Here, we deduce num_bytes from pDataBuffer.length instead of an explicit argument
        var num_bytes = pWriteBuffer && pWriteBuffer.length || 0;
        var params = [this.uint32_leb4(unit), this.uint32_leb4(num_bytes)];
        return this.h2c_command(Uart_Interface, unit, ocCmd_Uart_Write, params, pWriteBuffer);
    };

    /** Internal function */
    var reply_Uart_Write = function(self, qdef, unit, status, replypkt) {
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
     * @param {Number} numBytes number of bytes to read
     * @return {Promise}
     */
    OCFUart.prototype.Uart_Read = function(unit, num_bytes) {
        //uint8_t unit, uint16_t num_bytes
        //num_bytes (ref c code) is uint16_t when extracting from params, and is uint32_t when calling internal function ocfUART_Read
        var params = [this.uint32_leb4(unit), this.uint32_leb4(num_bytes)];
        return this.h2c_command(Uart_Interface, unit, ocCmd_Uart_Read, params);
    };

    /** Internal function */
    var reply_Uart_Read = function(self, qdef, unit, status, replypkt) {
        if (!qdef) return;
        if (status == 0) {
            qdef.resolve(replypkt.payload);
        } else {
            qdef.reject(self.status_msg(status, replypkt.payload ? self.bytes_ascii(replypkt.payload) : 'Failed in Read'));
        }
    };

    /**
     * Disable receiver
     * @param {Number} unit interface unit
     * @return {Promise}
     */
    OCFUart.prototype.Uart_DisableReceiver = function(unit) {
        //uint8_t unit
        // once the rx is disbaled, need to use Uart_Config to re-enable rx
        var params = [this.uint32_leb4(unit)];
        return this.h2c_command(Uart_Interface, unit, ocCmd_Uart_DisableReceiver, params);
    };

    /** Internal function */
    var reply_Uart_DisableReceiver = function(self, qdef, unit, status, replypkt) {
        if (!qdef) return;
        if (status == 0) {
             qdef.resolve(replypkt.payload ? replypkt.payload : true);
        } else {
            qdef.reject(self.status_msg(status, replypkt.payload ? self.bytes_ascii(replypkt.payload) : 'Failed in DisableReceiver'));
        }
    };

})();

