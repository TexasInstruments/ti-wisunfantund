(function() {
    function OCFDataStream(packetParser, sendPacket) {
        OCFBaseEx.apply(this, arguments);
        this.handlers = [
            reply_DataStream_Stop
        ];
    };
    OCFDataStream.prototype = Object.create(OCFBaseEx.prototype);
    OCFDataStream.prototype.constructor = OCFDataStream;
    OCFBaseEx.prototype.add_interface('datastream', OCFDataStream);

    OCFDataStream.prototype.ensureConfigured = function(config_seq) {
        return Promise.resolve();
    };

    // Reference ocf_common.h
    //#define DataStream_Interface       0x18
    //typedef enum
    //{
    //    ocCmd_DataStream_Stop = 0x00
    //} DataStream_CMD;
    var DataStream_Interface = 0x18;
    var ocCmd_DataStream_Stop = 0x00;

    OCFDataStream.prototype.get_interface_type = function() { return DataStream_Interface; };

    OCFDataStream.prototype.DataStream_Stop = function() {
        //no params
        var params = [];
        return this.h2c_command(DataStream_Interface, 0, ocCmd_DataStream_Stop, params);
    };
    var reply_DataStream_Stop = function(self, qdef, unit, status, replypkt) {
        if (status == 0) {
            qdef.resolve(replypkt.payload);
        } else {
            qdef.reject(self.status_msg(status, replypkt.payload ? self.bytes_ascii(replypkt.payload) : 'Failed in DataStream Stop'))
        }
    };

})();

