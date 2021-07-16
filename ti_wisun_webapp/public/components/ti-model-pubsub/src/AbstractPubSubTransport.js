/*****************************************************************
 * Copyright (c) 2017 Texas Instruments and others
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *  Raymond Pang - Initial API and implementation
 *****************************************************************/

var gc = gc || {};
gc.databind = gc.databind  || {};

/** 
 */
gc.databind.AbstractPubSubTransport = function() 
{
};

/** 
 */
gc.databind.AbstractPubSubTransport.prototype.connect = function( conn )
{
}

/** 
 */
gc.databind.AbstractPubSubTransport.prototype.disconnect = function()
{
}

/** 
 */
gc.databind.AbstractPubSubTransport.prototype.subscribe = function( topic, opt )
{
}

/** 
 */
gc.databind.AbstractPubSubTransport.prototype.unsubscribe = function( topic, opt )
{
}

/** 
 */
gc.databind.AbstractPubSubTransport.prototype.publish = function( topic, payload, opt )
{
}

