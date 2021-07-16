/*****************************************************************
 * Copyright (c) 2016-2019 Texas Instruments and others
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *  Paul Gingrich - Initial API and implementation
 *****************************************************************/
var gc = gc || {};
gc.databind = gc.databind || {};
gc.databind.internal = gc.databind.internal || {};
gc.services = gc.services || {};

(function()
{
    var ComponentName = 'gc.connectionManager';

    var Sequencer = function(name)
    {
        this._name = name;
        this._deferred = Q.defer();
        this._scheduler = this._deferred.promise;
        this._events = {};
     };

    Sequencer.prototype.start = function()
    {
        this._deferred.resolve();
    };

    var doStart = function(name)
    {
        if (name)
        {
            var event = this._events[name];
            if (!event)
            {
                name = name + '.$after';
                event = this._events[name];
            }
            if (event)
            {
                window.setTimeout(function()
                {
                    this._events[name] = undefined;

                    gc.console.debug(ComponentName, 'starting event ' + name);

                    event.start();
                }.bind(this), 1);
                event.thenDo(doStart.bind(this, name + '.$after'));
                return event._scheduler;
            }
        }
    };

    Sequencer.prototype.when = function(eventName)
    {
        this.schedule(eventName);
        return this._events[eventName];
    };

    Sequencer.prototype.after = function(eventName)
    {
        return this.when(eventName + '.$after');
    };

    Sequencer.prototype.thenDo = function(action)
    {
        if (action instanceof String || typeof action === 'string')
        {
            this.schedule(action);
        }
        else
        {
            this._scheduler = this._scheduler.finally(action);
        }
        return this;
    };

    Sequencer.prototype.schedule = function(eventName, action)
    {
        var event = this._events[eventName];
        if (!event)
        {
            this.thenDo(doStart.bind(this, eventName));
            event = new Sequencer(eventName);
            if (action)
            {
                event.thenDo(action);
            }
            this._events[eventName] = event;
        }
        return this;
    };

    var DISCONNECTED = 'disconnected';
    var CONNECTED = 'connected';
    var CONNECTING = 'connecting';
    var DISCONNECTING = 'disconnecting';

    var ITargetConnection = function()
    {
    };

    ITargetConnection.prototype.doConnect = function() {};
    ITargetConnection.prototype.doDisconnect = function() {};
    ITargetConnection.prototype.shouldAutoConnect = function() {};

    var AbstractTargetConnection = function()
    {
        this.status = DISCONNECTED;
    };

    AbstractTargetConnection.prototype = new ITargetConnection();

    AbstractTargetConnection.prototype.canConnect = function()
    {
        return this.status === DISCONNECTED || this.status === DISCONNECTING;
    };

    AbstractTargetConnection.prototype.shouldAutoConnect = function()
    {
        return this.status === CONNECTING || this.status === CONNECTED;
    };

    var resetOnEventHandlers = function()
    {
        this.onDisconnected = AbstractTargetConnection.prototype.onDisconnected;
        this.onConnected = AbstractTargetConnection.prototype.onConnected;
    };

    var completed = Q();
    
    AbstractTargetConnection.prototype._disconnectingPromise = completed;
    AbstractTargetConnection.prototype._connectingPromise = undefined;

    AbstractTargetConnection.prototype.connect = function(selectedDevice, preventClientAgentInstallCallback)
    {
        if (this.canConnect())
        {
            var self = this;
            
            this._connectingPromise = this._connectingPromise || this._disconnectingPromise.finally(function() 
            {
                self.status = CONNECTING;
                self._progressData = {};
                startProgressBar();
                
                return self.doConnect(selectedDevice, preventClientAgentInstallCallback).then(function()
                {
                    if (self.status === CONNECTING)
                    {
                        self.status = CONNECTED;
                    }
                    if (self.setConnectedState)
                    {
                        self.onConnected = self.setConnectedState.bind(self, true);
                        self.onDisconnected = self.setConnectedState.bind(self, false);
                    }
                    else
                    {
                        resetOnEventHandlers.call(self);
                    }
                }).fail(function(msg)
                {
                    resetOnEventHandlers.call(self);
                    self.disconnect();
                    throw msg;
                }).finally(function() 
                {
                    self._progressData.lastProgressMessage = undefined;
                    self._connectingPromise = undefined;
                    stopProgressBar();
                });
            }); 
        }
        return this._connectingPromise || completed;
    };

    AbstractTargetConnection.prototype.disconnect = function()
    {
        if (!this.canConnect())
        {
            this.status = DISCONNECTING;
            this.onDisconnected(); // force the current operation i.e., connect() to terminate, so the disconnect can proceed.
            gc.connectionManager.setConnectedState(this.id, false);

            startProgressBar();
            
            var self = this;
            this._disconnectingPromise = this.doDisconnect().finally(function()
            {
                self._progressData = self._progressData || {};
                self._progressData.lastProgressMessage = undefined;
                self._progressData.connectionMessage = undefined;
                
                if (self.status === DISCONNECTING)
                {
                    self.status = DISCONNECTED;
                }
                resetOnEventHandlers.call(self);
                stopProgressBar();
            });
        }
        return this._disconnectingPromise;
    };

    var noop = function() {};

    AbstractTargetConnection.prototype.onConnected = noop;
    AbstractTargetConnection.prototype.onDisconnected = noop;
    
    AbstractTargetConnection.prototype.doConnect = function(selectedDevice, preventClientAgentInstallCallback)
    {
        return Q.promise(function(resolve, reject)
        {
            this.onDisconnected = reject;
            this.onConnected = resolve;

            this.startConnecting(selectedDevice, preventClientAgentInstallCallback);
        }.bind(this));
    };

    AbstractTargetConnection.prototype.doDisconnect = function()
    {
        return Q.promise(function(resolve, reject)
        {
            this.onDisconnected = resolve;
            this.onConnected = noop;

            this.startDisconnecting();
        }.bind(this));
    };

    AbstractTargetConnection.prototype.startConnecting = function()
    {
        this.onConnected();
    };

    AbstractTargetConnection.prototype.startDisconnecting = function()
    {
        this.onDisconnected();
    };

    AbstractTargetConnection.prototype.isBackplaneReady = function(backplane)
    {
        backplane = backplane || gc.services['ti-core-backplane'];
        return backplane && backplane.isConnectedToCloudAgent;
    };

    var backplaneConnectionCount = 0;
    AbstractTargetConnection.prototype.startBackplane = function(deviceInfo, preventClientAgentInstallCallback)
    {
        var appBackplane = gc.services['ti-core-backplane'];
        var designerBackplane = window.parent.gc && window.parent.gc.services && window.parent.gc.services['ti-core-backplane'];
        if (designerBackplane && designerBackplane !== appBackplane)
        {
            designerBackplane._inDesigner = true;
            gc.services['ti-core-backplane'] = designerBackplane;
        }
        if (designerBackplane && this.backplane && this.backplane !== designerBackplane)
        {
            this.backplane = designerBackplane;
        }

        gc.connectionManager.sequencer.schedule('backplaneReady').schedule('downloadProgram').schedule('targetReady');

        if (backplaneConnectionCount === 0)
        {
            var that = this;

            gc.console.log(ComponentName, 'Starting the backplane.');
            gc.connectionManager.sequencer.when('backplaneReady').thenDo(function()
            {
                var id = 'ti-core-backplane';
                var backplane = gc.services[id];
                gc.connectionManager.setProgressMessage(id, 'Connecting to TI Cloud Agent...');
                return backplane.connect(deviceInfo, preventClientAgentInstallCallback).then(function()
                {
                    if (that.isBackplaneReady(backplane))
                    {
                        gc.connectionManager.setProgressMessage(id, 'Connected to TI Cloud Agent.');
                    }
                    return backplane;
                }).fail(function()
                {
                    if (that.shouldAutoConnect())
                    {
                        gc.connectionManager.setErrorMessage(id, "Failed to connect to TI Cloud Agent.", "", backplane.getErrorStatus());
                    }
                });
            });
        }
        backplaneConnectionCount++;
    };

    AbstractTargetConnection.prototype.stopBackplane = function()
    {
        backplaneConnectionCount--;
        if (backplaneConnectionCount === 0)
        {
            gc.console.log(ComponentName, 'Stopping the backplane.');
            gc.services['ti-core-backplane'].disconnect();
        }
    };

    AbstractTargetConnection.prototype.waitForEvent = function(target, eventName, passPropertyName, passPropertyValue, failPropertyName, failPropertyValue)
    {
        return Q.promise(function(resolve, reject)
        {
            gc.console.debug(ComponentName, 'waitForEvent started for ' + eventName);

            // if we are not trying to connect, then abort this operation too.
            if (!this.shouldAutoConnect())
            {
                gc.console.debug(ComponentName, 'waitForEvent cancelled for ' + eventName);
                reject();
                return;
            }

            var listener;

            // chain the disconnected handler to quit the waitForEvent promise if the user disconnects in the middle of it.
            var disconnectedHandler = this.onDisconnected;
            this.onDisconnected = function()
            {
                target.removeEventListener(eventName, listener);
                this.onDisconnected = disconnectedHandler;
                gc.console.debug(ComponentName, 'waitForEvent aborted for ' + eventName);
                reject();
                disconnectedHandler();
            }.bind(this);

            listener = function()
            {
                if (!passPropertyName || target[passPropertyName] === passPropertyValue)
                {
                    target.removeEventListener(eventName, listener);
                    gc.console.debug(ComponentName, 'waitForEvent resolved for ' + eventName);
                    this.onDisconnected = disconnectedHandler;
                    resolve();
                }
                if (failPropertyName && target[failPropertyName] === failPropertyValue)
                {
                    target.removeEventListener(eventName, listener);
                    this.onDisconnected = disconnectedHandler;
                    gc.console.debug(ComponentName, 'waitForEvent failed for ' + eventName);
                    reject();
                }
            }.bind(this);
            target.addEventListener(eventName, listener);
            if (passPropertyName)
            {
                listener();
            }
        }.bind(this));
    };

    AbstractTargetConnection.prototype.addConsoleMessage = function(message, type, tooltip, toast, connectionMgr)
    {
        connectionMgr = connectionMgr || gc.connectionManager;

        this._progressData = this._progressData || {};

        if (type === 'error') {
            this._progressData.lastErrorMessage = message;
        } else if (type === 'info') {
            this._progressData.lastProgressMessage = message;
        }
        
        connectionMgr.addConsoleMessage(message, type, this.id, tooltip, toast);
    };

    AbstractTargetConnection.prototype.addConsoleError = function(errMsg, tooltip, toast, connectionMgr)
    {
        this.addConsoleMessage(errMsg, 'error', tooltip, toast, connectionMgr);
    };

    AbstractTargetConnection.prototype.addConsoleProgress = function(message, tooltip, connectionMgr)
    {
        this.addConsoleMessage(message, 'info', tooltip, undefined, connectionMgr);
    };

    var connections = {};

    var isTransportOptional = function(transport) 
    {
        // remap program loader transports to their associated transport, if there is one, for determining optional or not.
        // we don't want the connection manager to fail to connect because a programLoader failed to load a program for an
        // optional transport.
        if (transport.tagName && transport.tagName.toLowerCase() === 'ti-core-programloader' && transport.transportId) 
        {
            transport = connections[transport.transportId] || transport;
        }
        return transport.optional;
    };

    var doComputeConnectedState = function()
    {
        var result = true;
        for(var id in connections)
        {
            if (connections.hasOwnProperty(id))
            {
                var connection = connections[id];
                if (connection && !isTransportOptional(connection) && connection._progressData && connection._progressData.connectedState !== undefined)
                {
                    result = result && connection._progressData.connectedState;
                }
            }
        }
        return result;
    };

    var doComputeConnectionMessage = function()
    {
        var result = '';
        for(var id in connections)
        {
            if (connections.hasOwnProperty(id))
            {
                var connection = connections[id];
                if (connection && connection._progressData && connection._progressData.connectionMessage)
                {
                    if (result.length > 0)
                    {
                        result += ', ';
                    }
                    result += connection._progressData.connectionMessage;
                }
            }
        }
        return result;
    };

    var events = {};

    var fireEvent = function(event, detail)
    {
        var listeners = events[event] || [];
        for(var i = listeners.length; i-- > 0; )
        {
            var listener = listeners[i];
            try
            {
                listener.call(listener, { detail: detail }, detail);
            }
            catch(e)
            {
                console.error(e);
            }
        }
    };

    var progressPercent = 0;
    var progressUpdateTimer;
    var progressReferenceCounter = 0;

    var updateProgress = function()
    {
        // stop progress when cloud agent install dialog is showing.
        var backplane = gc.services['ti-core-backplane'];
        if (backplane && !backplane.isCloudAgentDownloadBtnVisible)
        {
            progressUpdateTimer = window.setTimeout(updateProgress, 60);
            progressPercent += 0.5;

            if (progressPercent > 100) {
                progressPercent = progressPercent-100;
            }

            fireEvent('progress-updated', { progress: progressPercent });
        }
    };

    var startProgressBar = function()
    {
        if (progressReferenceCounter === 0) 
        {
            progressPercent = 0;
            updateProgress();
        }
        progressReferenceCounter++;
        computeStatus();
    };

    var stopProgressBar = function()
    {
        if (--progressReferenceCounter === 0) 
        {
            if (progressUpdateTimer)
            {
                window.clearTimeout(progressUpdateTimer);
            }
            progressPercent = 0;
        }
        computeStatus();
    };
    
    var getMultiTransportProgressOverviewMessage = function() 
    {
        var transportCount = 0;          // counter for number of ti-transport-xxx instances.
        var hasProgressMessage = false;  // non ti-transport-xxx still has progress to display.
        var transportsConnected = 0;     // counter for number of ti-trasnport-xxx instances already connected.
        
        for(var id in connections)
        {
            if (connections.hasOwnProperty(id))
            {
                var connection = connections[id];
                if (connection)
                {
                    if (isTransportConnection(connection)) 
                    {
                        transportCount++;
                        if (connection.status === CONNECTED) 
                        {
                            transportsConnected++;
                        }
                    }
                    else if (connection._progressData && connection._progressData.lastProgressMessage) 
                    {
                        hasProgressMessage = true;
                        break;
                    }
                }
            }
        }
        
        // show a summary message in the case where we have multiple transports and no other connection has any progress to report.  This way
        // we can get the following sequence, "Connecting to TI Cloud Agent...", "Connected to TI Cloud Agent", "Downloading program ...", "Download successful", 
        // "connecting 0 of 3 transports.", "connecting 1 of 3 transports.", "connecting 2 of 3 transports.", and finally "hardware connected."
        if (!hasProgressMessage && transportCount > 1) 
        {
            // if no other progress for non ti-transport-xxx's, and more than one ti-transport-xxx, use a summary message
            return "connecting to " + (transportsConnected + 1) + " of " + transportCount + ' targets.';
        }
    };
    
    var getConnectionStatusIconName = function(status, isConnectionOK) {
        switch(status) 
        {
            case CONNECTED:
                if (isConnectionOK === undefined) 
                {
                    isConnectionOK = true;
                }
                return isConnectionOK ? "ti-core-icons:link" : "ti-core-icons:link-off";
            case CONNECTING:
                return "ti-core-icons:link-pending";
            default:
                return "ti-core-icons:nolink";
        }
    };

    var toastMessage = "";

    var doUpdateStatusBar = function()
    {
        var statusString1 = "";
        var statusString2 = "";
        var tooltipStatusString1 = "";
        var tooltipStatusString2 = "";
        var tooltipIconImage = "";
        var isConnected;

        var status = gc.connectionManager.status;
        var progressData = gc.connectionManager._progressData || {};

        if (status === CONNECTED)
        {
            isConnected = doComputeConnectedState();
            if (isConnected) 
            {
                statusString2 = gc.connectionManager.isPartiallyConnected ? "Hardware Partially Connected." : "Hardware Connected.";
            }
            else
            {
                statusString2 = progressData.lastProgressMessage || "Hardware not Connected.";
            }
            tooltipStatusString1 = tooltipStatusString2 = statusString1 = doComputeConnectionMessage();

            tooltipIconImage = isConnected ? 'Click to Disconnect.' : 'Click to Connect to Hardware.';
        }
        else if (status === CONNECTING)
        {
            tooltipIconImage = "Connecting...";
            statusString1 = doComputeConnectionMessage();
            if (progressData.lastErrorMessage)
            {
                statusString2 = progressData.lastErrorMessage;
                tooltipStatusString2 = progressData.lastErrorTooltip || "";

                if (progressData.lastErrorToast)
                {
                    toastMessage = progressData.lastErrorToast;
                    progressData.lastErrorToast = undefined;
                }
            }
            else if (progressData.lastProgressMessage !== statusString1)
            {
                statusString2 = getMultiTransportProgressOverviewMessage() || progressData.lastProgressMessage || "";
                tooltipStatusString2 = progressData.lastProgressTooltip || "";
            }
            else
            {
                statusString2 = "";
                tooltipStatusString2 = "";
            }
        }
        else // DISCONNECTING OR DISCONNECTED
        {
            if (progressData && progressData.lastErrorMessage)
            {
                tooltipStatusString1 = "";
                statusString1 = "Hardware not Connected.";
                statusString2 = gc.connectionManager.getConnections().length > 1 ? "" : progressData.lastErrorMessage;
                tooltipStatusString2 = progressData.lastErrorTooltip || "";
            }
            else
            {
                statusString2 = "Hardware not Connected.";
                tooltipStatusString1 = statusString1 = "";
                tooltipStatusString2 = "";
            }

            tooltipIconImage = "Click to Connect to Hardware.";
        }

        var detail =
        {
            progress: progressPercent,
            statusMessage1: statusString1 || "",
            statusMessage2: statusString2 || "",
            tooltip1: tooltipStatusString1 || tooltipStatusString2 || "",
            tooltip2: tooltipStatusString2 || tooltipStatusString1 || "",
            iconName: getConnectionStatusIconName(status, isConnected),
            errorMessage: toastMessage,
            status: status
        };

        fireEvent('status-updated', detail);
    };

    var doSetConnectionMessage = function(transport, message, tooltip)
    {
        transport._progressData = transport._progressData || {};
        if (transport._progressData.connectionMessage !== message)
        {
            transport._progressData.connectionMessage = message;
            transport._progressData.connectionTooltip = tooltip;
            if (message)
            {
                transport.addConsoleMessage('connecting to ' + message, 'debug');
            }
            doUpdateStatusBar();
        }
    };

    var skipHardwareNotConnectedMessage = false;

    var doSetConnectedState = function(transport, connected)
    {
        if (transport)
        {
            transport._progressData = transport._progressData || {};
            if (transport._progressData.connectedState !== connected)
            {
                var displayProgress = connected || (transport._progressData.connectedState !== undefined && !skipHardwareNotConnectedMessage);
                transport._progressData.connectedState = connected;
                if (displayProgress)
                {
                    transport.addConsoleMessage(connected ? 'Hardware Connected.' : 'Hardware Not Connected.', 'console', 'debug');
                }
                else
                {
                    doUpdateStatusBar();
                }

                if (transport.onConnectedStateChanged)
                {
                    transport.onConnectedStateChanged(connected);
                }

				// disconnect transport if connection lost while connected, except in CCS
                if (!connected && transport.status === CONNECTED && !(gc.desktop && gc.desktop.isCCS()))
                {
                    gc.connectionManager.toggleTransportConnectedState(transport);
                }
            }
        }
    };

    var ConnectionManager = function()
    {
        AbstractTargetConnection.call(this);
    };

    ConnectionManager.prototype = new AbstractTargetConnection();

    ConnectionManager.prototype.addEventListener = function(event, handler)
    {
        events[event] = events[event] || [];
        events[event].push(handler);
    };

    ConnectionManager.prototype.removeEventListener = function(event, handler)
    {
        var listeners = events[event] || [];
        for(var i = listeners.length; i-- > 0; )
        {
            if (listeners[i] === handler)
            {
                listeners.splice(i, 1);
            }
        }
    };
    
    var isTransportConnection = function(connection) 
    {
        return connection.tagName && connection.tagName.toLowerCase().startsWith('ti-transport');
    };
    
    var computeStatus = function()
    {
        var state = { required: CONNECTED, optional: DISCONNECTED };
        var transportsConnectedCount = 0;
        for(var id in connections)
        {
            if (connections.hasOwnProperty(id))
            {
                var connection = connections[id];
                if (connection && isTransportOptional(connection))
                {
                    /*
                    *       Optional                    Each Optional TargetConnection
                    *         State      |   CONNECTED      CONNECTING    DISCONNECTED   DISCONNECTING 
                    *     -----------------------------------------------------------------------------
                    *  *   DISCONNECTED  |   CONNECTED      CONNECTING    DISCONNECTED   DISCONNECTING  
                    *  |   DISCONNECTING |   CONNECTED      CONNECTING    DISCONNECTING  DISCONNECTING 
                    *  |   CONNECTING    |   CONNECTED      CONNECTING     CONNECTING     CONNECTING    
                    *  V   CONNECTED     |   CONNECTED      CONNECTED      CONNECTED      CONNECTED           
                    *
                    *  The way this works, is that the connectionManager starts with the optional state == DISCONNECTED.  
                    *  Then for each transport, one at a time, the optional state is modified based on the table above.  
                    *  This state always progresses down each row, so that the state cannot go up from DISCONNECTING to DISCONNECTED 
                    *  or up from CONNECTED to CONNECTING.  As a result, the state will only be disconnected when all optional transports 
                    *  are in the DISCONNECTED state, and the state will become CONNECTED if any optional transport is CONNECTED.
                    */
                    if (connection.status === CONNECTED) 
                    {
                        if (isTransportConnection(connection)) 
                        {
                            transportsConnectedCount++;
                        }
                        state.optional = CONNECTED;
                    }
                    else if (connection.status === CONNECTING || state.optional === CONNECTING) 
                    {
                        state.optional = CONNECTING;
                    }
                    else if (connection.status === DISCONNECTING || state.optional === DISCONNECTING) 
                    {
                        state.optional = DISCONNECTING;
                    }
                } 
                else if (connection)  // required connection
                {
                    /*       Required                    Each Required TargetConnection
                    *         State      |   CONNECTED      CONNECTING    DISCONNECTED   DISCONNECTING 
                    *     -----------------------------------------------------------------------------
                    *  *   CONNECTED     |   CONNECTED      CONNECTING    DISCONNECTED   DISCONNECTING     
                    *  |   CONNECTING    |   CONNECTING     CONNECTING    DISCONNECTED   DISCONNECTING    
                    *  |   DISCONNECTED  |  DISCONNECTED   DISCONNECTED   DISCONNECTED   DISCONNECTING  
                    *  V   DISCONNECTING |  DISCONNECTING  DISCONNECTING  DISCONNECTING  DISCONNECTING 
                    *
                    *  The way this works, is that the connectionManager starts with the required state == CONNECTED.  
                    *  Then for each transport, one at a time, the required state is modified based on the table above.  
                    *  This state always progresses down each row, so that the state cannot go up from CONNECTING to CONNECTED or up from 
                    *  DISCONNECTING to DISCONNECTED.  As a result, the state will only be connected when all required transports are in the 
                    *  CONNECTED state, and the state will become DISCONNECTING if at least one required transport is DISCONNECTING.
                    *  
                    *  Based on this table, there are only two outcomes, we either change the state to the current connection.status, or we don't change it.
                    */
                    if (connection.status === CONNECTED) 
                    {
	                    // first column in state map for CONNECTED does not change the state.
                        if (isTransportConnection(connection))
                        {
                            transportsConnectedCount++;
                        }
                    }
                    else
                    {
                        // the last row in state map does not change the state, nor does the 
                        // state change if it is DISCONNECTING and the connection is CONNECTING.
                        if (state.required !== DISCONNECTING && !(state.required === DISCONNECTED && connection.status === CONNECTING))
                        {
                            state.required = connection.status;
                        }
                    }
                }
            }
        }
        
	    /*  Finally, the resulting state of all optional and required transports are combined to determine resulting state 
         *  overall, and this may result in a partially connected state.  
	     *  
	     *                                          Optional State
	     *  Required State |   CONNECTED      CONNECTING    DISCONNECTED  DISCONNECTING 
	     *  -----------------------------------------------------------------------------
	     *   CONNECTED     |   CONNECTED      PARTIALLY*     PARTIALLY*     PARTIALLY*     
	     *   CONNECTING    |   CONNECTING     CONNECTING     CONNECTING     CONNECTING    
	     *   DISCONNECTED  |  DISCONNECTED   DISCONNECTED   DISCONNECTED   DISCONNECTING  
	     *   DISCONNECTING |  DISCONNECTING  DISCONNECTING  DISCONNECTING  DISCONNECTING 
	     *   
	     *  (*) the partially connected state must be qualified by at least one required transport being connected.  
	     *  Otherwise, we are in a situation with only optional transports, and we should use the optional state. 
		 */

        var result = state.required;
        if (result === CONNECTED && state.optional !== CONNECTED) 
        {
            // there are no optional transports connected because state.optional !== CONNECTED
            if (transportsConnectedCount === 0)    
            {
                // there are no required transports, so use the optional state.
                result = state.optional;
            }
        } 
        else if (result === DISCONNECTED && state.optional === DISCONNECTING) 
        {
            result = DISCONNECTING;
        }
        
        // Make sure we have at least one transport connected, otherwise we are really disconnected.
        if (result === CONNECTED && transportsConnectedCount === 0) 
        {
            result = DISCONNECTED;
        }
        
        if (result === CONNECTED && transportsConnectedCount < gc.connectionManager.getConnections().length) 
        {
            gc.connectionManager.isPartiallyConnected = true;
        }
        else 
        {
            gc.connectionManager.isPartiallyConnected = false;
        }
        
        gc.connectionManager.status = result;
        doUpdateStatusBar();
        
        fireEvent('status-changed');
        return result;
    };

    var createOperation = function(command)
    {
        var cmd = command.toLowerCase();
        ConnectionManager.prototype[cmd] = function(param1, param2)
        {
            if (command === 'Connect') 
            {
                // clear progress information, and error toasts every time we start another connect() operation.
                this._progressData = {}; 
                toastMessage = "";
            }
            
            gc.console.log(ComponentName, 'Starting to ' + command);

            var requiredPromises = [];
            var allPromises = [];
            
            for(var id in connections)
            {
                if (connections.hasOwnProperty(id))
                {
                    var connection = connections[id];
                    if (connection)
                    {
                        var onCompletedPromise = connection[cmd](param1, param2);
                        allPromises.push(onCompletedPromise);

                        if (command === 'Connect' && !isTransportOptional(connection)) 
                        {
                            requiredPromises.push(onCompletedPromise);
                        }
                    }
                }
            }
            
            var self = this;
            var resultPromise = completed;
            
            // disconnect if any required connection fails.
            if (requiredPromises.length > 0)
            {
                resultPromise = Q.all(requiredPromises).fail(function() 
                {
                    self.disconnect();
                    throw "One or more transports failed to " + cmd + " without error";
                });
            }

            return Q.allSettled(allPromises).then(function()
            {
                gc.console.log(ComponentName, 'Finished ' + command + 'ting.  New state = ' + gc.connectionManager.status);
                if (self._progressData) 
                {
                    self._progressData.lastProgressMessage = undefined;
                }
                return resultPromise;  // make sure we return a failure when a required transport fails. 
            });
        };
    };

    createOperation('Connect');
    createOperation('Disconnect');
    
    ConnectionManager.prototype.toggleTransportConnectedState = function(transport) 
    {
        var canConnect = transport.canConnect();
        
        var transports = [transport];

        var dsLiteService = gc.services && gc.services['ti-service-targetaccess'];
        var dsLiteTransport = dsLiteService && connections[dsLiteService.transportId];
        var isDsLiteConnected = dsLiteTransport && dsLiteTransport.shouldAutoConnect();
        
        // find all program loaders associated with this transport and make sure they connect as well.
        for(var id in connections)
        {
            if (connections.hasOwnProperty(id))
            {
                var coreProgramLoader = connections[id];
                if (!isTransportConnection(coreProgramLoader) && !isTransportOptional(coreProgramLoader)) 
                {
                    // The following is a bit of a kludge, but only dsLite transports have to be associated with an program loader.
                    // So any program loader not associated with a transport explicitly, will be assumed to be associated with 
                    // all non-dsLite transports.  
                    var transportId = coreProgramLoader.transportId;
                    if (transportId ? transportId === transport.id : transport !== dsLiteTransport) 
                    {
                        transports.push(coreProgramLoader);
                    }
                }
            }
        }
        
        // We can't load programs if dsLite is already connected because we need it to do the flashing.
        // This may result in a Hardware Not Connected state even though all required transports are connected.  
        // This is due to the fact that the program loader will be disconnected, however it's a required connection for 
        // the Hardware Connected state.  So if you are manually connecting transports individually, xds must be last in order
        // for the program loaders to work.
        if (isDsLiteConnected && canConnect) 
        {
            // don't attempt to connect any program loaders.
            // if "transport" is the dsLite connection, then it is already connected, so programLoader should also be connected already.
            
            if (transports.length > 1) 
            {
                gc.console.warning(ComponentName, "skipping program loading because dsLite is already connected.");
            }
            transports = [transport]; 
        }
        
        return Q.allSettled(transports.map(function(connection) 
        {
            return connection[canConnect ? 'connect' : 'disconnect']();
        }));
    };

    ConnectionManager.prototype.register = function(id, connector)
    {
        if (id)
        {
            connections[id] = connector;
        }
    };

    ConnectionManager.prototype.unregister = function(id)
    {
        if (id)
        {
            this.register(id, null);
        }
    };

    var sequencer = Q();

    ConnectionManager.prototype.thenDo = function(doNext)
    {
        return this.sequencer.thenDo(doNext);
    };

    var scheduledEvents = {};
    ConnectionManager.prototype.schedule = function(eventName, action)
    {
        return this.sequencer.schedule(eventName, action);
    };

    ConnectionManager.prototype.shouldAutoConnect = function(transport)
    {
        if (transport)
        {
            var connector = connections[transport];
            return connector && connector.shouldAutoConnect();
        }
        return backplaneConnectionCount > 0;
    };

    ConnectionManager.prototype.disableAutoConnect = false;
    ConnectionManager.prototype.autoConnect = function()
    {
        this.schedule('autoconnect', function()
        {
            return gc.fileCache.readJsonFile('project.json').then(function(manifest)
            {
                var deviceInfo;
                // Node webkit specific code for auto-connect
                if (manifest.device_name)
                {
                    deviceInfo =
                    {
                        boardName: manifest.board_name,
                        deviceName: manifest.device_name,
                        fileName: manifest.target_out_filename,
                        fileFolderName: manifest.target_out_foldername
                    };
                }
                gc.connectionManager.disableAutoConnect = manifest.disableAutoConnect;
                if (!manifest.disableAutoConnect)
                {
                    gc.connectionManager.connect(deviceInfo);
                }
            });
        });
    };

    ConnectionManager.prototype.saveSettingsToProjectDatabase = function(projectName)
    {
        var properties = {};
        var promises = [];
        for(var id in connections)
        {
            if (connections.hasOwnProperty(id))
            {
                var connection = connections[id];
                if (connection && connection.saveSettingsToProjectDatabase)
                {
                    var promise = connection.saveSettingsToProjectDatabase(properties, projectName);
                    if (promise)
                    {
                        promises.push(promise);
                    }
                }
            }
        }

        var result = promises.length > 0 ? Q.all(promises) : Q();
        result.then(function()
        {
            var projectPath = projectName ? gc.designer.workspace.folderName + '/' + projectName +'/' : "";
            return gc.fileCache.writeJsonFile(projectPath + 'targetsymbols.json', properties);
        });
        return result;
    };

    ConnectionManager.prototype.sequencer = new Sequencer('main');
    ConnectionManager.prototype.sequencer.start();

    ConnectionManager.prototype.reconnectBackplane = function()
    {
        var that = this;
        if (this.shouldAutoConnect())
        {
            var backplane = gc.services['ti-core-backplane'];

            skipHardwareNotConnectedMessage = true;

            backplane.disconnect();
            return this.waitForEvent(backplane, 'connectionStatusChanged', 'isConnectedToCloudAgent', false).then(function()
            {
                window.setTimeout(function()
                {
                    skipHardwareNotConnectedMessage = false;
                    if (that.shouldAutoConnect())
                    {
                        backplane.connect();
                    }
                }, 2500);
            }).then(this.waitForEvent.bind(this, backplane, 'connectionStatusChanged', 'isConnectedToCloudAgent', true)).fail(function()
            {
                skipHardwareNotConnectedMessage = false;
            });
        }
    };

    ConnectionManager.prototype.addConsoleMessage = function(message, type, id, tooltip, toast)
    {
        if (id === 'ti-core-backplane')
        {
            id = '';  // show backplane progress and errors without a transport id since it is a global.
        }
        
        this._progressData = this._progressData || {};
        if (type === 'error' || toast)
        {
            this._progressData.lastErrorMessage = message;
            this._progressData.lastErrorTooltip = tooltip;
            this._progressData.lastErrorToast = toast;
        }
        else if (type === 'info')
        {
            this._progressData.lastProgressMessage = message;
            this._progressData.lastProgressTooltip = tooltip;
        }
        if (message)
        {
            fireEvent('console-output', { message: message, type: type || 'data', id: id, tooltip: tooltip, showToast: toast } );
            if (type && (type === 'info' || type === 'error'))
            {
                doUpdateStatusBar();
            }
        }
    };

    ConnectionManager.prototype.setConnectionMessage = function(transportId, message, tooltip)
    {
        var transport = connections[transportId];
        if (transport)
        {
            doSetConnectionMessage(transport, message, tooltip);
        }
    };

    ConnectionManager.prototype.setProgressMessage = function(transportId, message, tooltip, toast)
    {
        var transport = connections[transportId];
        if (transport)
        {
            if (toast)
            {
                transport.addConsoleError(message, tooltip, toast, this);
            }
            else
            {
                transport.addConsoleProgress(message, tooltip, this);
            }
        }
    };

    ConnectionManager.prototype.setErrorMessage = function(transportId, message, tooltip, toast)
    {
        var transport = connections[transportId];
        if (transport)
        {
            transport.addConsoleError(message, tooltip, toast, this);
        }
    };

    ConnectionManager.prototype.setConnectedState = function(transportId, connected, errorMsg)
    {
        var transport = connections[transportId];
        if (transport)
        {
            if (errorMsg)
            {
                transport.addConsoleError(errorMsg, undefined, undefined, this);
            }
            doSetConnectedState(transport, connected);
        }
    };

    ConnectionManager.prototype.onDisconnectedFor = function(transportId)
    {
        var transport = connections[transportId];
        if (transport)
        {
            transport.onDisconnected();
        }
    };

    ConnectionManager.prototype.onConnectedFor = function(transportId)
    {
        var transport = connections[transportId];
        if (transport)
        {
            transport.onConnected();
        }
    };

    ConnectionManager.prototype.getDefaultCcxmlFile = function(transportId, name)
    {
        var transport = connections[transportId];
        if (transport)
        {
            return transport._ccxmlText && transport._ccxmlText[name.toLowerCase()];
        }
    };

    ConnectionManager.prototype.getModels = function(transportId)
    {
        var transport = connections[transportId];
        if (transport && transport.getModels)
        {
            return transport.getModels();
        }
        return [];
    };

    ConnectionManager.prototype.getConnections = function() {
        var result = [];
        for (var id in connections) {
            if (connections.hasOwnProperty(id)) {
                var connection = connections[id];
                if (isTransportConnection(connection)) {
                    result.push(connection);
                }
            }
        }
        return result;
    };
    
    ConnectionManager.prototype.getConnectionStatusIconName = getConnectionStatusIconName;
    
    gc.connectionManager = new ConnectionManager();
    gc.databind.internal.AbstractTargetConnection = AbstractTargetConnection;

    gc.connectionManager.thenDo(function()
    {
        if (!gc.designer)
        {
            return Q.promise(function(resolve)
            {
                var origOnLoadHandler = window.onload;
                var timeoutHdlr = window.setTimeout(function()
                {
                    timeoutHdlr = null;
                    resolve();
                    gc.console.warning(ComponentName, 'window.onload() never called.');
                },3000);
                window.onload = function()
                {
                    if (origOnLoadHandler) {
                        origOnLoadHandler();
                    }
                    if (timeoutHdlr) {
                        window.clearTimeout(timeoutHdlr);
                        timeoutHdlr = null;
                    }
                    resolve();
                };
            }).fail(function(error)
            {
                gc.console.error(ComponentName, error);
            });
        }
    }).thenDo('onLoad');

    gc.connectionManagerReady = gc.connectionManagerReady || Q.Promise(function(resolve) { gc.connectionManagerFireReady = resolve; return gc.connectionManager;});
    gc.connectionManagerFireReady(gc.connectionManager);

}());
