var gc = gc || {};
gc.databind = gc.databind || {};

(function()
{
    var FIFOCommandResponseQueue = function(name)
    {
        this.name = name;
        this.first = this.last = {};
    };

    FIFOCommandResponseQueue.prototype.addCommand = function(command, sequenceNumber)
    {
        var deferred = Q.defer();
        
        this.last.next =
        {
            seqNo : sequenceNumber,
            command: command,
            deferred: deferred
        };
        this.last = this.last.next;
        
        return deferred.promise;
    };
    
    FIFOCommandResponseQueue.prototype.addResponse = function(response, command, sequenceNumber, isError)
    {
        var step = -1;
        var cur = this.first;
        while (cur !== this.last && step < 0)
        {
            var prev = cur;
            cur = cur.next;
            step = sequenceNumber === undefined ? 0 : cur.seqNo - sequenceNumber;
            if (step < -100) 
            {
                step += 255;
            }
            else if (step > 100)
            {
                step -= 255;
            }
                
            if (step < -2)
            {
                cur.deferred.reject(this.name + ' error: missing response for command sequence #' + cur.seqNo);
                this.first = cur;
            }
            else if (step === 0)
            {
                if (cur.command !== command)
                {
                    cur.deferred.reject(this.name + ' error: Command Mismatch.  Expected ' + cur.command + ', but received ' + command);
                }
                else if (isError)
                {
                    cur.deferred.reject(response);
                }
                else 
                {
                    cur.deferred.resolve(response);
                }
                prev.next = cur.next;  // remove item from list
                if (this.last === cur)
                {
                    this.last = prev;  // move end pointer when removing the last element.
                }
            }
        }
    };
    
    FIFOCommandResponseQueue.prototype.clearAll = function()
    {
        while (this.first !== this.last)
        {
            this.first = this.first.next;
            
            this.first.deferred.reject('Skipping response from ' + this.name + ' due to reset operation');
        }
        this.first = this.last = {};
    };
    
    FIFOCommandResponseQueue.prototype.isEmpty = function()
    {
        return this.first === this.last;
    };
    
    /** 
     * Abstract class for command/response, message based, packet codecs.  This class manages messages
     * sent and received from a controller/firmware.  This class provides helper methods for adding 
     * commands to a queue waiting for responses from the controller/firmware and associating responses with
     * the appropriate command.  Messages can optionally have command id's as well as sequence numbers to aid in
     * matching up responses to commands.  If not provided, all commands are expected to have responses, and then must
     * be processed in order.  If sequence numbers are provided, commands will be matched up by sequence number, but 
     * they still must be processed in order.  Out of order responses, with sequence numbers, are not supported. 
     *    
     * @constructor
     * @implements gc.databind.IPollingPacketCodec
     */
    gc.databind.AbstractMessageBasedCodec = function(name)
    {
        this.name = name;
        this.commandQueue = new FIFOCommandResponseQueue(name);
        this.disconnect();
    };

    gc.databind.AbstractMessageBasedCodec.prototype = new gc.databind.IPollingPacketCodec();

    /**
     * Default implementation of the connect method that does nothing.  If initialization is  
     * required, derived implementations should implement their own version of this method and 
     * return a promise to indicate when the connection is completed. 
     */
    gc.databind.AbstractMessageBasedCodec.prototype.connect = function()
    {
        this._isCodecConnected = true;
        return Q();
    };

    /**
     * Implementation of the disconnect method.  This method clears the commad/response queue on disconnect.
     * If you override this method, be sure to call this base method in addition to other cleanup activities.  
     */
    gc.databind.AbstractMessageBasedCodec.prototype.disconnect = function()
    {
        this._isCodecConnected = false;
        this.commandQueue.clearAll();
        this._pendingTransmissions = undefined;
    };
    
    var logPacket = function(name, message,  buffer, len)
    {
        gc.console.debug(name, function() 
        {
            len = len || buffer.length;
            for(var i = 0; i < len; i++)
            {
                message = message + buffer[i].toString(16) + ', ';
            }
            return message;
        });
    };

    /**
     * Implementation of the IPacketCodec.encode() method.  This implementation logs the encoded packet using 
     * gc.console.debug() method for debug purposes before forwarding the packet to the next 
     * encoder in the packet encoding chain.  The derived implementation should call this 
     * method to send packets to the target.
     * 
     * @param {function} target - the target encoder to call with the encoded packet for transmission.
     * @param {object} value - the packet for transmission.
     */
    gc.databind.AbstractMessageBasedCodec.prototype.encode = function(target, value)
    {
        if (this._pendingTransmissions)
        {
            this._pendingTransmissions.push(value);
        }
        else if (this.shouldPauseTransmission(value))
        {
            gc.console.log(this.name, "pausing transmissions"); 
            this._pendingTransmissions = [ value ];
        }
        else
        {
            logPacket(this.name, 'send    ', value);
            target(value);
        }
    };
    
    /**
     * Implementation of the IPacketCodec.decode() method.  This implementation logs the incoming packet 
     * to gc.console.debug().  The derived implementation should override this method to implement the 
     * necessary decoding of incomping packet, and it should call this base method first to perform the 
     * logging function, before decoding the incoming and passing it along to the target decoder/model.
     * 
     * @param {function} target - the target decoder to call with the decoded packet received.
     * @param {object} value - the packet received for decoding.
     */
    gc.databind.AbstractMessageBasedCodec.prototype.decode = function(target, value)
    {
        logPacket(this.name, 'receive ', value);
        
        if (this._pendingTransmissions)
        {
            var pending = this._pendingTransmissions;
            this._pendingTransmissions = undefined;
            
            while(!this.shouldPauseTransmission(pending[0]))
            {
                this.encoder(pending.shift());
                if (pending.length <= 0)
                {
                    gc.console.log(this.name, "resuming transmissions"); 
                    pending = undefined;
                    break;
                }
            }
            
            this._pendingTransmissions = pending;
        }
    };

    /**
     * Helper method to add a command to the command/response queue.  This method returns a promise that can be used
     * to process the response received by this method.  Only messages that require response handling need be 
     * added to the command/response queue.  Messages that are sent that do not require handling may be omitted. 
     * 
     * @param [Number|String] command - the specific command sent that requires a response.
     * @param [Number] sequence - the sequence number of the packet that requires a response.
     */
    gc.databind.AbstractMessageBasedCodec.prototype.addCommand = function(command, sequenceNumber)
    {
        if (this._isCodecConnected === false)
        {
            return Q.reject("Connection to target is lost.");
        }
        return this.commandQueue.addCommand(command, sequenceNumber);
    };
    
    /**
     * Helper method to process responses in command/response queue.  This method will find the appropriate 
     * command in the command/response queue and reject any pending commands that did not receive a response, based
     * on the optional sequence numbers provided. 
     * 
     * @param {Array|String} response - the raw response message received.
     * @param [Number|String] command - the specific command that this response is for.
     * @param [Number] sequence - the sequence number of the packet received, if there is one.
     */
    gc.databind.AbstractMessageBasedCodec.prototype.addResponse = function(response, toCommand, sequenceNumber)
    {
        if (this._isCodecConnected === false)
        {
            return Q.reject("Connection to target is lost.");
        }
        return this.commandQueue.addResponse(response, toCommand, sequenceNumber);
    };
    
    /**
     * Helper method to process error responses in command/response queue.  This method will find the appropriate 
     * command in the command/response queue and reject it.  Any pending commands that did not receive a response, 
	 * based on the optional sequence numbers provided, will also be rejected. 
     * 
     * @param {String} response - the error message for the command.
     * @param [Number|String] command - the specific command that this error is for.
     * @param [Number] sequence - the sequence number of the packet received, if there is one.
     */
    gc.databind.AbstractMessageBasedCodec.prototype.addErrorResponse = function(response, toCommand, sequenceNumber)
    {
        return this.commandQueue.addResponse(response, toCommand, sequenceNumber, true);
    };
    
    /**
     * Method to determine if the target is still connected.  The ti-transport-usb calls this api to
     * determine if there has been a loss of connection when it has not received any data in a while.  This method returns
     * a promise that either resolves if there are no commands in the queue expecting a response; otherwise, if returns fails, indicating that
     * there are commands that have not been responded to.  Derived classes should call the base class, and if it succeeds, they should
     * attempt to ping the target to ensure that the connection is indeed valid.  Just because there are no outstanding messages
     * does not imply the connection is good.  
     * 
     * @returns promise that resolves if still connected, or fails if the connection is lost with an error message.
     */
    gc.databind.AbstractMessageBasedCodec.prototype.isStillConnected = function()
    {
        if (!this.commandQueue.isEmpty())
        {
            return Q.reject('No response from ' + this.name + ' controller');
        }
        return Q(true);
    };
    
    /**
     * Abstract method to determine if the transmission of packets should be paused or not.  
     * This method is optional, and if implemented can return true to temporarily pause transmission of packets.
     * Each packet sent by the base classes encode() method will be test to see if transmission should be paused.
     * Once paused, the decode() method will test if the pending packet(s) should remain paused, or if transmission
     * can resume.  In other words, each packet sent will be tested repeatedly until this method returns false, at which point the 
     * packet is transmitted to the target.
     *
     * @params packet the packet to test if it should be paused/delayed before sending to the target.  
     * @returns {boolean} 
     */
    gc.databind.AbstractMessageBasedCodec.prototype.shouldPauseTransmission = function(packet)
    {
        return false;
    };
    
    /**
     * Helper method to perform a multiRegisterRead operation by using single readValue() calls.  This method is 
     * convenient to use if a particular codec finds itself in a position where it can't perform a particular multiple read
     * register operation. 
     *
     * @param startRegInfo register information about the starting register for the multiple register read
     * @param count the number of registers to read.
     * @param registerModel the register model for the device
     * @param [coreIndex] (for device arrays only) - the 0-based core index for the selected core. -1 for all cores.
     * @returns {promise} a promise that will resolve with an array of register values read from the target. 
     */
    gc.databind.AbstractMessageBasedCodec.prototype.doMultiRegisterRead = function(startRegInfo, count, registerModel, coreIndex)
    {
        var promises = [];
        var info = Object.create(startRegInfo);
        for(var i = 0; i < count; i++)
        {
            promises.push(this.readValue(info, registerModel, coreIndex));
            info.addr++;
        }
        return Q.all(promises);
    };
    
    /**
     * Helper method for multi-device register model use case to read a single register across all cores and return 
     * a promise that resolves to an array of register values corresponding to each device or core.  This method
     * can be used by a derived codec to implement readValue() when coreIndex is -1 (read all cores), and it is not capable
     * of reading all the cores with a single operation.
     *
     * @param regInfo {object} register information about the register to read on all devices or cores.
     * @param numCores {number} the number of registers to read.
     * @param registerModel {object} the register model for the device
     * 
     * @returns {promise} a promise that will resolve with an array of register values read from the target. 
     */
    gc.databind.AbstractMessageBasedCodec.prototype.doReadAllRegisters = function(regInfo, registerModel, numCores)
    {
        var promises = [];
        for(var i = 0; i < numCores; i++)
        {
            promises.push(this.readValue(regInfo, registerModel, i));
        }
        return Q.all(promises);
    };

    /**
     * Helper method for multi-device register model use case to write a single register values across all cores.  This method
     * can be used be a derived codec to implement writeValue() when coreIndex is -1 (write all cores), when it is not capable
     * of writing all the cores with a single operation.
     *
     * @param regInfo {object} register information about the register to write on all devices or cores.
     * @param registerModel {object} the register model for the device
     * @param values {array} array of values to write to each devices or cores register.
     * 
     * @returns {promise} a promise that will resolve when all values are written to all cores. 
     */
    gc.databind.AbstractMessageBasedCodec.prototype.doWriteAllRegisters = function(regInfo, registerModel, values)
    {
        var promises = [];
        for(var i = 0; i < values.length; i++)
        {
            promises.push(this.writeValue(regInfo, values[i], registerModel, i));
        }
        return Q.all(promises);
    };

}());