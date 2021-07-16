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
 * <p>This interface represents a progress counter.  The progress is determined by the number of jobs to do, and
 * the number of jobs already completed.  Users can add their own jobs to the count, and indicate when the 
 * jobs are complete.      

 * <p>Clients do not implement this class directly. 
 * They need to inherit from AbstractProgressCounter instead.</p>   
 * 
 *  @interface
 *  @extends IBindValue
 */
gc.databind.IProgressCounter = function()
{
};

/**
 * Method to increase the count of jobs to do.  
 * 
 * @param {number} [jobs=1] - the number of new jobs to wait for completion on.
 */
gc.databind.IProgressCounter.prototype.wait = function(jobs)
{
};

/**
 * Method to increase the count of jobs completed that have been completed.  
 * 
 * @param {number} [jobs=1] - the number of jobs that have been completed.
 */
gc.databind.IProgressCounter.prototype.done = function(jobs)
{
};

/**
 * Method to retrieve the current number of jobs completed as a percentage of the total jobs.
 * if there are no jobs to do at all, the percentage will be 100%.  
 * 
 * @return {number} - the percentage of jobs that have been completed.  A number between 0 and 100.
 */
gc.databind.IProgressCounter.prototype.getProgress = function()
{
};


