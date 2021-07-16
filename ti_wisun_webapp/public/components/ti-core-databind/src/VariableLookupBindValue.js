var gc = gc || {};
gc.databind = gc.databind || {};

/**
 * Class that implements ILookupBindValue interface for a variable lookup value binding.
 * Use this class if you wish to create a lookup binding based on a given array or struct data pointer.
 *
 * @constructor
 * @extends gc.databind.AbstractLookupBindValue
 *
 * @param {*} initialData - the constant array or object data to use for lookups.
 * @param {boolean} readOnly - flag to indicate if setValue() method should be allowed to modify the data.
 */
gc.databind.VariableLookupBindValue = function(initialData, readOnly)
{
	gc.databind.AbstractLookupBindValue.call(this);

	this.data = initialData;
	if (readOnly !== undefined && readOnly != this._readOnly)
	{
		this._readOnly = readOnly;
	}

};

gc.databind.VariableLookupBindValue.prototype = new gc.databind.AbstractLookupBindValue();

gc.databind.VariableLookupBindValue.prototype._readOnly = false;

gc.databind.VariableLookupBindValue.prototype.setValue = function(value, progress, force)
{
	if (!this._readOnly)
	{
		// allow this value to be modified.
		gc.databind.AbstractLookupBindValue.prototype.setValue.call(this, value, progress, force);
	}
};

gc.databind.VariableLookupBindValue.prototype.isReadOnly = function()
{
	return this._readOnly;
};

/**
 * Implemented to use the data provided to lookup values based on index changes.
 * The data must be an array or object type with nested arrays or objects as needed.
 * The index must be numeric for array types and string for object types.
 * This method calls setValue() to update this bindings
 * value and notify listeners based on the new index values.
 *
 * @param {Array.number|string} indecies - the multi-dimensional index values to use for lookup.
 */
gc.databind.VariableLookupBindValue.prototype.onIndexChanged = function(indecies)
{
	var value = this.data;

	try
	{
		for(var i = 0; value !== undefined && indecies != undefined && i < indecies.length; i++)
		{
			var index = indecies[i];
			if (index === null || index === undefined)
			{
				throw "The index value is null.";
			}
			if (value instanceof Array)
			{
				value = value[this.assertValidArrayIndex(index, value.length)];
			}
			else if (typeof value === "object")
			{
				var fields = index.toString().split('.');
				for(var j = 0; j < fields.length; j++)
				{
					index = fields[j];
					value = value[index];
					if (value === undefined)
					{
						this.assertValidFieldName(index);
					}
				}
			}
			else
			{
				this.assertValidData(index);
			}
		}
		this.setStatus(null);  // if no exceptions clear errors
	}
	catch(e)
	{
		value = undefined;
		this.setStatus(gc.databind.AbstractStatus.createErrorStatus(e));
	}

	this.updateValue(value);
};

gc.databind.VariableLookupBindValue.prototype.setData = function(data)
{
	this.data = data;
	this.onIndexChanged(this.fIndexValues);
};

gc.databind.VariableLookupBindValue.prototype.getData = function(data)
{
	return this.data;
};

gc.databind.AbstractLookupBindValue.prototype.toString = function()
{
	try
	{
		return JSON.stringify(this.data);
	}
	catch(e)
	{
		return "" + this.data;
	}
};
