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
gc.databind.internal = gc.databind.internal || {};
gc.databind.internal.pm = gc.databind.internal.pm || {};

(function()
{
	gc.databind.internal.pm.DSEvalBind = function(uri, refreshIntervalProvider)
	{
		gc.databind.AbstractAsyncBindValue.call(this);

		var that = this;

		that.uri = uri;

		that._onFailure = function(err)
		{
			var errMsg = err.message || err;
			if (that.isConnected() && errMsg.toLowerCase().indexOf('target failed') < 0)
			{
				that.reportErrorStatus(errMsg);
			}
			var callback = that._callback;
			that._callback = undefined;
			callback(that.fCachedValue);  // don't record a new value, keep the same value as before.
		};

		that._onSuccess = function(result)
		{
			// clear errors on succesfull read
			that.reportCriticalError(null);

			return result;
		};

		that.setRefreshIntervalProvider(refreshIntervalProvider);
	};

	gc.databind.internal.pm.DSEvalBind.prototype = new gc.databind.AbstractAsyncBindValue('number');

	gc.databind.internal.pm.DSEvalBind.prototype.writeValue = function(callback)
	{
		this._callback = callback;
		gc.target.access.writeValue(this.getTargetExpression(), this.fCachedValue).then(callback).fail(this._onFailure);
	};

	gc.databind.internal.pm.DSEvalBind.prototype.readValue = function(callback)
	{
		this._callback = callback;
		gc.target.access.readValue(this.getTargetExpression()).then(this._onSuccess).then(callback).fail(this._onFailure);
	};

	gc.databind.internal.pm.DSEvalBind.prototype.getTargetExpression = function()
	{
	    var result = this.uri;
	    var indecies = this.getIndex();
	    if (indecies)
	    {
	        for(var i = 0; i < indecies.length; i++)
	        {
	            var index = indecies[i];
	            var number = +index;
	            if (isNaN(number))
	            {
	                result += '.' + index;
	            }
	            else
	            {
	                result += '[' + number + ']';
	            }
	        }
	    }
	    return result;
	};

	gc.databind.internal.pm.DSEvalBind.prototype.reportErrorStatus = function(dsErrorMessage)
	{
		var status = null;
		if (dsErrorMessage && dsErrorMessage.length > 0)
		{
			if (dsErrorMessage.indexOf('identifier not found') >= 0 && dsErrorMessage.indexOf(this.getTargetExpression()) >= 0)
			{
				dsErrorMessage = 'Missing identifier: ' + this.getTargetExpression() + ", it cannot be found in the target program's symbols.";
			}
			status = gc.databind.AbstractStatus.createErrorStatus(dsErrorMessage, 'target');
		}
		this.reportCriticalError(status);
	};

	gc.databind.internal.pm.DSEvalBind.prototype.isConnected = function()
	{
		return gc.target.access.isConnected();
	};

}());


