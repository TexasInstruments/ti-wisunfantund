/*****************************************************************
 * Copyright (c) 2016-17 Texas Instruments and others
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
    var codecAliases = {};
    var codecRegistry = {};
    var serialFrameDecoderRegistry = {};
    var nullFunction = function() {};
    var nullPromiseFunction = function() { return Q(); };

    /**
     * @namespace
     */
    gc.databind.PacketCodecFactory = 
    {
        /** 
         * Method for creating Packet protocol chains.  
         * 
         * @param {string} codecName - the name identifying the protocol or packet codec chain to create.
         * @param {function} encoder - the transport method used to send packets of data after encoding.
         * @param {function} [decoder] - the model's handler to receive the target values after decoding.
         * @param {boolean} [useSerialFrameDecoder] - if true, add the registered serial frame decoder to detect 
         * the start and end of packets; otherwise, do not. 
         * @returns {object} the first codec in the chain with added encoder() and decoder() helper functions 
         * for pushing data through the codec chain.
         */
        create: function(codecName, encoder, decoder, useSerialFrameDecoder)
        {
            var aliasNames = codecName.toLowerCase().split('+');
            codecName = codecAliases[aliasNames[0]] || aliasNames[0]; 
            for(var j = 1; j < aliasNames.length; j++)
            {
                codecName = codecName + '+' + (codecAliases[aliasNames[j]] || aliasNames[j]);
            }
            
            var codecs = codecName.toLowerCase().split('+');
            encoder = encoder || nullFunction;
            decoder = decoder || nullFunction;
            
            // construct codes
            var codec;
            for(var i = codecs.length; i-- > 0; )
            {
                codec = codecs[i];
                codec = codecRegistry[codec.toLowerCase()];
                codec = codec && new codec();
                codecs[i] = codec;
            }
            
            // add serial frame decoder if necessary for serial links
            if (useSerialFrameDecoder)
            {
                var serialFrameDecoder = serialFrameDecoderRegistry[aliasNames[aliasNames.length-1]];
                if (serialFrameDecoder && (serialFrameDecoder instanceof String || typeof serialFrameDecoder === 'string')) 
                {
                    serialFrameDecoder = codecRegistry[serialFrameDecoder.toLowerCase()];
                }
                serialFrameDecoder = serialFrameDecoder && new serialFrameDecoder();
                if (serialFrameDecoder)
                {
                    codecs.push(serialFrameDecoder);
                }
            }
            
            // create encoder chain
            for(i = codecs.length; i-- > 0; )
            {
                codec = codecs[i];
                if (codec)
                {
                    encoder = codec.encode.bind(codec, encoder);
                }
            }
            
            // create decoder chain
            for(i = 0; i < codecs.length; i++ )
            {
                codec = codecs[i];
                if (codec)
                {
                    decoder = codec.decode.bind(codec, decoder);
                }
            }
            
            // attach bound encoder and decoder methods to first codec in the chain.
            var result = null;
            if (codecs && codecs.length > 0 && codecs[0]) {
                result = codecs[0];
                result.encoder = encoder;
                result.decoder = decoder;
                result.connect = result.connect || nullPromiseFunction;
                result.disconnect = result.disconnect || nullPromiseFunction;
            }
            return result;
        },
        
        /** 
         * Method for registering custom codec's for use by the create() method.
         *    
         * @param {string} name - the name identifying the packet codec.
         * @param {function} constructor - the constructor functon for for the packet codec.
         * @param {string} [baseCodecs] - List of base codec names, separated by a plus '+' character that are
         * to be chained on the end of the codec when is is created. 
         * @param {function} [serialFrameDecoder] - the constructor for a frame decoder to detect beginning and 
         * end of each packet over a serial streaming transport, like USB.   
         */
        registerCustomCodec: function(name, constructor, baseCodecs, serialFrameDecoder)
        {
            name = name.toLowerCase();
            codecRegistry[name] = constructor;
            if (baseCodecs)
            {
                codecAliases[name] = name + '+' + baseCodecs;
            }
            if (serialFrameDecoder)
            {
                serialFrameDecoderRegistry[name] = serialFrameDecoder;
            }
        },
        
        /** 
         * Method for retrieving the constructor for a particular codec.  This is useful
         * if you wish to just create an instance of one codec without creating an entire
         * protocol chain, or if you wish to access static members through the prototype
         * member of a codec.
         *    
         * @param {string} name - the name identifying the packet codec.
         * @returns {function} the constructor for the named codec. 
         */
        getConstructor: function(name)
        {
            return codecRegistry[name.toLowerCase()];
        }
    };
    
    // aliases for backward compatability
    gc.databind.registerCustomCodec = gc.databind.PacketCodecFactory.registerCustomCodec;
    gc.databind.internal.PacketCodecFactory = gc.databind.PacketCodecFactory;
    
    var _codecsReady = Q.defer();
    gc.databind.codecsReady = new gc.databind.ProgressCounter(function() { _codecsReady.resolve(); });
    gc.databind.codecsReady.then = _codecsReady.promise.then.bind(_codecsReady.promise);
}());

