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
gc.databind.internal = gc.databind.internal || {};

(function() {
	
	var MathModel = function()
	{
	    gc.databind.AbstractBindFactory.call(this);
	    this.init();
	};

	MathModel.prototype = new gc.databind.AbstractBindFactory('Math');
	
	MathModel.prototype.createNewBind = function(name)
	{
		if (Math.hasOwnProperty(name))
		{
			var result = Math[name];
			
			if (typeof result == 'function')
			{
				return new gc.databind.FunctionBindValue(result, Math);
			}
			else
			{
				return new gc.databind.ConstantBindValue(result);
			}
		}
	};
	
	gc.databind.registry.registerModel(new MathModel());
	
}());
