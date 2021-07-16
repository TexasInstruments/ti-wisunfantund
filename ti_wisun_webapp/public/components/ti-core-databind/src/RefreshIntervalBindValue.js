/*****************************************************************
 * Copyright (c) 2015 Texas Instruments and others
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *  Paul Gingrich - Initial API and implementation
 *  Brian Cruickshank - Added preRefresh functionality.
 *****************************************************************/
var gc = gc || {};
gc.databind = gc.databind || {};

/**
 * Listener interface that provides the client with notification when 
 * its time to refresh something.    
 * 
 * @interface
 */ 
gc.databind.IRefreshListener = function()
{
};

/**
 * This method is called when its time to refresh something
 * 
 * @param {gc.databind.IProgressCounter} [progress] - interface for the client to indicate progress of
 * asynchronous operations so the client can determine when the refresh operation is fully completed.
 */
gc.databind.IRefreshListener.prototype.onRefresh = function(progress)
{
};

/**
 * This method is called some amount of time prior to the refresh event.  The amount of time before the 
 * refresh that this event is called is set using the RefreshIntervaleBindValue.setPreRefreshInterval() method.  If no
 * pre-refresh interval is set, then no pre-refresh event is fired.
 *
 * @param {gc.databind.IProgressCounter} [progress] - interface for the client to indicate progress of
 * asynchronous operations so the client can determine when the pre-refresh operation is fully completed.
 */
gc.databind.IRefreshListener.prototype.onPreRefresh = function()
{
};
/** 
 * Class that implements IBindValue for a refresh interval value.  Clients can 
 * set the interval (in milliseconds) by calling setValue().  Also, clients can
 * register for onRefresh() listeners that will be called periodically based on
 * the current refresh interval.  This class is useful for providing the polling
 * events other bindings that need to poll to detect changes. 
 * 
 * @constructor
 * @extends gc.databind.VariableBindValue
 * @implements gc.databind.IValueBind
 */
gc.databind.RefreshIntervalBindValue = function(defaultValue) 
{
	var that = this;
	
	gc.databind.VariableBindValue.call(that, defaultValue || that.fCachedValue);

	that._hasListeners = false;
	
	this._updateListener = function() 
	{
		if (that._preRefreshInterval)
		{
			that.onPreRefresh();
            that._preRefreshTimer = setTimeout(that.onRefresh.bind(that), that._preRefreshInterval);
		} 
		else 
		{
            that.onRefresh();
        }
	};
	
	this._resetTimer = function()
	{
		if (that._preRefreshInterval) 
		{
            clearTimeout(that._preRefreshTimer);
            that._preRefreshTimer = undefined;
        }

		// only restart the timer if we have listeners and a timer is not pending.
		if (that._timer === undefined && that._hasListeners)
		{
		    var delay = that.getValue();
		    if (delay >= 0)
		    {
		        that._timer = setTimeout(that._updateListener, delay);
		    }
		}
	};
}; 

gc.databind.RefreshIntervalBindValue.prototype = new gc.databind.VariableBindValue(100);

/**
 * This method sets the pre-refresh interval.  When set, a pre-refresh event is fired before the actual refresh event. 
 *
 * @param {Number} timeInMs - the amount of time prior to the refresh interval to fire the pre-refresh notification.
 */
gc.databind.RefreshIntervalBindValue.prototype.setPreRefreshInterval = function(timeInMs)
{
	this._preRefreshInterval = timeInMs;
    clearTimeout(this._preRefreshTimer);
    this._preRefreshTimer = undefined;
};

gc.databind.RefreshIntervalBindValue.prototype.excludeFromStorageProviderData = true;

gc.databind.RefreshIntervalBindValue.prototype.onValueChanged = function()
{
	this.excludeFromStorageProviderData = undefined;
	this._resetTimer();  // kick start timer in case new value is not negative.
};

/**
 * Add a preRefresh listener for this bindable object.  Listeners will be notified at some time prior to the 
 * refresh event.  The amount of time prior can be set using the setPreRefreshInterval() method.  If no such interval
 * has been set, then the preRefresh listeners are not called.
 *
 * @param {gc.databind.IRefreshListener} listener - callback that will be called for a pre-refresh event.
 */
gc.databind.RefreshIntervalBindValue.prototype.addPreRefreshListener = function(listener)
{
    this.fEvents.addListener('PreRefresh', listener);
};

/**
 * Add a refresh listener for this bindable object.  Listeners will be notified 
 * periodically based on the refresh interval assigned. 
 *  
 * @param {gc.databind.IRefreshListener} listener - callback that will be notified when it time to refresh.  
 */
gc.databind.RefreshIntervalBindValue.prototype.addRefreshListener = function(listener)
{
	this.fEvents.addListener('Refresh', listener);
};

gc.databind.RefreshIntervalBindValue.prototype.onFirstRefreshListenerAdded = function()
{
	this._hasListeners = true;
	this._resetTimer();  // kick start the timer, if needed.
};

gc.databind.RefreshIntervalBindValue.prototype.onLastRefreshListenerRemoved = function()
{
	this._hasListeners = false;
};

gc.databind.RefreshIntervalBindValue.prototype.dispose = function()
{
	if (this._timer !== undefined)
	{
		clearTimeout(this._timer);
		this._timer = undefined;
	}
    if (this._preRefreshTimer !== undefined)
    {
        clearTimeout(this._preRefreshTimer);
        this._preRefreshTimer = undefined;
    }

};

/**
 * Remove a preRefresh listener for this bindable object that was previously added using
 * addPreRefreshListener() api.
 *
 * @param {gc.databind.IRefreshListener} listener - callback to be removed.
 */
gc.databind.RefreshIntervalBindValue.prototype.removePreRefreshListener = function(listener)
{
    this.fEvents.removeListener('preRefresh', listener);
};
/**
 * Remove a refresh listener for this bindable object that was previously added using
 * addRefreshListener() api.   
 *  
 * @param {gc.databind.IRefreshListener} listener - callback to be removed.  
 */
gc.databind.RefreshIntervalBindValue.prototype.removeRefreshListener = function(listener)
{
	this.fEvents.removeListener('Refresh', listener);
};

gc.databind.RefreshIntervalBindValue.prototype.onPreRefresh = function()
{
    this._preRefreshTimer = undefined; // clear timer for next _resetTimer() call
    this.fEvents.fireEvent('PreRefresh');
};

gc.databind.RefreshIntervalBindValue.prototype.onRefresh = function()
{
	this._timer = undefined; // clear timer for next _resetTimer() call
	var progress = new gc.databind.ProgressCounter(this._resetTimer);
	this.fEvents.fireEvent('Refresh', progress);
	progress.done();
};

gc.databind.RefreshIntervalBindValue.prototype.onDisconnected = function() 
{
    if (this._timer === undefined && this._hasListeners) 
    {
        var delay = this.getValue();
        if (delay < 0) 
        {
            // kick start a refresh in case we aren't polling, and we need to queue up one read operation for the next 
            // time we connect. 
            this._updateListener();
        }
    }
};
