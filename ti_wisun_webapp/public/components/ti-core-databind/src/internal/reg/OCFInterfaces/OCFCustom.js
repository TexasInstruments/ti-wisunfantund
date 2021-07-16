(function() {
    function OCFCustom(packetParser, sendPacket) {
        OCFBaseEx.apply(this, arguments);
        this.handlers = [
            reply_Custom_Enable,
            reply_Custom_Config,
            reply_Custom_Write,
            reply_Custom_Read
        ];
    };
    OCFCustom.prototype = Object.create(OCFBaseEx.prototype);
    OCFCustom.prototype.constructor = OCFCustom;
    window.OCFCustom = OCFCustom;

    OCFCustom.prototype.initSymbolsForDevice = function(settings, registerModel) {
        OCFBaseEx.prototype.initSymbolsForDevice.apply(this, arguments);
    };

    OCFCustom.prototype.init = function(info) {
        this.interface_type = this.parse_int(info.interface_type);
        return OCFBaseEx.prototype.init.apply(this, arguments);
    };

    OCFCustom.prototype.get_packet_handler = function(packet_type, command) {
        // Get the pre-stored handlers for commands that are known.
        var hdl = OCFBaseEx.prototype.get_packet_handler.apply(this, arguments);
        // To support generic command values, return the generic handler.
        if (hdl === undefined) {
            return reply_Custom_Command;
        }
    };

    // Cannot wrap this pair of read/write because the protocol of constructing params and/or payload from info and data is an unknown to us.
    //OCFCustom.prototype.read = function(info) {
    //    return this.Custom_Read(this.unit, info.params, info.payload);
    //};

    //OCFCustom.prototype.write = function(info, data) {
    //    return this.Custom_Write(this.unit, info.params, info.payload);
    //};

    OCFCustom.prototype.ensureConfigured = function(config_seq) {
        var promises = [];
        var seq_len = config_seq ? config_seq.length : 0;
        for (var i=0; i<seq_len; i++) {
            var config = config_seq[i];
            switch (config.command) {
                case 'enable': 
                    promises.push(this.Custom_Enable(this.unit, config.params, config.payload));
                    break;
                case 'config':
                    promises.push(this.Custom_Config(this.unit, config.params, config.payload));
                    break;
                case 'write':
                    promises.push(this.Custom_Write(this.unit, config.params, config.payload));
                    break;
                default:
                    promises.push(this.Custom_Command(this.unit, config.command, config.params, config.payload));
                    break;
            }
        }
        return Q.all(promises);
    };

    // Reference ocf_common.h
    //#define Custom_Interface       0x1A and any other values
    //typedef enum
    //{
    //    ocCmd_Custom_Enable = 0x00,
    //    ocCmd_Custom_Config,
    //    ocCmd_Custom_Write,
    //    ocCmd_Custom_Read,
    //} Custom_CMD;
    //var Custom_Interface = undefined; // client define this by setting the value of interface_type in system.json
    var ocCmd_Custom_Enable = 0x00;
    var ocCmd_Custom_Config = 0x01;
    var ocCmd_Custom_Write = 0x02;
    var ocCmd_Custom_Read = 0x03;

    OCFCustom.prototype.get_interface_type = function() { return this.interface_type; }

    OCFCustom.prototype.Custom_Enable = function(unit, params, payload) {
        return this.h2c_command(this.interface_type, unit, ocCmd_Custom_Enable, params, payload);
    };
    var reply_Custom_Enable = function(self, qdef, unit, status, replypkt) {
        if (status == 0) {
            var enable = self.leb4_uint32(replypkt.params[1]) == 1;
            self.unit_state[unit].current = enable ? 1 : 0;
            qdef && qdef.resolve(enable);
        } else {
            qdef && qdef.reject(self.status_msg(status, replypkt.payload ? self.bytes_ascii(replypkt.payload) : 'Failed in Enable/Disable'));
        }
    };
    OCFCustom.prototype.Custom_Config = function(unit, params, payload) {
        return this.h2c_command(this.interface_type, unit, ocCmd_Custom_Config, params, payload);
    };
    var reply_Custom_Config = function(self, qdef, unit, status, replypkt) {
        if (status == 0) {
            self.unit_state[unit].current = 2;
            qdef && qdef.resolve(true);
        } else {
            qdef && qdef.reject(self.status_msg(status, replypkt.payload ? self.bytes_ascii(replypkt.payload) : 'Failed in Config'));
        }
    };
    OCFCustom.prototype.Custom_Write = function(unit, params, payload) {
        return this.h2c_command(this.interface_type, unit, ocCmd_Custom_Write, params, payload);
    };
    var reply_Custom_Write = function(self, qdef, unit, status, replypkt) {
        if (!qdef) return;
        if (status == 0) {
            qdef.resolve(true);
        } else {
            qdef.reject(self.status_msg(status, replypkt.payload ? self.bytes_ascii(replypkt.payload) : 'Failed in Write'));
        }
    };
    OCFCustom.prototype.Custom_Read = function(unit, params, payload) {
        return this.h2c_command(this.interface_type, unit, ocCmd_Custom_Read, params, payload);
    };
    var reply_Custom_Read = function(self, qdef, unit, status, replypkt) {
        if (!qdef) return;
        if (status == 0) {
            qdef.resolve(replypkt.payload);
        } else {
            qdef.reject(self.status_msg(status, replypkt.payload ? self.bytes_ascii(replypkt.payload) : 'Failed in Read'));
        }
    };
    OCFCustom.prototype.Custom_Command = function(unit, command, params, payload) {
        return this.h2c_command(this.interface_type, unit, command, params, payload);
    };
    var reply_Custom_Command = function(self, qdef, unit, status, replypkt) {
        if (!qdef) return;
        if (status == 0) {
            qdef.resolve(replypkt.payload);
        } else {
            qdef.reject(self.status_msg(status, replypkt.payload ? self.bytes_ascii(replypkt.payload) : 'Failed in Custom Command'));
        }
    };
})();

