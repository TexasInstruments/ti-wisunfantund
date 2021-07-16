var gc = gc || {};
gc.databind = gc.databind || {};
gc.databind.Scripting = (function() {

var RuntimeScriptURL = window.URL.createObjectURL(new Blob([
`/****************************************************
* Synchronization Logic
***************************************************/
var box = this;
var Runtime = (function() {
    var buffer   = null;
    var lock     = null;
    var _timeout = 10000;
    var _command = null;

    box.onmessage = function(event) {
        var detail = event.data;
        switch (detail.cmd) {
            case 'init':
                lock   = new Int32Array(detail.lock);
                buffer = new Uint8Array(detail.buffer);
                break;

            case 'main':
                try {
                    main();
                } catch (err) {
                    box.postMessage({event: 'Console', detail: {message: err.toString(), type: 'error'}});
                }
                box.postMessage({event: 'MainCompleted'});
                break;

            case 'eval':
                try {
                    var result = eval(detail.expression);
                    box.postMessage({event: 'EvalCompleted', detail: {result: result}});
                } catch (err) {
                    box.postMessage({event: 'EvalFailed', detail: {error: err.toString()}});
                    box.postMessage({event: 'Console', detail: {message: err.toString(), type: 'error'}});
                }

                break;
        }
    };

    function reset() {
        lock.fill(0);
        buffer.fill(0);
    };

    function getResult() {
        let startTime = Date.now();
        let endTime = startTime;
        while (endTime - startTime < _timeout) {
            var waitResult = Atomics.wait(lock, 0, 0, 10);
            if (waitResult == 'not-equal') {
                break;
            }
            endTime = Date.now();
        }

        /* check for timeout */
        if (endTime - startTime >= _timeout) {
            var error = Error('Script timeout while waiting for result!');
            console.error(error.toString());
            throw error;
        }

        var signal = Atomics.load(lock, 1);
        if (signal === 0) {                 // undefined
            return undefined;

        } else if (signal === 1) {          // JSON
            var result = new TextDecoder('utf-8').decode(Uint8Array.from(Array.from(buffer)));
            var nullPos = result.indexOf('\0');
            result = result.substring(0, nullPos);
            return JSON.parse(result).data;

        } else if (signal === 2) {          // Array
            var length = Atomics.load(lock, 2);
            return buffer.slice(0, length);

        } else {
            var result = new TextDecoder('utf-8').decode(Uint8Array.from(Array.from(buffer)));
            var nullPos = result.indexOf('\0');
            result = result.substring(0, nullPos);

            var message = 'Error executing ' + JSON.stringify(_command) + '. ' + result;
            console.error(message);
            throw Error(message);
        }
    };

    function Runtime(timeout) {
        if (timeout) {
            _timeout = timeout;
        }
    }

    Runtime.prototype.execute = function(command) {
        _command = command;

        reset();
        box.postMessage(command);
        return getResult();
    };

    return Runtime;
})();`
], {type: 'text/javascript'}));

var APIScriptURL = window.URL.createObjectURL(new Blob([
`/****************************************************
* Common Scripting API
***************************************************/
var Runtime = new Runtime();

function read(name) {
    var result = Runtime.execute({
        cmd: 'read',
        name: name
    });
    box.postMessage({ event: 'Console', detail: { message: 'read(' + name + ') => ' + JSON.stringify(result) } });
    return result;
}

function write(name, value) {
    Runtime.execute({
        cmd: 'write',
        name: name,
        value: value
    });
    box.postMessage({ event: 'Console', detail: { message: 'write(' + name + ', ' +  value + ') => void' } });
}

function invoke(name, args, inf) {
    /* move inf from first argument to the last argument, backward compatible support */
    var hasInf = false;
    if (arguments.length === 3 && Array.isArray(arguments[2])) {
        // inf, name, args
        var _inf = name;
        name = args;
        args = inf;
        inf = _inf;
        hasInf = true;
    }

    var result = Runtime.execute({
        cmd: 'invoke',
        inf: inf,
        name: name,
        args: args
    });

    var msgResult = undefined;
    if (result) {
        msgResult = JSON.stringify(result);
        if (msgResult.length > 100) {
            msgResult = msgResult.substring(0, 100) + '...';
        }
    }
    box.postMessage({ event: 'Console', detail: { message: 'invoke(' + name + ', [' + args + '], ' + inf + ') => ' + msgResult } });
    return result;
};

function log(text, clear) {
    box.postMessage({event: 'Log', detail: {text: text, clear: clear}});
}

function exit() {
    box.postMessage({event: 'Exit'});
}
`
], {type: 'text/javascript'}));

/**************************************************************************************************
 *
 * Scripting Class
 *
 * Example - handles button click to call the sayHello function
 *
 *  document.querySelector("#my_btn").addEventListener("click", function() {
 *       var script = registerModel.getModel().newScriptInstance();
 *       gc.fileCache.readTextFile('app/scripts/myscript.js').then(function(text) {
 *           script.load(text);
 *           return script.eval("sayHello('patrick')");
 *       }).then(function(result) {
 *           console.log(result);
 *       }).fail(function(error) {
 *           console.error(error);
 *       }).finally(function() {
 *           script.stop();
 *       });
 *   });
 *
 **************************************************************************************************/
function Scripting(bufferSize, callback) {
    /* detect SharedArrayBuffer support */
    if (typeof SharedArrayBuffer === 'undefined') {
        throw new Error('SharedArrayBuffer');
    }

    this.lock           = new SharedArrayBuffer(12);
    this.lockArray      = new Int32Array(this.lock);
    this.userscriptURL  = null;
    this.worker         = null;
    this.messageHdlr    = callback;
    this.buffer         = new SharedArrayBuffer(bufferSize);
    this.bufferArray    = new Uint8Array(this.buffer);
    this.evalQueue      = [];
    this.events         = new gc.databind.internal.Events();
}

Scripting.prototype.load = function(script, bootloader) {
    var self = this;

    /* cache bootloader script object */
    if (gc._scriptingBootloaderURL) window.URL.revokeObjectURL(gc._scriptingBootloaderURL);
    if (bootloader) {
        gc._scriptingBootloaderURL = window.URL.createObjectURL(new Blob([
            `${bootloader.trim()}`
        ], {type: 'text/javascript'}));
    }

    /* clean up existing user script object and terminate existing worker */
    if (self.userscriptURL) window.URL.revokeObjectURL(self.userscriptURL);
    if (self.worker) self.worker.terminate();

    /* create user script object url */
    self.userscriptURL = window.URL.createObjectURL(new Blob([
        'importScripts("' + RuntimeScriptURL + '")\n' +
        'importScripts("' + APIScriptURL + '")\n' +
        (gc._scriptingBootloaderURL ? 'importScripts("' + gc._scriptingBootloaderURL + '")\n' : '') +
        '\n' + script
    ]));

    /* create a worker */
    self.worker = new Worker(self.userscriptURL);

    /* add worker message listener */
    self.worker.onmessage = function(event) {
        if (event.data.cmd) {
            /*
             * Note:
             *      dataType: -1 - failure
             *                 0 - undefined
             *                 1 - JSON
             *                 2 - Array
             *
             *      lockArray[0] - signal
             *               [1] - dataType,
             *               [2] - arraySize
             */
            var arrayLength = 0;
            var dataType = 0; // 0 - undefined, 1 - JSON, 2 - Array
            self.messageHdlr(event).then(function(data) {
                /* array data type */
                if (Array.isArray(data)) {
                    dataType = 2;
                    arrayLength = data.length;
                    self.bufferArray.set(data);
                    Atomics.store(self.lockArray, 1, 2);
                    Atomics.store(self.lockArray, 2, arrayLength);

                /* all other datatype, store in JSON*/
                } else if (typeof data !== 'undefined') {
                    dataType = 1;
                    self.bufferArray.set(new TextEncoder('utf-8').encode(JSON.stringify({ data: data })));
                    Atomics.store(self.lockArray, 1, 1);
                }

            }).fail(function() {
                try {
                    if (dataType === 2) {
                        self.bufferArray.set(new TextEncoder('utf-8').encode('Set buffer size to have at least: ' + (Math.ceil(arrayLength/1000)) + ' KB.'));
                    }
                } catch (e) { /* ignore */ }
                Atomics.store(self.lockArray, 1, -1);

            }).finally(function() {
                Atomics.store(self.lockArray, 0, 1);

                if (Atomics.notify) { // chrome has deprecated wake
                    Atomics.notify(self.lockArray, 0);
                } else if (Atomics.wake) {
                    Atomics.wake(self.lockArray, 0);
                }
            });
        } else if (event.data.event) {
            if (event.data.event === 'EvalCompleted' || event.data.event === 'EvalFailed') {
                var deferred = self.evalQueue.shift().deferred;
                event.data.event === 'EvalCompleted' ? deferred.resolve(event.data.detail.result) : deferred.reject(event.data.detail.error);
                if (self.evalQueue.length >= 1) {
                    self.worker.postMessage({
                        cmd: 'eval',
                        expression: self.evalQueue[0].expression
                    });
                }
                return;
            }

            self.fireEvent(event.data.event, event.data.detail);
        }
    };

    /* initialize the worker */
    self.worker.postMessage({
        cmd:    'init',
        buffer: self.buffer,
        lock:   self.lock
    });

    return this;
};

Scripting.prototype.main = function() {
    if (this.worker == null) return;

    this.worker.postMessage({
        cmd: 'main'
    });
};

Scripting.prototype.stop = function() {
    if (this.worker == null) return;

    this.evalQueue = [];
    this.worker.terminate();
    this.fireEvent('Terminated');
}

Scripting.prototype.eval = function(expression) {
    if (this.worker == null) {
        this.load(''); // create an empty script
    }

    var deferred = Q.defer();
    this.evalQueue.push({deferred: deferred, expression: expression});

    if (this.evalQueue.length == 1) {
        this.worker.postMessage({
            cmd: 'eval',
            expression: expression
        });
    }

    return deferred.promise;
};

Scripting.prototype.addEventListener = function(event, handler) {
    this.events.addListener(event, handler);
};

Scripting.prototype.removeEventListener = function(event,handler) {
    this.events.removeListener(event, handler);
};

Scripting.prototype.fireEvent = function(event, detail) {
    this.events.fireEvent(event, detail);
};

return Scripting;
})();
