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
    gc.databind.internal.QualifierFactoryMap = function() 
    {
    };
    
    gc.databind.internal.QualifierFactoryMap.add = function(name, factory)
    {
        gc.databind.internal.QualifierFactoryMap.prototype['.$' + name] = factory; 
    };
    
    gc.databind.internal.QualifierFactoryMap.prototype.add = function(name, factory)
    {
        this['.$' + name] = factory; 
    };
    
    var QUALIFIER_PREFIX = '.$';
    var QUALIFIER_PARAM_REGEX = /\d+$/;
    
    gc.databind.internal.QualifierFactoryMap.prototype.parseQualifiers = function(name, bindFactory, bindFactoryThis)
    {
        var pos = name.lastIndexOf(QUALIFIER_PREFIX);
        if (pos > 0)
        {
            var qualifierName = name.substring(pos).toLowerCase();
            var param = qualifierName.match(QUALIFIER_PARAM_REGEX);
            if (param)
            {
                param = param[0];
                qualifierName = qualifierName.substring(0, qualifierName.length-param.length);
            }
            else
            {
                param = undefined;  // null is causing problems when passed to Number.toExponential() method.
            }
            var qualifierFactory = this[qualifierName];
            if (qualifierFactory)
            {
                var bind = this.parseQualifiers(name.substring(0, pos), bindFactory, bindFactoryThis);
                return qualifierFactory(bind, param);
            }
        }
        return bindFactory.call(bindFactoryThis, name);
    };
    
 }());
