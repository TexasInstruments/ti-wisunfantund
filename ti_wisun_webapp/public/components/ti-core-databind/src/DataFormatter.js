/*****************************************************************
 * Copyright (c) 2017 Texas Instruments and others
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

(function()
{
    gc.databind.internal.AbstractDataFormatter = function(operator, operand)
    {
        gc.databind.internal.expressionParser.AbstractUnaryOperator.call(this, operator);
        
        if (operand)
        {
            this.operand = operand;
            if (operand.addQualifier)
            {
                this.addQualifier = operand.addQualifier.bind(operand);
            }
        }
    };
    
    gc.databind.internal.AbstractDataFormatter.prototype = new gc.databind.internal.expressionParser.AbstractUnaryOperator("<fmt>");
    
    gc.databind.internal.AbstractDataFormatter.prototype.formattedType = "string";
    
    gc.databind.internal.AbstractDataFormatter.prototype.getType = function()
    {
        return this.formattedType;
    };
    
    gc.databind.internal.AbstractDataFormatter.prototype.getValue = function()
    {
        var value = this.operand.getValue();
        if (value !== null && value !== undefined)
        {
            if (this.unFormattedType)
            {
                value = gc.databind.DataConverter.convert(value, this.operand.getType(), this.unFormattedType);
            }
            value = this.formatValue(value, this._precision);
        }
        return value;
    };
    
    gc.databind.internal.AbstractDataFormatter.prototype.setValue = function(value, progress)
    {
        if (value !== null && value !== undefined)
        {
            if (this.unFormatValue)
            {
                value = this.unFormatValue(value, this._precision);
            }
            value = gc.databind.DataConverter.convert(value, undefined, this.operand.getType());
        }
        this.operand.setValue(value, progress);
    };
    
    gc.databind.internal.AbstractDataFormatter.prototype.formatValue = gc.databind.DataConverter.getConverter(undefined, 'string').convert;
    
    gc.databind.internal.AbstractDataFormatter.prototype.toString = function()
    {
        return this.operand.toString() + '.$' + this.operator;
    };
            
    var HexFormatter = function(operand, precision)
    {
        gc.databind.internal.AbstractDataFormatter.call(this, undefined, operand);
        this._precision = precision;
    };
    
    var doPrecision = function(value, precision)
    {
        if (precision > 0)
        {
            if (value.length > precision)
            {
                value = value.substring(value.length-precision);
            }
            else
            {
                for(var len = value.length; len < precision; len++ )
                {
                    value = '0' + value;
                }
            }
        }
        return value;
    };
    
    HexFormatter.prototype = new gc.databind.internal.AbstractDataFormatter('hex');
    
    HexFormatter.prototype.formatValue = function(input, precision)  
    {
        input = +input;
        if (isNaN(input))
        {
            return '0x'+input;
        }
        if (input < 0)
        {
            input = 0xFFFFFFFF + input + 1;
        }
        input = input.toString(16).toUpperCase();
        return '0x' + doPrecision(input, precision);
    };
    
    var HexFormatFactory = function(bind, precision)
    {
        return new HexFormatter(bind, precision);
    };

    gc.databind.DataConverter.register({ convert: HexFormatter.prototype.formatValue }, 'hex');
    
    gc.databind.internal.QualifierFactoryMap.add('hex', HexFormatFactory);
    
    var DecimalFormatter = function(operand, precision)
    {
        gc.databind.internal.AbstractDataFormatter.call(this, undefined, operand);
        
        this._precision = precision;
    };
    
    DecimalFormatter.prototype = new gc.databind.internal.AbstractDataFormatter('dec');
    
    DecimalFormatter.prototype.formatValue = function(input, precision)  
    {
        input = +input;
        if (isNaN(input))
        {
            return "" + input;
        }
        return input.toFixed(precision);
    };
    
    var DecimalFormatFactory = function(bind, precision)
    {
        return new DecimalFormatter(bind, precision);
    };
    
    gc.databind.DataConverter.register({ convert: DecimalFormatter.prototype.formatValue }, 'dec');
    
    gc.databind.internal.QualifierFactoryMap.add('dec', DecimalFormatFactory);
    
    var ScientificFormatter = function(operand, precision)
    {
        gc.databind.internal.AbstractDataFormatter.call(this, undefined, operand);
        
        this._precision = precision;
    };
    
    ScientificFormatter.prototype = new gc.databind.internal.AbstractDataFormatter('exp');
    
    ScientificFormatter.prototype.formatValue = function(input, precision)  
    {
        input = +input;
        if (isNaN(input))
        {
            return "" + input;
        }
        return input.toExponential(precision);
    };
    
    var ScientificFormatFactory = function(bind, precision)
    {
        return new ScientificFormatter(bind, precision);
    };
    
    gc.databind.DataConverter.register({ convert: ScientificFormatter.prototype.formatValue }, 'exp');
    
    gc.databind.internal.QualifierFactoryMap.add('exp', ScientificFormatFactory);
        
    var BinaryFormatter = function(operand, precision)
    {
        gc.databind.internal.AbstractDataFormatter.call(this, undefined, operand);
        
        this._precision = precision;
    };
    
    BinaryFormatter.prototype = new gc.databind.internal.AbstractDataFormatter('binary');
    
    BinaryFormatter.prototype.formatValue = function(input, precision)  
    {
        input = +input;
        if (isNaN(input))
        {
            return "" + input;
        }
        if (input < 0)
        {
            input = 0xFFFFFFFF + input + 1;
        }
        
        return doPrecision(input.toString(2), precision);
    };
    
    BinaryFormatter.prototype.unFormattedType = "number";
    
    BinaryFormatter.prototype.unFormatValue = function(input)
    {
        return Number.parseInt(input, 2);
    };
    
    var BinaryFormatFactory = function(bind, precision)
    {
        return new BinaryFormatter(bind, +precision);
    };
    
    gc.databind.DataConverter.register({ convert: BinaryFormatter.prototype.formatValue }, 'binary');
    gc.databind.DataConverter.register({ convert: BinaryFormatter.prototype.unFormatValue }, 'number', 'binary');
    
    gc.databind.internal.QualifierFactoryMap.add('binary', BinaryFormatFactory);
    
    gc.databind.registry.addDataFormatter = function(name, destType, src2destFormatter, srcType, dest2srcFormatter)
    {
        var DataFormatter = function(operand, precision) 
        {
            gc.databind.internal.AbstractDataFormatter.call(this, undefined, operand);
            if (precision)
            {
                this._precision = precision;
            }
        };
        
        DataFormatter.prototype = new gc.databind.internal.AbstractDataFormatter(name);
        
        if (destType)
        {
            DataFormatter.prototype.formattedType = destType;
        }
        
        if (srcType)
        {
            DataFormatter.prototype.unFormattedType = srcType;
        }
        
        if (src2destFormatter)
        {
            DataFormatter.prototype.formatValue = src2destFormatter;
        }
        
        if (dest2srcFormatter)
        {
            DataFormatter.prototype.unFormatValue = dest2srcFormatter;
        }
         
        if (name)
        {
            gc.databind.internal.QualifierFactoryMap.add(name, function(operand, precision) 
            {
                return new DataFormatter(operand, precision);
            });
        }
    };

}());