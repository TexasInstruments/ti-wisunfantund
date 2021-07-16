/*****************************************************************
 * Copyright (c) 2017-2019 Texas Instruments and others
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *  Paul Gingrich - Initial API and implementation
 *****************************************************************/
var gc = gc || {};
gc.databind = gc.databind || {};
gc.databind.internal = gc.databind.internal || {};
gc.databind.internal.reg = gc.databind.internal.reg || {};

(function() // closure for private static methods and data.
{
    var CALCULATED = "Calculated";
    var FIELD = "Field";
    var CORE_REGISTER = "Register";
    var PSEUDO = "Pseudo Register";
    var USER = "User Preference";
    var REGISTER_ALL = "Register All";
    var ACTIVE_REGISTER = "Active Register";
    var BAD = "Bad URI";

    var notIdentifierRegExp = /[^A-Za-z$_\.0-9]+/;

    var getBindingTypeFromUri = function(uri, segments)
    {
        var unexpectedCharacters = notIdentifierRegExp.exec(uri);
        if (unexpectedCharacters !== null)
        {
            return BAD;
        }

        segments = segments || uri.split('.');

        if (segments[0] === '$cores')
        {
            switch(segments.length)
            {
                case 4:
                    return FIELD;
                case 3:
                    return segments[1] === 'all' ? REGISTER_ALL : isNaN(segments[1]) ? BAD : CORE_REGISTER;
                default:
                    return BAD;
            }
        }

        if (('.' + uri).split('.$').length > 1)
        {
            return USER;  // any segment beginning with a $
        }

        var lastSegmentFirstChar = segments[segments.length-1].charAt(0);
        if (lastSegmentFirstChar === '_')
        {
            return CALCULATED;
        }
        else if (segments.length === 2)
        {
            return FIELD;
        }
        else if (segments.length > 2)
        {
            return PSEUDO;
        }
        return ACTIVE_REGISTER;
    };

    var updateUserPreferenceBind = function(uri, bind, symbolData)
    {
        if (symbolData)
        {
            bind.setReadOnly(symbolData.readOnly || false);
            bind.setDefaultValue(symbolData.defaultValue);
            bind.setStatus(null);
        }
        else
        {
            bind.setStatus(gc.databind.AbstractStatus.createErrorStatus('Unknown ' + USER + ' Binding named: ' + uri));
        }
    };

    var RegisterBlock = function(registerModel, info, next)
    {
        this.registerModel = registerModel;
        this.addr = info.addr;
        this.next = next;
        this.regs = [info];
    };

    RegisterBlock.prototype.len = 1;

    RegisterBlock.prototype.prependRegister = function(regInfo)
    {
        this.len++;
        this.addr--;
        this.regs.unshift(regInfo);
    };

    RegisterBlock.prototype.appendRegister = function(regInfo)
    {
        this.len++;
        this.regs.push(regInfo);

        if (this.next && regInfo.addr === this.next.addr - 1)
        {
            // combine next register block into this one.
            this.len += this.next.len;
            this.regs.push.apply(this.regs, this.next.regs);
            this.next = this.next.next;
        }
    };

    var resolveBlockRead = function(offset, size, results)
    {
        for(var i = 0; i < size; i++)
        {
            this[i + offset].resolve(results[i]);
        }
    };

    var failBlockRead = function(offset, size, reason)
    {
        for(var i = 0; i < size; i++)
        {
            this[i + offset].reject(reason);
        }
    };

    RegisterBlock.prototype.doReadRegisters = function(coreIndex)
    {
        var promises = this.promises;

        for(var i = 0; i < promises.length; i++)
        {
            if (promises[i])
            {
                var size = 1;
                while(promises[i+size])
                {
                    size++;
                }

                var codec = this.registerModel._codec;
                if (size > 1)
                {
                    // block read values
                    codec.multiRegisterRead(this.regs[i], size, this.registerModel, coreIndex).then(resolveBlockRead.bind(promises, i, size)).fail(failBlockRead.bind(promises, i, size));
                    i += size - 1;
                }
                else
                {
                    // single value read
                    codec.readValue(this.regs[i], this.registerModel, coreIndex).then(promises[i].resolve).fail(promises[i].reject);
                }
            }
        }
        this.promises = undefined;
    };

    RegisterBlock.prototype.readRegister = function(regInfo, coreIndex)
    {
        if (!this.promises)
        {
            this.promises = [];
            setTimeout(this.doReadRegisters.bind(this, coreIndex), 0);
        }
        var deferred = this.promises[regInfo.addr - this.addr] || Q.defer();
        this.promises[regInfo.addr - this.addr] = deferred;
        return deferred.promise;
    };

    var RegisterBlocks = function(registerModel)
    {
        this.registerModel = registerModel;
    };

    RegisterBlocks.prototype.findRegisterBlock = function(info)
    {
        var addr = info.addr;
        if (addr !== undefined)
        {
            var cur = this.first;
            while(cur && addr >= cur.addr + cur.len)
            {
                cur = cur.next;
            }
            if (cur && addr >= cur.addr && cur.len > 1)
            {
                return cur;
            }
        }
    };

    RegisterBlocks.prototype.addRegister = function(info)
    {
        var addr = info.addr;
        if (addr !== undefined)
        {
            var cur = this.first;
            if (!cur)
            {
                // first element
                this.first = new RegisterBlock(this.registerModel, info);
            }
            else if (addr < cur.addr - 1)
            {
                // insert before first element
                this.first = new RegisterBlock(this.registerModel, info, cur);
            }
            else
            {
                // find insert point
                while(cur.next && addr >= cur.next.addr - 1 && addr !== cur.addr + cur.len)
                {
                    cur = cur.next;
                }
                if (addr === cur.addr - 1)
                {
                    // insert at beginning of block
                    cur.prependRegister(info);
                }
                else if (addr === cur.addr + cur.len)
                {
                    // insert at end of block
                    cur.appendRegister(info);
                }
                else
                {
                    // insert new block after current element.
                    cur.next = new RegisterBlock(this.registerModel, info, cur.next);
                }
            }
        }
    };

    RegisterBlocks.prototype.readRegister = function(info, coreIndex)
    {
        var block = this.findRegisterBlock(info);
        if (block && this.registerModel._codec.multiRegisterRead)
        {
            return block.readRegister(info, coreIndex);
        }

        return this.registerModel._codec.readValue(info, this.registerModel, coreIndex);
    };

    gc.databind.internal.reg.RegisterModel = function(codec, name, isDeviceArray)
    {
        this.isDeviceArray = isDeviceArray;
        gc.databind.AbstractBindFactory.call(this, name);

        this.init();

	    this._codec = codec;
	    this.addSymbols();
	};

	gc.databind.internal.reg.RegisterModel.prototype = new gc.databind.AbstractPollingDataModel("reg");

    gc.databind.internal.reg.RegisterModel.prototype.init = function()
    {
        gc.databind.AbstractPollingDataModel.prototype.init.call(this);

        var deviceKey = this._modelBindings['$selectedDevice'] = new gc.databind.UserPreferenceBindValue(this._id, 'device');
        var controllerKey = this._modelBindings['$selectedController'] = new gc.databind.UserPreferenceBindValue(this._id, deviceKey, 'controller');
        this._modelBindings['$selectedConfiguration'] = new gc.databind.UserPreferenceBindValue(this._id, deviceKey, controllerKey, 'configuration');
        this._modelBindings['$deviceLabels'] = new gc.databind.ConstantBindValue();
        this._modelBindings['$controllerLabels'] = new gc.databind.ConstantBindValue();
        this._modelBindings['$configurationLabels'] = new gc.databind.ConstantBindValue();
        this._modelBindings['$deviceValues'] = new gc.databind.ConstantBindValue();
        this._modelBindings['$controllerValues'] = new gc.databind.ConstantBindValue();
        this._modelBindings['$configurationValues'] = new gc.databind.ConstantBindValue();
        if (this.isDeviceArray)
        {
			this._modelBindings['$selectedCore'] = new gc.databind.UserPreferenceBindValue(this._id, deviceKey, 'core');
			this._modelBindings['$cores.length'] = new gc.databind.VariableBindValue(undefined, true);
		}
    };

    gc.databind.internal.reg.RegisterModel.prototype.getBinding = function(uri)
    {
        // use a prefix for looking up bindings, but only if a symbol exists for the prefix + uri, otherwise just use uri.
        if (this._uriPrefix)
        {
            if (this._symbols[this._uriPrefix + uri])
            {
                uri = this._uriPrefix + uri;
            }
        }
        else if (uri === '$deviceAddrs')
        {
            uri = this._defaultDeviceAddrsBindName || uri;
        }

        return gc.databind.AbstractPollingDataModel.prototype.getBinding.call(this, uri);
    };

	gc.databind.internal.reg.RegisterModel.prototype.createNewBind = function(uri)
	{
	    var customRefreshBind = gc.databind.AbstractPollingDataModel.prototype.createNewBind.call(this, uri);
	    if (customRefreshBind)
	    {
	        return customRefreshBind;
	    }

	    var symbolData = this._symbols[uri];
	    var bindResult, registerAllBind, registerBind, registerUri;
	    var segments = uri.split('.');

        switch(getBindingTypeFromUri(uri, segments))
        {
            case FIELD:
                var pos = uri.lastIndexOf('.');
                var parentBind = this.getBinding(uri.substring(0, pos));
                var bitNumber = uri.substring(pos+1);
                if (!isNaN(bitNumber))
                {
                    symbolData = { start: +bitNumber };
                    uri = undefined;
                }
                else if (segments.length === 4)
                {
                    // strip $cores.xxx.  from the uri.
                    uri = segments[2] + '.' + segments[3];
                    symbolData = this._symbols[uri];
                }

                bindResult = new gc.databind.internal.reg.FieldBind(uri, parentBind, symbolData);
                break;

            case USER:
                var deviceKey = this._modelBindings['$selectedDevice'];
                var controllerKey = this._modelBindings['$selectedController'];
                var configurationKey = this._modelBindings['$selectedConfiguration'];

                bindResult = new gc.databind.UserPreferenceBindValue(this._id, deviceKey, controllerKey, configurationKey, uri);
                updateUserPreferenceBind(uri, bindResult, symbolData);
                break;

            case CALCULATED:
                bindResult = new gc.databind.internal.ReferenceBindValue(uri);
                bindResult.updateReferenceBinding(symbolData, this);
                break;

            case ACTIVE_REGISTER:
                if (this.isDeviceArray)
                {
                    registerAllBind = this.getBinding('$cores.all.' + uri);
                    registerBind = new gc.databind.internal.reg.RegisterBind(uri, this, undefined, symbolData, registerAllBind);
                    var activeRegisterBind = this.getBinding('$selectedCore');
                    bindResult = new gc.databind.internal.reg.RegisterArrayOperator(registerBind, activeRegisterBind);
                    break;
                }
                // else same as PSEUDO case

            case PSEUDO:
                bindResult = new gc.databind.internal.reg.RegisterBind(uri, this, this._modelBindings.$refresh_interval, symbolData);
                break;

            case REGISTER_ALL:
                if (this.isDeviceArray)
                {
                    registerUri = segments[2];
                    symbolData = this._symbols[registerUri];
                    bindResult = new gc.databind.internal.reg.RegisterAllBind(registerUri, this, this._modelBindings.$refresh_interval, symbolData);
                    break;
                }
                // else fall through to report error that is-device-array is false.

            case CORE_REGISTER:
                if (this.isDeviceArray)
                {
                    registerUri = segments[2];
                    symbolData = this._symbols[registerUri];
                    registerAllBind = this.getBinding('$cores.all.' + registerUri);
                    bindResult = new gc.databind.internal.reg.RegisterBind(registerUri, this, undefined, symbolData, registerAllBind);
                    bindResult.setIndex(segments[1]);
                }
                else
                {
                    bindResult = new gc.databind.ConstantBindValue();
                    var errorMessage = 'Must set is-device-array="true" on ti-model-register in order to use URIs that start with $cores';
                    bindResult.setStatus(gc.databind.AbstractStatus.createErrorStatus(errorMessage));
                }
                break;

            default:
                bindResult = new gc.databind.ConstantBindValue();
                bindResult.setStatus(gc.databind.AbstractStatus.createErrorStatus("Invalid register bind name: " + uri));
                break;
        }
        return bindResult;
    };

    var updateAllBindings = function()
    {
        for(var bindName in this._modelBindings)
        {
            if (this._modelBindings.hasOwnProperty(bindName))
            {
                var bind = this._modelBindings[bindName];
                var uri = bind.uri;
                var symbolData = this._symbols[uri || bindName];

                if (bind.updateRegisterInfo && uri) // don't update <registerID>.#, or ...<fieldID>.# fields, where the uri is empty.
                {
                    bind.updateRegisterInfo(symbolData);
                }
                else if (bind.updateReferenceBinding)
                {
                    bind.updateReferenceBinding(symbolData, this);
                }
                else if (bind instanceof gc.databind.UserPreferenceBindValue && symbolData && symbolData.isControllerPreference)
                {
                    updateUserPreferenceBind(bindName, bind, symbolData);
                }
            }
        }
    };

    gc.databind.internal.reg.RegisterModel.prototype.addSymbol = function(symbolName, symbolData)
    {
        /* truth table
         *                       new entry
         * existing entry | Register |  Field   |
         * ===============+=====================+
         *      undefined | replace  | replace  |
         *           null | replace  |   skip   |
         *       Register | replace  |   skip   |
         *          Field | replace  | set null |
         */
        symbolName = symbolName.split(' ').join('_');  // convert spaces to underscores
        var symbolEntry = this._symbols[symbolName];
        if (symbolEntry === undefined || !(symbolData && symbolData.parentRegister))
        {
            this._symbols[symbolName] = symbolData;  // replace
        }
        else if (symbolEntry && symbolEntry.parentRegister)
        {
            this._symbols[symbolName] = null; // remove duplicates from the symbol table, unless field is trying to override a register.
        }
        return symbolName;
    };

    var emptyObject = {};
    gc.databind.internal.reg.RegisterModel.prototype.addSymbols = function(calculatedBindings, device, config)
    {
        var groups = (device && device.regblocks) || [];
        this._registerBlockMap = {};

        this.clearAllModelSpecificBindExpressions();

        // re-initialize symbols with the built-in register model bindings.
        this._symbols = {
            '$selectedDevice': emptyObject,
            '$selectedController': emptyObject,
            '$selectedConfiguration': emptyObject,
            '$deviceLabels': emptyObject,
            '$controllerLabels': emptyObject,
            '$configurationLabels': emptyObject,
            '$deviceValues': emptyObject,
            '$controllerValues': emptyObject,
            '$configurationValues' : emptyObject,
            '$target_connected' : emptyObject
        };

        if (this.isDeviceArray)
        {
            this._symbols['$selectedCore'] = emptyObject;
            this._symbols['$cores.length'] = emptyObject;
        }

        for(var i = groups.length; i-- > 0; )
        {
            var symbolName;
            var group = groups[i];
            group.parentDevice = device;
            var regs = group.registers || [];
            for(var j = regs.length; j-- > 0; )
            {
                var reg = regs[j];
                reg.parentGroup = group;
                reg.nBytes = Math.ceil((reg.size === undefined ? 8 : reg.size)/8);
                reg.addr = gc.utils.string2value(reg.addr);
                reg.writeAddr = gc.utils.string2value(reg.writeAddr);
                var fields = reg.fields || [];
                for(var k = fields.length; k-- > 0; )
                {
                    var field = fields[k];
                    field.parentRegister = reg;
                    symbolName = (reg.id || reg.name) + '.' + (field.id || field.name);
                    field.fullyQualifiedName = this.addSymbol(symbolName, field);
                }
                symbolName = reg.id || reg.name;
                reg.fullyQualifiedName = this.addSymbol(symbolName, reg);
                if (reg._deviceAddressBinding)
                {
                    // clear any device addressing bindings that need to be recalculated based on new system.json file.
                    reg._deviceAddressBinding = undefined;
                }

                // add registers to registerBlockMap to support Multi-register read operations.
                if (reg.nBytes === 1)
                {
                    var block = reg.deviceAddrs !== undefined ? reg.deviceAddrs : (reg.parentGroup.deviceAddrs !== undefined ? reg.parentGroup.deviceAddrs : '.default');
                    if (!this._registerBlockMap[block])
                    {
                        this._registerBlockMap[block] = new RegisterBlocks(this);
                    }
                    this._registerBlockMap[block].addRegister(reg);
                }
            }
        }

        calculatedBindings = calculatedBindings || {};
        var calculatedBindingsPrefix = this._calculatedBindingsPrefix || '_';
        for(var calcBindName in calculatedBindings)
        {
            if (calculatedBindings.hasOwnProperty(calcBindName))
            {
                if (calcBindName.indexOf(calculatedBindingsPrefix) !== 0)
                {
                    var errorBind = new gc.databind.ConstantBindValue(undefined);
                    var errorMessage = 'The calculated binding "' + calcBindName +
                                        ' must begin with the prefix "' + calculatedBindingsPrefix +
                                        '".  Please edit your system.json and ensure you prefix all your calculated binding definitions with this.';
                    errorBind.setStatus(gc.databind.AbstractStatus.createErrorStatus(errorMessage));
                    this._modelBindings[calcBindName] = errorBind;
                }
                else
                {
                    // add symbols for calculated bindings
                    this._symbols[calcBindName] = calculatedBindings[calcBindName];
                }
            }
        }

        if (config)
        {
            var controller = this.getBinding('$selectedController').getValue();
            var constructor = controller && gc.databind.PacketCodecFactory.getConstructor(controller);
            if (constructor && constructor.prototype.initSymbolsForDevice)
            {
                constructor.prototype.initSymbolsForDevice(config, this);
            }
        }

        updateAllBindings.call(this);  // update bindings to reflect new symbols available or not.
    };

    gc.databind.internal.reg.RegisterModel.prototype.getSymbolSuggestions = function(prefix)
    {
        prefix = prefix || "";
        var result = [];
        for(var symbolName in this._symbols)
        {
            if (this._symbols.hasOwnProperty(symbolName) && symbolName.indexOf(prefix) === 0)
            {
                result.push(symbolName);
            }
        }
        return result;
    };

    gc.databind.internal.reg.RegisterModel.prototype.sendControlCommand = function(id, settings)
    {
        if (!this.isConnected())
        {
            return this.whenConnected().then(this.sendControlCommand.bind(this, id, settings));
        }

        if(this._codec)
        {
            this._codec.sendControlCommand(id, settings, this);
        }
    };

    gc.databind.internal.reg.RegisterModel.prototype.readValue = function(uri, coreIndex)
    {
        var that = this;
        if (!this.isConnected())
        {
            var result = this.whenConnected().then(this.readValue.bind(this, uri, coreIndex));
            this._verifyConnectionReadValuePromise = this._verifyConnectionReadValuePromise || result;
            return result;
        }

        if (this.isDeviceArray && coreIndex === undefined)
        {
            // assumption is that this is coming from _scriptRead api and we should be using the active core.
            coreIndex = +this.getBinding('$selectedCore').getValue();
        }
        else
        {
            coreIndex = coreIndex || 0;
        }

        this._verifyConnectionReadValuePromise = undefined;
        var symbolData = this._symbols[uri];
        if (symbolData)
        {
            if (this._codec)
            {
                var block = symbolData.deviceAddrs !== undefined ? symbolData.deviceAddrs : ((symbolData.parentGroup && symbolData.parentGroup.deviceAddrs !== undefined) ? symbolData.parentGroup.deviceAddrs : '.default');
                block = this._registerBlockMap[block];
                if (block)
                {
                    return block.readRegister(symbolData, coreIndex);
                }
                return this._codec.readValue(symbolData, this, coreIndex);
            }
        }
        return Q.reject('Register "' + uri + '" is not recognized for this device.  Please check the spelling.');
    };

    gc.databind.internal.reg.RegisterModel.prototype.readBitfieldValue = function(uri)
    {
        var segments = uri.split('.');
        var symbolData = this._symbols[uri];
        if (segments.length > 1 && symbolData) {
            return this.readValue(segments[segments.length-2]).then(function(result)
            {
                var shiftMask = gc.databind.internal.reg.FieldBind.prototype._calcShiftMask.call(null, symbolData);
                return (result & shiftMask.mask) >> shiftMask.shift;
            });
        } else {
            return Q.reject('Invalid register bitfield expression.');
        }
    };

    gc.databind.internal.reg.RegisterModel.prototype.writeValue = function(uri, value, coreIndex)
    {
        var that = this;
        if (!this.isConnected())
        {
            return this.whenConnected().then(this.writeValue.bind(this, uri, value, coreIndex));
        }

        if (this.isDeviceArray && coreIndex === undefined)
        {
            // assumption is that this is coming from _scriptWrite api and we should be using the active core.
            coreIndex = +this.getBinding('$selectedCore').getValue();
        }
        else
        {
            coreIndex = coreIndex || 0;
        }

        var symbolData = this._symbols[uri];
        if (symbolData)
        {
            if (this._codec)
            {
                return this._codec.writeValue(this._symbols[uri], value, this, coreIndex);
            }
        }
        return Q.reject('Register "' + uri + '" is not recognized for this device.  Please check the spelling.');
    };

    gc.databind.internal.reg.RegisterModel.prototype.writeBitfieldValue = function(uri, value)
    {
        var self = this;
        var segments = uri.split('.');
        var symbolData = self._symbols[uri];
        if (segments.length > 1 && symbolData) {
            return self.readValue(segments[segments.length-2]).then(function(result)
            {
                var shiftMask = gc.databind.internal.reg.FieldBind.prototype._calcShiftMask.call(null, symbolData);
                var newValue = (value << shiftMask.shift) & shiftMask.mask;
                var oldValue = result & ~shiftMask.mask;
                return self.writeValue(segments[segments.length-2], newValue | oldValue);
            });
        } else {
            return Q.reject('Invalid register bitfield expression.');
        }
    };

    gc.databind.internal.reg.RegisterModel.prototype.addPseudoRegister = function(uri, registerInfo, qualifier)
    {
        if (getBindingTypeFromUri(uri) !== PSEUDO)
        {
            throw 'Invalid URI for a ' + PSEUDO + ' Binding: ' + uri;
        }

        this._symbols[uri] = registerInfo;
        if (qualifier)
        {
            registerInfo.type = qualifier;
        }
    };

    gc.databind.internal.reg.RegisterModel.prototype.addUserPreference = function(uri, defaultValue, readOnly)
    {
        if (getBindingTypeFromUri(uri) !== USER)
        {
            throw 'Invalid URI for a ' + USER + ' Binding: ' + uri;
        }

        this._symbols[uri] = { defaultValue: defaultValue, readOnly: readOnly, isControllerPreference: true };
    };

    gc.databind.internal.reg.RegisterModel.prototype.addCalculatedBinding = function(uri, bindExpression)
    {
        if (getBindingTypeFromUri(uri) !== CALCULATED)
        {
            throw 'Invalid URI for a ' + CALCULATED + ' Binding: ' + uri;
        }

        this._symbols[uri] = bindExpression;
    };

    gc.databind.internal.reg.RegisterModel.prototype.parseModelSpecificBindExpressionWithPrefix = function(prefix, bindExpression)
    {
        this._uriPrefix = prefix;
        var result = gc.databind.AbstractPollingDataModel.prototype.parseModelSpecificBindExpression.call(this, bindExpression);
        this._uriPrefix = '';
        return result;
    };

    gc.databind.internal.reg.RegisterModel.prototype.readDeviceAddrsMap = function(name, settings)
    {
        this._defaultDeviceAddrsBindName = '$deviceAddrs';
        if (settings.deviceAddrsMap)
        {
            for(var blockName in settings.deviceAddrsMap)
            {
                if (settings.deviceAddrsMap.hasOwnProperty(blockName))
                {
                    this.addUserPreference('$deviceAddrs.' + blockName, settings.deviceAddrsMap[blockName]);
                }
            }
            if (!settings.deviceAddrsDefault)
            {
                console.error(name + ' interface in system.json file is missing required deviceAddrsDefault member');
            }
            else if (settings.deviceAddrsMap.hasOwnProperty(settings.deviceAddrsDefault))
            {
                this._defaultDeviceAddrsBindName = '$deviceAddrs.' + settings.deviceAddrsDefault;
            }
            else
            {
                console.error('deviceAddrsDefault value does not match members in the deviceAddrsMap in the system.json file.');
            }
        }
        else if (settings.deviceAddrs !== undefined)
        {
            this.addUserPreference('$deviceAddrs', settings.deviceAddrs);
        }
        else
        {
            console.error('I2C interface in system.json file is missing required deviceAddrs member');
        }
    };

    gc.databind.internal.reg.RegisterModel.prototype.getDeviceAddrsForRegister = function(info)
    {
        info._deviceAddressBinding = info._deviceAddressBinding || {};
        info._deviceAddressBinding[this.id] = info._deviceAddressBinding[this.id] ||
                (info.deviceAddrs !== undefined && this.parseModelSpecificBindExpressionWithPrefix('$deviceAddrs.', info.deviceAddrs)) ||
                (info.parentGroup && info.parentGroup.deviceAddrs !== undefined && this.parseModelSpecificBindExpressionWithPrefix('$deviceAddrs.', info.parentGroup.deviceAddrs)) ||
                this.getBinding(this._defaultDeviceAddrsBindName);

        return info._deviceAddressBinding[this.id].getValue();
    };

    gc.databind.internal.reg.RegisterModel.prototype.getRegisterInfo = function(uri)
    {
        return this._symbols[uri];
    };
}());
