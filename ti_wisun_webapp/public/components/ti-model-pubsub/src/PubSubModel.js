/*****************************************************************
 * Copyright (c) 2017 Texas Instruments and others
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * pubsub://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *  Raymond Pang - Initial API and implementation
 *****************************************************************/
var gc = gc || {};
gc.databind = gc.databind || {};


(function() // closure for private static methods and data.
{
    var PubSubTopicBind = function(name, viewInstance)
    {
    	gc.databind.VariableLookupBindValue.call(this);
    	this.setStale(true);
	  	this.pubsubViewInstance = viewInstance;
    };
    
    PubSubTopicBind.prototype = new gc.databind.VariableLookupBindValue();

    PubSubTopicBind.prototype.onValueChanged = function(oldValue, newValue, progress)
    {
        this.sendValue( newValue , progress);
    };
    
 	PubSubTopicBind.prototype.sendValue = function(value, progress) 
    {
        var jsonString = JSON.stringify(value);
        if (this.pubsubViewInstance)
        {
        	var topic = this.getName();
        	this.pubsubViewInstance.sendTopic( topic, jsonString);
        }
        else 
        {
            gc.console.log('Discarded tx data: ' + jsonString);
        }
    };

    gc.databind.PubSubModel = function(name, viewInstance) 
	{
	  	gc.databind.AbstractStreamingDataModel.call(this, name);
	  	this.init();
	  	this.pubsubViewInstance = viewInstance;
	};
	
	gc.databind.PubSubModel.prototype = new gc.databind.AbstractStreamingDataModel('pubsub');
	
	gc.databind.PubSubModel.prototype.createNewBind = function(name)
	{
		if (this.pubsubViewInstance.isTopicName( name ) )
		{
			return new PubSubTopicBind(name, this.pubsubViewInstance);
		}
		else
		{
			return gc.databind.AbstractStreamingDataModel.prototype.createNewBind.call(this, name);
		}
	};
}());






