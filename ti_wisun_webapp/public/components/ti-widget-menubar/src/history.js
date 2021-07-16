var gc = gc || {};
gc.history = gc.history || {};

if (!gc.history.undo)
{
    (function() // closure for private static methods and data.
    {
    	gc.history.IUndoOperation = function()
    	{
    	};
    	
    	gc.history.IUndoOperation.prototype.undo = function()
    	{
    	};
    	
    	gc.history.IUndoOperation.prototype.redo = function()
    	{
    	};
    	
    	gc.history.IUndoOperation.prototype.toString = function()
    	{
    		return "";
    	};
    	
    	var lastOperation = new gc.history.IUndoOperation();
    	lastOperation.prev = null;
    	lastOperation.next = null;
    	
    	gc.history.getLastUndoOperation = function()
    	{
    		return lastOperation;
    	};
    	
    	gc.history.push = function(operation)
    	{
    		// lose all future history
    		if (lastOperation.next)
    		{
    			lastOperation.next.prev = null;
    		}
    		lastOperation.next = operation;
    		
    		// enable undo operation, if first operation added to the history 
    		if (lastOperation.prev === null && gc.nav.enableAction)
    		{
    			gc.nav.enableAction('EditUndo');
    		}
    		
    		// setup next/prev pointers for new history operation
    		operation.prev = lastOperation;
    		operation.next = null;
    
    		// move the chains
    		lastOperation = lastOperation.next;
    	};
    	
    	gc.history.undo = function()
    	{
    		var operation = lastOperation;
    		if (operation.prev)
    		{
    			// enable redo if no future operations
    			if (lastOperation.next === null && gc.nav.enableAction)
    			{
    				gc.nav.enableAction('EditRedo');
    			}
    
    			// move the chains
    			lastOperation = lastOperation.prev;
    
    			// disable undo if fist operation in the stack
    			if (lastOperation.prev === null && gc.nav.disableAction)
    			{
    				gc.nav.disableAction('EditUndo');
    			}
    			
    			operation.undo();
    		}
    	};
    	
    	gc.history.redo = function()
    	{
    		var operation = lastOperation.next;
    		if (operation)
    		{
    			// enable undo if this is first undo operation added
    			if (lastOperation.prev === null && gc.nav.enableAction)
    			{
    				gc.nav.enableAction('EditUndo');
    			}
    			
    			// move the chains
    			lastOperation = lastOperation.next;
    			
    			// disable redo if no more redo operations
    			if (lastOperation.next === null && gc.nav.disableAction)
    			{
    				gc.nav.disableAction('EditRedo');
    			}
    			
    			operation.redo();
    		}
    	};
    	
    	gc.nav = gc.nav || {};
    	gc.nav.ready = gc.nav.ready || Q.Promise(function(resolve) { gc.nav.fireReady = resolve; });
    	gc.nav.ready.then(function() 
    	{
    		gc.nav.registerAction('EditUndo',  
    		{
    			run: gc.history.undo
    		});
    		gc.nav.registerAction('EditRedo', 
    		{
    			run: gc.history.redo
    		});
    		
    		gc.nav.disableAction('EditUndo');
    		gc.nav.disableAction('EditRedo');
    	});
    	
    }());
    	
    gc.history.ready = gc.history.ready || Q.Promise(function(resolve) { gc.history.fireReady = resolve; });
    gc.history.fireReady();
}