/*
OCF_PACKET Structure: {
    uint16_t     signature;     // Packet signature (must be PACKET_SIGNATURE value)
    uint16_t     type;          // Type of packet
    uint32_t     status;        // Status code returned by command function
    uint32_t     transfer_len;  // Total number of bytes in the transfer
    uint16_t     packet_num;    // Sequential packet number
    uint16_t     payload_len;   // Number of bytes in the payload
    uint16_t     if_type_unit;  // Interface type and unit
    uint16_t     command;       // Command code
    uint32_t     param[8];      // eight 32-bit parameters
    byte[0-2048] payload;       // payload 0 to 2048 bytes
}
*/

(function() {
    const IS_CONNECTED_REQUEST_TIMEOUT = 2000;  /* time out value to wait for controller to isConnected request */
    const NO_RESPONSE_MESSAGE          = 'Controller is not responding.';

    /*********************************************************************************************************************
     * 
     * AEVMCodec
     * 
     * API
     *      getInterfaces - Returns the interface instances.
     * 
     * User Perference Bindings
     *      aevm.$sendPacketInterval - Controls the interval between each packet that is send to the controller.
     * 
     *********************************************************************************************************************/
    var AEVMCodec = function()  {
        this._packetParser    = new RegisterPacketParser();
        this._ocfIF           = {};
        this._SEQSendQ        = [];
        this._SEQSendQIntHldr = null;
    }
    AEVMCodec.prototype = new gc.databind.IPacketCodec();
    AEVMCodec.prototype._sendPacketInterval = 100; // default send packet interval
    AEVMCodec.prototype._connectReqTimeout  = 500; // default connect request timeout

    function _toHexString(byteArray) {
        return Array.from(byteArray, function(byte) {
            return ('0' + (byte & 0xFF).toString(16).toUpperCase()).slice(-2);
        }).join(' ')
    }

    AEVMCodec.prototype._processSEQ = function() {
        if (this._SEQSendQIntHldr == null) {
            this._SEQSendQIntHldr = setTimeout(function() {
                this._SEQSendQIntHldr = null;

                var _rawData = this._SEQSendQ.shift();   
                if (_rawData) { 
                    this.encoder(_rawData);
                    this._processSEQ();
                } 
                
            }.bind(this), AEVMCodec.prototype._sendPacketInterval);
        }
    };

    AEVMCodec.prototype._sendPacket = function(packet) {
        var rawData = this._packetParser.encode(packet);
        this._SEQSendQ.push(rawData);
        this._processSEQ();
    };

    AEVMCodec.prototype._consoleRawPacketMessageCallback = function(label, data) {
        return label + _toHexString(data);
    };

    AEVMCodec.prototype.initSymbolsForDevice = function(config, registerModel) {
        gc.console.log('AEVMCodec', 'initSymbolsForDevice');

        // save registerModel in config for use later.
        config._registerModel = registerModel;
        /* initialize aevm preference bindings */
        registerModel.addUserPreference('$sendPacketInterval', AEVMCodec.prototype._sendPacketInterval);
        registerModel.getBinding('$sendPacketInterval').addChangedListener({onValueChanged: function(oldValue, newValue) {
            AEVMCodec.prototype._sendPacketInterval = Number(newValue);
        }});
        registerModel.addUserPreference('$connectReqTimeout', AEVMCodec.prototype._connectReqTimeout);
        registerModel.getBinding('$connectReqTimeout').addChangedListener({onValueChanged: function(oldValue, newValue) {
            AEVMCodec.prototype._connectReqTimeout = Number(newValue);
        }});

        /* intialize interface symbols */
        var interfaces = config.interfaceList;
        if (interfaces) {
            for (var i = 0; i < interfaces.length; ++i) {
                var interface = interfaces[i];
                try {
                    switch (interface.name) {
                        case 'system':
                            OCFSystem.prototype.initSymbolsForDevice(interface, registerModel);
                            break;
                        default:
                            var impl = OCFBaseEx.prototype.get_interface(interface.name);
                            impl.prototype.initSymbolsForDevice(interface, registerModel);
                            break;
                    }
                } catch (e) {
                    gc.console.error('AEVMCodec', e.toString());
                }
            }
        }
    };

    /** 
     * Returns the interface instances. Application can use the interface instance directly to interact with
     * the firmware by invoking the provided public API.
     */
    AEVMCodec.prototype.getInterfaces = function() {
        return this._ocfIF;
    },

    AEVMCodec.prototype.checkFirmware = function(info, behaviorControl) {
        var promises = [];
        for (x in firmwareChecks) {
            promises.push(firmwareChecks[x](info, behaviorControl));
        }
        return Q.all(promises);
    };

    AEVMCodec.prototype.connect = function(settings, behaviorControl) {
        gc.console.log('AEVMCodec', 'connect');
        var self = this;
        settings = settings instanceof Array ? settings : [ settings ];

        var connectDefer = Q.defer();
        self._rxDataReceived = false;
        self._checkingFirmware = false;
        self._connTimeoutIntervalHdlr = setInterval(function() {
            if (self._rxDataReceived) {
                self._rxDataReceived = false;
            } else if (self._checkingFirmware === false) {
                if (self._connTimeoutIntervalHdlr) {
                    clearInterval(self._connTimeoutIntervalHdlr);
                    delete self._connTimeoutIntervalHdlr;
                    gc.console.log('AEVMCodec', 'Connection timeout.');
                    connectDefer.reject(NO_RESPONSE_MESSAGE);
                }
            }
        }, AEVMCodec.prototype._connectReqTimeout);

        /* intialize the system interface first */
        self._ocfIF.system = new OCFSystem(self._packetParser, self._sendPacket.bind(self));
        self._ocfIF.system.init().then(function() {
            self._checkingFirmware = true; // suppress the _connTimeoutIntervalHdlr's timeout logic for a moment
            return self.checkFirmware({detectedFirmwareVersion: self._ocfIF.system.getSystemInfo().version, modelID: settings.length && settings[0]._registerModel._id, codec: self, controller: 'aevm'}, behaviorControl)
        }).then(function() {
            self._checkingFirmware = false; // resume the _connTimeoutIntervalHdlr's timeout logic
            var ifPromises = [];

            /* now initalize the dependent interfaces */
            for (var i = 0; settings != null && i < settings.length; ++i) {
                var setting    = settings[i];
                var interfaces = setting.interfaceList || [];

                for (var j = 0; j < interfaces.length; ++j) {
                    var interface = interfaces[j];
                    switch (interface.name) {
                        default:
                            var impl = OCFBaseEx.prototype.get_interface(interface.name);
                            var obj = new impl(self._packetParser, self._sendPacket.bind(self));
                            var interfaceType = interface.interface_type === undefined && obj.get_interface_type() || parseInt(interface.interface_type);
                            self._comm = setting._comm = self._ocfIF[interfaceType] = self._ocfIF[interface.name] = obj;
                            ifPromises.push(self._ocfIF[interfaceType].init(interface));
                            break;
                    }
                }
            }
            return Q.all(ifPromises);
        
        }).then(function() {
            connectDefer.resolve();
            gc.console.log('AEVMCodec', 'System connected');

        }).fail(function(error) {
            gc.console.error('AEVMCodec', error);

        }).finally(function() {
            if (self._connTimeoutIntervalHdlr) {
                clearInterval(self._connTimeoutIntervalHdlr);
                delete self._connTimeoutIntervalHdlr
            }
        });

        return connectDefer.promise;
    };

    AEVMCodec.prototype.disconnect = function(callback) {
        gc.console.log('AEVMCodec', 'disconnect');
        this.reset();
    };

    AEVMCodec.prototype.readValue = function(registerInfo) {
        var _comm = registerInfo.comm || (registerInfo.parentGroup && registerInfo.parentGroup.parentDevice.parentConfiguration._comm) || this._comm;

        if (_comm != null) {
            return _comm.read(registerInfo);
        } else {
            return Q.reject('Cannot read value, undefined ' + device.interface + ' OCF interface.');
        }
    };

    AEVMCodec.prototype.writeValue = function(registerInfo, value) {
        var _comm = registerInfo.comm || (registerInfo.parentGroup && registerInfo.parentGroup.parentDevice.parentConfiguration._comm) || this._comm;

        if (_comm != null) {
            return _comm.write(registerInfo, value);
        } else {
            return Q.reject('Cannot write value, undefined ' + device.interface + ' OCF interface.');
        }
    };

    AEVMCodec.prototype.encode = function(target, rawData) {
        gc.console.log('AEVMCodec', this._consoleRawPacketMessageCallback, 'AEVMCodec.encode: ', rawData);

        target(rawData);
    };

    AEVMCodec.prototype.decode = function(target, rawData) {
        gc.console.log('AEVMCodec', this._consoleRawPacketMessageCallback, 'AEVMCodec.decode: ', rawData);
        this._rxDataReceived = true;

        var handled = false;
        var parser = this._packetParser;
        var packet = parser.decode(rawData);
        var interfaceType = parser.getPacketInterface(packet);
        try {
            switch (interfaceType) {
                case 0x00: // system
                    if (typeof this._ocfIF.system != 'undefined') { return this._ocfIF.system.handlePacket(packet); }

                default:
                    if (typeof this._ocfIF[interfaceType] != 'undefined') { return this._ocfIF[interfaceType].handlePacket(packet); }
            }

        } catch (err) {
            gc.console.error('AEVMCodec', err);
            return false;
        }

        // pass along to the next target
        return target(rawData);
    };

    AEVMCodec.prototype.reset = function() {
        this._SEQSendQ = [];

        for (var property in this._ocfIF) {
            if (this._ocfIF.hasOwnProperty(property)) {
                this._ocfIF[property].reset();
            }
        }
    };

    AEVMCodec.prototype.isStillConnected = function() {
        gc.console.log('AEVMCodec', 'isConnected');
        return this._ocfIF.system.getInfo().timeout(IS_CONNECTED_REQUEST_TIMEOUT, NO_RESPONSE_MESSAGE);
    }

    /*********************************************************************************************************************
     * 
     * AEVMCodec_FrameDecoder
     * 
     *********************************************************************************************************************/    
    var AEVMCodec_FrameDecoder = function() {
        this._packetParser = new RegisterPacketParser(); 
    };
    AEVMCodec_FrameDecoder.prototype = new gc.databind.AbstractFrameDecoder(null, AEVMCodec_FrameDecoder.getPacketLength);

    AEVMCodec_FrameDecoder.prototype.getPacketLength = function(buffer, offset) {
        gc.console.log('AEVMCodec', function() { return 'AEVMCodec_FrameDecoder.getPacketLength:' + _toHexString(buffer) });
        return this._packetParser.getFramePacketLength(buffer, offset);
    };
    
    // register AEVMCodec packet codec with optional frame decoder (for use with USB transport, that is not HID).
    gc.databind.registerCustomCodec('aevm', AEVMCodec, null, AEVMCodec_FrameDecoder);

    // expose frame decoder for custom codec reuse
    AEVMCodec.prototype.FrameDecoder = AEVMCodec_FrameDecoder;

    AEVMCodec.prototype.add_interface = function(name, impl) {
        OCFBaseEx.prototype.add_interface(name,impl);
    };
    AEVMCodec.prototype.register_crc_user = function(impl, interface_name, device) {
        // impl (required) - implementation that provides customized crc logic
        // interface_name (required) - specific interfaces that needs the given crc implementation, e.g. 'i2c'
        // devices (optional) - specific devices that needs the given crc implementation, undefined means all devices
        OCFBaseEx.prototype.register_crc_user(impl, interface_name, device);
    };
    gc.databind.AEVMCodec = AEVMCodec;
    gc.databind.AEVMCodec.OCFBaseEx = OCFBaseEx;

    var firmwareChecks = {};
    AEVMCodec.registerFirmwareCheck = function(impl, name) {
        firmwareChecks[name] = impl; // impl: function(info) -> Q.Promise
    };
}());
