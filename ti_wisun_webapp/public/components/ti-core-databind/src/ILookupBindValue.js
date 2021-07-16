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
 * <p>This interface represents a single binding within a multi-dimensional collection of bindable objects.
 * It can also be thought of as a parametized binding.  For example, an array, a structure,
 * or even a function have parameters like index, field name, and argument that 
 * are used in determining the bindings value in addition to underlying model data that is changing as well.</p>  
 * 
 * <p>It is best explained through example.  Consider the master-detail use case where you have a list box
 * that is the master selector.  Then you have widgets that show the detail based on the current single
 * selection in the listbox.  A binding for a particular piece of detail will likely look like this:
 * "a[i].x".  This expression contains an array operator and a dot operator.  The multi-dimensional 
 * collection a returns an array of structures.  In this case, the detail binding is interested in only a 
 * single value at a time.  As the users selection changes so will the binding i change, and as a result
 * the value of interest will change as well.  So in this case, we will create an ILookupBindValue
 * and call setIndex(i, "x") to indicate we are currently interested in the ith element's x field.
 * When the index changes, another call to setIndex(j) will be called to indicate that we are now only
 * interested in the jth element's x field.  In this case a is a two dimensional collection.</p>  
 * 
 * <p>Furthermore, the expression "a[i]" represents a single dimensional collection whose value is a 
 * structure.  The expression "a" is also valid, but it will not be a lookup binding.  Rather it will
 * be a normal binding that returns an array of structures (no lookup).</p>
 * 
 * <p>Clients do not implement this class directly. 
 * They need to inherit from AbstractLookupBindValue instead.</p>   
 * 
 *  @interface
 *  @extends IBindValue
 */
gc.databind.ILookupBindValue = function()
{
};

gc.databind.ILookupBindValue.prototype = new gc.databind.IBindValue();

/**
 * Method to choose which index value(s) should be used to lookup the value of this binding.
 * Setting a new index value(s) may cause the value of this binding to change.
 * 
 * @param {...number|string} index - the lookup identifier(s).  Number for array lookup, and string for fields.
 */
gc.databind.ILookupBindValue.prototype.setIndex = function(index)
{
};
