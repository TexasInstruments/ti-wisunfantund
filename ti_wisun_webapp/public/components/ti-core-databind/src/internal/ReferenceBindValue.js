/*****************************************************************
 * Copyright (c) 2018 Texas Instruments and others
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
    gc.databind.internal.ReferenceBindValue = function(name) 
    {
        this._events = new gc.databind.internal.Events(this);
        this.uri = name;
    };
    
    gc.databind.internal.ReferenceBindValue.prototype = new gc.databind.internal.expressionParser.AbstractUnaryOperator('&');
    
    gc.databind.internal.ReferenceBindValue.prototype.excludeFromStorageProviderData = true;
    
    gc.databind.internal.ReferenceBindValue.prototype.getValue = function() 
    {
        return this.operand.getValue();
    };
    
    gc.databind.internal.ReferenceBindValue.prototype.setValue = function(value, progress)
    {
        this.operand.setValue(value, progress);
    };
    
    var createEventHandlers = function(event, handlerName)
    {
        gc.databind.internal.ReferenceBindValue.prototype['add' + event + 'Listener'] = function(listener) 
        {
            this._events.addListener(handlerName, listener);
        };
        gc.databind.internal.ReferenceBindValue.prototype['remove' + event + 'Listener'] = function(listener)
        {
            this._events.removeListener(handlerName, listener);
        };
        gc.databind.internal.ReferenceBindValue.prototype['onFirst' + handlerName + 'ListenerAdded'] = function()
        {
            var listener = this['_eventHandlerFor' + event] = {};
            listener['on' + handlerName] = this._events.fireEvent.bind(this._events, handlerName);
            this.operand['add' + event + 'Listener'](listener);
        };
        gc.databind.internal.ReferenceBindValue.prototype['onLast' + handlerName + 'ListenerRemoved'] = function()
        {
            var listener = this['_eventHandlerFor' + event];
            if (listener)
            {
                this.operand['remove' + event + 'Listener'](listener);
                this['_eventHandlerFor' + event] = undefined;
            }
        };
    };
    
    var eventNames = [ 'Status', 'Stale', 'Changed', 'Streaming' ];
    var handlerNames = [ 'StatusChanged', 'StaleChanged', 'ValueChanged', 'DataReceived' ];
    
    (function()
    {
        for(var i = eventNames.length; i-- > 0; )
        {
            createEventHandlers(eventNames[i], handlerNames[i]);
        }
    }());
    
    var moveListeners = function(oldBind, newBind)
    {
        for(var i = 0; i < eventNames.length; i++ )
        {
            var event = eventNames[i];
            var handler = this['_eventHandlerFor' + event];
            if (handler)
            {
                if (oldBind)
                {
                    oldBind['remove' + event + 'Listener'](handler);
                }
                newBind['add' + event + 'Listener'](handler);
            }
        }
    };
    
    var nullProgressCounter = new gc.databind.IProgressCounter();
    
    gc.databind.internal.ReferenceBindValue.prototype.updateReferenceBinding = function(bindExpression, model)
    {
        // create new reference bind from expression
        var oldBind = this.operand;
        
        try
        {
            if (bindExpression)
            {
                if (model)
                {
                    this.operand = model.parseModelSpecificBindExpression(bindExpression);
                }
                else
                {
                    this.operand = gc.databind.registry.getBinding(bindExpression);
                }
            }
            else
            {
                throw 'The calculated binding "' + this.uri + '" is not defined for this device.'; 
            }
        }
        catch(errorMessage)
        {
            // create error bind for reference if no binding exists.
            this.operand = new gc.databind.ConstantBindValue(undefined);
            this.operand.setStatus(gc.databind.AbstractStatus.createErrorStatus(errorMessage));
        }
        
        // move listeners from the old reference binding to the new reference binding.
        moveListeners.call(this, oldBind, this.operand);
        
        // fire events to update to new state
        this._events.fireEvent('StatusChanged', this.operand.getStatus());
        this._events.fireEvent('StaleChanged');
        this._events.fireEvent('ValueChanged', oldBind && oldBind.getValue(), this.operand.getValue(), nullProgressCounter);
    };

 }());
