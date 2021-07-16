/*
 * Host side event record
 */
var gc = gc || {};
gc.uia = gc.uia || {};

(function() 
{
	var EventRecord = function() {};
	
	EventRecord.prototype.reset = function() 
	{
		this.eventID = -1;
		this.args = null;
		this.payload = null;
		this.recLength = 0;
		this.type = 0;
		this.priority = 0;
		this.sequenceNum = -1;
		this.moduleID = -1;
		this.timestamp = -1;
		this.payloadSize = 0;
		this.parentModuleID = -1;
		//
		this.endpointID = -1;
		this.processID = -1;
		// Host look up data
		this.moduleName = null;
		this.eventName = null;
		this.formatString = null;
		this.argStrings = null;
		this.parentModuleName = null;
		this.formattedMsg = null;
		//
		this.master = null;
		this.masterID = -1;
		this.loggerID = -1;
		this.idxInLog = -1;
		// 
		this.evtObj = null;
		this.modObj = null;
		this.parentModObj = null;
	};
	EventRecord.prototype.cloneArray = function(src) 
	{
		if(!src) 
		{
			return null;
		}
		var dest = [];
		for(var i = 0; i < src.length; i++ )
		{
			dest.push(src[i]);
		}
		return dest;
	};
	EventRecord.prototype.copy = function(src) 
	{
		this.eventID = src.eventID;
		this.args = this.cloneArray(src.args);	// full copy
		this.payload = this.cloneArray(src.payload);	// full copy	
		// 
		this.recLength = src.recLength;
		this.type = src.type;
		this.priority = src.priority;
		this.sequenceNum = src.sequenceNum;
		this.moduleID = src.moduleID;
		this.timestamp = src.timestamp;
		this.payloadSize = src.payloadSize;
		//
		this.endpointID = src.endpointID;
		this.processID = src.processID;
		//
		this.parentModuleID = src.parentModuleID;
		// 
		this.moduleName = src.moduleName;
		this.eventName = src.eventName;
		this.formatString = src.formatString;
		this.argStrings = src.argStrings;	// shallow copy
		this.parentModuleName = src.parentModuleName;
		// 
		this.formattedMsg = src.formattedMsg;
		// 
		// some object references
		this.evtObj = src.evtObj;
		this.modObj = src.modObj;
		this.parentModObj = src.parentModObj;
	};
	EventRecord.prototype.clone = function() 
	{
		var newObj = new EventRecord();
		newObj.copy(this);
		return newObj;
	};
	
	gc.uia.EventRecord = EventRecord;
}());
