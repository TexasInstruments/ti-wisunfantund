/*****************************************************************
 * Copyright (c) 2015 Texas Instruments and others
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *  Paul Gingrich - Initial API and implementation
 *****************************************************************/
var gc = gc || {};
/** @namespace */
gc.widget = gc.widget || {};

/** 
 * A Status Indicator is used to show error, warning, and info messages overlaid on
 * any widget.  This interfaces allows clients to add and remove messages as needed
 * on a particular status indicator.  An error widget will be created and destroyed
 * as needed to show error, warning, or info messages.
 * 
 *	@interface
 */
gc.widget.IStatusIndicator = function()
{
};

/**
 *  There are three status indicator types - error, warning, or information. 
 *  Different types are displayed with different visual cues in the widgets.
 *  
 *  @enum {string}
 */
gc.widget.StatusIndicatorType = 
{
	/** An error status type */
	ERROR: "error",
	/** A warning status type */
	WARNING: "warning",
	/** An informative status type */
	INFO: "information"
};

/**
 * Add a status messages to be displayed to the user for this indicator.  Old message 
 * are not lost, but may be hidden by the new status message if there isn't room to show
 * all status messages for a given indicator.  If no type is provided, error is assumed.
 *  
 * @param {string} message - the new message to be added to this status indicator.
 * @param {gc.widget.StatusIndicatorType} [type] the type of new message to be added to this status indicator.
 */
gc.widget.IStatusIndicator.prototype.addMessage = function(message, type)
{
};

/**
 * Remove a status messages previously added to this indicator.  If there are more
 * than one message added to an indicator, the other status messages will not be lost.
 *  
 * @param {string} message - the old message to remove from this status indicator.
 */
gc.widget.IStatusIndicator.prototype.removeMessage = function(message)
{
};

/**
 * @namespace
 */
gc.widget.StatusIndicator = {};

/**
 * Factory object used to retrieve status indicators for a given widget.
 * 
 * @namespace
 */
gc.widget.StatusIndicator.Factory = {};

/**
 * Factory method to create/retrieve status indicators for a particular widget The widget 
 * 
 * @param {object} widget - the the widget to get a status indicator for.
 * @return {gc.widget.IStatusIndicator} the status indicator created for this widget, or null if no widget found.
 */
gc.widget.StatusIndicator.Factory.get = function(widget)
{			
	return gc.widget.internal.StatusIndicator.factory.get(widget);
};
