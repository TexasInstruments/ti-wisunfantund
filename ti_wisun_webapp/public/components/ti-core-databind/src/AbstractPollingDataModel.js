/*******************************************************************************
 * Copyright (c) 2017-18 Texas Instruments and others All rights reserved. This
 * program and the accompanying materials are made available under the terms of
 * the Eclipse Public License v1.0 which accompanies this distribution, and is
 * available at http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors: Gingrich, Paul - Initial API and implementation
 ******************************************************************************/
var gc = gc || {};
gc.databind = gc.databind || {};

(function() // closure for private static methods and data.
{
    /**
     * Abstract class that provides default implementation of IBindFactory for a polling data model.  This class
     * provides a "$refresh_interval" binding can be used to control the polling interval any bindings that are created.
     * Alternatively, each binding could have it's own polling interval as needed.  The $refresh_interval is available
     * to app developers so that they could allow end users to control the polling interval.  The refresh interval represents
     * a delay between polling cycles, and does not reflect real time constraints.  This way if refresh interval is too short
     * it doesn't backlog polling operations, instead it simply polls as fast as possible.
     *
     * @constructor
     * @extends gc.databind.AbstractBindFactory
     * @param {string} name - uniquely identifiable name for this bind factory.
    */
    gc.databind.AbstractPollingDataModel = function(name)
    {
        gc.databind.AbstractBindFactory.call(this, name);
    };

    gc.databind.AbstractPollingDataModel.prototype = new gc.databind.AbstractBindFactory();

    gc.databind.AbstractPollingDataModel.prototype.init = function()
    {
        gc.databind.AbstractBindFactory.prototype.init.call(this);

        this._modelBindings.$refresh_interval = new gc.databind.RefreshIntervalBindValue();
        this.createStorageProvider();
    };

    gc.databind.AbstractPollingDataModel.prototype.createNewBind = function(uri)
    {
        var result;

        if (uri.indexOf("$refresh_interval.") === 0)
        {
            result = new gc.databind.RefreshIntervalBindValue();

            this._refreshIntervalBindList = this._refreshIntervalBindList || [];
            this._refreshIntervalBindList.push(result);
        }
        return result;
    };

    /**
     * Helper method to refresh, or re-read, all bindings associated with this model.  This method goes through
     * all refresh interval providers created by this model and forces them to refresh all their bindings that are
     * registered with them.
     *
     */
    gc.databind.AbstractPollingDataModel.prototype.doRefreshAllBindngs = function()
    {
        this._modelBindings.$refresh_interval.onRefresh(); // refresh the default interval provider

        if (this._refreshIntervalBindList)
        {
            for(var i = this._refreshIntervalBindList.length; i-- > 0; )
            {
                this._refreshIntervalBindList[i].onRefresh();  // refresh any app specific interval providers
            }
        }
    };

    gc.databind.AbstractPollingDataModel.prototype._scriptRead = function(uri) {
        var binding = this.getBinding(uri);
        if (binding && binding.onRefresh) {
            var defer = Q.defer();
            var progress = new gc.databind.ProgressCounter(function() {
                defer.resolve(binding.getValue());
            });
            binding.onRefresh(progress, true);
            progress.done();

            return defer.promise;

        } else {
            return gc.databind.AbstractBindFactory.prototype._scriptRead.call(this, uri);
        }
    };
}());
