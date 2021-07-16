/*************************************************************************************************************
 * OCF System Interface module.
 *************************************************************************************************************/
(function() {
    /* Common contstants */
    const UNUSED_16             = [0x00, 0x00];
    const UNUSED_32             = [0x00, 0x00, 0x00, 0x00];
    const ZERO_BYTES_16         = [0x00, 0x00];
    const ONE_BYTES_16          = [0x01, 0x00];

    /* Packet Types */
    const COMMAND_PACKET        = [0x01, 0x00];
    const DATA_PACKET           = [0x02, 0x00];
    const STATUS_PACKET         = [0x03, 0x00];
    const INTERRUPT_PACKET      = [0x04, 0x00];
    const SCRIPT_DATA_PACKET    = [0x05, 0x00];
    const SCRIPT_STATUS_PACKET  = [0x06, 0x00];

    /* System commands */
    const CMD_SYS_ENABLE        = [0x00, 0x00];
    const CMD_SYS_STATUS        = [0x01, 0x00];
    const CMD_SYS_RESERVED      = [0x02, 0x00];
    const CMD_SYS_NOP           = [0x03, 0x00];
    const CMD_SYS_INVALID       = [0x04, 0x00];
    const CMD_SYS_RESTART       = [0x05, 0x00];
    const CMD_SYS_INVOKEBSL     = [0x06, 0x00];
    const CMD_SYS_DEBUG         = [0x07, 0x00];
    const CMD_SYS_ABORT         = [0x08, 0x00];
    const CMD_SYS_GETINFO       = [0x09, 0x00];
    const CMD_SYS_GETSTATUSTEXT = [0x0a, 0x00];
    const CMD_SYS_ECHO          = [0x0b, 0x00];
    const CMD_SYS_DEVCTRL       = [0x0c, 0x00];
    const CMD_SYS_ABORTSCRIPT   = [0x0d, 0x00];
    const CMD_SYS_RESETRESOURCE = [0x0e, 0x00];

    /* Interface type and unit */
    const IF_TYPE_UNIT          = [0x00, 0x00];

    /**************************************************************************************
     * 
     * CommandQueue class
     * 
     **************************************************************************************/
    function CommandQueue(packetParser) {
        this.queue = [];
        this.parser = packetParser;;
    }
    
    CommandQueue.prototype.pop = function(command) {
        var queue = this.queue;
        var parser = this.parser;

        for (var i = 0; i < queue.length; ++i) {
            if (command == null || parser.isArrayEqual(queue[i].command, command)) {
                return queue.splice(i, 1)[0].deferred;
            }
        }
        return null;
    };

    CommandQueue.prototype.push = function(command) {
        var deferred = Q.defer();
        this.queue.push({command: command, deferred: deferred});
        return deferred;
    };


    /**************************************************************************************
     * 
     * OCFSystem class
     * 
     **************************************************************************************/
    function OCFSystem(packetParser, sendPacket)  {
        OCFBase.apply(this, arguments);
        this.ocfCmdQueue = new CommandQueue(packetParser);
        this.reset();
    }
    OCFSystem.prototype = new OCFBase();

    OCFSystem.prototype._sendPacket = function(packet) {
        this.sendPacket(packet);
        return this.ocfCmdQueue.push(packet.command).promise;
    };

    OCFSystem.prototype.init = function() {
       var self = this;
       return this.getInfo().then(function(info) {
           self._info = info;
           return self.resetResource();
       });
    };

    OCFSystem.prototype.reset = function() {
        for (var deferred; (deferred = this.ocfCmdQueue.pop()) != null; ) {
            deferred.reject('OCFSystem reset.');
        }
    };

    OCFSystem.prototype.handlePacket = function(packet) {
        try {
            switch (packet.command.join()) {
                case CMD_SYS_RESETRESOURCE.join():
                    this.ocfCmdQueue.pop(packet.command).resolve();
                    return true;
                case CMD_SYS_GETINFO.join():
                    var boardSerialNum = packet.payload.slice(68, 108);
                    var boardName = packet.payload.slice(28, 68);
                    var boardRevStr =  packet.payload.slice(13, 28);
                    this.ocfCmdQueue.pop(packet.command).resolve({
                        DLLVersion: 0,                          // 8 bytes
                        FirmwareVersion: {                      // 4 bytes
                            major: packet.payload[8], 
                            minor: packet.payload[9], 
                            reversion: packet.payload[10], 
                            build: packet.payload[11]
                        },
                        boardRev: packet.payload[12],           // 1 bytes
                        boardRevStr: boardRevStr,               // 15 bytes
                        boardName: boardName,                   // 40 bytes
                        boardSerialNum: boardSerialNum,         // 40 bytes
                        checksum: packet.payload.slice(108),    // 4 bytes    

                        _boardSerialNum: String.fromCharCode.apply(null, boardSerialNum),
                        _boardRevStr: String.fromCharCode.apply(null, boardRevStr),
                        _boardName: String.fromCharCode.apply(null, boardName),
                        version: packet.payload[8]+'.'+packet.payload[9]+'.'+packet.payload[10]+'.'+packet.payload[11]
                    });
                    return true;
                case CMD_SYS_INVOKEBSL.join():
                    this.ocfCmdQueue.pop(packet.command).resolve(packet);
                    return true;
            }
        } catch (e) {
            gc.console.error('OCFSystem', e);
        }
        return false;
    };

    OCFSystem.prototype.invokeBSL = function() {
        return this._sendPacket({
            type:           COMMAND_PACKET,
            transfer_len:   UNUSED_32,
            packet_num:     ONE_BYTES_16,
            payload_len:    UNUSED_16,
            if_type_unit:   IF_TYPE_UNIT,
            command:        CMD_SYS_INVOKEBSL
        });
    };

    OCFSystem.prototype.getInfo = function() {
        return this._sendPacket({
            type:           COMMAND_PACKET, /* TYPE         */
            transfer_len:   UNUSED_32,      /* TRANSFER_LEN */ 
            packet_num:     ONE_BYTES_16,   /* PACKET_NUM   */
            payload_len:    UNUSED_16,      /* PAYLOAD_LEN  */
            if_type_unit:   IF_TYPE_UNIT,   /* IF_TYPE_UNIT */
            command:        CMD_SYS_GETINFO /* COMMAND      */
        });
    };
    
    /**
     * This is a private API that will change without notice.
     */
    OCFSystem.prototype.getSystemInfo = function() {
        return this._info;
    };
    
    OCFSystem.prototype.resetResource = function() {
        return this._sendPacket({
            type:           COMMAND_PACKET, /* TYPE         */
            transfer_len:   UNUSED_32,      /* TRANSFER_LEN */
            packet_num:     ONE_BYTES_16,   /* PACKET_NUM   */
            payload_len:    UNUSED_16,      /* PAYLOAD_LEN  */
            if_type_unit:   IF_TYPE_UNIT,   /* IF_TYPE_UNIT */
            command:        CMD_SYS_RESETRESOURCE /* COMMAND      */
        });
    };

    /* exports the OCFSystem object */
    window.OCFSystem = OCFSystem;
})();
