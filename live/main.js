;(function(e,t,n){function i(n,s){if(!t[n]){if(!e[n]){var o=typeof require=="function"&&require;if(!s&&o)return o(n,!0);if(r)return r(n,!0);throw new Error("Cannot find module '"+n+"'")}var u=t[n]={exports:{}};e[n][0].call(u.exports,function(t){var r=e[n][1][t];return i(r?r:t)},u,u.exports)}return t[n].exports}var r=typeof require=="function"&&require;for(var s=0;s<n.length;s++)i(n[s]);return i})({1:[function(require,module,exports){
var createWorker = require('./create-worker');
var dealWithWorkerAndUpdateUI = require('./deal-with-worker-and-update-UI.js');
var ws = new WebSocket('ws://'+window.location.host);

var wwChannel;

ws.onopen = function () {
  console.log('WS connected');
};

ws.onmessage = function (msg) {
  if (wwChannel)
    wwChannel.emit('implode');
  wwChannel = createWorker(msg.data);
  dealWithWorkerAndUpdateUI(wwChannel);
};

ws.onclose = function () {
  ws = new WebSocket('ws://localhost:8081');
};

},{"./deal-with-worker-and-update-UI.js":2,"./create-worker":3}],2:[function(require,module,exports){
var somethingWent = require('./ui/something-went');
var somethingWentWell = somethingWent.well;
var somethingWentBad = somethingWent.bad;
var giveFeedback = require('./ui/give-feedback');

function dealWithWorkerAndUpdateUI (channel) {
  channel.on('result', function (result, time) {
    var msg = 'result computed in <strong>'+time+'ms</strong>';
    var well = somethingWentWell(msg);
    giveFeedback(well);
    var lastResult = document.querySelector('#lastResult');
    lastResult.innerHTML = JSON.stringify(result);
  });

  channel.on('ready', function (programTime) {
    var msg = 'programmed worker in: <strong>'+programTime+'ms</strong>';
    var well = somethingWentWell(msg);
    giveFeedback(well);
  });

  channel.on('fail', function (err) {
    var bad = somethingWentBad('error: '+JSON.stringify(err));
    giveFeedback(bad);
  });

  channel.on('implode', function () {
    console.log('IMPLODE!! GOOD BYE!');
  });

  var dataUnitEl = document.querySelector('#dataUnit');

  function runDataUnit() {
    try {
      var dataUnit = JSON.parse(dataUnitEl.value);
      channel.emit('data', dataUnit);
    } catch (err) {
      var bad = somethingWentBad('invalid JSON in data unit <br/>'+err);
      giveFeedback(bad);
    }
  }

  if (dataUnitEl.value) // if there's something there
    runDataUnit(); // run it as soon as the worker loads

  var testEl = document.querySelector('#test');
  testEl.onclick = runDataUnit; // and when someone clicks on the test button
}

module.exports = dealWithWorkerAndUpdateUI;

},{"./ui/give-feedback":4,"./ui/something-went":5}],6:[function(require,module,exports){
// nothing to see here... no file methods for the browser

},{}],7:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            if (ev.source === window && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],8:[function(require,module,exports){
(function(process){function filter (xs, fn) {
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (fn(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length; i >= 0; i--) {
    var last = parts[i];
    if (last == '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Regex to split a filename into [*, dir, basename, ext]
// posix version
var splitPathRe = /^(.+\/(?!$)|\/)?((?:.+?)?(\.[^.]*)?)$/;

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
var resolvedPath = '',
    resolvedAbsolute = false;

for (var i = arguments.length; i >= -1 && !resolvedAbsolute; i--) {
  var path = (i >= 0)
      ? arguments[i]
      : process.cwd();

  // Skip empty and invalid entries
  if (typeof path !== 'string' || !path) {
    continue;
  }

  resolvedPath = path + '/' + resolvedPath;
  resolvedAbsolute = path.charAt(0) === '/';
}

// At this point the path should be resolved to a full absolute path, but
// handle relative paths to be safe (might happen when process.cwd() fails)

// Normalize the path
resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
var isAbsolute = path.charAt(0) === '/',
    trailingSlash = path.slice(-1) === '/';

// Normalize the path
path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }
  
  return (isAbsolute ? '/' : '') + path;
};


// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    return p && typeof p === 'string';
  }).join('/'));
};


exports.dirname = function(path) {
  var dir = splitPathRe.exec(path)[1] || '';
  var isWindows = false;
  if (!dir) {
    // No dirname
    return '.';
  } else if (dir.length === 1 ||
      (isWindows && dir.length <= 3 && dir.charAt(1) === ':')) {
    // It is just a slash or a drive letter with a slash
    return dir;
  } else {
    // It is a full dirname, strip trailing slash
    return dir.substring(0, dir.length - 1);
  }
};


exports.basename = function(path, ext) {
  var f = splitPathRe.exec(path)[2] || '';
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPathRe.exec(path)[3] || '';
};

exports.relative = function(from, to) {
  from = exports.resolve(from).substr(1);
  to = exports.resolve(to).substr(1);

  function trim(arr) {
    var start = 0;
    for (; start < arr.length; start++) {
      if (arr[start] !== '') break;
    }

    var end = arr.length - 1;
    for (; end >= 0; end--) {
      if (arr[end] !== '') break;
    }

    if (start > end) return [];
    return arr.slice(start, end - start + 1);
  }

  var fromParts = trim(from.split('/'));
  var toParts = trim(to.split('/'));

  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
    if (fromParts[i] !== toParts[i]) {
      samePartsLength = i;
      break;
    }
  }

  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
    outputParts.push('..');
  }

  outputParts = outputParts.concat(toParts.slice(samePartsLength));

  return outputParts.join('/');
};

})(require("__browserify_process"))
},{"__browserify_process":7}],3:[function(require,module,exports){
(function(){var M2E = require('m2e');
var fs = require('fs');
var path = require('path');

//var workerLocation = path.normalize(__dirname + '../live/worker.js');
var workerFile = ";(function(e,t,n){function i(n,s){if(!t[n]){if(!e[n]){var o=typeof require==\"function\"&&require;if(!s&&o)return o(n,!0);if(r)return r(n,!0);throw new Error(\"Cannot find module '\"+n+\"'\")}var u=t[n]={exports:{}};e[n][0].call(u.exports,function(t){var r=e[n][1][t];return i(r?r:t)},u,u.exports)}return t[n].exports}var r=typeof require==\"function\"&&require;for(var s=0;s<n.length;s++)i(n[s]);return i})({1:[function(require,module,exports){\n(function(){var M2E = require('m2e');\n\nvar channel = new M2E(self.postMessage.bind(self));\n\nfunction log() {\n  var args = Array.prototype.slice.call(arguments);\n  channel.emit('log', args);\n}\n\n//log('helloooo');\n\nvar startTs = Date.now();\nvar global = {};\nvar program = (function getProgram(\n    self,\n    window,\n    global,\n    //log,\n    arguments,\n    eval,\n    alert,\n    prompt,\n    require,\n    $,\n    document,\n    navigator,\n    XMLHttpRequest,\n    Function,\n    location,\n    console,\n    localStorage,\n    sessionStorage,\n    applicationCache,\n    chrome,\n    close,\n    clientInformation,\n    confirm,\n    frames,\n    history,\n    print,\n    postMessage,\n    onmessge,\n    parent,\n    profile,\n    q,\n    top,\n    Worker,\n\n    // locals\n    startTs,\n    program,\n    getProgram,\n    endTs,\n    programTime\n    ) {\n\n  var _require = PROGRAM();\n  \n  if (_require.name === 'Run')\n    return _require;\n  else // using browserify ?\n    return _require(1);\n\n}).call(global, global, global);\n\n(function () {\n  self.addEventListener('message', function(e) { channel.onMessage(e.data); });\n\n  channel.on('data', onData);\n  channel.emit('ready', Date.now() - startTs);\n\n  function onData(data) {\n    var start = Date.now();\n\n    var args = [data];\n\n    function cb(result) {\n      var time = Date.now() - start;\n      channel.emit('result', result, time);\n    }\n\n    if (program.async)\n      args.push(cb);\n\n    var result;\n    try {\n      result = program.apply(null, args);\n    } catch (e) {\n      channel.emit('fail', { lineno: e.lineno, message: e.message });\n      return;\n    }\n\n    if (!program.isAsync)\n      cb(result);\n  }\n\n})();\n\n})()\n},{\"m2e\":2}],2:[function(require,module,exports){\nvar EventEmitter = require('events').EventEmitter;\n\nvar SEPARATOR = ':';\n\nfunction event2message(name, args) {\n  var message = name + SEPARATOR + JSON.stringify(args);\n\n  return message;\n}\n\nfunction message2event(message) {\n  var name, args;\n\n  var indexOfSeparator = message.indexOf(SEPARATOR);\n  if (~indexOfSeparator) {\n    name = message.substring(0, indexOfSeparator);\n    args = JSON.parse(message.substring(indexOfSeparator + 1));\n  } else {\n    name = message;\n    args = undefined;\n  }\n\n  return {\n    name: name,\n    args: args\n  };\n}\n\nfunction M2E(sendMessage) {\n  var m2e = new EventEmitter;\n\n  m2e.sendMessage = sendMessage;\n\n  var localEmit = m2e.emit;\n\n  m2e.emit =\n  function remoteEmit() {\n    if (!this.sendMessage) {\n      throw Error('sendMessage is not defined');\n    }\n\n    var args = Array.prototype.slice.call(arguments);\n    var name = args.shift();\n\n    if (!M2E.propagateNewListener && name === 'newListener')\n      return;\n\n    var msg = event2message(name, args);\n    try {\n      this.sendMessage(msg);\n    } catch (error) {\n      if (this.listeners(this.errorname).length)\n        EventEmitter.prototype.trigger.call(this, this.errorname, [error]);\n      else\n        throw error;\n    }\n  };\n\n  m2e.onMessage =\n  function onMessage(msg) {\n    var evt = message2event(msg);\n    var args = evt.args;\n    args.unshift(evt.name);\n    localEmit.apply(m2e, args);\n  };\n\n  return m2e;\n}\n\nmodule.exports = M2E;\nM2E.event2message = event2message;\nM2E.message2event = message2event;\n\n},{\"events\":3}],4:[function(require,module,exports){\n// shim for using process in browser\n\nvar process = module.exports = {};\n\nprocess.nextTick = (function () {\n    var canSetImmediate = typeof window !== 'undefined'\n    && window.setImmediate;\n    var canPost = typeof window !== 'undefined'\n    && window.postMessage && window.addEventListener\n    ;\n\n    if (canSetImmediate) {\n        return function (f) { return window.setImmediate(f) };\n    }\n\n    if (canPost) {\n        var queue = [];\n        window.addEventListener('message', function (ev) {\n            if (ev.source === window && ev.data === 'process-tick') {\n                ev.stopPropagation();\n                if (queue.length > 0) {\n                    var fn = queue.shift();\n                    fn();\n                }\n            }\n        }, true);\n\n        return function nextTick(fn) {\n            queue.push(fn);\n            window.postMessage('process-tick', '*');\n        };\n    }\n\n    return function nextTick(fn) {\n        setTimeout(fn, 0);\n    };\n})();\n\nprocess.title = 'browser';\nprocess.browser = true;\nprocess.env = {};\nprocess.argv = [];\n\nprocess.binding = function (name) {\n    throw new Error('process.binding is not supported');\n}\n\n// TODO(shtylman)\nprocess.cwd = function () { return '/' };\nprocess.chdir = function (dir) {\n    throw new Error('process.chdir is not supported');\n};\n\n},{}],3:[function(require,module,exports){\n(function(process){if (!process.EventEmitter) process.EventEmitter = function () {};\n\nvar EventEmitter = exports.EventEmitter = process.EventEmitter;\nvar isArray = typeof Array.isArray === 'function'\n    ? Array.isArray\n    : function (xs) {\n        return Object.prototype.toString.call(xs) === '[object Array]'\n    }\n;\nfunction indexOf (xs, x) {\n    if (xs.indexOf) return xs.indexOf(x);\n    for (var i = 0; i < xs.length; i++) {\n        if (x === xs[i]) return i;\n    }\n    return -1;\n}\n\n// By default EventEmitters will print a warning if more than\n// 10 listeners are added to it. This is a useful default which\n// helps finding memory leaks.\n//\n// Obviously not all Emitters should be limited to 10. This function allows\n// that to be increased. Set to zero for unlimited.\nvar defaultMaxListeners = 10;\nEventEmitter.prototype.setMaxListeners = function(n) {\n  if (!this._events) this._events = {};\n  this._events.maxListeners = n;\n};\n\n\nEventEmitter.prototype.emit = function(type) {\n  // If there is no 'error' event listener then throw.\n  if (type === 'error') {\n    if (!this._events || !this._events.error ||\n        (isArray(this._events.error) && !this._events.error.length))\n    {\n      if (arguments[1] instanceof Error) {\n        throw arguments[1]; // Unhandled 'error' event\n      } else {\n        throw new Error(\"Uncaught, unspecified 'error' event.\");\n      }\n      return false;\n    }\n  }\n\n  if (!this._events) return false;\n  var handler = this._events[type];\n  if (!handler) return false;\n\n  if (typeof handler == 'function') {\n    switch (arguments.length) {\n      // fast cases\n      case 1:\n        handler.call(this);\n        break;\n      case 2:\n        handler.call(this, arguments[1]);\n        break;\n      case 3:\n        handler.call(this, arguments[1], arguments[2]);\n        break;\n      // slower\n      default:\n        var args = Array.prototype.slice.call(arguments, 1);\n        handler.apply(this, args);\n    }\n    return true;\n\n  } else if (isArray(handler)) {\n    var args = Array.prototype.slice.call(arguments, 1);\n\n    var listeners = handler.slice();\n    for (var i = 0, l = listeners.length; i < l; i++) {\n      listeners[i].apply(this, args);\n    }\n    return true;\n\n  } else {\n    return false;\n  }\n};\n\n// EventEmitter is defined in src/node_events.cc\n// EventEmitter.prototype.emit() is also defined there.\nEventEmitter.prototype.addListener = function(type, listener) {\n  if ('function' !== typeof listener) {\n    throw new Error('addListener only takes instances of Function');\n  }\n\n  if (!this._events) this._events = {};\n\n  // To avoid recursion in the case that type == \"newListeners\"! Before\n  // adding it to the listeners, first emit \"newListeners\".\n  this.emit('newListener', type, listener);\n\n  if (!this._events[type]) {\n    // Optimize the case of one listener. Don't need the extra array object.\n    this._events[type] = listener;\n  } else if (isArray(this._events[type])) {\n\n    // Check for listener leak\n    if (!this._events[type].warned) {\n      var m;\n      if (this._events.maxListeners !== undefined) {\n        m = this._events.maxListeners;\n      } else {\n        m = defaultMaxListeners;\n      }\n\n      if (m && m > 0 && this._events[type].length > m) {\n        this._events[type].warned = true;\n        console.error('(node) warning: possible EventEmitter memory ' +\n                      'leak detected. %d listeners added. ' +\n                      'Use emitter.setMaxListeners() to increase limit.',\n                      this._events[type].length);\n        console.trace();\n      }\n    }\n\n    // If we've already got an array, just append.\n    this._events[type].push(listener);\n  } else {\n    // Adding the second element, need to change to array.\n    this._events[type] = [this._events[type], listener];\n  }\n\n  return this;\n};\n\nEventEmitter.prototype.on = EventEmitter.prototype.addListener;\n\nEventEmitter.prototype.once = function(type, listener) {\n  var self = this;\n  self.on(type, function g() {\n    self.removeListener(type, g);\n    listener.apply(this, arguments);\n  });\n\n  return this;\n};\n\nEventEmitter.prototype.removeListener = function(type, listener) {\n  if ('function' !== typeof listener) {\n    throw new Error('removeListener only takes instances of Function');\n  }\n\n  // does not use listeners(), so no side effect of creating _events[type]\n  if (!this._events || !this._events[type]) return this;\n\n  var list = this._events[type];\n\n  if (isArray(list)) {\n    var i = indexOf(list, listener);\n    if (i < 0) return this;\n    list.splice(i, 1);\n    if (list.length == 0)\n      delete this._events[type];\n  } else if (this._events[type] === listener) {\n    delete this._events[type];\n  }\n\n  return this;\n};\n\nEventEmitter.prototype.removeAllListeners = function(type) {\n  if (arguments.length === 0) {\n    this._events = {};\n    return this;\n  }\n\n  // does not use listeners(), so no side effect of creating _events[type]\n  if (type && this._events && this._events[type]) this._events[type] = null;\n  return this;\n};\n\nEventEmitter.prototype.listeners = function(type) {\n  if (!this._events) this._events = {};\n  if (!this._events[type]) this._events[type] = [];\n  if (!isArray(this._events[type])) {\n    this._events[type] = [this._events[type]];\n  }\n  return this._events[type];\n};\n\n})(require(\"__browserify_process\"))\n},{\"__browserify_process\":4}]},{},[1])\n;";

function createWorker (program) {
  var workerCode = workerFile.replace(/PROGRAM\(\)\;/, takeOutFirstAndLastSemiColons(program));
  var workerBlob = new Blob([workerCode], { 'type' : 'text\/javascript' });
  var workerBlobUrl = URL.createObjectURL(workerBlob);
  var ww = new Worker(workerBlobUrl);


  ww.onerror = function (err) {
    console.error('got a web worker error');
    console.error(err);
  };

  var channel = new M2E();

  channel.sendMessage = ww.postMessage.bind(ww);
  ww.onmessage = function(m) {
    channel.onMessage(m.data);
  };

  channel.on('error', function (err) {
    console.log('got an error!');
    console.error(err);
  });

  channel.on('log', function (args) {
    console.log.apply(console, args);
  });

  channel.on('implode', function () {
    ww.terminate();
  });

  return channel;
}

function takeOutFirstAndLastSemiColons(str) {
  if (str[0] === ';' && str[str.length - 1] === ';')
    return str.substring(1, str.length - 1);
  return str;
}

module.exports = createWorker;

})()
},{"fs":6,"path":8,"m2e":9}],9:[function(require,module,exports){
var EventEmitter = require('events').EventEmitter;

var SEPARATOR = ':';

function event2message(name, args) {
  var message = name + SEPARATOR + JSON.stringify(args);

  return message;
}

function message2event(message) {
  var name, args;

  var indexOfSeparator = message.indexOf(SEPARATOR);
  if (~indexOfSeparator) {
    name = message.substring(0, indexOfSeparator);
    args = JSON.parse(message.substring(indexOfSeparator + 1));
  } else {
    name = message;
    args = undefined;
  }

  return {
    name: name,
    args: args
  };
}

function M2E(sendMessage) {
  var m2e = new EventEmitter;

  m2e.sendMessage = sendMessage;

  var localEmit = m2e.emit;

  m2e.emit =
  function remoteEmit() {
    if (!this.sendMessage) {
      throw Error('sendMessage is not defined');
    }

    var args = Array.prototype.slice.call(arguments);
    var name = args.shift();

    if (!M2E.propagateNewListener && name === 'newListener')
      return;

    var msg = event2message(name, args);
    try {
      this.sendMessage(msg);
    } catch (error) {
      if (this.listeners(this.errorname).length)
        EventEmitter.prototype.trigger.call(this, this.errorname, [error]);
      else
        throw error;
    }
  };

  m2e.onMessage =
  function onMessage(msg) {
    var evt = message2event(msg);
    var args = evt.args;
    args.unshift(evt.name);
    localEmit.apply(m2e, args);
  };

  return m2e;
}

module.exports = M2E;
M2E.event2message = event2message;
M2E.message2event = message2event;

},{"events":10}],4:[function(require,module,exports){
var feedback = document.querySelector('#feedback');

function giveFeedback (el) {
  if (feedback.children.length === 0)
    feedback.appendChild(el);
  else
    feedback.insertBefore(el, feedback.children[0]);
}

module.exports = giveFeedback;
},{}],5:[function(require,module,exports){
function somethingWent (msg, how) {
  var el = document.createElement('div');
  el.classList.add('alert');
  el.classList.add(how);
  el.innerHTML = msg;
  setTimeout(function () {
    el.parentNode.removeChild(el);
  }, 10000);
  return el;
}

function somethingWentWell (msg) {
  return somethingWent(msg, 'alert-success');
}

function somethingWentBad (msg) {
  return somethingWent(msg, 'alert-error');
}

exports.well = somethingWentWell;
exports.bad = somethingWentBad;
},{}],10:[function(require,module,exports){
(function(process){if (!process.EventEmitter) process.EventEmitter = function () {};

var EventEmitter = exports.EventEmitter = process.EventEmitter;
var isArray = typeof Array.isArray === 'function'
    ? Array.isArray
    : function (xs) {
        return Object.prototype.toString.call(xs) === '[object Array]'
    }
;
function indexOf (xs, x) {
    if (xs.indexOf) return xs.indexOf(x);
    for (var i = 0; i < xs.length; i++) {
        if (x === xs[i]) return i;
    }
    return -1;
}

// By default EventEmitters will print a warning if more than
// 10 listeners are added to it. This is a useful default which
// helps finding memory leaks.
//
// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
var defaultMaxListeners = 10;
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!this._events) this._events = {};
  this._events.maxListeners = n;
};


EventEmitter.prototype.emit = function(type) {
  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events || !this._events.error ||
        (isArray(this._events.error) && !this._events.error.length))
    {
      if (arguments[1] instanceof Error) {
        throw arguments[1]; // Unhandled 'error' event
      } else {
        throw new Error("Uncaught, unspecified 'error' event.");
      }
      return false;
    }
  }

  if (!this._events) return false;
  var handler = this._events[type];
  if (!handler) return false;

  if (typeof handler == 'function') {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        var args = Array.prototype.slice.call(arguments, 1);
        handler.apply(this, args);
    }
    return true;

  } else if (isArray(handler)) {
    var args = Array.prototype.slice.call(arguments, 1);

    var listeners = handler.slice();
    for (var i = 0, l = listeners.length; i < l; i++) {
      listeners[i].apply(this, args);
    }
    return true;

  } else {
    return false;
  }
};

// EventEmitter is defined in src/node_events.cc
// EventEmitter.prototype.emit() is also defined there.
EventEmitter.prototype.addListener = function(type, listener) {
  if ('function' !== typeof listener) {
    throw new Error('addListener only takes instances of Function');
  }

  if (!this._events) this._events = {};

  // To avoid recursion in the case that type == "newListeners"! Before
  // adding it to the listeners, first emit "newListeners".
  this.emit('newListener', type, listener);

  if (!this._events[type]) {
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  } else if (isArray(this._events[type])) {

    // Check for listener leak
    if (!this._events[type].warned) {
      var m;
      if (this._events.maxListeners !== undefined) {
        m = this._events.maxListeners;
      } else {
        m = defaultMaxListeners;
      }

      if (m && m > 0 && this._events[type].length > m) {
        this._events[type].warned = true;
        console.error('(node) warning: possible EventEmitter memory ' +
                      'leak detected. %d listeners added. ' +
                      'Use emitter.setMaxListeners() to increase limit.',
                      this._events[type].length);
        console.trace();
      }
    }

    // If we've already got an array, just append.
    this._events[type].push(listener);
  } else {
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  var self = this;
  self.on(type, function g() {
    self.removeListener(type, g);
    listener.apply(this, arguments);
  });

  return this;
};

EventEmitter.prototype.removeListener = function(type, listener) {
  if ('function' !== typeof listener) {
    throw new Error('removeListener only takes instances of Function');
  }

  // does not use listeners(), so no side effect of creating _events[type]
  if (!this._events || !this._events[type]) return this;

  var list = this._events[type];

  if (isArray(list)) {
    var i = indexOf(list, listener);
    if (i < 0) return this;
    list.splice(i, 1);
    if (list.length == 0)
      delete this._events[type];
  } else if (this._events[type] === listener) {
    delete this._events[type];
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  if (arguments.length === 0) {
    this._events = {};
    return this;
  }

  // does not use listeners(), so no side effect of creating _events[type]
  if (type && this._events && this._events[type]) this._events[type] = null;
  return this;
};

EventEmitter.prototype.listeners = function(type) {
  if (!this._events) this._events = {};
  if (!this._events[type]) this._events[type] = [];
  if (!isArray(this._events[type])) {
    this._events[type] = [this._events[type]];
  }
  return this._events[type];
};

})(require("__browserify_process"))
},{"__browserify_process":7}]},{},[1])
;