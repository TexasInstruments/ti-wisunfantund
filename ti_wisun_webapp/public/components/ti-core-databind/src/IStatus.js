/*****************************************************************
 * Copyright (c) 2013-2014 Texas Instruments and others
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

/** 
 * Additional information like error or warning message that the model can provide 
 * to the widget. Most GUI Composer widgets show the status as a small error or 
 * warning icon to the top left of the widget.
 * 
 *	@interface
 */
gc.databind.IStatus = function()
{
};

/**
 *  There are two status types - error or warning. 
 *  Different types are displayed with different visual cues in the widgets.
 *  
 *  @enum {number}
 */
gc.databind.StatusType = 
{
	/** An error status type */
	ERROR: 0,
	/** A warning status type */
	WARNING: 1
};

/**
 *  There are two status types - error or warning. 
 *  Different types are displayed with different visual clues in the widgets.  
 *  
 * @return {gc.databind.StatusType} the type of this status: ERROR or WARNING.
 */
gc.databind.IStatus.prototype.getType = function()
{
};

/**
 * The messages displayed to the user when she hovers the status icon with the mouse. 
 *  
 * @return {string} the messages displayed to the user when she hovers the status icon with the mouse.
 */
gc.databind.IStatus.prototype.getMessage = function()
{
};

/**  
 * Unique string that can be used to identify the type of error or warning 
 * in client's scripts. Once ids are defined they should not be changed because 
 * older scripts will expect the previously published values. 
 * 
 * Can be an empty string. It can be specific to a given model or shared between models.
 * 
 * @return {string} an unique string that can be used to identify the type of error in client's scripts.
 */
gc.databind.IStatus.prototype.getId = function()
{
};
