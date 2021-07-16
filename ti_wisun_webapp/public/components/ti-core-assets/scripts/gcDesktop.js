/***************************************************************************************************
 * Copyright (c) 2016-2018 Texas Instruments and others All rights reserved. This program and the
 * accompanying materials are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors: Brian Cruickshank - Initial API and implementation
 **************************************************************************************************/
var gc = gc || {};
gc.desktop = gc.desktop || {};

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



if (gc.desktop.isDesktop === undefined)
{
    (function() // closure for private static methods and data.
    {
        var gcClipboardStorage = {};

        function _shutdownServer() {
            var xmlhttp = new XMLHttpRequest();
            xmlhttp.onreadystatechange = function () {};
            xmlhttp.open("GET", "/api/shutdown", true);
            xmlhttp.send();
        }

        gc.desktop.isNodeWebkit = function(){
            return (typeof nw !== "undefined");
        }


        gc.desktop.isDesktop = function (is_gcDesigner) {
            /* when the files are served by a webserver, serverConfig is initialized by the server-config.js file */
            var desktop = false;
            var keepAlive = false;
            if (gc.serverConfig != null) {
                desktop = !gc.serverConfig.isOnline;
            }

            /* if running in NW environment, add an NW close handle and shutdown the server */
            if (typeof nw !== "undefined" && !!window.$ti_nw_main_window) {
                 if (!gc.desktop.shutdownHdlr) {
                    gc.desktop.shutdownHdlr = function() {
                        window.dispatchEvent(new CustomEvent('shutdown'));
                        _shutdownServer();
                        this.close(true);
                    };
                    nw.Window.get().on("close", gc.desktop.shutdownHdlr);
                }
            }

            return desktop;
        };
        gc.desktop.isDesktop(); // kick off the server ping

        gc.desktop.isMobileDevice = function () {
            var result = false;
            if ((navigator.app) || (navigator.device)) {
                result = true;
            }

            return result;
        };

        gc.desktop.isCCS = function() {
            var hostname = window.location.hostname;
            return !gc.desktop.isDesktop() && (hostname === 'localhost' || hostname === '127.0.0.1');
        };

        gc.desktop._nw_wins = {};
        gc.desktop.openBrowserWindow = function(url, options /* { width: number, height: number, id: string, frame: boolean } */) {
            const id = options && options.id ? options.id : undefined;
            const width = options && options.width ? options.width : undefined;
            const height = options && options.height ? options.height : undefined;

            if (!gc.desktop.isNodeWebkit()) {
                return Promise.resolve(window.open(url, id, width && height ? { height: height, width: width } : undefined));

            } else {
                // nw.js required absolute path
                if (url.indexOf('http') != 0){
                    var segments = window.location.toString().split('/');
                    segments.pop();
                    segments.push(url);
                    url = segments.join('/');
                }

                if (this._nw_wins[url]) {
                    // TODO: Setting window.location = url will crash the browser with nw.js v0.55.0,
                    //       workaround is to close the nw window and open it again.
                    // @see https://github.com/nwjs/nw.js/issues/7458
                    // this._nw_wins[url].window.location = url;
                    this._nw_wins[url].close();
                }
                // else {
                    return new Promise((resolve) => {
                        nw.Window.open (url, {
                            id: id || url,
                            focus: true,
                            frame: options && typeof options.frame !== 'undefined' ? options.frame : true,
                            min_width: width,
                            min_height: height
                        }, nwWin => {
                            // The OS browser window.open() has an 'opener' available for the child
                            // window, and the closeWindow is relying on this property to determine
                            // if the window is the top most window to quite the nwjs process.
                            nwWin.window.opener = window;

                            this._nw_wins[url] = nwWin;
                            nwWin.on('closed', () => {
                                delete this._nw_wins[url];
                            });
                            resolve(nwWin.window);
                        });
                    });
                // }
            }
        };

        gc.desktop.closeWindow = function(win,quitApp){
            var _win = win || window;
            quitApp = quitApp ? quitApp : !_win.opener;

            // shutdown the server
            if (gc.desktop.isNodeWebkit() && quitApp) {
                _shutdownServer();
                nw.App.quit();
            } else {
                _win.close();
            }
        };
        gc.desktop.minimizeWindow = function(win){
            if (gc.desktop.isNodeWebkit()){
                var _win = nw.Window.get();
                _win.minimize()
            }
        };
        gc.desktop.maximizeWindow = function(win){
            if (gc.desktop.isNodeWebkit()){
                var _win = nw.Window.get();
                _win.maximize()
            }
        };
        gc.desktop.restoreWindow = function(win){
            if (gc.desktop.isNodeWebkit()){
                var _win = nw.Window.get();
                _win.restore();

            }
        };
        gc.desktop.getPathToDesignerFolder = function(){
            return gc.designer.folderName;
        };
        gc.desktop.getPathToWorkspaceFolder = function(){
            return gc.designer.workspace.folderName;
        };
        gc.desktop.isAppPreview = function(){
            return (document.baseURI.indexOf('/gc/preview/') > 0);
        };
        gc.desktop.getPathToProjectFolder = function(pathRelativeToWorkspaceFolder){
            return gc.designer.project.folderName;
        };
        gc.desktop.getPathToComponentsFolder = function(){
            return gc.designer != null ? "designer/components" : "components"; // TODO: which components folder v2 or v3, or both?
        };
        gc.desktop.openExplorer = function(folderPath) {
            var xmlhttp = new XMLHttpRequest();
            xmlhttp.onreadystatechange = function () {};
            xmlhttp.open("GET", "/api/openExplorer?path=" + folderPath, true);
            xmlhttp.send();
        };
        gc.desktop.getOS = function(){
            var os  = 'linux';
            if (navigator.appVersion.indexOf("Mac") != -1) {
                os = 'osx';
            } else if (navigator.appVersion.indexOf("Win")!= -1) {
                os = 'win';
            }
            return os;
        };
        gc.desktop.getPathToSupportedDevicesJson = function() {
            var jsonFilePath = document.baseURI + "components/ti-core-backplane/supported_devices.json";
            return jsonFilePath;
        };
        gc.desktop.getPathToTargetSetupJson = function() {
            var jsonFilePath = document.baseURI + "components/ti-core-backplane/target_setup.json";
            return jsonFilePath;
        };
        gc.desktop.clipboard = {
            set: function(text, type) {
                if (gc.desktop.isNodeWebkit()) {
                    nw.Clipboard.get().set(text, type);
                } else {
                    gcClipboardStorage[type] = text;
                }
            },
            get: function(type) {
                if (gc.desktop.isNodeWebkit()) {
                    return nw.Clipboard.get().get(type);
                } else {
                    return gcClipboardStorage[type];
                }
            }
        };
    }());
}
