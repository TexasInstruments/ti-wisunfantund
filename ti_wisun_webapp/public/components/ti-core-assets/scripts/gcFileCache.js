/***************************************************************************************************
 * Copyright (c) 2015, 2019 Texas Instruments and others All rights reserved. This program and the
 * accompanying materials are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 *
 * This utility class is deprecated, there will not be any caching ontop of what is supported by the
 * browser cache.
 *
 *
 *
 * Contributors: Paul Gingrich - Initial API and implementation
 *               Patrick Chuong - Deprecating the implementation
 **************************************************************************************************/
var gc = gc || {};
gc.fileCache = gc.fileCache || {};
if (window.parent != window)
{
    window.parent.gc = window.parent.gc || {};
    window.parent.gc.app = gc;
}

if (window.parent.gc)
{
    // take the designer from the parent iframe, if available.
    gc.designer = gc.designer || window.parent.gc.designer;
}
if (window.global && global.document && global.document.gc)
{
    // take the designer from the global node-webkit document if available
    gc.designer = gc.designer || global.document.gc.designer;
}

if (gc.fileCache.readJsonFile === undefined)
{
	(function() // closure for private static methods and data.
	{
		var saveFile = function(fileURL, data, formatter)
		{
            if (fileURL.indexOf('/') !== 0 && gc.designer && gc.designer.project && gc.designer.project.folderName)
            {
            	fileURL = gc.designer.project.folderName + '/' + fileURL;
            }

            if (data)
            {
                var req = new XMLHttpRequest();

                req.onerror = function(event) {
                    var message = 'gcFileCache failed to write file contents due to: ' + event.error;
                    console.log(message);
                };

                req.open('PUT', fileURL, true);
                req.send(formatter(data));
            }
		}

	    var loadFile = function(fileURL, parser, responseType)
	    {
            if (fileURL.indexOf('http') !== 0 && fileURL.indexOf('/') !== 0 && gc.designer && gc.designer.project && gc.designer.project.folderName)
            {
            	fileURL = gc.designer.project.folderName + '/' + fileURL;
            }

            return Q.Promise(function(resolve, reject)
            {
                var xmlHttp = new XMLHttpRequest();
                xmlHttp.onloadend = function()
                {
                    if (xmlHttp.readyState === 4 && (xmlHttp.status === 200 || xmlHttp.status === 0))
                    {
                        var data;
                        try
                        {
                            data = parser(responseType ? xmlHttp.response : xmlHttp.responseText);
                            resolve(data);
                        }
                        catch(e)
                        {
                            console.log('gcFileCache parse error: ' + e.toString());
                            gc.fileCache.unloadFile(fileURL,true);
                            reject(e);
                        }
                    }
                    else
                    {
                        gc.fileCache.unloadFile(fileURL,true);
                        reject("Can't read file: " + fileURL + ".  Status Code = " + xmlHttp.status);
                    }
                };

                xmlHttp.open("GET", fileURL, true);
                if (responseType)
                {
                    xmlHttp.responseType = responseType;
                }
                xmlHttp.send();

            });
	    };

	    gc.fileCache.readJsonFile = function(fileURL)
	    {
	    	return loadFile(fileURL, JSON.parse);
	    };

	    var jsonFormater = function(jsonData)
	    {
	    	return JSON.stringify(jsonData, null, 4);
	    }

	    gc.fileCache.writeJsonFile = function(fileURL, jsonData)
	    {
	    	return saveFile(fileURL, jsonData, jsonFormater);
	    }

	    var nullParser = function(data)
	    {
	    	return data;
	    };

	    gc.fileCache.readTextFile = function(fileURL)
	    {
	    	return loadFile(fileURL, nullParser);
	    };

	    gc.fileCache.writeTextFile = function(fileURL, textData)
	    {
	    	return saveFile(fileURL, textData, nullParser);
	    }

	    gc.fileCache.readBinaryFile = function(fileURL)
	    {
	    	return loadFile(fileURL, nullParser, 'blob');
	    };

	    gc.fileCache.getProjectName = function()
	    {
        	var projectName;
        	if (gc.designer)
        	{
        		projectName = gc.designer.project.name;
        	}
        	else
        	{
        		var regEx = /\/([^\/]+)\/([^\/]+)$/;
                var projectName = window.location.pathname;
                var match = projectName.match(regEx);
                if (match)
                {
                	projectName = match[1];
                }
        	}
	    	return projectName;
	    };

	    gc.fileCache.unloadFile = function(fileURL, dontPropagateToParentChildFrames)
	    {
	    	/* do nothing, keep API for backward compatible */
	    };
    }());
}

