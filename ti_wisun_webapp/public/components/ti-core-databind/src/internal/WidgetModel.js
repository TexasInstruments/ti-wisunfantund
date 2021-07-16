/*******************************************************************************
 * Copyright (c) 2015 Texas Instruments and others All rights reserved. This
 * program and the accompanying materials are made available under the terms of
 * the Eclipse Public License v1.0 which accompanies this distribution, and is
 * available at http://www.eclipse.org/legal/epl-v10.html
 * 
 * Contributors: Paul Gingrich - Initial API and implementation
 ******************************************************************************/
var gc = gc || {};
gc.databind = gc.databind || {};
gc.databind.internal = gc.databind.internal || {};

(function()
{
    var EditOperation = function(bind, oldValue, newValue, time)
    {
        this.newValue = newValue;
        this.oldValue = oldValue;
        this.bind = bind;
        this.time = time;
    };

    EditOperation.prototype.undo = function()
    {
        this.bind.setValue(this.oldValue);
    };

    EditOperation.prototype.redo = function()
    {
        this.bind.setValue(this.newValue);
    };

    EditOperation.prototype.toString = function()
    {
        return "edit";
    };

    var WidgetBindValue = function(widget, widgetProperty, initialValue)
    {
        gc.databind.AbstractBindValue.call(this);
        this.fCachedValue = initialValue;
        this.widgetId = widget.id;
        this._widget = widget;
        this._widgetProperty = widgetProperty;
    };

    WidgetBindValue.prototype = new gc.databind.AbstractBindValue();
    
    WidgetBindValue.prototype.excludeFromStorageProviderData = true;

    WidgetBindValue.prototype.onValueChanged = function(oldValue, newValue, progress)
    {
        this.value = newValue;
        this.excludeFromStorageProviderData = true;

        if (this._observer === undefined)
        {
            // must propagate values manually, since observer is not available
            var widget = this.getWidget();
            if (widget)
            {
                // widget available, so update property
                widget[this._widgetProperty] = newValue;
            }
        }
    };

    WidgetBindValue.prototype.getWidget = function()
    {
        this._widget = this._widget || (Polymer.dom ? Polymer.dom(document) : document).querySelector('#' + this.widgetId);
        return this._widget;
    };

    WidgetBindValue.prototype.onStatusChanged = function(oldStatus, newStatus)
    {
        if (newStatus && gc.widget)
        {
            var newMessage = newStatus.getMessage();

            var type = newStatus.getType();
            if (type === gc.databind.StatusType.WARNING)
            {
                type = gc.widget.StatusIndicatorType.WARNING;
            }
            else
            {
                type = gc.widget.StatusIndicatorType.ERROR;
            }
            gc.widget.StatusIndicator.Factory.get(this.getWidget()).addMessage(newMessage, type);
        }
        if (oldStatus && gc.widget)
        {
        	var oldMessage = oldStatus.getMessage();
        	var newMessage = newStatus && newStatus.getMessage();
        	if (oldMessage != newMessage) // don't remove old message if it matches new message because we already removed it during addMessage() above.
        	{
        		gc.widget.StatusIndicator.Factory.get(this.getWidget()).removeMessage(oldMessage);
        	}
        }
    };

    var doUserEditOperation = function(bind, newValue)
    {
        var oldValue = bind.getValue();
        if (oldValue != newValue)
        {
            if (gc.history && gc.history.push)
            {
                var now = Date.now();
                var lastOperation = gc.history.getLastUndoOperation();
                // make sure it's also different from original value; e.g.,
                // checkbox toggled quickly.
                if (lastOperation instanceof EditOperation && now - lastOperation.time < 250 && lastOperation.bind === bind && lastOperation.oldValue !== newValue)
                {
                    // not enough time has elapsed, so just modify the top of
                    // history stack with new value
                    lastOperation.newValue = newValue;
                    lastOperation.time = now;
                    lastOperation.redo(); // perform action now.
                }
                else
                {
                    if (oldValue !== undefined && newValue !== undefined && !gc.databind.blockNewEditUndoOperationCreation)
                    {
                        var operation = new EditOperation(bind, oldValue, newValue, now);
                        gc.history.push(operation);
                        operation.redo();
                    }
                    else
                    {
                        bind.setValue(newValue);
                    }
                }
            }
            else
            {
                bind.setValue(newValue);
            }
            bind.excludeFromStorageProviderData = undefined;
        }
    };
    
    WidgetBindValue.prototype.onFirstValueChangedListenerAdded = function()
    {
        var widget = this.getWidget();
        var widgetProperty = this._widgetProperty;
        if (widget)
        {
            var bind = this;
            if (widget.bind && widget.bindProperty)  // test for Polymer 0.5 support
            {
                var observer = new window.PathObserver(bind, 'value');
                observer.setValue = function(newValue)
                {
                    doUserEditOperation(bind, newValue);
                    window.PathObserver.prototype.setValue.call(this, newValue);
                };
    
                widget.bind(widgetProperty.toLowerCase(), observer);
                this._observer = observer;
            }
            else // assume Polymer 1.x supported
            {
                this._changedPropertyEventName = Polymer.CaseMap.camelToDashCase(widgetProperty) + '-changed';
                this._propertyChangedListener = function(event) 
                {
                    doUserEditOperation(bind, event.detail.value);
                };
                
                widget.addEventListener(this._changedPropertyEventName, this._propertyChangedListener);
            }

            var oldStatus = this.getStatus();
            if (oldStatus)
            {
                // restore status indicators for the new widget.
                gc.widget.StatusIndicator.Factory.get(widget).addMessage(oldStatus.getMessage());
            }
        }
    };

    WidgetBindValue.prototype.onLastValueChangedListenerRemoved = function()
    {
        if (this._observer)
        {
            this._observer.close();
            this._observer = undefined;
        }
        if (this._widget)
        {
            if (this._propertyChangedListener) 
            {
                this._widget.removeEventListener(this._changedPropertyEventName, this._propertyChangedListener);
                this._propertyChangedListener = undefined;
                this._changedPropertyEventName = undefined;
            }
            
            var oldStatus = this.getStatus();
            if (oldStatus)
            {
                // remove status indicators that are tied to this widget
                gc.widget.StatusIndicator.Factory.get(this._widget).removeMessage(oldStatus.getMessage());
            }
            this._widget = undefined;
        }
    };

    var WidgetModel = function()
    {
        gc.databind.AbstractBindFactory.call(this);
        this.init();
    };

    WidgetModel.prototype = new gc.databind.AbstractBindFactory('widget');

    WidgetModel.prototype.createNewBind = function(name)
    {
        var bind = null;
        var pos = name.lastIndexOf('.');
        if (pos > 0)
        {
            var widgetName = name.substring(0, pos);

            var widgetProperty = name.substring(pos + 1);

            var widget = (Polymer.dom ? Polymer.dom(document) : document).querySelector('#' + widgetName);
            if (widget)
            {
                bind = new WidgetBindValue(widget, widgetProperty, widget[widgetProperty]);

                if (widget.propertyForAttribute)
                {
                    widgetProperty = widget.propertyForAttribute(widgetProperty) || widgetProperty;
                }
                var streamingListener = widget[widgetProperty + 'StreamingDataListener'];
                if (streamingListener && typeof streamingListener === 'function')
                {
                    bind.onStreamingDataReceived = streamingListener.bind(widget);
                }
            }
            else
            {
                ti_logger.error(gc.databind.name, "Failed to find widget #" + widgetName);
            }
        }
        return bind;
    };

    gc.databind.registry.registerModel(new WidgetModel(), false, '$');

}());
