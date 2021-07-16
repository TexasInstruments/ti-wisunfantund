/**
 * This file includes implementation of gc.File operations. If they have already
 * been defined ( implying we are running in GC ) then the implementation is
 * skipped.
 *
 */

var gc = gc || {};
gc.File = gc.File || {};

if (!gc.File._saveFile)
{
    (function() // closure for private static methods and data.
    {
        gc.File._saveFile = function(filePath, data, callback)
        {
            if ( (typeof process != "undefined") && (require))
            {
                var fs = null;
                if (require.nodeRequire) {
                    fs = require.nodeRequire('fs');
                } else {
                    fs = require('fs');
                }
                if (!fs) return;
                fs.writeFile(filePath, data, function(err)
                {
                    if (err)
                    {
                        callback(
                            {
                                localPath : filePath
                            },
                            {
                                message : err
                            });
                    }
                    else
                    {
                        callback(
                            {
                                localPath : filePath
                            }, null);
                    }
                });
            }
            else
            {
                callback(
                    {
                        localPath : filePath
                    },
                    {
                        message : "This API required NodeWebkit!"
                    });
            }
        };

        gc.File._loadFile = function(filePath, file, options, callback)
        {
            var reader = new FileReader();
            reader.onload = function(e)
            {
                callback(e.target.result,
                    {
                        localPath : filePath,
                        name : file.name
                    }, null);
            };
            reader.onerror = function(e)
            {
                callback(null,
                    {
                        localPath : filePath,
                        name : file.name
                    },
                    {
                        message : e.toString()
                    });
            };

            if (options && options.bin)
            {
                reader.readAsArrayBuffer(file);
            }
            else
            {
                reader.readAsText(file);
            }
        };

        /** See Gui Composer for API doc * */
        gc.File.browseAndSave = function(data, fileName, fileFilterOptions, callback, dialog)
        {
            var chooser = dialog || document.querySelector('#fileSaveDialog');
            chooser.value = null;
            if ((chooser.nwsaveas !== undefined) && fileName){
                chooser.nwsaveas = fileName;
            }
            if ((chooser.accept !== undefined) && fileFilterOptions) {
                if (fileFilterOptions.indexOf("*.") >= 0){
                    fileFilterOptions = fileFilterOptions.replace(/\*\./g,".");
                }
                chooser.accept = fileFilterOptions;
            }

            chooser.addEventListener("change", function changeEvtListner(evt)
            {
                var filePath = this.value;
                gc.File._saveFile(filePath, data, callback);
                chooser.removeEventListener("change", changeEvtListner, false);

            }, false);

            chooser.click();
        };

        gc.File.save = function(data, fileInfo, options, callback)
        {
            gc.File._saveFile(fileInfo.localPath, data, function(fileInfo, errorInfo)
            {
                callback(errorInfo);
            });
        };

        gc.File.saveBrowserFile = function(data, options, callback)
        {
            var blob = new Blob(
                [
                    data
                ],
                {
                    type : "text/plain,charset=utf-8"
                });
            saveAs(blob, options && options.filename ? options.filename : "untitled.txt");
        };

        gc.File.browseAndLoad = function(fileInfo, options, callback, dialog)
        {
            var chooser = dialog || document.querySelector('#fileLoadDialog');
            chooser.value = null;

            chooser.addEventListener("change", function changeEvtListner(evt)
            {
                var filePath = this.value;
                var file = this.files[0];
                gc.File._loadFile(filePath, file, options, callback);
                chooser.removeEventListener("change", changeEvtListner, false);

            }, false);

            chooser.click();
        };

        gc.File.browseFolder = function(fileInfo, options, callback, dialog)
        {
            var chooser = dialog || document.querySelector('#chooseDirDialog');
            chooser.value = null;

            chooser.addEventListener("change", function changeEvtListner(evt)
            {
                var filePath = this.value;
                callback(
                    {
                        localPath : filePath
                    }, null);
                chooser.removeEventListener("change", changeEvtListner, false);

            }, false);

            chooser.click();
        };

        var dataProviders = {};

        gc.File.addDataProvider = function(id, callback)
        {
            dataProviders[id] = callback;
        };

        gc.File.removeDataProvider = function(id)
        {
            this.addDataProvider(id, null);
        };

        var readDataForSave = function()
        {
            var data = {};

            for ( var providerName in dataProviders)
            {
                if (dataProviders.hasOwnProperty(providerName))
                {
                    var dataProvider = dataProviders[providerName];

                    data[providerName] = dataProvider.readData();
                }
            }
            return data;
        };

        var writeDataForLoad = function(data)
        {
            for ( var providerName in dataProviders)
            {
                if (dataProviders.hasOwnProperty(providerName))
                {
                    var dataProvider = dataProviders[providerName];
                    var providerData = data[providerName];
                    if (providerData)
                    {
                        dataProvider.writeData(providerData);
                    }
                }
            }
        };

        gc.File.IDataProvider = function()
        {
        };

        gc.File.IDataProvider.prototype.readData = function()
        {
        };

        gc.File.IDataProvider.prototype.writeData = function(data)
        {
        };

        var FileLoadOperation = function(oldData, newData)
        {
            this.oldData = oldData;
            this.newData = newData;
        };

        FileLoadOperation.prototype.undo = function()
        {
            writeDataForLoad(this.oldData);
        };

        FileLoadOperation.prototype.redo = function()
        {
            writeDataForLoad(this.newData);
        };

        FileLoadOperation.prototype.toString = function()
        {
            return "File Load";
        };

        var doFileLoad = function()
        {
            gc.File.browseAndLoad(null, null, function(contents)
            {
                console.log("finished loading file");

                try
                {
                    var data = JSON.parse(contents);
                    var oldData = (gc.history && gc.history.push) ? readDataForSave() : null;
                    var operation = new FileLoadOperation(oldData, data);
                    operation.redo();

                    if (gc.history && gc.history.push)
                    {
                        gc.history.push(operation);
                    }
                }
                catch (e)
                {
                    console.log("Error parsing JSON data file");
                }
            }, loadDialogContext);
        };

        var doFileSave = function()
        {
            var data = readDataForSave();
            var jsonText = JSON.stringify(data, null, 4);

            if (typeof process != "undefined")
            {
                gc.File.browseAndSave(jsonText, null, null, function()
                {
                    console.log("finished saving file");
                }, saveDialogContext);

            }
            else
            {
                var filename = saveDialogContext.getAttribute("nwsaveas");
                gc.File.saveBrowserFile(jsonText,
                    {
                        filename : filename
                    }, function()
                    {
                        console.log("finished saving file");
                    });
            }
        };

        var loadDialogContext;
        gc.File.registerLoadDialog = function(node)
        {
            loadDialogContext = node;
        };
        var saveDialogContext;
        gc.File.registerSaveDialog = function(node)
        {
            saveDialogContext = node;
        };

        gc.nav = gc.nav || {};
        gc.nav.ready = gc.nav.ready || Q.Promise(function(resolve)
        {
            gc.nav.fireReady = resolve;
        });
        gc.nav.ready.then(function()
        {
            gc.nav.registerAction('FileLoad',
                {
                    run : doFileLoad
                });
            gc.nav.registerAction('FileSave',
                {
                    run : doFileSave
                });
        });

    }());

    gc.File.ready = gc.File.ready || Q.Promise(function(resolve)
    {
        gc.File.fireReady = resolve;
    });
    gc.File.fireReady();

    document.dispatchEvent(new CustomEvent("gc-file-ready", { "detail": "File menu helpers are available" }));

}