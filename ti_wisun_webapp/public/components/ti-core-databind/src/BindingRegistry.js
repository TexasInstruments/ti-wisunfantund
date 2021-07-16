/*******************************************************************************
 * Copyright (c) 2013-2014 Texas Instruments and others All rights reserved.
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v1.0 which accompanies this distribution,
 * and is available at http://www.eclipse.org/legal/epl-v10.html
 * 
 * Contributors: Paul Gingrich, Dobrin Alexiev - Initial API and implementation
 ******************************************************************************/
var gc = gc || {};
gc.databind = gc.databind || {};

if (window.parent.gc)
{
    // take the designer from the parent iframe, if available.
    gc.designer = gc.designer || window.parent.gc.designer;
}
else if (window.global && global.document && global.document.gc)
{
    // take the designer from the global node-webkit document if available
    gc.designer = gc.designer || global.document.gc.designer;
}

(function() // closure for private static methods and data.
{
    /**
     * Singleton class where all bindings, and binding expressions are
     * registered. This is also where data model {gc.databind.IBindFactory}
     * instances are registered.
     * 
     * @constructor
     * @implements {gc.databind.IBindProvider}
     */
    gc.databind.BindingRegistry = function()
    {
    };

    gc.databind.BindingRegistry.prototype = new gc.databind.IBindProvider();

    var models = {};
    var bindings = {};
    var bindCount = 0;
    var expressionParser = null;
    var defaultModelName;
    var dataBinder = new gc.databind.internal.DataBinder();

    var instance = null;
    /**
     * Method to get the singleton DataConverter instance.
     * 
     * @returns {BindingRegistry} the singleton DataConverter instance.
     */
    gc.databind.BindingRegistry.getSingleton = function()
    {
        if (instance === null)
        {
            instance = new gc.databind.BindingRegistry();
            expressionParser = new gc.databind.internal.expressionParser.ExpressionParser(instance);
        }
        return instance;
    };

    // below is a regular expression. It has three alternatives to match
    // 1. ^\s+ this matches all leading spaces
    // 2. this matches two alternatives plus the optional spaces around it
    // 2a. [^A-Za-z0-9$_ ']+ this matches anything that is not an identifier or
    // anything in quotes.
    // The space is a terminator for the character group. Dots are not included
    // because we can
    // remove the spaces around them.
    // 2b. '[^']' this matches quoted text and includes spaces in between quotes
    // 3. \s+$ this matches trailing spaces
    // Atlernative 1 & 3 have an empty capture group, and alternative 2's
    // capture group excludes the
    // surrounding spaces.
    var stripSpacesMatchString = /^\s+|\s*([^A-Za-z0-9$_ ']+|'[^']*')\s*|\s+$/g;

    /**
     * If the cache contains an object with the given name, this method will
     * returns it. Otherwise the binding is created by first evaluating any
     * expression then by using the registered models to create the appropriate
     * bindings to satisfy the binding expression.
     * 
     * @param {string} name - the name of the bindable object.
     * @return {gc.databind.IBind} the object if found in the cache or created,
     *         null otherwise.
     */
    gc.databind.BindingRegistry.prototype.getBinding = function(name, hint)
    {
        if (hint === undefined)
        {
            // first time strip extra spaces in the expression so that
            // expressions that
            // differ only in extra spaces can be matched by string compares.
            // second time (called from expressionParser) there will be a hint
            // provided.
            name = name.replace(stripSpacesMatchString, "$1");
        }
        var bind = bindings[name]; // lookup an existing binding for the same
        // expression
        if (bind === undefined) // if not created yet, use expressionParser to
        // create the new
        // binding.
        {
            // pass hint to expressionParser so skip operators already tested
            // for in
            // sub-expressions.
            bind = expressionParser.parse(name, hint) || null;
            if (bind !== null)
            {
                bind.setName(name);
            }
            bindings[name] = bind;
            bindCount++;

        }
        return bind;
    };

    /**
     * Register a data model with the binding registry. At least one model must
     * be registered in order for this class to be able to create bindings.
     * 
     * @param {gc.databind.IBindFactory} model - the models binding factory to
     *        create new bindings.
     * @param {boolean} [makedefault] - optional flag to make this the new
     *        default model.
     * @param {string} [alias] - optional alias that can be used in place of the model name, for example, $ for widget
     */
    gc.databind.BindingRegistry.prototype.registerModel = function(model, makeDefault, alias)
    {
        var name = model.getName();
        defaultModelName = defaultModelName || name; // use first registered
        // model as default, if
        // not already specified.
        if (makeDefault)
        {
            defaultModelName = name;
        }
        models[name] = model;
        if (alias)
        {
            models[alias] = models[alias] || model;  // don't overwrite a real model name with an alias.
        }
    };

    gc.databind.BindingRegistry.prototype.getModel = function(name)
    {
        name = name || defaultModelName; // use default if not specified.
        return models[name];
    };

    /**
     * Combined Getter/Setter for the default model name. Called without
     * parameters and it will return the name of the current default model.
     * E.g., var name = registry.defaultModel(); Pass in a model name and it
     * will change the default model to the one specified; for example,
     * registry.defaultModel("widget"); Usually binding names start with the
     * model identifier; for example, "widget.widgetid.property". However, if
     * the default model is set to "widget", then users can omit the model
     * identifier and use binding names like "widgetid.property" as a short cut.
     * 
     * @param {string} [name] - identifier for the new default model when used
     *        as a setter function. E.g. widget.
     * @param {gc.databind.IBindFactory} model - the name of the default model
     *        when used as getter, or the this pointer when used as a setter.
     */
    gc.databind.BindingRegistry.prototype.defaultModel = function(name)
    {
        if (name === undefined)
        {
            return defaultModelName;
        }
        defaultModelName = name;
        return this;
    };

    /**
     * Method to delete and dispose of all bindings and models in the binding
     * registry.
     */
    gc.databind.BindingRegistry.prototype.dispose = function()
    {
        for ( var name in bindings)
        {
            if (bindings.hasOwnProperty(name))
            {
                var bind = bindings[name];
                if (bind.dispose !== undefined)
                {
                    bind.dispose();
                }
            }
        }
        bindings = {};

        for (name in models)
        {
            if (models.hasOwnProperty(name))
            {
                var model = models[name];
                if (model.dispose !== undefined)
                {
                    model.dispose();
                }
            }
        }
        models = {};
    };
    
    /**
     * Method to disable a binding previously created using the bind() method.
     * This will also unregister the two bind values that are being bound together.
     * If no other binding or expression is using the bind values, then garbage collection
     * will dispose of them.  Otherwise, new bindings may create additional bindValues 
     * and you will end up with multiple bindValues for the same model or target data.
     * This will not cause problems, but is less efficient.
     * 
     * @param {gc.databind.IDataBinder} binder - the binding to delete.
     *        as a setter function. E.g. widget.
     * @param {gc.databind.IBindFactory} model - the name of the default model
     *        when used as getter, or the this pointer when used as a setter.
     */
    gc.databind.BindingRegistry.prototype.unbind = function(binder)
    {
        binder.enable(false);
        if (binder.dispose)
        {
            binder.dispose(bindings);
        }
    };

    var createBindingCollection = function(registry, bindings)
    {
        if (typeof bindings === 'object')
        {
            var result = {};
            for (var bindName in bindings)
            {
                if (bindings.hasOwnProperty(bindName))
                {
                    var binding;
                    try 
                    {
                        binding = gc.databind.registry.getBinding(bindings[bindName]);
                    }
                    catch(e)
                    {
                        throw "Can't parse binding \"" + bindName + '".  \n' + e; 
                    }
                    if (binding !== null)
                    {
                        result[bindName] = binding;
                    }
                    else
                    {
                        throw 'Binding "' + bindName + '" could not be found.';
                    }
                }
            }
            return new gc.databind.CollectionBindValue(result);
        }
        else
        {
            try 
            {
                return registry.getBinding(bindings);
            }
            catch(message)
            {
                throw "Can't parse binding \"" + bindings + '".  \n' + message; 
            }
        }
    };

    /**
     * <p>
     * Method to bind together a target and a model binding.
     * </p>
     * <p>
     * The difference between the target binding and the model binding is
     * subtle. The modelBinding contains the initial value. Otherwise there is
     * no distinction between model and target. Once the bindings are bound
     * together, their value and status will forever be the same. If either
     * value of status changes on one binding, the other will be updated to
     * reflect the change. This is typically used to keep widget and model data
     * in sync.
     * </p>
     * <p>
     * This method returns a binder object that can be used to control the
     * enabled disabled state of this two-way data binding between target and
     * model bindings.
     * </p>
     * 
     * @param {string|object} targetBinding - name or expression for the target
     *        binding.
     * @param {string|object} modelBinding - name or expression for the model
     *        binding.
     * @param {function} [getter] - getter/preprocessing for a computed value
     * @param {function} [setter] - setter/postprocessing for a computed value
     * @returns {IDataBinder} - interface to control the binding created between
     *          the the target and model bindings.
     */
    gc.databind.BindingRegistry.prototype.bind = function(targetBinding, modelBinding, getter, setter)
    {
        var targetBind, modelBind;
        try 
        {
            targetBind = createBindingCollection(this, targetBinding);
            modelBind = createBindingCollection(this, modelBinding);
            return gc.databind.internal.DataBinder.bind(targetBind, modelBind, getter, setter);
        }
        catch(e)
        {
            var errorStatus = gc.databind.AbstractStatus.createErrorStatus(e);
            if (targetBind)
            {
                targetBind.setStatus(errorStatus);
            }
            else 
            {
                try
                {
                    if (!modelBind)
                    {
                        modelBind = typeof modelBinding === 'object' ? createBindingCollection(modelBinding) : this.getBinding(modelBinding);
                    }
                    if (modelBind) 
                    {
                        modelBind.setStatus(errorStatus);
                    }
                }
                catch(err)
                {
                }
            }

            ti_logger.error(gc.databind.name, e);
            return new gc.databind.IDataBinder();
        }
    };

    gc.databind.BindingRegistry.prototype.getBindingCount = function()
    {
        return bindCount;
    };

    var getDefaultBindingFile = function()
    {
        try 
        {
            var path = window.location.pathname;            
            var pos = path.lastIndexOf('/');
            
            if (pos !== path.length-1) {
	            path = path.substring(pos+1);
	            return path.replace('.html', '.json');
            }
        }
        catch(e) {/* do nothing */ }
        
        return 'index.json';
    };

    var getDefaultPropertyFile = function()
    {
        return 'index_prop.json';
    };

    var BinderCollection = function()
    {
        this._binders = [];
        this._enabled = true;
    };

    BinderCollection.prototype = new gc.databind.IDataBinder();

    BinderCollection.prototype.enable = function(enable, filterFn)
    {
        if (enable === undefined)
        {
            return this._enabled;
        }
        else if (this._enabled != enable)
        {
            this._enabled = enable;

            for (var i = this._binders.length; i-- > 0;)
            {
                if (!filterFn || filterFn(this.__wb))
                {
                    this._binders[i].enable(enable);
                }
            }
        }
        return this;
    };

    BinderCollection.prototype.add = function(binder)
    {
        if (binder)
        {
            this._binders.push(binder);
            binder.enable(this._enabled);
        }
    };

    var bindingCollections = {};
    gc.databind.BindingRegistry.prototype.unloadBindingsFromFile = function(jsonFile, filterFn)
    {
        jsonFile = jsonFile || getDefaultBindingFile();

        var binder = bindingCollections[jsonFile];
        if (binder)
        {
            binder.enable(false, filterFn);
        }
    };

    gc.databind.BindingRegistry.prototype.loadBindingsFromFile = function(jsonFile, filterFn)
    {
        jsonFile = jsonFile || getDefaultBindingFile();

        var bindings = bindingCollections[jsonFile];
        if (bindings)
        {
            return Q.Promise(function(resolve)
            {
                setTimeout(function()
                {
                    bindings.enable(true, filterFn);
                }, 100);
                resolve(bindings);
            });
        }

        var promise = gc.fileCache.readJsonFile(jsonFile).then(function(data)
        {
            var results = new BinderCollection();
            bindingCollections[jsonFile] = results;
            if (data)
            {
                var bindingProvider = gc.databind.registry;
                for ( var prop in data.widgetBindings)
                {
                    if (data.widgetBindings.hasOwnProperty(prop))
                    {
                        var wb = data.widgetBindings[prop];
                        var i = 0;

                        // set the default type for the widget
                        // binding
                        if (wb.options && wb.options.dataType)
                        {
                            var widgetBind = bindingProvider.getBinding('widget.' + wb.widgetId + '.' + wb.propertyName);
                            var defaultType = wb.options.dataType.toLowerCase();
                            if (defaultType === 'long' || defaultType === 'short' || defaultType === "int" || defaultType === 'double' || defaultType === 'float')
                            {
                                defaultType = 'number';
                            }
                            widgetBind.setDefaultType(defaultType);
                        }

                        // Binding records with no widgetId are used
                        // to
                        // initialize backplane bindings.
                        if (!(wb.widgetId) && wb.serverBindName && wb.options && (typeof wb.options.defaultValue !== 'undefined'))
                        {
                            var bind = bindingProvider.getBinding(wb.serverBindName);
                            bind.setValue(wb.options.defaultValue);
                        }
                        else
                        {
                            var binder = bindingProvider.bind('widget.' + wb.widgetId + '.' + wb.propertyName, wb.serverBindName);
                            binder.__wb = wb;
                            results.add(binder);
                        }
                    }
                }
            }
            return results;
        }).fail(function(error)
        {
            ti_logger.error(gc.databind.name, error);
            return new gc.databind.IDataBinder();
        });

        return promise;
    };

    gc.databind.BindingRegistry.prototype.loadPropertiesFromFile = function(model, jsonFile)
    {
        jsonFile = jsonFile || getDefaultPropertyFile();

        return gc.fileCache.readJsonFile(jsonFile).then(function(jsonData)
        {
            return jsonData ? jsonData[model] : undefined;
        }).fail(function(error)
        {
            ti_logger.error(gc.databind.name, error);
            return undefined;
        });
    };

    var matchIDRegEx = /\s+id="([^"]+)"/;
    gc.databind.BindingRegistry.prototype.parseBindingsFromGist = function(modelName, arrayOfLines, modelID)
    {
        var re = new RegExp('\\s+(\\w+)\\s*=\\s*"\\s*{{\\s*\\$\\.' + modelName + '\\.([a-zA-Z0-9_\\.$]+)', 'g');
        var bindingsData = [];
        if (this.defaultModel() == modelID)
        {
            modelID = "";
        }
        else
        {
            modelID = modelID + '.';
        }
        for (var i = 0; i < arrayOfLines.length; i++)
        {
            var pos = arrayOfLines[i].indexOf('$.' + modelName + '.');
            if (pos >= 0)
            {
                // parse binding expression and property name
                var widgetID = arrayOfLines[i].match(matchIDRegEx);
                if (widgetID)
                {
                    widgetID = widgetID[1];
                    var match = re.exec(arrayOfLines[i]);
                    while (match)
                    {
                        var bindingExpression = match[2];
                        var propertyName = match[1];

                        bindingsData.push(
                        {
                            propertyName : propertyName,
                            serverBindName : modelID + bindingExpression,
                            widgetId : widgetID
                        });

                        match = re.exec(arrayOfLines[i]);
                    }
                }
            }
        }
        return bindingsData;
    };

    var saveJsonFile = function(jsonFile, jsonObject)
    {
        return gc.fileCache.writeJsonFile(jsonFile, jsonObject);
    };

    gc.databind.BindingRegistry.prototype.savePropertiesToFile = function(jsonFile, properties)
    {
        jsonFile = jsonFile || getDefaultPropertyFile();

        return saveJsonFile(jsonFile, properties);
    };

    gc.databind.BindingRegistry.prototype.saveBindingsToFile = function(jsonFile, bindings)
    {
        var jsonObject = bindings;
        if (bindings instanceof Array)
        {
            jsonObject =
            {
                widgetBindings : bindings
            };
        }
        jsonFile = jsonFile || getDefaultBindingFile();

        return saveJsonFile(jsonFile, jsonObject);
    };

    /**
     *  Singleton BindingRegistry instance.  Use this to access the singleton BindingRegistry instance. 
     *  
     *  @type {gc.databind.BindingRegistry}
     */
    gc.databind.registry = gc.databind.BindingRegistry.getSingleton();
    
    var _modelsReady = Q.defer();
    gc.databind.modelsReady = new gc.databind.ProgressCounter(function() { _modelsReady.resolve(); });
    gc.databind.modelsReady.then = _modelsReady.promise.then.bind(_modelsReady.promise);

}());