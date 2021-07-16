var gc = gc || {};
gc.nav = gc.nav || {};

if (!gc.nav.IRunable)
{
    (function() // closure for private static methods and data.
    {
        gc.nav.IRunable = function()
        {
        };
        gc.nav.IRunable.prototype.run = function(id, isChecked)
        {
        };
        
        gc.nav.IStateListener = function()
        {
        };
        
        gc.nav.IStateListener.prototype.onStateChanged = function(enabled, checked)
        {
        };
        
        gc.nav.showMenu = function(id)
        {
            var element = document.getElementById(id);
            if (element)
            {
                element.removeAttribute("hidden");
            }
        };
    
        gc.nav.hideMenu = function(id)
        {
            var element = document.getElementById(id);
            if (element)
            {
                element.setAttribute("hidden", "");
            }
        };
    
        var actionRegistry = 
        {
        };
        
        gc.nav.registerAction = function(id, runable, isAvailable, isVisible)
        {
            if (typeof runable === 'function')
            {
                runable = { run: runable, isAvailable: isAvailable, isVisible : isVisible};
            }
            if (runable.run)
            {
                actionRegistry[id] = runable;
    
                // fire listener to bring it up to current state
                fireStateChangedListeners(id, gc.nav.isEnabled(id), gc.nav.isChecked(id));
            }
            else
            {
                console.log('gc.nav.registerAction failed because the runable does not have a run() method');
            }
        };
        
        var stateListeners = {};
        gc.nav.addStateListener = function(id, listener)
        {
            if (listener)
            {
                // ensure it is not already in the list
                gc.nav.removeStateListener(id, listener);
                
                var listeners = stateListeners[id];
                if (listeners === undefined)
                {
                    listeners = [];
                    stateListeners[id] = listeners;
                }
                // add to the list
                listeners.push(listener);
                
                // fire listener to bring it up to current state
                fireStateChangedListeners(id, gc.nav.isEnabled(id), gc.nav.isChecked(id));
            }
        };
        
        gc.nav.removeStateListener = function(id, listener)
        {
            if (listener)
            {
                var listeners = stateListeners[id];
                if (listeners)
                {
                    for(var i = listeners.length; i-- > 0; )
                    {
                        if (listeners[i] == listener)
                        {
                            listeners.splice(i, 1);
                        }
                    }
                }
            }
        };
        
        var fireStateChangedListeners = function(id, enabled, checked)
        {
            var listeners = stateListeners[id];
            if (listeners)
            {
                for(var i = 0; i < listeners.length; i++)
                {
                    listeners[i].onStateChanged(enabled, checked);
                }
            }
        };
        
        gc.nav.onClick = function(id, detail)
        {
            var action = actionRegistry[id];
            if (action && gc.nav.isEnabled(id))
            {
                var checked = gc.nav.isChecked(id);
                if (checked !== undefined)
                {
                    // toggle checked actions
                    checked = !checked;
                    gc.nav.setActionChecked(id, checked);
                }
                
                return action.run(id, checked, detail) || true;
            }
            return false;
        };
        
        var actionStates = {};
        gc.nav.disableAction = function(id)
        {
            if (this.isEnabled(id))
            {
                actionStates[id] = false;
                fireStateChangedListeners(id, false, gc.nav.isChecked(id));
            }
        };
        
        gc.nav.enableAction = function(id)
        {
            if (!this.isEnabled(id))
            {
                actionStates[id] = true;
                fireStateChangedListeners(id, true, gc.nav.isChecked(id));
            }
        };
        
        gc.nav.isEnabled = function(id)
        {
            var action = actionRegistry[id];
            if (action)
            {
                var enabled = actionStates[id];
                return enabled === undefined || enabled;
            }
            return false;  // return disabled for missing actions.
        };
        
        gc.nav.testAvailability = function(id)
        {
            try
            {
                var action = actionRegistry[id];
                if (action && action.isAvailable)
                {
                    if (action.isAvailable(id))
                    {
                        gc.nav.enableAction(id);
                    }
                    else 
                    {
                        gc.nav.disableAction(id);
                    }
                }
                return action && action.isVisible && action.isVisible(id);
            }
            catch(e)
            {
                return false;  // don't let exceptions cause the whole menu to not open.
            }
        };
    
        var checkedStates = {};
    
        gc.nav.isChecked = function(id)
        {
            return checkedStates[id];
        };
        
        gc.nav.setActionChecked = function(id, isChecked)
        {
            var oldValue = this.isChecked(id);
            if (oldValue === undefined || oldValue != isChecked)
            {
                checkedStates[id] = isChecked;
                fireStateChangedListeners(id, this.isEnabled(id), isChecked);
            }
        };
        
        gc.nav.registerChecklistActions = function(prefix, values, onSelectionHandler, defaultSelection, persistFlag)
        {
            var onIsVisibleHandler = undefined;
            var onIsAvailableHandler = undefined;
            if (typeof onSelectionHandler === "object") {
                onIsVisibleHandler = onSelectionHandler.onIsVisibleHandler;
                onIsAvailableHandler = onSelectionHandler.onIsAvailableHandler;
                onSelectionHandler = onSelectionHandler.onSelectionHandler || gc.nav.IRunable;
            } else {
                onSelectionHandler = onSelectionHandler || gc.nav.IRunable;
            }

            var runnable = 
            { 
                run: function(id, checked, detail) 
                {
                    var value;
                    for(var i = values.length; i-- > 0; )
                    {
                        var actionId = prefix + values[i];
                        var isSelected = actionId === id;
                        gc.nav.setActionChecked(actionId, isSelected);
                        if (isSelected)
                        {
                            value = values[i];
                        }
                    }
                    
                    if (gc.localStorage && persistFlag)
                    {
                        var key = window.location.pathname + '_' + prefix;
                        gc.localStorage.setItem(key, value);
                    }
                    
                    onSelectionHandler(value, detail);
                },
                
                isAvailable: onIsAvailableHandler,
                isVisible : onIsVisibleHandler
            };
            
            for(var i = values.length; i-- > 0; )
            {
                var actionId = prefix + values[i];
                this.registerAction(actionId, runnable);
                this.setActionChecked(actionId, false);
            }

            var defaultValue = defaultSelection;
            if (localStorage && persistFlag)
            {
                var key = window.location.pathname + '_' + prefix;
                if (gc.localStorage.getItem(key))
                {
                    defaultValue = gc.localStorage.getItem(key);
                }
            }
            if (defaultValue)
            {
                this.setActionChecked(prefix + defaultValue, true);
                onSelectionHandler(defaultValue);
            }
        };
        
        gc.nav.createOpenWindowAction = function(url, title, width, height, debugEnabled)
        {
            return function() 
            {
                if (gc.desktop.isDesktop()) {
                    try
                    {
                        console.log('gc.nav.createOpenWindowAction: url= '+url);
                        gc.desktop.openBrowserWindow(url);
                    }
                    catch(ex)
                    {
                        console.log("Exception when opening " + url + ": ex=" + ex.toString());
                    }
                } else {
                    var specs = "titlebar,location,resizable,scrollbars,status,top=50,left=50";
                    if ((width) && (height)) {
                        specs += ",width=" + width + ",height=" + height;
                    }
                    window.open(url, title, specs);
                }
            };
        };
        
        document.dispatchEvent(new CustomEvent("gc-nav-ready", { "detail": "Navigation actions registry is available" }));
        
    }());
    
    gc.nav.ready = gc.nav.ready || Q.Promise(function(resolve) { gc.nav.fireReady = resolve; });
    gc.nav.fireReady();
}
