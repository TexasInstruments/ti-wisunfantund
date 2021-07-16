/*****************************************************************
 * Copyright (c) 2015 Texas Instruments and others
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

gc.databind.internal.PropertyModel = function()
{
    gc.databind.AbstractBindFactory.call(this);
    this.init();
};

gc.databind.internal.PropertyModel.prototype = new gc.databind.AbstractBindFactory('prop');

gc.databind.internal.PropertyModel.prototype.createNewBind = function(name)
{
    return new gc.databind.VariableBindValue();
};

gc.databind.registry.registerModel(new gc.databind.internal.PropertyModel());

