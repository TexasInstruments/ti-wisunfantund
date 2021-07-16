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
 * Class that implements IProgressCounter interface to count progress.  
 * This class is constructed with a  
 * callback that will be called when the progress reaches 100%.
 * A single initial job is added to the progress counter automatically.
 * in the constructor.    
 * As a result, the client must call IProgressCounter.done() once to
 * complete the job.  Typically, the client will pass this object
 * around to other parties who may or may not add their own jobs
 * to the progress counter.  Only when all jobs are completed will
 * the client recieve the callback.   
 *
 * @constructor
 * @implements gc.databind.IProgressCounter
 * 
 * @param {IFinished} callback - callback interface to call when progress reaches 100%. 
 */
gc.databind.ProgressCounter = function(callback)
{
	this._callback = callback;
	this._jobCount = 1;
	this._jobsDone = 0;
};

gc.databind.ProgressCounter.prototype = new gc.databind.IProgressCounter();

gc.databind.ProgressCounter.prototype.wait = function(jobs)
{
	jobs = jobs || 1;
	this._jobCount += jobs;
};

gc.databind.ProgressCounter.prototype.done = function(jobs)
{
	jobs = jobs || 1;
	this._jobsDone += jobs;
	
	if (this._jobsDone === this._jobCount && this._callback !== undefined)
	{
		this._callback();
	}
};

gc.databind.ProgressCounter.prototype.getProgress = function()
{
	return 100 * this._jobsDone / this._jobCount;
};
