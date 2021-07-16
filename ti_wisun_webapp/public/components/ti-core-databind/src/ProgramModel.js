/*****************************************************************
 * Copyright (c) 2013-2019 Texas Instruments and others
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *  Paul Gingrich, Dobrin Alexiev - Initial API and implementation
 *****************************************************************/
var gc = gc || {};
gc.databind = gc.databind || {};

(function() // closure for private static methods and data.
{
	gc.databind.ProgramModel = function()
	{
	    gc.databind.AbstractPollingDataModel.apply(this, arguments);

	    this.init();
	};

	gc.databind.ProgramModel.prototype = new gc.databind.AbstractPollingDataModel('pm');

    gc.databind.ProgramModel.prototype.init = function()
    {
        gc.databind.AbstractPollingDataModel.prototype.init.call(this);

        var refreshBinding = this._modelBindings.$refresh_interval;
        var activeDebugContext = new gc.databind.VariableBindValue('');
        this._modelBindings.$active_context_name = activeDebugContext;
        var that = this;
        activeDebugContext.addChangedListener(
        {
            onValueChanged: function()
            {
                //...[ clear out critical errors on every context change
                that.onDisconnected();
                // ...]

                // force a read on all bindings for the new context.
                that.doRefreshAllBindngs();
            }
        });

        gc.databind.AbstractAsyncBindValue.addQualifiersToModel(this);
    };

	gc.databind.ProgramModel.prototype.createNewBind = function(uri)
	{
	    var result = gc.databind.AbstractPollingDataModel.prototype.createNewBind.call(this, uri);
        result = result || new gc.databind.internal.pm.DSEvalBind(uri, this._modelBindings.$refresh_interval);
        result.parentModel = this;
        return result;
    };

    gc.databind.ProgramModel.prototype._scriptInvoke = function(method, args) {
        var expression = method.trim();
        if (expression.startsWith('GEL_')) {
            expression = expression + '(' + (args ? args.join(', ') : '') + ')';
        }
        return gc.target.access.readValue(expression).then(function(data) {
            try {
                return Number.parseInt(data, 16);
            } catch (e) {
                return -1;
            }
        });
    };
}());






