;(function(e,t,n){function i(n,s){if(!t[n]){if(!e[n]){var o=typeof require=="function"&&require;if(!s&&o)return o(n,!0);if(r)return r(n,!0);throw new Error("Cannot find module '"+n+"'")}var u=t[n]={exports:{}};e[n][0].call(u.exports,function(t){var r=e[n][1][t];return i(r?r:t)},u,u.exports)}return t[n].exports}var r=typeof require=="function"&&require;for(var s=0;s<n.length;s++)i(n[s]);return i})({1:[function(require,module,exports){
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
},{"__browserify_process":4}],2:[function(require,module,exports){
// nothing to see here... no file methods for the browser

},{}],3:[function(require,module,exports){
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
},{"__browserify_process":4}],4:[function(require,module,exports){
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

},{}],5:[function(require,module,exports){
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

},{"events":1}],6:[function(require,module,exports){
(function(){var M2E = require('m2e');
var fs = require('fs');
var path = require('path');

var properProgramError = require('./ui/proper-program-error');
var somethingWentBad = require('./ui/something-went').bad;
var giveFeedback = require('./ui/give-feedback');

var workerFile = ";(function(e,t,n){function i(n,s){if(!t[n]){if(!e[n]){var o=typeof require==\"function\"&&require;if(!s&&o)return o(n,!0);if(r)return r(n,!0);throw new Error(\"Cannot find module '\"+n+\"'\")}var u=t[n]={exports:{}};e[n][0].call(u.exports,function(t){var r=e[n][1][t];return i(r?r:t)},u,u.exports)}return t[n].exports}var r=typeof require==\"function\"&&require;for(var s=0;s<n.length;s++)i(n[s]);return i})({1:[function(require,module,exports){\n(function(process){if (!process.EventEmitter) process.EventEmitter = function () {};\n\nvar EventEmitter = exports.EventEmitter = process.EventEmitter;\nvar isArray = typeof Array.isArray === 'function'\n    ? Array.isArray\n    : function (xs) {\n        return Object.prototype.toString.call(xs) === '[object Array]'\n    }\n;\nfunction indexOf (xs, x) {\n    if (xs.indexOf) return xs.indexOf(x);\n    for (var i = 0; i < xs.length; i++) {\n        if (x === xs[i]) return i;\n    }\n    return -1;\n}\n\n// By default EventEmitters will print a warning if more than\n// 10 listeners are added to it. This is a useful default which\n// helps finding memory leaks.\n//\n// Obviously not all Emitters should be limited to 10. This function allows\n// that to be increased. Set to zero for unlimited.\nvar defaultMaxListeners = 10;\nEventEmitter.prototype.setMaxListeners = function(n) {\n  if (!this._events) this._events = {};\n  this._events.maxListeners = n;\n};\n\n\nEventEmitter.prototype.emit = function(type) {\n  // If there is no 'error' event listener then throw.\n  if (type === 'error') {\n    if (!this._events || !this._events.error ||\n        (isArray(this._events.error) && !this._events.error.length))\n    {\n      if (arguments[1] instanceof Error) {\n        throw arguments[1]; // Unhandled 'error' event\n      } else {\n        throw new Error(\"Uncaught, unspecified 'error' event.\");\n      }\n      return false;\n    }\n  }\n\n  if (!this._events) return false;\n  var handler = this._events[type];\n  if (!handler) return false;\n\n  if (typeof handler == 'function') {\n    switch (arguments.length) {\n      // fast cases\n      case 1:\n        handler.call(this);\n        break;\n      case 2:\n        handler.call(this, arguments[1]);\n        break;\n      case 3:\n        handler.call(this, arguments[1], arguments[2]);\n        break;\n      // slower\n      default:\n        var args = Array.prototype.slice.call(arguments, 1);\n        handler.apply(this, args);\n    }\n    return true;\n\n  } else if (isArray(handler)) {\n    var args = Array.prototype.slice.call(arguments, 1);\n\n    var listeners = handler.slice();\n    for (var i = 0, l = listeners.length; i < l; i++) {\n      listeners[i].apply(this, args);\n    }\n    return true;\n\n  } else {\n    return false;\n  }\n};\n\n// EventEmitter is defined in src/node_events.cc\n// EventEmitter.prototype.emit() is also defined there.\nEventEmitter.prototype.addListener = function(type, listener) {\n  if ('function' !== typeof listener) {\n    throw new Error('addListener only takes instances of Function');\n  }\n\n  if (!this._events) this._events = {};\n\n  // To avoid recursion in the case that type == \"newListeners\"! Before\n  // adding it to the listeners, first emit \"newListeners\".\n  this.emit('newListener', type, listener);\n\n  if (!this._events[type]) {\n    // Optimize the case of one listener. Don't need the extra array object.\n    this._events[type] = listener;\n  } else if (isArray(this._events[type])) {\n\n    // Check for listener leak\n    if (!this._events[type].warned) {\n      var m;\n      if (this._events.maxListeners !== undefined) {\n        m = this._events.maxListeners;\n      } else {\n        m = defaultMaxListeners;\n      }\n\n      if (m && m > 0 && this._events[type].length > m) {\n        this._events[type].warned = true;\n        console.error('(node) warning: possible EventEmitter memory ' +\n                      'leak detected. %d listeners added. ' +\n                      'Use emitter.setMaxListeners() to increase limit.',\n                      this._events[type].length);\n        console.trace();\n      }\n    }\n\n    // If we've already got an array, just append.\n    this._events[type].push(listener);\n  } else {\n    // Adding the second element, need to change to array.\n    this._events[type] = [this._events[type], listener];\n  }\n\n  return this;\n};\n\nEventEmitter.prototype.on = EventEmitter.prototype.addListener;\n\nEventEmitter.prototype.once = function(type, listener) {\n  var self = this;\n  self.on(type, function g() {\n    self.removeListener(type, g);\n    listener.apply(this, arguments);\n  });\n\n  return this;\n};\n\nEventEmitter.prototype.removeListener = function(type, listener) {\n  if ('function' !== typeof listener) {\n    throw new Error('removeListener only takes instances of Function');\n  }\n\n  // does not use listeners(), so no side effect of creating _events[type]\n  if (!this._events || !this._events[type]) return this;\n\n  var list = this._events[type];\n\n  if (isArray(list)) {\n    var i = indexOf(list, listener);\n    if (i < 0) return this;\n    list.splice(i, 1);\n    if (list.length == 0)\n      delete this._events[type];\n  } else if (this._events[type] === listener) {\n    delete this._events[type];\n  }\n\n  return this;\n};\n\nEventEmitter.prototype.removeAllListeners = function(type) {\n  if (arguments.length === 0) {\n    this._events = {};\n    return this;\n  }\n\n  // does not use listeners(), so no side effect of creating _events[type]\n  if (type && this._events && this._events[type]) this._events[type] = null;\n  return this;\n};\n\nEventEmitter.prototype.listeners = function(type) {\n  if (!this._events) this._events = {};\n  if (!this._events[type]) this._events[type] = [];\n  if (!isArray(this._events[type])) {\n    this._events[type] = [this._events[type]];\n  }\n  return this._events[type];\n};\n\n})(require(\"__browserify_process\"))\n},{\"__browserify_process\":2}],2:[function(require,module,exports){\n// shim for using process in browser\n\nvar process = module.exports = {};\n\nprocess.nextTick = (function () {\n    var canSetImmediate = typeof window !== 'undefined'\n    && window.setImmediate;\n    var canPost = typeof window !== 'undefined'\n    && window.postMessage && window.addEventListener\n    ;\n\n    if (canSetImmediate) {\n        return function (f) { return window.setImmediate(f) };\n    }\n\n    if (canPost) {\n        var queue = [];\n        window.addEventListener('message', function (ev) {\n            if (ev.source === window && ev.data === 'process-tick') {\n                ev.stopPropagation();\n                if (queue.length > 0) {\n                    var fn = queue.shift();\n                    fn();\n                }\n            }\n        }, true);\n\n        return function nextTick(fn) {\n            queue.push(fn);\n            window.postMessage('process-tick', '*');\n        };\n    }\n\n    return function nextTick(fn) {\n        setTimeout(fn, 0);\n    };\n})();\n\nprocess.title = 'browser';\nprocess.browser = true;\nprocess.env = {};\nprocess.argv = [];\n\nprocess.binding = function (name) {\n    throw new Error('process.binding is not supported');\n}\n\n// TODO(shtylman)\nprocess.cwd = function () { return '/' };\nprocess.chdir = function (dir) {\n    throw new Error('process.chdir is not supported');\n};\n\n},{}],3:[function(require,module,exports){\nvar EventEmitter = require('events').EventEmitter;\n\nvar SEPARATOR = ':';\n\nfunction event2message(name, args) {\n  var message = name + SEPARATOR + JSON.stringify(args);\n\n  return message;\n}\n\nfunction message2event(message) {\n  var name, args;\n\n  var indexOfSeparator = message.indexOf(SEPARATOR);\n  if (~indexOfSeparator) {\n    name = message.substring(0, indexOfSeparator);\n    args = JSON.parse(message.substring(indexOfSeparator + 1));\n  } else {\n    name = message;\n    args = undefined;\n  }\n\n  return {\n    name: name,\n    args: args\n  };\n}\n\nfunction M2E(sendMessage) {\n  var m2e = new EventEmitter;\n\n  m2e.sendMessage = sendMessage;\n\n  var localEmit = m2e.emit;\n\n  m2e.emit =\n  function remoteEmit() {\n    if (!this.sendMessage) {\n      throw Error('sendMessage is not defined');\n    }\n\n    var args = Array.prototype.slice.call(arguments);\n    var name = args.shift();\n\n    if (!M2E.propagateNewListener && name === 'newListener')\n      return;\n\n    var msg = event2message(name, args);\n    try {\n      this.sendMessage(msg);\n    } catch (error) {\n      if (this.listeners(this.errorname).length)\n        EventEmitter.prototype.trigger.call(this, this.errorname, [error]);\n      else\n        throw error;\n    }\n  };\n\n  m2e.onMessage =\n  function onMessage(msg) {\n    var evt = message2event(msg);\n    var args = evt.args;\n    args.unshift(evt.name);\n    localEmit.apply(m2e, args);\n  };\n\n  return m2e;\n}\n\nmodule.exports = M2E;\nM2E.event2message = event2message;\nM2E.message2event = message2event;\n\n},{\"events\":1}],4:[function(require,module,exports){\n(function(){var M2E = require('m2e');\n\nvar channel = new M2E(self.postMessage.bind(self));\n\nfunction log() {\n  var args = Array.prototype.slice.call(arguments);\n  channel.emit('log', args);\n}\n\n//log('helloooo');\n\nvar startTs = Date.now();\nvar global = {};\nvar program = (function getProgram(\n    self,\n    window,\n    global,\n    //log,\n    arguments,\n    eval,\n    alert,\n    prompt,\n    require,\n    $,\n    document,\n    navigator,\n    XMLHttpRequest,\n    Function,\n    location,\n    console,\n    localStorage,\n    sessionStorage,\n    applicationCache,\n    chrome,\n    close,\n    clientInformation,\n    confirm,\n    frames,\n    history,\n    print,\n    postMessage,\n    onmessge,\n    parent,\n    profile,\n    q,\n    top,\n    Worker,\n\n    // locals\n    startTs,\n    program,\n    getProgram,\n    endTs,\n    programTime\n    ) {\n\n  var _require = PROGRAM();\n  \n  if (_require.name === 'Run')\n    return _require;\n  else // using browserify ?\n    return _require(1);\n\n}).call(global, global, global);\n\n(function () {\n  self.addEventListener('message', function(e) { channel.onMessage(e.data); });\n\n  channel.on('data', onData);\n  channel.emit('ready', Date.now() - startTs);\n\n  function onData(data) {\n    var start = Date.now();\n\n    var args = [data];\n\n    function cb(result) {\n      var time = Date.now() - start;\n      channel.emit('result', result, time);\n    }\n\n    if (program.async)\n      args.push(cb);\n\n    var result;\n    try {\n      result = program.apply(null, args);\n    } catch (e) {\n      channel.emit('fail', { lineno: e.lineno, message: e.message });\n      return;\n    }\n\n    if (!program.isAsync)\n      cb(result);\n  }\n\n})();\n\n})()\n},{\"m2e\":3}]},{},[4])\n//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvaG9tZS9qb2FvamVyb25pbW8vc3JjL2Nyb3dkcHJvY2Vzcy9wcm9ncmFtLWVkaXRvci9ub2RlX21vZHVsZXMvZ3J1bnQtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1idWlsdGlucy9idWlsdGluL2V2ZW50cy5qcyIsIi9ob21lL2pvYW9qZXJvbmltby9zcmMvY3Jvd2Rwcm9jZXNzL3Byb2dyYW0tZWRpdG9yL25vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9pbnNlcnQtbW9kdWxlLWdsb2JhbHMvbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyIsIi9ob21lL2pvYW9qZXJvbmltby9zcmMvY3Jvd2Rwcm9jZXNzL3Byb2dyYW0tZWRpdG9yL25vZGVfbW9kdWxlcy9tMmUvaW5kZXguanMiLCIvaG9tZS9qb2FvamVyb25pbW8vc3JjL2Nyb3dkcHJvY2Vzcy9wcm9ncmFtLWVkaXRvci9zcmMvd29ya2VyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKHByb2Nlc3Mpe2lmICghcHJvY2Vzcy5FdmVudEVtaXR0ZXIpIHByb2Nlc3MuRXZlbnRFbWl0dGVyID0gZnVuY3Rpb24gKCkge307XG5cbnZhciBFdmVudEVtaXR0ZXIgPSBleHBvcnRzLkV2ZW50RW1pdHRlciA9IHByb2Nlc3MuRXZlbnRFbWl0dGVyO1xudmFyIGlzQXJyYXkgPSB0eXBlb2YgQXJyYXkuaXNBcnJheSA9PT0gJ2Z1bmN0aW9uJ1xuICAgID8gQXJyYXkuaXNBcnJheVxuICAgIDogZnVuY3Rpb24gKHhzKSB7XG4gICAgICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoeHMpID09PSAnW29iamVjdCBBcnJheV0nXG4gICAgfVxuO1xuZnVuY3Rpb24gaW5kZXhPZiAoeHMsIHgpIHtcbiAgICBpZiAoeHMuaW5kZXhPZikgcmV0dXJuIHhzLmluZGV4T2YoeCk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB4cy5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAoeCA9PT0geHNbaV0pIHJldHVybiBpO1xuICAgIH1cbiAgICByZXR1cm4gLTE7XG59XG5cbi8vIEJ5IGRlZmF1bHQgRXZlbnRFbWl0dGVycyB3aWxsIHByaW50IGEgd2FybmluZyBpZiBtb3JlIHRoYW5cbi8vIDEwIGxpc3RlbmVycyBhcmUgYWRkZWQgdG8gaXQuIFRoaXMgaXMgYSB1c2VmdWwgZGVmYXVsdCB3aGljaFxuLy8gaGVscHMgZmluZGluZyBtZW1vcnkgbGVha3MuXG4vL1xuLy8gT2J2aW91c2x5IG5vdCBhbGwgRW1pdHRlcnMgc2hvdWxkIGJlIGxpbWl0ZWQgdG8gMTAuIFRoaXMgZnVuY3Rpb24gYWxsb3dzXG4vLyB0aGF0IHRvIGJlIGluY3JlYXNlZC4gU2V0IHRvIHplcm8gZm9yIHVubGltaXRlZC5cbnZhciBkZWZhdWx0TWF4TGlzdGVuZXJzID0gMTA7XG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnNldE1heExpc3RlbmVycyA9IGZ1bmN0aW9uKG4pIHtcbiAgaWYgKCF0aGlzLl9ldmVudHMpIHRoaXMuX2V2ZW50cyA9IHt9O1xuICB0aGlzLl9ldmVudHMubWF4TGlzdGVuZXJzID0gbjtcbn07XG5cblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5lbWl0ID0gZnVuY3Rpb24odHlwZSkge1xuICAvLyBJZiB0aGVyZSBpcyBubyAnZXJyb3InIGV2ZW50IGxpc3RlbmVyIHRoZW4gdGhyb3cuXG4gIGlmICh0eXBlID09PSAnZXJyb3InKSB7XG4gICAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50cy5lcnJvciB8fFxuICAgICAgICAoaXNBcnJheSh0aGlzLl9ldmVudHMuZXJyb3IpICYmICF0aGlzLl9ldmVudHMuZXJyb3IubGVuZ3RoKSlcbiAgICB7XG4gICAgICBpZiAoYXJndW1lbnRzWzFdIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgdGhyb3cgYXJndW1lbnRzWzFdOyAvLyBVbmhhbmRsZWQgJ2Vycm9yJyBldmVudFxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVW5jYXVnaHQsIHVuc3BlY2lmaWVkICdlcnJvcicgZXZlbnQuXCIpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIGlmICghdGhpcy5fZXZlbnRzKSByZXR1cm4gZmFsc2U7XG4gIHZhciBoYW5kbGVyID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuICBpZiAoIWhhbmRsZXIpIHJldHVybiBmYWxzZTtcblxuICBpZiAodHlwZW9mIGhhbmRsZXIgPT0gJ2Z1bmN0aW9uJykge1xuICAgIHN3aXRjaCAoYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgLy8gZmFzdCBjYXNlc1xuICAgICAgY2FzZSAxOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcyk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAyOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDM6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0sIGFyZ3VtZW50c1syXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgLy8gc2xvd2VyXG4gICAgICBkZWZhdWx0OlxuICAgICAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG4gICAgICAgIGhhbmRsZXIuYXBwbHkodGhpcywgYXJncyk7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuXG4gIH0gZWxzZSBpZiAoaXNBcnJheShoYW5kbGVyKSkge1xuICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcblxuICAgIHZhciBsaXN0ZW5lcnMgPSBoYW5kbGVyLnNsaWNlKCk7XG4gICAgZm9yICh2YXIgaSA9IDAsIGwgPSBsaXN0ZW5lcnMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICBsaXN0ZW5lcnNbaV0uYXBwbHkodGhpcywgYXJncyk7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuXG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59O1xuXG4vLyBFdmVudEVtaXR0ZXIgaXMgZGVmaW5lZCBpbiBzcmMvbm9kZV9ldmVudHMuY2Ncbi8vIEV2ZW50RW1pdHRlci5wcm90b3R5cGUuZW1pdCgpIGlzIGFsc28gZGVmaW5lZCB0aGVyZS5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICBpZiAoJ2Z1bmN0aW9uJyAhPT0gdHlwZW9mIGxpc3RlbmVyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdhZGRMaXN0ZW5lciBvbmx5IHRha2VzIGluc3RhbmNlcyBvZiBGdW5jdGlvbicpO1xuICB9XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIFRvIGF2b2lkIHJlY3Vyc2lvbiBpbiB0aGUgY2FzZSB0aGF0IHR5cGUgPT0gXCJuZXdMaXN0ZW5lcnNcIiEgQmVmb3JlXG4gIC8vIGFkZGluZyBpdCB0byB0aGUgbGlzdGVuZXJzLCBmaXJzdCBlbWl0IFwibmV3TGlzdGVuZXJzXCIuXG4gIHRoaXMuZW1pdCgnbmV3TGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHNbdHlwZV0pIHtcbiAgICAvLyBPcHRpbWl6ZSB0aGUgY2FzZSBvZiBvbmUgbGlzdGVuZXIuIERvbid0IG5lZWQgdGhlIGV4dHJhIGFycmF5IG9iamVjdC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBsaXN0ZW5lcjtcbiAgfSBlbHNlIGlmIChpc0FycmF5KHRoaXMuX2V2ZW50c1t0eXBlXSkpIHtcblxuICAgIC8vIENoZWNrIGZvciBsaXN0ZW5lciBsZWFrXG4gICAgaWYgKCF0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkKSB7XG4gICAgICB2YXIgbTtcbiAgICAgIGlmICh0aGlzLl9ldmVudHMubWF4TGlzdGVuZXJzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgbSA9IHRoaXMuX2V2ZW50cy5tYXhMaXN0ZW5lcnM7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBtID0gZGVmYXVsdE1heExpc3RlbmVycztcbiAgICAgIH1cblxuICAgICAgaWYgKG0gJiYgbSA+IDAgJiYgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCA+IG0pIHtcbiAgICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCA9IHRydWU7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJyhub2RlKSB3YXJuaW5nOiBwb3NzaWJsZSBFdmVudEVtaXR0ZXIgbWVtb3J5ICcgK1xuICAgICAgICAgICAgICAgICAgICAgICdsZWFrIGRldGVjdGVkLiAlZCBsaXN0ZW5lcnMgYWRkZWQuICcgK1xuICAgICAgICAgICAgICAgICAgICAgICdVc2UgZW1pdHRlci5zZXRNYXhMaXN0ZW5lcnMoKSB0byBpbmNyZWFzZSBsaW1pdC4nLFxuICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGgpO1xuICAgICAgICBjb25zb2xlLnRyYWNlKCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gSWYgd2UndmUgYWxyZWFkeSBnb3QgYW4gYXJyYXksIGp1c3QgYXBwZW5kLlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5wdXNoKGxpc3RlbmVyKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBBZGRpbmcgdGhlIHNlY29uZCBlbGVtZW50LCBuZWVkIHRvIGNoYW5nZSB0byBhcnJheS5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBbdGhpcy5fZXZlbnRzW3R5cGVdLCBsaXN0ZW5lcl07XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub24gPSBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uY2UgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHNlbGYub24odHlwZSwgZnVuY3Rpb24gZygpIHtcbiAgICBzZWxmLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGcpO1xuICAgIGxpc3RlbmVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIH0pO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIGlmICgnZnVuY3Rpb24nICE9PSB0eXBlb2YgbGlzdGVuZXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3JlbW92ZUxpc3RlbmVyIG9ubHkgdGFrZXMgaW5zdGFuY2VzIG9mIEZ1bmN0aW9uJyk7XG4gIH1cblxuICAvLyBkb2VzIG5vdCB1c2UgbGlzdGVuZXJzKCksIHNvIG5vIHNpZGUgZWZmZWN0IG9mIGNyZWF0aW5nIF9ldmVudHNbdHlwZV1cbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSkgcmV0dXJuIHRoaXM7XG5cbiAgdmFyIGxpc3QgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzQXJyYXkobGlzdCkpIHtcbiAgICB2YXIgaSA9IGluZGV4T2YobGlzdCwgbGlzdGVuZXIpO1xuICAgIGlmIChpIDwgMCkgcmV0dXJuIHRoaXM7XG4gICAgbGlzdC5zcGxpY2UoaSwgMSk7XG4gICAgaWYgKGxpc3QubGVuZ3RoID09IDApXG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICB9IGVsc2UgaWYgKHRoaXMuX2V2ZW50c1t0eXBlXSA9PT0gbGlzdGVuZXIpIHtcbiAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUFsbExpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8vIGRvZXMgbm90IHVzZSBsaXN0ZW5lcnMoKSwgc28gbm8gc2lkZSBlZmZlY3Qgb2YgY3JlYXRpbmcgX2V2ZW50c1t0eXBlXVxuICBpZiAodHlwZSAmJiB0aGlzLl9ldmVudHMgJiYgdGhpcy5fZXZlbnRzW3R5cGVdKSB0aGlzLl9ldmVudHNbdHlwZV0gPSBudWxsO1xuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICBpZiAoIXRoaXMuX2V2ZW50cykgdGhpcy5fZXZlbnRzID0ge307XG4gIGlmICghdGhpcy5fZXZlbnRzW3R5cGVdKSB0aGlzLl9ldmVudHNbdHlwZV0gPSBbXTtcbiAgaWYgKCFpc0FycmF5KHRoaXMuX2V2ZW50c1t0eXBlXSkpIHtcbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBbdGhpcy5fZXZlbnRzW3R5cGVdXTtcbiAgfVxuICByZXR1cm4gdGhpcy5fZXZlbnRzW3R5cGVdO1xufTtcblxufSkocmVxdWlyZShcIl9fYnJvd3NlcmlmeV9wcm9jZXNzXCIpKSIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxuXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbnByb2Nlc3MubmV4dFRpY2sgPSAoZnVuY3Rpb24gKCkge1xuICAgIHZhciBjYW5TZXRJbW1lZGlhdGUgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5zZXRJbW1lZGlhdGU7XG4gICAgdmFyIGNhblBvc3QgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5wb3N0TWVzc2FnZSAmJiB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lclxuICAgIDtcblxuICAgIGlmIChjYW5TZXRJbW1lZGlhdGUpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChmKSB7IHJldHVybiB3aW5kb3cuc2V0SW1tZWRpYXRlKGYpIH07XG4gICAgfVxuXG4gICAgaWYgKGNhblBvc3QpIHtcbiAgICAgICAgdmFyIHF1ZXVlID0gW107XG4gICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgZnVuY3Rpb24gKGV2KSB7XG4gICAgICAgICAgICBpZiAoZXYuc291cmNlID09PSB3aW5kb3cgJiYgZXYuZGF0YSA9PT0gJ3Byb2Nlc3MtdGljaycpIHtcbiAgICAgICAgICAgICAgICBldi5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgICBpZiAocXVldWUubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZm4gPSBxdWV1ZS5zaGlmdCgpO1xuICAgICAgICAgICAgICAgICAgICBmbigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgdHJ1ZSk7XG5cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgICAgICBxdWV1ZS5wdXNoKGZuKTtcbiAgICAgICAgICAgIHdpbmRvdy5wb3N0TWVzc2FnZSgncHJvY2Vzcy10aWNrJywgJyonKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgc2V0VGltZW91dChmbiwgMCk7XG4gICAgfTtcbn0pKCk7XG5cbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn1cblxuLy8gVE9ETyhzaHR5bG1hbilcbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuIiwidmFyIEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoJ2V2ZW50cycpLkV2ZW50RW1pdHRlcjtcblxudmFyIFNFUEFSQVRPUiA9ICc6JztcblxuZnVuY3Rpb24gZXZlbnQybWVzc2FnZShuYW1lLCBhcmdzKSB7XG4gIHZhciBtZXNzYWdlID0gbmFtZSArIFNFUEFSQVRPUiArIEpTT04uc3RyaW5naWZ5KGFyZ3MpO1xuXG4gIHJldHVybiBtZXNzYWdlO1xufVxuXG5mdW5jdGlvbiBtZXNzYWdlMmV2ZW50KG1lc3NhZ2UpIHtcbiAgdmFyIG5hbWUsIGFyZ3M7XG5cbiAgdmFyIGluZGV4T2ZTZXBhcmF0b3IgPSBtZXNzYWdlLmluZGV4T2YoU0VQQVJBVE9SKTtcbiAgaWYgKH5pbmRleE9mU2VwYXJhdG9yKSB7XG4gICAgbmFtZSA9IG1lc3NhZ2Uuc3Vic3RyaW5nKDAsIGluZGV4T2ZTZXBhcmF0b3IpO1xuICAgIGFyZ3MgPSBKU09OLnBhcnNlKG1lc3NhZ2Uuc3Vic3RyaW5nKGluZGV4T2ZTZXBhcmF0b3IgKyAxKSk7XG4gIH0gZWxzZSB7XG4gICAgbmFtZSA9IG1lc3NhZ2U7XG4gICAgYXJncyA9IHVuZGVmaW5lZDtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgbmFtZTogbmFtZSxcbiAgICBhcmdzOiBhcmdzXG4gIH07XG59XG5cbmZ1bmN0aW9uIE0yRShzZW5kTWVzc2FnZSkge1xuICB2YXIgbTJlID0gbmV3IEV2ZW50RW1pdHRlcjtcblxuICBtMmUuc2VuZE1lc3NhZ2UgPSBzZW5kTWVzc2FnZTtcblxuICB2YXIgbG9jYWxFbWl0ID0gbTJlLmVtaXQ7XG5cbiAgbTJlLmVtaXQgPVxuICBmdW5jdGlvbiByZW1vdGVFbWl0KCkge1xuICAgIGlmICghdGhpcy5zZW5kTWVzc2FnZSkge1xuICAgICAgdGhyb3cgRXJyb3IoJ3NlbmRNZXNzYWdlIGlzIG5vdCBkZWZpbmVkJyk7XG4gICAgfVxuXG4gICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpO1xuICAgIHZhciBuYW1lID0gYXJncy5zaGlmdCgpO1xuXG4gICAgaWYgKCFNMkUucHJvcGFnYXRlTmV3TGlzdGVuZXIgJiYgbmFtZSA9PT0gJ25ld0xpc3RlbmVyJylcbiAgICAgIHJldHVybjtcblxuICAgIHZhciBtc2cgPSBldmVudDJtZXNzYWdlKG5hbWUsIGFyZ3MpO1xuICAgIHRyeSB7XG4gICAgICB0aGlzLnNlbmRNZXNzYWdlKG1zZyk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGlmICh0aGlzLmxpc3RlbmVycyh0aGlzLmVycm9ybmFtZSkubGVuZ3RoKVxuICAgICAgICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLnRyaWdnZXIuY2FsbCh0aGlzLCB0aGlzLmVycm9ybmFtZSwgW2Vycm9yXSk7XG4gICAgICBlbHNlXG4gICAgICAgIHRocm93IGVycm9yO1xuICAgIH1cbiAgfTtcblxuICBtMmUub25NZXNzYWdlID1cbiAgZnVuY3Rpb24gb25NZXNzYWdlKG1zZykge1xuICAgIHZhciBldnQgPSBtZXNzYWdlMmV2ZW50KG1zZyk7XG4gICAgdmFyIGFyZ3MgPSBldnQuYXJncztcbiAgICBhcmdzLnVuc2hpZnQoZXZ0Lm5hbWUpO1xuICAgIGxvY2FsRW1pdC5hcHBseShtMmUsIGFyZ3MpO1xuICB9O1xuXG4gIHJldHVybiBtMmU7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gTTJFO1xuTTJFLmV2ZW50Mm1lc3NhZ2UgPSBldmVudDJtZXNzYWdlO1xuTTJFLm1lc3NhZ2UyZXZlbnQgPSBtZXNzYWdlMmV2ZW50O1xuIiwiKGZ1bmN0aW9uKCl7dmFyIE0yRSA9IHJlcXVpcmUoJ20yZScpO1xuXG52YXIgY2hhbm5lbCA9IG5ldyBNMkUoc2VsZi5wb3N0TWVzc2FnZS5iaW5kKHNlbGYpKTtcblxuZnVuY3Rpb24gbG9nKCkge1xuICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XG4gIGNoYW5uZWwuZW1pdCgnbG9nJywgYXJncyk7XG59XG5cbi8vbG9nKCdoZWxsb29vbycpO1xuXG52YXIgc3RhcnRUcyA9IERhdGUubm93KCk7XG52YXIgZ2xvYmFsID0ge307XG52YXIgcHJvZ3JhbSA9IChmdW5jdGlvbiBnZXRQcm9ncmFtKFxuICAgIHNlbGYsXG4gICAgd2luZG93LFxuICAgIGdsb2JhbCxcbiAgICAvL2xvZyxcbiAgICBhcmd1bWVudHMsXG4gICAgZXZhbCxcbiAgICBhbGVydCxcbiAgICBwcm9tcHQsXG4gICAgcmVxdWlyZSxcbiAgICAkLFxuICAgIGRvY3VtZW50LFxuICAgIG5hdmlnYXRvcixcbiAgICBYTUxIdHRwUmVxdWVzdCxcbiAgICBGdW5jdGlvbixcbiAgICBsb2NhdGlvbixcbiAgICBjb25zb2xlLFxuICAgIGxvY2FsU3RvcmFnZSxcbiAgICBzZXNzaW9uU3RvcmFnZSxcbiAgICBhcHBsaWNhdGlvbkNhY2hlLFxuICAgIGNocm9tZSxcbiAgICBjbG9zZSxcbiAgICBjbGllbnRJbmZvcm1hdGlvbixcbiAgICBjb25maXJtLFxuICAgIGZyYW1lcyxcbiAgICBoaXN0b3J5LFxuICAgIHByaW50LFxuICAgIHBvc3RNZXNzYWdlLFxuICAgIG9ubWVzc2dlLFxuICAgIHBhcmVudCxcbiAgICBwcm9maWxlLFxuICAgIHEsXG4gICAgdG9wLFxuICAgIFdvcmtlcixcblxuICAgIC8vIGxvY2Fsc1xuICAgIHN0YXJ0VHMsXG4gICAgcHJvZ3JhbSxcbiAgICBnZXRQcm9ncmFtLFxuICAgIGVuZFRzLFxuICAgIHByb2dyYW1UaW1lXG4gICAgKSB7XG5cbiAgdmFyIF9yZXF1aXJlID0gUFJPR1JBTSgpO1xuICBcbiAgaWYgKF9yZXF1aXJlLm5hbWUgPT09ICdSdW4nKVxuICAgIHJldHVybiBfcmVxdWlyZTtcbiAgZWxzZSAvLyB1c2luZyBicm93c2VyaWZ5ID9cbiAgICByZXR1cm4gX3JlcXVpcmUoMSk7XG5cbn0pLmNhbGwoZ2xvYmFsLCBnbG9iYWwsIGdsb2JhbCk7XG5cbihmdW5jdGlvbiAoKSB7XG4gIHNlbGYuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIGZ1bmN0aW9uKGUpIHsgY2hhbm5lbC5vbk1lc3NhZ2UoZS5kYXRhKTsgfSk7XG5cbiAgY2hhbm5lbC5vbignZGF0YScsIG9uRGF0YSk7XG4gIGNoYW5uZWwuZW1pdCgncmVhZHknLCBEYXRlLm5vdygpIC0gc3RhcnRUcyk7XG5cbiAgZnVuY3Rpb24gb25EYXRhKGRhdGEpIHtcbiAgICB2YXIgc3RhcnQgPSBEYXRlLm5vdygpO1xuXG4gICAgdmFyIGFyZ3MgPSBbZGF0YV07XG5cbiAgICBmdW5jdGlvbiBjYihyZXN1bHQpIHtcbiAgICAgIHZhciB0aW1lID0gRGF0ZS5ub3coKSAtIHN0YXJ0O1xuICAgICAgY2hhbm5lbC5lbWl0KCdyZXN1bHQnLCByZXN1bHQsIHRpbWUpO1xuICAgIH1cblxuICAgIGlmIChwcm9ncmFtLmFzeW5jKVxuICAgICAgYXJncy5wdXNoKGNiKTtcblxuICAgIHZhciByZXN1bHQ7XG4gICAgdHJ5IHtcbiAgICAgIHJlc3VsdCA9IHByb2dyYW0uYXBwbHkobnVsbCwgYXJncyk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgY2hhbm5lbC5lbWl0KCdmYWlsJywgeyBsaW5lbm86IGUubGluZW5vLCBtZXNzYWdlOiBlLm1lc3NhZ2UgfSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKCFwcm9ncmFtLmlzQXN5bmMpXG4gICAgICBjYihyZXN1bHQpO1xuICB9XG5cbn0pKCk7XG5cbn0pKCkiXX0=\n;";

function createWorker (program) {
  var workerCode = workerFile.replace(/PROGRAM\(\)\;/, takeOutFirstAndLastSemiColons(program));
  var workerBlob = new Blob([workerCode], { 'type' : 'text\/javascript' });
  var workerBlobUrl = URL.createObjectURL(workerBlob);
  var ww = new Worker(workerBlobUrl);

  var channel = new M2E();

  channel.sendMessage = ww.postMessage.bind(ww);
  ww.onmessage = function(m) {
    channel.onMessage(m.data);
  };

  ww.onerror = function (err) {
    var programError = properProgramError(err);
    var bad = somethingWentBad(programError);
    giveFeedback(bad);
  };

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
},{"./ui/give-feedback":9,"./ui/proper-program-error":10,"./ui/something-went":11,"fs":2,"m2e":5,"path":3}],7:[function(require,module,exports){
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

},{"./ui/give-feedback":9,"./ui/something-went":11}],8:[function(require,module,exports){
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

},{"./create-worker":6,"./deal-with-worker-and-update-UI.js":7}],9:[function(require,module,exports){
var feedback = document.querySelector('#feedback');

function giveFeedback (el) {
  if (feedback.children.length === 0)
    feedback.appendChild(el);
  else
    feedback.insertBefore(el, feedback.children[0]);
}

module.exports = giveFeedback;
},{}],10:[function(require,module,exports){
function properProgramError(err) {
  var msg = 'An error occurred loading your '+
            '<a href="'+err.filename+'" target="_new">program</a> '+
            'on line <b>'+err.lineno+'</b>:<br/>'+
            '<pre><code>'+err.message+'</code></pre>';

  return msg;
}

module.exports = properProgramError;

/*

    Sample error

{
  "lineno":67,
  "filename":"blob:http%3A//localhost%3A8081/143843ab-b3c9-4c28-aee9-f7b375cdf03c",
  "message":"Uncaught SyntaxError: Unexpected identifier",
  "cancelBubble":false,
  "returnValue":true,
  "srcElement":{},
  "defaultPrevented":false,
  "timeStamp":1375454781214,
  "cancelable":true,
  "bubbles":false,
  "eventPhase":2,
  "currentTarget":{},
  "target":{},
  "type":"error"
}
*/

},{}],11:[function(require,module,exports){
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
},{}]},{},[8])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvaG9tZS9qb2FvamVyb25pbW8vc3JjL2Nyb3dkcHJvY2Vzcy9wcm9ncmFtLWVkaXRvci9ub2RlX21vZHVsZXMvZ3J1bnQtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1idWlsdGlucy9idWlsdGluL2V2ZW50cy5qcyIsIi9ob21lL2pvYW9qZXJvbmltby9zcmMvY3Jvd2Rwcm9jZXNzL3Byb2dyYW0tZWRpdG9yL25vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLWJ1aWx0aW5zL2J1aWx0aW4vZnMuanMiLCIvaG9tZS9qb2FvamVyb25pbW8vc3JjL2Nyb3dkcHJvY2Vzcy9wcm9ncmFtLWVkaXRvci9ub2RlX21vZHVsZXMvZ3J1bnQtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1idWlsdGlucy9idWlsdGluL3BhdGguanMiLCIvaG9tZS9qb2FvamVyb25pbW8vc3JjL2Nyb3dkcHJvY2Vzcy9wcm9ncmFtLWVkaXRvci9ub2RlX21vZHVsZXMvZ3J1bnQtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvaW5zZXJ0LW1vZHVsZS1nbG9iYWxzL25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCIvaG9tZS9qb2FvamVyb25pbW8vc3JjL2Nyb3dkcHJvY2Vzcy9wcm9ncmFtLWVkaXRvci9ub2RlX21vZHVsZXMvbTJlL2luZGV4LmpzIiwiL2hvbWUvam9hb2plcm9uaW1vL3NyYy9jcm93ZHByb2Nlc3MvcHJvZ3JhbS1lZGl0b3Ivc3JjL2NyZWF0ZS13b3JrZXIuanMiLCIvaG9tZS9qb2FvamVyb25pbW8vc3JjL2Nyb3dkcHJvY2Vzcy9wcm9ncmFtLWVkaXRvci9zcmMvZGVhbC13aXRoLXdvcmtlci1hbmQtdXBkYXRlLVVJLmpzIiwiL2hvbWUvam9hb2plcm9uaW1vL3NyYy9jcm93ZHByb2Nlc3MvcHJvZ3JhbS1lZGl0b3Ivc3JjL21haW4uanMiLCIvaG9tZS9qb2FvamVyb25pbW8vc3JjL2Nyb3dkcHJvY2Vzcy9wcm9ncmFtLWVkaXRvci9zcmMvdWkvZ2l2ZS1mZWVkYmFjay5qcyIsIi9ob21lL2pvYW9qZXJvbmltby9zcmMvY3Jvd2Rwcm9jZXNzL3Byb2dyYW0tZWRpdG9yL3NyYy91aS9wcm9wZXItcHJvZ3JhbS1lcnJvci5qcyIsIi9ob21lL2pvYW9qZXJvbmltby9zcmMvY3Jvd2Rwcm9jZXNzL3Byb2dyYW0tZWRpdG9yL3NyYy91aS9zb21ldGhpbmctd2VudC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4TEE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaExBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbihwcm9jZXNzKXtpZiAoIXByb2Nlc3MuRXZlbnRFbWl0dGVyKSBwcm9jZXNzLkV2ZW50RW1pdHRlciA9IGZ1bmN0aW9uICgpIHt9O1xuXG52YXIgRXZlbnRFbWl0dGVyID0gZXhwb3J0cy5FdmVudEVtaXR0ZXIgPSBwcm9jZXNzLkV2ZW50RW1pdHRlcjtcbnZhciBpc0FycmF5ID0gdHlwZW9mIEFycmF5LmlzQXJyYXkgPT09ICdmdW5jdGlvbidcbiAgICA/IEFycmF5LmlzQXJyYXlcbiAgICA6IGZ1bmN0aW9uICh4cykge1xuICAgICAgICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHhzKSA9PT0gJ1tvYmplY3QgQXJyYXldJ1xuICAgIH1cbjtcbmZ1bmN0aW9uIGluZGV4T2YgKHhzLCB4KSB7XG4gICAgaWYgKHhzLmluZGV4T2YpIHJldHVybiB4cy5pbmRleE9mKHgpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgeHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKHggPT09IHhzW2ldKSByZXR1cm4gaTtcbiAgICB9XG4gICAgcmV0dXJuIC0xO1xufVxuXG4vLyBCeSBkZWZhdWx0IEV2ZW50RW1pdHRlcnMgd2lsbCBwcmludCBhIHdhcm5pbmcgaWYgbW9yZSB0aGFuXG4vLyAxMCBsaXN0ZW5lcnMgYXJlIGFkZGVkIHRvIGl0LiBUaGlzIGlzIGEgdXNlZnVsIGRlZmF1bHQgd2hpY2hcbi8vIGhlbHBzIGZpbmRpbmcgbWVtb3J5IGxlYWtzLlxuLy9cbi8vIE9idmlvdXNseSBub3QgYWxsIEVtaXR0ZXJzIHNob3VsZCBiZSBsaW1pdGVkIHRvIDEwLiBUaGlzIGZ1bmN0aW9uIGFsbG93c1xuLy8gdGhhdCB0byBiZSBpbmNyZWFzZWQuIFNldCB0byB6ZXJvIGZvciB1bmxpbWl0ZWQuXG52YXIgZGVmYXVsdE1heExpc3RlbmVycyA9IDEwO1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5zZXRNYXhMaXN0ZW5lcnMgPSBmdW5jdGlvbihuKSB7XG4gIGlmICghdGhpcy5fZXZlbnRzKSB0aGlzLl9ldmVudHMgPSB7fTtcbiAgdGhpcy5fZXZlbnRzLm1heExpc3RlbmVycyA9IG47XG59O1xuXG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgLy8gSWYgdGhlcmUgaXMgbm8gJ2Vycm9yJyBldmVudCBsaXN0ZW5lciB0aGVuIHRocm93LlxuICBpZiAodHlwZSA9PT0gJ2Vycm9yJykge1xuICAgIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHMuZXJyb3IgfHxcbiAgICAgICAgKGlzQXJyYXkodGhpcy5fZXZlbnRzLmVycm9yKSAmJiAhdGhpcy5fZXZlbnRzLmVycm9yLmxlbmd0aCkpXG4gICAge1xuICAgICAgaWYgKGFyZ3VtZW50c1sxXSBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgIHRocm93IGFyZ3VtZW50c1sxXTsgLy8gVW5oYW5kbGVkICdlcnJvcicgZXZlbnRcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIlVuY2F1Z2h0LCB1bnNwZWNpZmllZCAnZXJyb3InIGV2ZW50LlwiKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cblxuICBpZiAoIXRoaXMuX2V2ZW50cykgcmV0dXJuIGZhbHNlO1xuICB2YXIgaGFuZGxlciA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgaWYgKCFoYW5kbGVyKSByZXR1cm4gZmFsc2U7XG5cbiAgaWYgKHR5cGVvZiBoYW5kbGVyID09ICdmdW5jdGlvbicpIHtcbiAgICBzd2l0Y2ggKGFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgIC8vIGZhc3QgY2FzZXNcbiAgICAgIGNhc2UgMTpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMjpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAzOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdLCBhcmd1bWVudHNbMl0pO1xuICAgICAgICBicmVhaztcbiAgICAgIC8vIHNsb3dlclxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICAgICAgICBoYW5kbGVyLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcblxuICB9IGVsc2UgaWYgKGlzQXJyYXkoaGFuZGxlcikpIHtcbiAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG5cbiAgICB2YXIgbGlzdGVuZXJzID0gaGFuZGxlci5zbGljZSgpO1xuICAgIGZvciAodmFyIGkgPSAwLCBsID0gbGlzdGVuZXJzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgbGlzdGVuZXJzW2ldLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcblxuICB9IGVsc2Uge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufTtcblxuLy8gRXZlbnRFbWl0dGVyIGlzIGRlZmluZWQgaW4gc3JjL25vZGVfZXZlbnRzLmNjXG4vLyBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmVtaXQoKSBpcyBhbHNvIGRlZmluZWQgdGhlcmUuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgaWYgKCdmdW5jdGlvbicgIT09IHR5cGVvZiBsaXN0ZW5lcikge1xuICAgIHRocm93IG5ldyBFcnJvcignYWRkTGlzdGVuZXIgb25seSB0YWtlcyBpbnN0YW5jZXMgb2YgRnVuY3Rpb24nKTtcbiAgfVxuXG4gIGlmICghdGhpcy5fZXZlbnRzKSB0aGlzLl9ldmVudHMgPSB7fTtcblxuICAvLyBUbyBhdm9pZCByZWN1cnNpb24gaW4gdGhlIGNhc2UgdGhhdCB0eXBlID09IFwibmV3TGlzdGVuZXJzXCIhIEJlZm9yZVxuICAvLyBhZGRpbmcgaXQgdG8gdGhlIGxpc3RlbmVycywgZmlyc3QgZW1pdCBcIm5ld0xpc3RlbmVyc1wiLlxuICB0aGlzLmVtaXQoJ25ld0xpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzW3R5cGVdKSB7XG4gICAgLy8gT3B0aW1pemUgdGhlIGNhc2Ugb2Ygb25lIGxpc3RlbmVyLiBEb24ndCBuZWVkIHRoZSBleHRyYSBhcnJheSBvYmplY3QuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gbGlzdGVuZXI7XG4gIH0gZWxzZSBpZiAoaXNBcnJheSh0aGlzLl9ldmVudHNbdHlwZV0pKSB7XG5cbiAgICAvLyBDaGVjayBmb3IgbGlzdGVuZXIgbGVha1xuICAgIGlmICghdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCkge1xuICAgICAgdmFyIG07XG4gICAgICBpZiAodGhpcy5fZXZlbnRzLm1heExpc3RlbmVycyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIG0gPSB0aGlzLl9ldmVudHMubWF4TGlzdGVuZXJzO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbSA9IGRlZmF1bHRNYXhMaXN0ZW5lcnM7XG4gICAgICB9XG5cbiAgICAgIGlmIChtICYmIG0gPiAwICYmIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGggPiBtKSB7XG4gICAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQgPSB0cnVlO1xuICAgICAgICBjb25zb2xlLmVycm9yKCcobm9kZSkgd2FybmluZzogcG9zc2libGUgRXZlbnRFbWl0dGVyIG1lbW9yeSAnICtcbiAgICAgICAgICAgICAgICAgICAgICAnbGVhayBkZXRlY3RlZC4gJWQgbGlzdGVuZXJzIGFkZGVkLiAnICtcbiAgICAgICAgICAgICAgICAgICAgICAnVXNlIGVtaXR0ZXIuc2V0TWF4TGlzdGVuZXJzKCkgdG8gaW5jcmVhc2UgbGltaXQuJyxcbiAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoKTtcbiAgICAgICAgY29uc29sZS50cmFjZSgpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIElmIHdlJ3ZlIGFscmVhZHkgZ290IGFuIGFycmF5LCBqdXN0IGFwcGVuZC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0ucHVzaChsaXN0ZW5lcik7XG4gIH0gZWxzZSB7XG4gICAgLy8gQWRkaW5nIHRoZSBzZWNvbmQgZWxlbWVudCwgbmVlZCB0byBjaGFuZ2UgdG8gYXJyYXkuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gW3RoaXMuX2V2ZW50c1t0eXBlXSwgbGlzdGVuZXJdO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uID0gRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbmNlID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICBzZWxmLm9uKHR5cGUsIGZ1bmN0aW9uIGcoKSB7XG4gICAgc2VsZi5yZW1vdmVMaXN0ZW5lcih0eXBlLCBnKTtcbiAgICBsaXN0ZW5lci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICB9KTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICBpZiAoJ2Z1bmN0aW9uJyAhPT0gdHlwZW9mIGxpc3RlbmVyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdyZW1vdmVMaXN0ZW5lciBvbmx5IHRha2VzIGluc3RhbmNlcyBvZiBGdW5jdGlvbicpO1xuICB9XG5cbiAgLy8gZG9lcyBub3QgdXNlIGxpc3RlbmVycygpLCBzbyBubyBzaWRlIGVmZmVjdCBvZiBjcmVhdGluZyBfZXZlbnRzW3R5cGVdXG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbdHlwZV0pIHJldHVybiB0aGlzO1xuXG4gIHZhciBsaXN0ID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIGlmIChpc0FycmF5KGxpc3QpKSB7XG4gICAgdmFyIGkgPSBpbmRleE9mKGxpc3QsIGxpc3RlbmVyKTtcbiAgICBpZiAoaSA8IDApIHJldHVybiB0aGlzO1xuICAgIGxpc3Quc3BsaWNlKGksIDEpO1xuICAgIGlmIChsaXN0Lmxlbmd0aCA9PSAwKVxuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgfSBlbHNlIGlmICh0aGlzLl9ldmVudHNbdHlwZV0gPT09IGxpc3RlbmVyKSB7XG4gICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvLyBkb2VzIG5vdCB1c2UgbGlzdGVuZXJzKCksIHNvIG5vIHNpZGUgZWZmZWN0IG9mIGNyZWF0aW5nIF9ldmVudHNbdHlwZV1cbiAgaWYgKHR5cGUgJiYgdGhpcy5fZXZlbnRzICYmIHRoaXMuX2V2ZW50c1t0eXBlXSkgdGhpcy5fZXZlbnRzW3R5cGVdID0gbnVsbDtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmxpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgaWYgKCF0aGlzLl9ldmVudHMpIHRoaXMuX2V2ZW50cyA9IHt9O1xuICBpZiAoIXRoaXMuX2V2ZW50c1t0eXBlXSkgdGhpcy5fZXZlbnRzW3R5cGVdID0gW107XG4gIGlmICghaXNBcnJheSh0aGlzLl9ldmVudHNbdHlwZV0pKSB7XG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gW3RoaXMuX2V2ZW50c1t0eXBlXV07XG4gIH1cbiAgcmV0dXJuIHRoaXMuX2V2ZW50c1t0eXBlXTtcbn07XG5cbn0pKHJlcXVpcmUoXCJfX2Jyb3dzZXJpZnlfcHJvY2Vzc1wiKSkiLCIvLyBub3RoaW5nIHRvIHNlZSBoZXJlLi4uIG5vIGZpbGUgbWV0aG9kcyBmb3IgdGhlIGJyb3dzZXJcbiIsIihmdW5jdGlvbihwcm9jZXNzKXtmdW5jdGlvbiBmaWx0ZXIgKHhzLCBmbikge1xuICAgIHZhciByZXMgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHhzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmIChmbih4c1tpXSwgaSwgeHMpKSByZXMucHVzaCh4c1tpXSk7XG4gICAgfVxuICAgIHJldHVybiByZXM7XG59XG5cbi8vIHJlc29sdmVzIC4gYW5kIC4uIGVsZW1lbnRzIGluIGEgcGF0aCBhcnJheSB3aXRoIGRpcmVjdG9yeSBuYW1lcyB0aGVyZVxuLy8gbXVzdCBiZSBubyBzbGFzaGVzLCBlbXB0eSBlbGVtZW50cywgb3IgZGV2aWNlIG5hbWVzIChjOlxcKSBpbiB0aGUgYXJyYXlcbi8vIChzbyBhbHNvIG5vIGxlYWRpbmcgYW5kIHRyYWlsaW5nIHNsYXNoZXMgLSBpdCBkb2VzIG5vdCBkaXN0aW5ndWlzaFxuLy8gcmVsYXRpdmUgYW5kIGFic29sdXRlIHBhdGhzKVxuZnVuY3Rpb24gbm9ybWFsaXplQXJyYXkocGFydHMsIGFsbG93QWJvdmVSb290KSB7XG4gIC8vIGlmIHRoZSBwYXRoIHRyaWVzIHRvIGdvIGFib3ZlIHRoZSByb290LCBgdXBgIGVuZHMgdXAgPiAwXG4gIHZhciB1cCA9IDA7XG4gIGZvciAodmFyIGkgPSBwYXJ0cy5sZW5ndGg7IGkgPj0gMDsgaS0tKSB7XG4gICAgdmFyIGxhc3QgPSBwYXJ0c1tpXTtcbiAgICBpZiAobGFzdCA9PSAnLicpIHtcbiAgICAgIHBhcnRzLnNwbGljZShpLCAxKTtcbiAgICB9IGVsc2UgaWYgKGxhc3QgPT09ICcuLicpIHtcbiAgICAgIHBhcnRzLnNwbGljZShpLCAxKTtcbiAgICAgIHVwKys7XG4gICAgfSBlbHNlIGlmICh1cCkge1xuICAgICAgcGFydHMuc3BsaWNlKGksIDEpO1xuICAgICAgdXAtLTtcbiAgICB9XG4gIH1cblxuICAvLyBpZiB0aGUgcGF0aCBpcyBhbGxvd2VkIHRvIGdvIGFib3ZlIHRoZSByb290LCByZXN0b3JlIGxlYWRpbmcgLi5zXG4gIGlmIChhbGxvd0Fib3ZlUm9vdCkge1xuICAgIGZvciAoOyB1cC0tOyB1cCkge1xuICAgICAgcGFydHMudW5zaGlmdCgnLi4nKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcGFydHM7XG59XG5cbi8vIFJlZ2V4IHRvIHNwbGl0IGEgZmlsZW5hbWUgaW50byBbKiwgZGlyLCBiYXNlbmFtZSwgZXh0XVxuLy8gcG9zaXggdmVyc2lvblxudmFyIHNwbGl0UGF0aFJlID0gL14oLitcXC8oPyEkKXxcXC8pPygoPzouKz8pPyhcXC5bXi5dKik/KSQvO1xuXG4vLyBwYXRoLnJlc29sdmUoW2Zyb20gLi4uXSwgdG8pXG4vLyBwb3NpeCB2ZXJzaW9uXG5leHBvcnRzLnJlc29sdmUgPSBmdW5jdGlvbigpIHtcbnZhciByZXNvbHZlZFBhdGggPSAnJyxcbiAgICByZXNvbHZlZEFic29sdXRlID0gZmFsc2U7XG5cbmZvciAodmFyIGkgPSBhcmd1bWVudHMubGVuZ3RoOyBpID49IC0xICYmICFyZXNvbHZlZEFic29sdXRlOyBpLS0pIHtcbiAgdmFyIHBhdGggPSAoaSA+PSAwKVxuICAgICAgPyBhcmd1bWVudHNbaV1cbiAgICAgIDogcHJvY2Vzcy5jd2QoKTtcblxuICAvLyBTa2lwIGVtcHR5IGFuZCBpbnZhbGlkIGVudHJpZXNcbiAgaWYgKHR5cGVvZiBwYXRoICE9PSAnc3RyaW5nJyB8fCAhcGF0aCkge1xuICAgIGNvbnRpbnVlO1xuICB9XG5cbiAgcmVzb2x2ZWRQYXRoID0gcGF0aCArICcvJyArIHJlc29sdmVkUGF0aDtcbiAgcmVzb2x2ZWRBYnNvbHV0ZSA9IHBhdGguY2hhckF0KDApID09PSAnLyc7XG59XG5cbi8vIEF0IHRoaXMgcG9pbnQgdGhlIHBhdGggc2hvdWxkIGJlIHJlc29sdmVkIHRvIGEgZnVsbCBhYnNvbHV0ZSBwYXRoLCBidXRcbi8vIGhhbmRsZSByZWxhdGl2ZSBwYXRocyB0byBiZSBzYWZlIChtaWdodCBoYXBwZW4gd2hlbiBwcm9jZXNzLmN3ZCgpIGZhaWxzKVxuXG4vLyBOb3JtYWxpemUgdGhlIHBhdGhcbnJlc29sdmVkUGF0aCA9IG5vcm1hbGl6ZUFycmF5KGZpbHRlcihyZXNvbHZlZFBhdGguc3BsaXQoJy8nKSwgZnVuY3Rpb24ocCkge1xuICAgIHJldHVybiAhIXA7XG4gIH0pLCAhcmVzb2x2ZWRBYnNvbHV0ZSkuam9pbignLycpO1xuXG4gIHJldHVybiAoKHJlc29sdmVkQWJzb2x1dGUgPyAnLycgOiAnJykgKyByZXNvbHZlZFBhdGgpIHx8ICcuJztcbn07XG5cbi8vIHBhdGgubm9ybWFsaXplKHBhdGgpXG4vLyBwb3NpeCB2ZXJzaW9uXG5leHBvcnRzLm5vcm1hbGl6ZSA9IGZ1bmN0aW9uKHBhdGgpIHtcbnZhciBpc0Fic29sdXRlID0gcGF0aC5jaGFyQXQoMCkgPT09ICcvJyxcbiAgICB0cmFpbGluZ1NsYXNoID0gcGF0aC5zbGljZSgtMSkgPT09ICcvJztcblxuLy8gTm9ybWFsaXplIHRoZSBwYXRoXG5wYXRoID0gbm9ybWFsaXplQXJyYXkoZmlsdGVyKHBhdGguc3BsaXQoJy8nKSwgZnVuY3Rpb24ocCkge1xuICAgIHJldHVybiAhIXA7XG4gIH0pLCAhaXNBYnNvbHV0ZSkuam9pbignLycpO1xuXG4gIGlmICghcGF0aCAmJiAhaXNBYnNvbHV0ZSkge1xuICAgIHBhdGggPSAnLic7XG4gIH1cbiAgaWYgKHBhdGggJiYgdHJhaWxpbmdTbGFzaCkge1xuICAgIHBhdGggKz0gJy8nO1xuICB9XG4gIFxuICByZXR1cm4gKGlzQWJzb2x1dGUgPyAnLycgOiAnJykgKyBwYXRoO1xufTtcblxuXG4vLyBwb3NpeCB2ZXJzaW9uXG5leHBvcnRzLmpvaW4gPSBmdW5jdGlvbigpIHtcbiAgdmFyIHBhdGhzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAwKTtcbiAgcmV0dXJuIGV4cG9ydHMubm9ybWFsaXplKGZpbHRlcihwYXRocywgZnVuY3Rpb24ocCwgaW5kZXgpIHtcbiAgICByZXR1cm4gcCAmJiB0eXBlb2YgcCA9PT0gJ3N0cmluZyc7XG4gIH0pLmpvaW4oJy8nKSk7XG59O1xuXG5cbmV4cG9ydHMuZGlybmFtZSA9IGZ1bmN0aW9uKHBhdGgpIHtcbiAgdmFyIGRpciA9IHNwbGl0UGF0aFJlLmV4ZWMocGF0aClbMV0gfHwgJyc7XG4gIHZhciBpc1dpbmRvd3MgPSBmYWxzZTtcbiAgaWYgKCFkaXIpIHtcbiAgICAvLyBObyBkaXJuYW1lXG4gICAgcmV0dXJuICcuJztcbiAgfSBlbHNlIGlmIChkaXIubGVuZ3RoID09PSAxIHx8XG4gICAgICAoaXNXaW5kb3dzICYmIGRpci5sZW5ndGggPD0gMyAmJiBkaXIuY2hhckF0KDEpID09PSAnOicpKSB7XG4gICAgLy8gSXQgaXMganVzdCBhIHNsYXNoIG9yIGEgZHJpdmUgbGV0dGVyIHdpdGggYSBzbGFzaFxuICAgIHJldHVybiBkaXI7XG4gIH0gZWxzZSB7XG4gICAgLy8gSXQgaXMgYSBmdWxsIGRpcm5hbWUsIHN0cmlwIHRyYWlsaW5nIHNsYXNoXG4gICAgcmV0dXJuIGRpci5zdWJzdHJpbmcoMCwgZGlyLmxlbmd0aCAtIDEpO1xuICB9XG59O1xuXG5cbmV4cG9ydHMuYmFzZW5hbWUgPSBmdW5jdGlvbihwYXRoLCBleHQpIHtcbiAgdmFyIGYgPSBzcGxpdFBhdGhSZS5leGVjKHBhdGgpWzJdIHx8ICcnO1xuICAvLyBUT0RPOiBtYWtlIHRoaXMgY29tcGFyaXNvbiBjYXNlLWluc2Vuc2l0aXZlIG9uIHdpbmRvd3M/XG4gIGlmIChleHQgJiYgZi5zdWJzdHIoLTEgKiBleHQubGVuZ3RoKSA9PT0gZXh0KSB7XG4gICAgZiA9IGYuc3Vic3RyKDAsIGYubGVuZ3RoIC0gZXh0Lmxlbmd0aCk7XG4gIH1cbiAgcmV0dXJuIGY7XG59O1xuXG5cbmV4cG9ydHMuZXh0bmFtZSA9IGZ1bmN0aW9uKHBhdGgpIHtcbiAgcmV0dXJuIHNwbGl0UGF0aFJlLmV4ZWMocGF0aClbM10gfHwgJyc7XG59O1xuXG5leHBvcnRzLnJlbGF0aXZlID0gZnVuY3Rpb24oZnJvbSwgdG8pIHtcbiAgZnJvbSA9IGV4cG9ydHMucmVzb2x2ZShmcm9tKS5zdWJzdHIoMSk7XG4gIHRvID0gZXhwb3J0cy5yZXNvbHZlKHRvKS5zdWJzdHIoMSk7XG5cbiAgZnVuY3Rpb24gdHJpbShhcnIpIHtcbiAgICB2YXIgc3RhcnQgPSAwO1xuICAgIGZvciAoOyBzdGFydCA8IGFyci5sZW5ndGg7IHN0YXJ0KyspIHtcbiAgICAgIGlmIChhcnJbc3RhcnRdICE9PSAnJykgYnJlYWs7XG4gICAgfVxuXG4gICAgdmFyIGVuZCA9IGFyci5sZW5ndGggLSAxO1xuICAgIGZvciAoOyBlbmQgPj0gMDsgZW5kLS0pIHtcbiAgICAgIGlmIChhcnJbZW5kXSAhPT0gJycpIGJyZWFrO1xuICAgIH1cblxuICAgIGlmIChzdGFydCA+IGVuZCkgcmV0dXJuIFtdO1xuICAgIHJldHVybiBhcnIuc2xpY2Uoc3RhcnQsIGVuZCAtIHN0YXJ0ICsgMSk7XG4gIH1cblxuICB2YXIgZnJvbVBhcnRzID0gdHJpbShmcm9tLnNwbGl0KCcvJykpO1xuICB2YXIgdG9QYXJ0cyA9IHRyaW0odG8uc3BsaXQoJy8nKSk7XG5cbiAgdmFyIGxlbmd0aCA9IE1hdGgubWluKGZyb21QYXJ0cy5sZW5ndGgsIHRvUGFydHMubGVuZ3RoKTtcbiAgdmFyIHNhbWVQYXJ0c0xlbmd0aCA9IGxlbmd0aDtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgIGlmIChmcm9tUGFydHNbaV0gIT09IHRvUGFydHNbaV0pIHtcbiAgICAgIHNhbWVQYXJ0c0xlbmd0aCA9IGk7XG4gICAgICBicmVhaztcbiAgICB9XG4gIH1cblxuICB2YXIgb3V0cHV0UGFydHMgPSBbXTtcbiAgZm9yICh2YXIgaSA9IHNhbWVQYXJ0c0xlbmd0aDsgaSA8IGZyb21QYXJ0cy5sZW5ndGg7IGkrKykge1xuICAgIG91dHB1dFBhcnRzLnB1c2goJy4uJyk7XG4gIH1cblxuICBvdXRwdXRQYXJ0cyA9IG91dHB1dFBhcnRzLmNvbmNhdCh0b1BhcnRzLnNsaWNlKHNhbWVQYXJ0c0xlbmd0aCkpO1xuXG4gIHJldHVybiBvdXRwdXRQYXJ0cy5qb2luKCcvJyk7XG59O1xuXG59KShyZXF1aXJlKFwiX19icm93c2VyaWZ5X3Byb2Nlc3NcIikpIiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG5cbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcblxucHJvY2Vzcy5uZXh0VGljayA9IChmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGNhblNldEltbWVkaWF0ZSA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgJiYgd2luZG93LnNldEltbWVkaWF0ZTtcbiAgICB2YXIgY2FuUG9zdCA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgJiYgd2luZG93LnBvc3RNZXNzYWdlICYmIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyXG4gICAgO1xuXG4gICAgaWYgKGNhblNldEltbWVkaWF0ZSkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGYpIHsgcmV0dXJuIHdpbmRvdy5zZXRJbW1lZGlhdGUoZikgfTtcbiAgICB9XG5cbiAgICBpZiAoY2FuUG9zdCkge1xuICAgICAgICB2YXIgcXVldWUgPSBbXTtcbiAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBmdW5jdGlvbiAoZXYpIHtcbiAgICAgICAgICAgIGlmIChldi5zb3VyY2UgPT09IHdpbmRvdyAmJiBldi5kYXRhID09PSAncHJvY2Vzcy10aWNrJykge1xuICAgICAgICAgICAgICAgIGV2LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgIGlmIChxdWV1ZS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBmbiA9IHF1ZXVlLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgIGZuKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LCB0cnVlKTtcblxuICAgICAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgICAgIHF1ZXVlLnB1c2goZm4pO1xuICAgICAgICAgICAgd2luZG93LnBvc3RNZXNzYWdlKCdwcm9jZXNzLXRpY2snLCAnKicpO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICBzZXRUaW1lb3V0KGZuLCAwKTtcbiAgICB9O1xufSkoKTtcblxucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufVxuXG4vLyBUT0RPKHNodHlsbWFuKVxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG4iLCJ2YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZSgnZXZlbnRzJykuRXZlbnRFbWl0dGVyO1xuXG52YXIgU0VQQVJBVE9SID0gJzonO1xuXG5mdW5jdGlvbiBldmVudDJtZXNzYWdlKG5hbWUsIGFyZ3MpIHtcbiAgdmFyIG1lc3NhZ2UgPSBuYW1lICsgU0VQQVJBVE9SICsgSlNPTi5zdHJpbmdpZnkoYXJncyk7XG5cbiAgcmV0dXJuIG1lc3NhZ2U7XG59XG5cbmZ1bmN0aW9uIG1lc3NhZ2UyZXZlbnQobWVzc2FnZSkge1xuICB2YXIgbmFtZSwgYXJncztcblxuICB2YXIgaW5kZXhPZlNlcGFyYXRvciA9IG1lc3NhZ2UuaW5kZXhPZihTRVBBUkFUT1IpO1xuICBpZiAofmluZGV4T2ZTZXBhcmF0b3IpIHtcbiAgICBuYW1lID0gbWVzc2FnZS5zdWJzdHJpbmcoMCwgaW5kZXhPZlNlcGFyYXRvcik7XG4gICAgYXJncyA9IEpTT04ucGFyc2UobWVzc2FnZS5zdWJzdHJpbmcoaW5kZXhPZlNlcGFyYXRvciArIDEpKTtcbiAgfSBlbHNlIHtcbiAgICBuYW1lID0gbWVzc2FnZTtcbiAgICBhcmdzID0gdW5kZWZpbmVkO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBuYW1lOiBuYW1lLFxuICAgIGFyZ3M6IGFyZ3NcbiAgfTtcbn1cblxuZnVuY3Rpb24gTTJFKHNlbmRNZXNzYWdlKSB7XG4gIHZhciBtMmUgPSBuZXcgRXZlbnRFbWl0dGVyO1xuXG4gIG0yZS5zZW5kTWVzc2FnZSA9IHNlbmRNZXNzYWdlO1xuXG4gIHZhciBsb2NhbEVtaXQgPSBtMmUuZW1pdDtcblxuICBtMmUuZW1pdCA9XG4gIGZ1bmN0aW9uIHJlbW90ZUVtaXQoKSB7XG4gICAgaWYgKCF0aGlzLnNlbmRNZXNzYWdlKSB7XG4gICAgICB0aHJvdyBFcnJvcignc2VuZE1lc3NhZ2UgaXMgbm90IGRlZmluZWQnKTtcbiAgICB9XG5cbiAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XG4gICAgdmFyIG5hbWUgPSBhcmdzLnNoaWZ0KCk7XG5cbiAgICBpZiAoIU0yRS5wcm9wYWdhdGVOZXdMaXN0ZW5lciAmJiBuYW1lID09PSAnbmV3TGlzdGVuZXInKVxuICAgICAgcmV0dXJuO1xuXG4gICAgdmFyIG1zZyA9IGV2ZW50Mm1lc3NhZ2UobmFtZSwgYXJncyk7XG4gICAgdHJ5IHtcbiAgICAgIHRoaXMuc2VuZE1lc3NhZ2UobXNnKTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgaWYgKHRoaXMubGlzdGVuZXJzKHRoaXMuZXJyb3JuYW1lKS5sZW5ndGgpXG4gICAgICAgIEV2ZW50RW1pdHRlci5wcm90b3R5cGUudHJpZ2dlci5jYWxsKHRoaXMsIHRoaXMuZXJyb3JuYW1lLCBbZXJyb3JdKTtcbiAgICAgIGVsc2VcbiAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgfVxuICB9O1xuXG4gIG0yZS5vbk1lc3NhZ2UgPVxuICBmdW5jdGlvbiBvbk1lc3NhZ2UobXNnKSB7XG4gICAgdmFyIGV2dCA9IG1lc3NhZ2UyZXZlbnQobXNnKTtcbiAgICB2YXIgYXJncyA9IGV2dC5hcmdzO1xuICAgIGFyZ3MudW5zaGlmdChldnQubmFtZSk7XG4gICAgbG9jYWxFbWl0LmFwcGx5KG0yZSwgYXJncyk7XG4gIH07XG5cbiAgcmV0dXJuIG0yZTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBNMkU7XG5NMkUuZXZlbnQybWVzc2FnZSA9IGV2ZW50Mm1lc3NhZ2U7XG5NMkUubWVzc2FnZTJldmVudCA9IG1lc3NhZ2UyZXZlbnQ7XG4iLCIoZnVuY3Rpb24oKXt2YXIgTTJFID0gcmVxdWlyZSgnbTJlJyk7XG52YXIgZnMgPSByZXF1aXJlKCdmcycpO1xudmFyIHBhdGggPSByZXF1aXJlKCdwYXRoJyk7XG5cbnZhciBwcm9wZXJQcm9ncmFtRXJyb3IgPSByZXF1aXJlKCcuL3VpL3Byb3Blci1wcm9ncmFtLWVycm9yJyk7XG52YXIgc29tZXRoaW5nV2VudEJhZCA9IHJlcXVpcmUoJy4vdWkvc29tZXRoaW5nLXdlbnQnKS5iYWQ7XG52YXIgZ2l2ZUZlZWRiYWNrID0gcmVxdWlyZSgnLi91aS9naXZlLWZlZWRiYWNrJyk7XG5cbnZhciB3b3JrZXJGaWxlID0gXCI7KGZ1bmN0aW9uKGUsdCxuKXtmdW5jdGlvbiBpKG4scyl7aWYoIXRbbl0pe2lmKCFlW25dKXt2YXIgbz10eXBlb2YgcmVxdWlyZT09XFxcImZ1bmN0aW9uXFxcIiYmcmVxdWlyZTtpZighcyYmbylyZXR1cm4gbyhuLCEwKTtpZihyKXJldHVybiByKG4sITApO3Rocm93IG5ldyBFcnJvcihcXFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcXFwiK24rXFxcIidcXFwiKX12YXIgdT10W25dPXtleHBvcnRzOnt9fTtlW25dWzBdLmNhbGwodS5leHBvcnRzLGZ1bmN0aW9uKHQpe3ZhciByPWVbbl1bMV1bdF07cmV0dXJuIGkocj9yOnQpfSx1LHUuZXhwb3J0cyl9cmV0dXJuIHRbbl0uZXhwb3J0c312YXIgcj10eXBlb2YgcmVxdWlyZT09XFxcImZ1bmN0aW9uXFxcIiYmcmVxdWlyZTtmb3IodmFyIHM9MDtzPG4ubGVuZ3RoO3MrKylpKG5bc10pO3JldHVybiBpfSkoezE6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xcbihmdW5jdGlvbihwcm9jZXNzKXtpZiAoIXByb2Nlc3MuRXZlbnRFbWl0dGVyKSBwcm9jZXNzLkV2ZW50RW1pdHRlciA9IGZ1bmN0aW9uICgpIHt9O1xcblxcbnZhciBFdmVudEVtaXR0ZXIgPSBleHBvcnRzLkV2ZW50RW1pdHRlciA9IHByb2Nlc3MuRXZlbnRFbWl0dGVyO1xcbnZhciBpc0FycmF5ID0gdHlwZW9mIEFycmF5LmlzQXJyYXkgPT09ICdmdW5jdGlvbidcXG4gICAgPyBBcnJheS5pc0FycmF5XFxuICAgIDogZnVuY3Rpb24gKHhzKSB7XFxuICAgICAgICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHhzKSA9PT0gJ1tvYmplY3QgQXJyYXldJ1xcbiAgICB9XFxuO1xcbmZ1bmN0aW9uIGluZGV4T2YgKHhzLCB4KSB7XFxuICAgIGlmICh4cy5pbmRleE9mKSByZXR1cm4geHMuaW5kZXhPZih4KTtcXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB4cy5sZW5ndGg7IGkrKykge1xcbiAgICAgICAgaWYgKHggPT09IHhzW2ldKSByZXR1cm4gaTtcXG4gICAgfVxcbiAgICByZXR1cm4gLTE7XFxufVxcblxcbi8vIEJ5IGRlZmF1bHQgRXZlbnRFbWl0dGVycyB3aWxsIHByaW50IGEgd2FybmluZyBpZiBtb3JlIHRoYW5cXG4vLyAxMCBsaXN0ZW5lcnMgYXJlIGFkZGVkIHRvIGl0LiBUaGlzIGlzIGEgdXNlZnVsIGRlZmF1bHQgd2hpY2hcXG4vLyBoZWxwcyBmaW5kaW5nIG1lbW9yeSBsZWFrcy5cXG4vL1xcbi8vIE9idmlvdXNseSBub3QgYWxsIEVtaXR0ZXJzIHNob3VsZCBiZSBsaW1pdGVkIHRvIDEwLiBUaGlzIGZ1bmN0aW9uIGFsbG93c1xcbi8vIHRoYXQgdG8gYmUgaW5jcmVhc2VkLiBTZXQgdG8gemVybyBmb3IgdW5saW1pdGVkLlxcbnZhciBkZWZhdWx0TWF4TGlzdGVuZXJzID0gMTA7XFxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5zZXRNYXhMaXN0ZW5lcnMgPSBmdW5jdGlvbihuKSB7XFxuICBpZiAoIXRoaXMuX2V2ZW50cykgdGhpcy5fZXZlbnRzID0ge307XFxuICB0aGlzLl9ldmVudHMubWF4TGlzdGVuZXJzID0gbjtcXG59O1xcblxcblxcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uKHR5cGUpIHtcXG4gIC8vIElmIHRoZXJlIGlzIG5vICdlcnJvcicgZXZlbnQgbGlzdGVuZXIgdGhlbiB0aHJvdy5cXG4gIGlmICh0eXBlID09PSAnZXJyb3InKSB7XFxuICAgIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHMuZXJyb3IgfHxcXG4gICAgICAgIChpc0FycmF5KHRoaXMuX2V2ZW50cy5lcnJvcikgJiYgIXRoaXMuX2V2ZW50cy5lcnJvci5sZW5ndGgpKVxcbiAgICB7XFxuICAgICAgaWYgKGFyZ3VtZW50c1sxXSBpbnN0YW5jZW9mIEVycm9yKSB7XFxuICAgICAgICB0aHJvdyBhcmd1bWVudHNbMV07IC8vIFVuaGFuZGxlZCAnZXJyb3InIGV2ZW50XFxuICAgICAgfSBlbHNlIHtcXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcXFwiVW5jYXVnaHQsIHVuc3BlY2lmaWVkICdlcnJvcicgZXZlbnQuXFxcIik7XFxuICAgICAgfVxcbiAgICAgIHJldHVybiBmYWxzZTtcXG4gICAgfVxcbiAgfVxcblxcbiAgaWYgKCF0aGlzLl9ldmVudHMpIHJldHVybiBmYWxzZTtcXG4gIHZhciBoYW5kbGVyID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xcbiAgaWYgKCFoYW5kbGVyKSByZXR1cm4gZmFsc2U7XFxuXFxuICBpZiAodHlwZW9mIGhhbmRsZXIgPT0gJ2Z1bmN0aW9uJykge1xcbiAgICBzd2l0Y2ggKGFyZ3VtZW50cy5sZW5ndGgpIHtcXG4gICAgICAvLyBmYXN0IGNhc2VzXFxuICAgICAgY2FzZSAxOlxcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMpO1xcbiAgICAgICAgYnJlYWs7XFxuICAgICAgY2FzZSAyOlxcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSk7XFxuICAgICAgICBicmVhaztcXG4gICAgICBjYXNlIDM6XFxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdLCBhcmd1bWVudHNbMl0pO1xcbiAgICAgICAgYnJlYWs7XFxuICAgICAgLy8gc2xvd2VyXFxuICAgICAgZGVmYXVsdDpcXG4gICAgICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcXG4gICAgICAgIGhhbmRsZXIuYXBwbHkodGhpcywgYXJncyk7XFxuICAgIH1cXG4gICAgcmV0dXJuIHRydWU7XFxuXFxuICB9IGVsc2UgaWYgKGlzQXJyYXkoaGFuZGxlcikpIHtcXG4gICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xcblxcbiAgICB2YXIgbGlzdGVuZXJzID0gaGFuZGxlci5zbGljZSgpO1xcbiAgICBmb3IgKHZhciBpID0gMCwgbCA9IGxpc3RlbmVycy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcXG4gICAgICBsaXN0ZW5lcnNbaV0uYXBwbHkodGhpcywgYXJncyk7XFxuICAgIH1cXG4gICAgcmV0dXJuIHRydWU7XFxuXFxuICB9IGVsc2Uge1xcbiAgICByZXR1cm4gZmFsc2U7XFxuICB9XFxufTtcXG5cXG4vLyBFdmVudEVtaXR0ZXIgaXMgZGVmaW5lZCBpbiBzcmMvbm9kZV9ldmVudHMuY2NcXG4vLyBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmVtaXQoKSBpcyBhbHNvIGRlZmluZWQgdGhlcmUuXFxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XFxuICBpZiAoJ2Z1bmN0aW9uJyAhPT0gdHlwZW9mIGxpc3RlbmVyKSB7XFxuICAgIHRocm93IG5ldyBFcnJvcignYWRkTGlzdGVuZXIgb25seSB0YWtlcyBpbnN0YW5jZXMgb2YgRnVuY3Rpb24nKTtcXG4gIH1cXG5cXG4gIGlmICghdGhpcy5fZXZlbnRzKSB0aGlzLl9ldmVudHMgPSB7fTtcXG5cXG4gIC8vIFRvIGF2b2lkIHJlY3Vyc2lvbiBpbiB0aGUgY2FzZSB0aGF0IHR5cGUgPT0gXFxcIm5ld0xpc3RlbmVyc1xcXCIhIEJlZm9yZVxcbiAgLy8gYWRkaW5nIGl0IHRvIHRoZSBsaXN0ZW5lcnMsIGZpcnN0IGVtaXQgXFxcIm5ld0xpc3RlbmVyc1xcXCIuXFxuICB0aGlzLmVtaXQoJ25ld0xpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xcblxcbiAgaWYgKCF0aGlzLl9ldmVudHNbdHlwZV0pIHtcXG4gICAgLy8gT3B0aW1pemUgdGhlIGNhc2Ugb2Ygb25lIGxpc3RlbmVyLiBEb24ndCBuZWVkIHRoZSBleHRyYSBhcnJheSBvYmplY3QuXFxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IGxpc3RlbmVyO1xcbiAgfSBlbHNlIGlmIChpc0FycmF5KHRoaXMuX2V2ZW50c1t0eXBlXSkpIHtcXG5cXG4gICAgLy8gQ2hlY2sgZm9yIGxpc3RlbmVyIGxlYWtcXG4gICAgaWYgKCF0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkKSB7XFxuICAgICAgdmFyIG07XFxuICAgICAgaWYgKHRoaXMuX2V2ZW50cy5tYXhMaXN0ZW5lcnMgIT09IHVuZGVmaW5lZCkge1xcbiAgICAgICAgbSA9IHRoaXMuX2V2ZW50cy5tYXhMaXN0ZW5lcnM7XFxuICAgICAgfSBlbHNlIHtcXG4gICAgICAgIG0gPSBkZWZhdWx0TWF4TGlzdGVuZXJzO1xcbiAgICAgIH1cXG5cXG4gICAgICBpZiAobSAmJiBtID4gMCAmJiB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoID4gbSkge1xcbiAgICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCA9IHRydWU7XFxuICAgICAgICBjb25zb2xlLmVycm9yKCcobm9kZSkgd2FybmluZzogcG9zc2libGUgRXZlbnRFbWl0dGVyIG1lbW9yeSAnICtcXG4gICAgICAgICAgICAgICAgICAgICAgJ2xlYWsgZGV0ZWN0ZWQuICVkIGxpc3RlbmVycyBhZGRlZC4gJyArXFxuICAgICAgICAgICAgICAgICAgICAgICdVc2UgZW1pdHRlci5zZXRNYXhMaXN0ZW5lcnMoKSB0byBpbmNyZWFzZSBsaW1pdC4nLFxcbiAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoKTtcXG4gICAgICAgIGNvbnNvbGUudHJhY2UoKTtcXG4gICAgICB9XFxuICAgIH1cXG5cXG4gICAgLy8gSWYgd2UndmUgYWxyZWFkeSBnb3QgYW4gYXJyYXksIGp1c3QgYXBwZW5kLlxcbiAgICB0aGlzLl9ldmVudHNbdHlwZV0ucHVzaChsaXN0ZW5lcik7XFxuICB9IGVsc2Uge1xcbiAgICAvLyBBZGRpbmcgdGhlIHNlY29uZCBlbGVtZW50LCBuZWVkIHRvIGNoYW5nZSB0byBhcnJheS5cXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gW3RoaXMuX2V2ZW50c1t0eXBlXSwgbGlzdGVuZXJdO1xcbiAgfVxcblxcbiAgcmV0dXJuIHRoaXM7XFxufTtcXG5cXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uID0gRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lcjtcXG5cXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uY2UgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xcbiAgdmFyIHNlbGYgPSB0aGlzO1xcbiAgc2VsZi5vbih0eXBlLCBmdW5jdGlvbiBnKCkge1xcbiAgICBzZWxmLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGcpO1xcbiAgICBsaXN0ZW5lci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xcbiAgfSk7XFxuXFxuICByZXR1cm4gdGhpcztcXG59O1xcblxcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xcbiAgaWYgKCdmdW5jdGlvbicgIT09IHR5cGVvZiBsaXN0ZW5lcikge1xcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3JlbW92ZUxpc3RlbmVyIG9ubHkgdGFrZXMgaW5zdGFuY2VzIG9mIEZ1bmN0aW9uJyk7XFxuICB9XFxuXFxuICAvLyBkb2VzIG5vdCB1c2UgbGlzdGVuZXJzKCksIHNvIG5vIHNpZGUgZWZmZWN0IG9mIGNyZWF0aW5nIF9ldmVudHNbdHlwZV1cXG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbdHlwZV0pIHJldHVybiB0aGlzO1xcblxcbiAgdmFyIGxpc3QgPSB0aGlzLl9ldmVudHNbdHlwZV07XFxuXFxuICBpZiAoaXNBcnJheShsaXN0KSkge1xcbiAgICB2YXIgaSA9IGluZGV4T2YobGlzdCwgbGlzdGVuZXIpO1xcbiAgICBpZiAoaSA8IDApIHJldHVybiB0aGlzO1xcbiAgICBsaXN0LnNwbGljZShpLCAxKTtcXG4gICAgaWYgKGxpc3QubGVuZ3RoID09IDApXFxuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcXG4gIH0gZWxzZSBpZiAodGhpcy5fZXZlbnRzW3R5cGVdID09PSBsaXN0ZW5lcikge1xcbiAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xcbiAgfVxcblxcbiAgcmV0dXJuIHRoaXM7XFxufTtcXG5cXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUFsbExpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XFxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xcbiAgICByZXR1cm4gdGhpcztcXG4gIH1cXG5cXG4gIC8vIGRvZXMgbm90IHVzZSBsaXN0ZW5lcnMoKSwgc28gbm8gc2lkZSBlZmZlY3Qgb2YgY3JlYXRpbmcgX2V2ZW50c1t0eXBlXVxcbiAgaWYgKHR5cGUgJiYgdGhpcy5fZXZlbnRzICYmIHRoaXMuX2V2ZW50c1t0eXBlXSkgdGhpcy5fZXZlbnRzW3R5cGVdID0gbnVsbDtcXG4gIHJldHVybiB0aGlzO1xcbn07XFxuXFxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XFxuICBpZiAoIXRoaXMuX2V2ZW50cykgdGhpcy5fZXZlbnRzID0ge307XFxuICBpZiAoIXRoaXMuX2V2ZW50c1t0eXBlXSkgdGhpcy5fZXZlbnRzW3R5cGVdID0gW107XFxuICBpZiAoIWlzQXJyYXkodGhpcy5fZXZlbnRzW3R5cGVdKSkge1xcbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBbdGhpcy5fZXZlbnRzW3R5cGVdXTtcXG4gIH1cXG4gIHJldHVybiB0aGlzLl9ldmVudHNbdHlwZV07XFxufTtcXG5cXG59KShyZXF1aXJlKFxcXCJfX2Jyb3dzZXJpZnlfcHJvY2Vzc1xcXCIpKVxcbn0se1xcXCJfX2Jyb3dzZXJpZnlfcHJvY2Vzc1xcXCI6Mn1dLDI6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xcbi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxcblxcbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcXG5cXG5wcm9jZXNzLm5leHRUaWNrID0gKGZ1bmN0aW9uICgpIHtcXG4gICAgdmFyIGNhblNldEltbWVkaWF0ZSA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXFxuICAgICYmIHdpbmRvdy5zZXRJbW1lZGlhdGU7XFxuICAgIHZhciBjYW5Qb3N0ID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcXG4gICAgJiYgd2luZG93LnBvc3RNZXNzYWdlICYmIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyXFxuICAgIDtcXG5cXG4gICAgaWYgKGNhblNldEltbWVkaWF0ZSkge1xcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChmKSB7IHJldHVybiB3aW5kb3cuc2V0SW1tZWRpYXRlKGYpIH07XFxuICAgIH1cXG5cXG4gICAgaWYgKGNhblBvc3QpIHtcXG4gICAgICAgIHZhciBxdWV1ZSA9IFtdO1xcbiAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBmdW5jdGlvbiAoZXYpIHtcXG4gICAgICAgICAgICBpZiAoZXYuc291cmNlID09PSB3aW5kb3cgJiYgZXYuZGF0YSA9PT0gJ3Byb2Nlc3MtdGljaycpIHtcXG4gICAgICAgICAgICAgICAgZXYuc3RvcFByb3BhZ2F0aW9uKCk7XFxuICAgICAgICAgICAgICAgIGlmIChxdWV1ZS5sZW5ndGggPiAwKSB7XFxuICAgICAgICAgICAgICAgICAgICB2YXIgZm4gPSBxdWV1ZS5zaGlmdCgpO1xcbiAgICAgICAgICAgICAgICAgICAgZm4oKTtcXG4gICAgICAgICAgICAgICAgfVxcbiAgICAgICAgICAgIH1cXG4gICAgICAgIH0sIHRydWUpO1xcblxcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XFxuICAgICAgICAgICAgcXVldWUucHVzaChmbik7XFxuICAgICAgICAgICAgd2luZG93LnBvc3RNZXNzYWdlKCdwcm9jZXNzLXRpY2snLCAnKicpO1xcbiAgICAgICAgfTtcXG4gICAgfVxcblxcbiAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcXG4gICAgICAgIHNldFRpbWVvdXQoZm4sIDApO1xcbiAgICB9O1xcbn0pKCk7XFxuXFxucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcXG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xcbnByb2Nlc3MuZW52ID0ge307XFxucHJvY2Vzcy5hcmd2ID0gW107XFxuXFxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcXG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xcbn1cXG5cXG4vLyBUT0RPKHNodHlsbWFuKVxcbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XFxucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcXG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcXG59O1xcblxcbn0se31dLDM6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xcbnZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKCdldmVudHMnKS5FdmVudEVtaXR0ZXI7XFxuXFxudmFyIFNFUEFSQVRPUiA9ICc6JztcXG5cXG5mdW5jdGlvbiBldmVudDJtZXNzYWdlKG5hbWUsIGFyZ3MpIHtcXG4gIHZhciBtZXNzYWdlID0gbmFtZSArIFNFUEFSQVRPUiArIEpTT04uc3RyaW5naWZ5KGFyZ3MpO1xcblxcbiAgcmV0dXJuIG1lc3NhZ2U7XFxufVxcblxcbmZ1bmN0aW9uIG1lc3NhZ2UyZXZlbnQobWVzc2FnZSkge1xcbiAgdmFyIG5hbWUsIGFyZ3M7XFxuXFxuICB2YXIgaW5kZXhPZlNlcGFyYXRvciA9IG1lc3NhZ2UuaW5kZXhPZihTRVBBUkFUT1IpO1xcbiAgaWYgKH5pbmRleE9mU2VwYXJhdG9yKSB7XFxuICAgIG5hbWUgPSBtZXNzYWdlLnN1YnN0cmluZygwLCBpbmRleE9mU2VwYXJhdG9yKTtcXG4gICAgYXJncyA9IEpTT04ucGFyc2UobWVzc2FnZS5zdWJzdHJpbmcoaW5kZXhPZlNlcGFyYXRvciArIDEpKTtcXG4gIH0gZWxzZSB7XFxuICAgIG5hbWUgPSBtZXNzYWdlO1xcbiAgICBhcmdzID0gdW5kZWZpbmVkO1xcbiAgfVxcblxcbiAgcmV0dXJuIHtcXG4gICAgbmFtZTogbmFtZSxcXG4gICAgYXJnczogYXJnc1xcbiAgfTtcXG59XFxuXFxuZnVuY3Rpb24gTTJFKHNlbmRNZXNzYWdlKSB7XFxuICB2YXIgbTJlID0gbmV3IEV2ZW50RW1pdHRlcjtcXG5cXG4gIG0yZS5zZW5kTWVzc2FnZSA9IHNlbmRNZXNzYWdlO1xcblxcbiAgdmFyIGxvY2FsRW1pdCA9IG0yZS5lbWl0O1xcblxcbiAgbTJlLmVtaXQgPVxcbiAgZnVuY3Rpb24gcmVtb3RlRW1pdCgpIHtcXG4gICAgaWYgKCF0aGlzLnNlbmRNZXNzYWdlKSB7XFxuICAgICAgdGhyb3cgRXJyb3IoJ3NlbmRNZXNzYWdlIGlzIG5vdCBkZWZpbmVkJyk7XFxuICAgIH1cXG5cXG4gICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpO1xcbiAgICB2YXIgbmFtZSA9IGFyZ3Muc2hpZnQoKTtcXG5cXG4gICAgaWYgKCFNMkUucHJvcGFnYXRlTmV3TGlzdGVuZXIgJiYgbmFtZSA9PT0gJ25ld0xpc3RlbmVyJylcXG4gICAgICByZXR1cm47XFxuXFxuICAgIHZhciBtc2cgPSBldmVudDJtZXNzYWdlKG5hbWUsIGFyZ3MpO1xcbiAgICB0cnkge1xcbiAgICAgIHRoaXMuc2VuZE1lc3NhZ2UobXNnKTtcXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcXG4gICAgICBpZiAodGhpcy5saXN0ZW5lcnModGhpcy5lcnJvcm5hbWUpLmxlbmd0aClcXG4gICAgICAgIEV2ZW50RW1pdHRlci5wcm90b3R5cGUudHJpZ2dlci5jYWxsKHRoaXMsIHRoaXMuZXJyb3JuYW1lLCBbZXJyb3JdKTtcXG4gICAgICBlbHNlXFxuICAgICAgICB0aHJvdyBlcnJvcjtcXG4gICAgfVxcbiAgfTtcXG5cXG4gIG0yZS5vbk1lc3NhZ2UgPVxcbiAgZnVuY3Rpb24gb25NZXNzYWdlKG1zZykge1xcbiAgICB2YXIgZXZ0ID0gbWVzc2FnZTJldmVudChtc2cpO1xcbiAgICB2YXIgYXJncyA9IGV2dC5hcmdzO1xcbiAgICBhcmdzLnVuc2hpZnQoZXZ0Lm5hbWUpO1xcbiAgICBsb2NhbEVtaXQuYXBwbHkobTJlLCBhcmdzKTtcXG4gIH07XFxuXFxuICByZXR1cm4gbTJlO1xcbn1cXG5cXG5tb2R1bGUuZXhwb3J0cyA9IE0yRTtcXG5NMkUuZXZlbnQybWVzc2FnZSA9IGV2ZW50Mm1lc3NhZ2U7XFxuTTJFLm1lc3NhZ2UyZXZlbnQgPSBtZXNzYWdlMmV2ZW50O1xcblxcbn0se1xcXCJldmVudHNcXFwiOjF9XSw0OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcXG4oZnVuY3Rpb24oKXt2YXIgTTJFID0gcmVxdWlyZSgnbTJlJyk7XFxuXFxudmFyIGNoYW5uZWwgPSBuZXcgTTJFKHNlbGYucG9zdE1lc3NhZ2UuYmluZChzZWxmKSk7XFxuXFxuZnVuY3Rpb24gbG9nKCkge1xcbiAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpO1xcbiAgY2hhbm5lbC5lbWl0KCdsb2cnLCBhcmdzKTtcXG59XFxuXFxuLy9sb2coJ2hlbGxvb29vJyk7XFxuXFxudmFyIHN0YXJ0VHMgPSBEYXRlLm5vdygpO1xcbnZhciBnbG9iYWwgPSB7fTtcXG52YXIgcHJvZ3JhbSA9IChmdW5jdGlvbiBnZXRQcm9ncmFtKFxcbiAgICBzZWxmLFxcbiAgICB3aW5kb3csXFxuICAgIGdsb2JhbCxcXG4gICAgLy9sb2csXFxuICAgIGFyZ3VtZW50cyxcXG4gICAgZXZhbCxcXG4gICAgYWxlcnQsXFxuICAgIHByb21wdCxcXG4gICAgcmVxdWlyZSxcXG4gICAgJCxcXG4gICAgZG9jdW1lbnQsXFxuICAgIG5hdmlnYXRvcixcXG4gICAgWE1MSHR0cFJlcXVlc3QsXFxuICAgIEZ1bmN0aW9uLFxcbiAgICBsb2NhdGlvbixcXG4gICAgY29uc29sZSxcXG4gICAgbG9jYWxTdG9yYWdlLFxcbiAgICBzZXNzaW9uU3RvcmFnZSxcXG4gICAgYXBwbGljYXRpb25DYWNoZSxcXG4gICAgY2hyb21lLFxcbiAgICBjbG9zZSxcXG4gICAgY2xpZW50SW5mb3JtYXRpb24sXFxuICAgIGNvbmZpcm0sXFxuICAgIGZyYW1lcyxcXG4gICAgaGlzdG9yeSxcXG4gICAgcHJpbnQsXFxuICAgIHBvc3RNZXNzYWdlLFxcbiAgICBvbm1lc3NnZSxcXG4gICAgcGFyZW50LFxcbiAgICBwcm9maWxlLFxcbiAgICBxLFxcbiAgICB0b3AsXFxuICAgIFdvcmtlcixcXG5cXG4gICAgLy8gbG9jYWxzXFxuICAgIHN0YXJ0VHMsXFxuICAgIHByb2dyYW0sXFxuICAgIGdldFByb2dyYW0sXFxuICAgIGVuZFRzLFxcbiAgICBwcm9ncmFtVGltZVxcbiAgICApIHtcXG5cXG4gIHZhciBfcmVxdWlyZSA9IFBST0dSQU0oKTtcXG4gIFxcbiAgaWYgKF9yZXF1aXJlLm5hbWUgPT09ICdSdW4nKVxcbiAgICByZXR1cm4gX3JlcXVpcmU7XFxuICBlbHNlIC8vIHVzaW5nIGJyb3dzZXJpZnkgP1xcbiAgICByZXR1cm4gX3JlcXVpcmUoMSk7XFxuXFxufSkuY2FsbChnbG9iYWwsIGdsb2JhbCwgZ2xvYmFsKTtcXG5cXG4oZnVuY3Rpb24gKCkge1xcbiAgc2VsZi5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgZnVuY3Rpb24oZSkgeyBjaGFubmVsLm9uTWVzc2FnZShlLmRhdGEpOyB9KTtcXG5cXG4gIGNoYW5uZWwub24oJ2RhdGEnLCBvbkRhdGEpO1xcbiAgY2hhbm5lbC5lbWl0KCdyZWFkeScsIERhdGUubm93KCkgLSBzdGFydFRzKTtcXG5cXG4gIGZ1bmN0aW9uIG9uRGF0YShkYXRhKSB7XFxuICAgIHZhciBzdGFydCA9IERhdGUubm93KCk7XFxuXFxuICAgIHZhciBhcmdzID0gW2RhdGFdO1xcblxcbiAgICBmdW5jdGlvbiBjYihyZXN1bHQpIHtcXG4gICAgICB2YXIgdGltZSA9IERhdGUubm93KCkgLSBzdGFydDtcXG4gICAgICBjaGFubmVsLmVtaXQoJ3Jlc3VsdCcsIHJlc3VsdCwgdGltZSk7XFxuICAgIH1cXG5cXG4gICAgaWYgKHByb2dyYW0uYXN5bmMpXFxuICAgICAgYXJncy5wdXNoKGNiKTtcXG5cXG4gICAgdmFyIHJlc3VsdDtcXG4gICAgdHJ5IHtcXG4gICAgICByZXN1bHQgPSBwcm9ncmFtLmFwcGx5KG51bGwsIGFyZ3MpO1xcbiAgICB9IGNhdGNoIChlKSB7XFxuICAgICAgY2hhbm5lbC5lbWl0KCdmYWlsJywgeyBsaW5lbm86IGUubGluZW5vLCBtZXNzYWdlOiBlLm1lc3NhZ2UgfSk7XFxuICAgICAgcmV0dXJuO1xcbiAgICB9XFxuXFxuICAgIGlmICghcHJvZ3JhbS5pc0FzeW5jKVxcbiAgICAgIGNiKHJlc3VsdCk7XFxuICB9XFxuXFxufSkoKTtcXG5cXG59KSgpXFxufSx7XFxcIm0yZVxcXCI6M31dfSx7fSxbNF0pXFxuLy9AIHNvdXJjZU1hcHBpbmdVUkw9ZGF0YTphcHBsaWNhdGlvbi9qc29uO2Jhc2U2NCxleUoyWlhKemFXOXVJam96TENKbWFXeGxJam9pWjJWdVpYSmhkR1ZrTG1weklpd2ljMjkxY21ObGN5STZXeUl2YUc5dFpTOXFiMkZ2YW1WeWIyNXBiVzh2YzNKakwyTnliM2RrY0hKdlkyVnpjeTl3Y205bmNtRnRMV1ZrYVhSdmNpOXViMlJsWDIxdlpIVnNaWE12WjNKMWJuUXRZbkp2ZDNObGNtbG1lUzl1YjJSbFgyMXZaSFZzWlhNdlluSnZkM05sY21sbWVTOXViMlJsWDIxdlpIVnNaWE12WW5KdmQzTmxjaTFpZFdsc2RHbHVjeTlpZFdsc2RHbHVMMlYyWlc1MGN5NXFjeUlzSWk5b2IyMWxMMnB2WVc5cVpYSnZibWx0Ynk5emNtTXZZM0p2ZDJSd2NtOWpaWE56TDNCeWIyZHlZVzB0WldScGRHOXlMMjV2WkdWZmJXOWtkV3hsY3k5bmNuVnVkQzFpY205M2MyVnlhV1o1TDI1dlpHVmZiVzlrZFd4bGN5OWljbTkzYzJWeWFXWjVMMjV2WkdWZmJXOWtkV3hsY3k5cGJuTmxjblF0Ylc5a2RXeGxMV2RzYjJKaGJITXZibTlrWlY5dGIyUjFiR1Z6TDNCeWIyTmxjM012WW5KdmQzTmxjaTVxY3lJc0lpOW9iMjFsTDJwdllXOXFaWEp2Ym1sdGJ5OXpjbU12WTNKdmQyUndjbTlqWlhOekwzQnliMmR5WVcwdFpXUnBkRzl5TDI1dlpHVmZiVzlrZFd4bGN5OXRNbVV2YVc1a1pYZ3Vhbk1pTENJdmFHOXRaUzlxYjJGdmFtVnliMjVwYlc4dmMzSmpMMk55YjNka2NISnZZMlZ6Y3k5d2NtOW5jbUZ0TFdWa2FYUnZjaTl6Y21NdmQyOXlhMlZ5TG1weklsMHNJbTVoYldWeklqcGJYU3dpYldGd2NHbHVaM01pT2lJN1FVRkJRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CT3p0QlEzaE1RVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPenRCUTNCRVFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUczdRVU40UlVFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJJaXdpYzI5MWNtTmxjME52Ym5SbGJuUWlPbHNpS0daMWJtTjBhVzl1S0hCeWIyTmxjM01wZTJsbUlDZ2hjSEp2WTJWemN5NUZkbVZ1ZEVWdGFYUjBaWElwSUhCeWIyTmxjM011UlhabGJuUkZiV2wwZEdWeUlEMGdablZ1WTNScGIyNGdLQ2tnZTMwN1hHNWNiblpoY2lCRmRtVnVkRVZ0YVhSMFpYSWdQU0JsZUhCdmNuUnpMa1YyWlc1MFJXMXBkSFJsY2lBOUlIQnliMk5sYzNNdVJYWmxiblJGYldsMGRHVnlPMXh1ZG1GeUlHbHpRWEp5WVhrZ1BTQjBlWEJsYjJZZ1FYSnlZWGt1YVhOQmNuSmhlU0E5UFQwZ0oyWjFibU4wYVc5dUoxeHVJQ0FnSUQ4Z1FYSnlZWGt1YVhOQmNuSmhlVnh1SUNBZ0lEb2dablZ1WTNScGIyNGdLSGh6S1NCN1hHNGdJQ0FnSUNBZ0lISmxkSFZ5YmlCUFltcGxZM1F1Y0hKdmRHOTBlWEJsTG5SdlUzUnlhVzVuTG1OaGJHd29lSE1wSUQwOVBTQW5XMjlpYW1WamRDQkJjbkpoZVYwblhHNGdJQ0FnZlZ4dU8xeHVablZ1WTNScGIyNGdhVzVrWlhoUFppQW9lSE1zSUhncElIdGNiaUFnSUNCcFppQW9lSE11YVc1a1pYaFBaaWtnY21WMGRYSnVJSGh6TG1sdVpHVjRUMllvZUNrN1hHNGdJQ0FnWm05eUlDaDJZWElnYVNBOUlEQTdJR2tnUENCNGN5NXNaVzVuZEdnN0lHa3JLeWtnZTF4dUlDQWdJQ0FnSUNCcFppQW9lQ0E5UFQwZ2VITmJhVjBwSUhKbGRIVnliaUJwTzF4dUlDQWdJSDFjYmlBZ0lDQnlaWFIxY200Z0xURTdYRzU5WEc1Y2JpOHZJRUo1SUdSbFptRjFiSFFnUlhabGJuUkZiV2wwZEdWeWN5QjNhV3hzSUhCeWFXNTBJR0VnZDJGeWJtbHVaeUJwWmlCdGIzSmxJSFJvWVc1Y2JpOHZJREV3SUd4cGMzUmxibVZ5Y3lCaGNtVWdZV1JrWldRZ2RHOGdhWFF1SUZSb2FYTWdhWE1nWVNCMWMyVm1kV3dnWkdWbVlYVnNkQ0IzYUdsamFGeHVMeThnYUdWc2NITWdabWx1WkdsdVp5QnRaVzF2Y25rZ2JHVmhhM011WEc0dkwxeHVMeThnVDJKMmFXOTFjMng1SUc1dmRDQmhiR3dnUlcxcGRIUmxjbk1nYzJodmRXeGtJR0psSUd4cGJXbDBaV1FnZEc4Z01UQXVJRlJvYVhNZ1puVnVZM1JwYjI0Z1lXeHNiM2R6WEc0dkx5QjBhR0YwSUhSdklHSmxJR2x1WTNKbFlYTmxaQzRnVTJWMElIUnZJSHBsY204Z1ptOXlJSFZ1YkdsdGFYUmxaQzVjYm5aaGNpQmtaV1poZFd4MFRXRjRUR2x6ZEdWdVpYSnpJRDBnTVRBN1hHNUZkbVZ1ZEVWdGFYUjBaWEl1Y0hKdmRHOTBlWEJsTG5ObGRFMWhlRXhwYzNSbGJtVnljeUE5SUdaMWJtTjBhVzl1S0c0cElIdGNiaUFnYVdZZ0tDRjBhR2x6TGw5bGRtVnVkSE1wSUhSb2FYTXVYMlYyWlc1MGN5QTlJSHQ5TzF4dUlDQjBhR2x6TGw5bGRtVnVkSE11YldGNFRHbHpkR1Z1WlhKeklEMGdianRjYm4wN1hHNWNibHh1UlhabGJuUkZiV2wwZEdWeUxuQnliM1J2ZEhsd1pTNWxiV2wwSUQwZ1puVnVZM1JwYjI0b2RIbHdaU2tnZTF4dUlDQXZMeUJKWmlCMGFHVnlaU0JwY3lCdWJ5QW5aWEp5YjNJbklHVjJaVzUwSUd4cGMzUmxibVZ5SUhSb1pXNGdkR2h5YjNjdVhHNGdJR2xtSUNoMGVYQmxJRDA5UFNBblpYSnliM0luS1NCN1hHNGdJQ0FnYVdZZ0tDRjBhR2x6TGw5bGRtVnVkSE1nZkh3Z0lYUm9hWE11WDJWMlpXNTBjeTVsY25KdmNpQjhmRnh1SUNBZ0lDQWdJQ0FvYVhOQmNuSmhlU2gwYUdsekxsOWxkbVZ1ZEhNdVpYSnliM0lwSUNZbUlDRjBhR2x6TGw5bGRtVnVkSE11WlhKeWIzSXViR1Z1WjNSb0tTbGNiaUFnSUNCN1hHNGdJQ0FnSUNCcFppQW9ZWEpuZFcxbGJuUnpXekZkSUdsdWMzUmhibU5sYjJZZ1JYSnliM0lwSUh0Y2JpQWdJQ0FnSUNBZ2RHaHliM2NnWVhKbmRXMWxiblJ6V3pGZE95QXZMeUJWYm1oaGJtUnNaV1FnSjJWeWNtOXlKeUJsZG1WdWRGeHVJQ0FnSUNBZ2ZTQmxiSE5sSUh0Y2JpQWdJQ0FnSUNBZ2RHaHliM2NnYm1WM0lFVnljbTl5S0Z3aVZXNWpZWFZuYUhRc0lIVnVjM0JsWTJsbWFXVmtJQ2RsY25KdmNpY2daWFpsYm5RdVhDSXBPMXh1SUNBZ0lDQWdmVnh1SUNBZ0lDQWdjbVYwZFhKdUlHWmhiSE5sTzF4dUlDQWdJSDFjYmlBZ2ZWeHVYRzRnSUdsbUlDZ2hkR2hwY3k1ZlpYWmxiblJ6S1NCeVpYUjFjbTRnWm1Gc2MyVTdYRzRnSUhaaGNpQm9ZVzVrYkdWeUlEMGdkR2hwY3k1ZlpYWmxiblJ6VzNSNWNHVmRPMXh1SUNCcFppQW9JV2hoYm1Sc1pYSXBJSEpsZEhWeWJpQm1ZV3h6WlR0Y2JseHVJQ0JwWmlBb2RIbHdaVzltSUdoaGJtUnNaWElnUFQwZ0oyWjFibU4wYVc5dUp5a2dlMXh1SUNBZ0lITjNhWFJqYUNBb1lYSm5kVzFsYm5SekxteGxibWQwYUNrZ2UxeHVJQ0FnSUNBZ0x5OGdabUZ6ZENCallYTmxjMXh1SUNBZ0lDQWdZMkZ6WlNBeE9seHVJQ0FnSUNBZ0lDQm9ZVzVrYkdWeUxtTmhiR3dvZEdocGN5azdYRzRnSUNBZ0lDQWdJR0p5WldGck8xeHVJQ0FnSUNBZ1kyRnpaU0F5T2x4dUlDQWdJQ0FnSUNCb1lXNWtiR1Z5TG1OaGJHd29kR2hwY3l3Z1lYSm5kVzFsYm5Seld6RmRLVHRjYmlBZ0lDQWdJQ0FnWW5KbFlXczdYRzRnSUNBZ0lDQmpZWE5sSURNNlhHNGdJQ0FnSUNBZ0lHaGhibVJzWlhJdVkyRnNiQ2gwYUdsekxDQmhjbWQxYldWdWRITmJNVjBzSUdGeVozVnRaVzUwYzFzeVhTazdYRzRnSUNBZ0lDQWdJR0p5WldGck8xeHVJQ0FnSUNBZ0x5OGdjMnh2ZDJWeVhHNGdJQ0FnSUNCa1pXWmhkV3gwT2x4dUlDQWdJQ0FnSUNCMllYSWdZWEpuY3lBOUlFRnljbUY1TG5CeWIzUnZkSGx3WlM1emJHbGpaUzVqWVd4c0tHRnlaM1Z0Wlc1MGN5d2dNU2s3WEc0Z0lDQWdJQ0FnSUdoaGJtUnNaWEl1WVhCd2JIa29kR2hwY3l3Z1lYSm5jeWs3WEc0Z0lDQWdmVnh1SUNBZ0lISmxkSFZ5YmlCMGNuVmxPMXh1WEc0Z0lIMGdaV3h6WlNCcFppQW9hWE5CY25KaGVTaG9ZVzVrYkdWeUtTa2dlMXh1SUNBZ0lIWmhjaUJoY21keklEMGdRWEp5WVhrdWNISnZkRzkwZVhCbExuTnNhV05sTG1OaGJHd29ZWEpuZFcxbGJuUnpMQ0F4S1R0Y2JseHVJQ0FnSUhaaGNpQnNhWE4wWlc1bGNuTWdQU0JvWVc1a2JHVnlMbk5zYVdObEtDazdYRzRnSUNBZ1ptOXlJQ2gyWVhJZ2FTQTlJREFzSUd3Z1BTQnNhWE4wWlc1bGNuTXViR1Z1WjNSb095QnBJRHdnYkRzZ2FTc3JLU0I3WEc0Z0lDQWdJQ0JzYVhOMFpXNWxjbk5iYVYwdVlYQndiSGtvZEdocGN5d2dZWEpuY3lrN1hHNGdJQ0FnZlZ4dUlDQWdJSEpsZEhWeWJpQjBjblZsTzF4dVhHNGdJSDBnWld4elpTQjdYRzRnSUNBZ2NtVjBkWEp1SUdaaGJITmxPMXh1SUNCOVhHNTlPMXh1WEc0dkx5QkZkbVZ1ZEVWdGFYUjBaWElnYVhNZ1pHVm1hVzVsWkNCcGJpQnpjbU12Ym05a1pWOWxkbVZ1ZEhNdVkyTmNiaTh2SUVWMlpXNTBSVzFwZEhSbGNpNXdjbTkwYjNSNWNHVXVaVzFwZENncElHbHpJR0ZzYzI4Z1pHVm1hVzVsWkNCMGFHVnlaUzVjYmtWMlpXNTBSVzFwZEhSbGNpNXdjbTkwYjNSNWNHVXVZV1JrVEdsemRHVnVaWElnUFNCbWRXNWpkR2x2YmloMGVYQmxMQ0JzYVhOMFpXNWxjaWtnZTF4dUlDQnBaaUFvSjJaMWJtTjBhVzl1SnlBaFBUMGdkSGx3Wlc5bUlHeHBjM1JsYm1WeUtTQjdYRzRnSUNBZ2RHaHliM2NnYm1WM0lFVnljbTl5S0NkaFpHUk1hWE4wWlc1bGNpQnZibXg1SUhSaGEyVnpJR2x1YzNSaGJtTmxjeUJ2WmlCR2RXNWpkR2x2YmljcE8xeHVJQ0I5WEc1Y2JpQWdhV1lnS0NGMGFHbHpMbDlsZG1WdWRITXBJSFJvYVhNdVgyVjJaVzUwY3lBOUlIdDlPMXh1WEc0Z0lDOHZJRlJ2SUdGMmIybGtJSEpsWTNWeWMybHZiaUJwYmlCMGFHVWdZMkZ6WlNCMGFHRjBJSFI1Y0dVZ1BUMGdYQ0p1WlhkTWFYTjBaVzVsY25OY0lpRWdRbVZtYjNKbFhHNGdJQzh2SUdGa1pHbHVaeUJwZENCMGJ5QjBhR1VnYkdsemRHVnVaWEp6TENCbWFYSnpkQ0JsYldsMElGd2libVYzVEdsemRHVnVaWEp6WENJdVhHNGdJSFJvYVhNdVpXMXBkQ2duYm1WM1RHbHpkR1Z1WlhJbkxDQjBlWEJsTENCc2FYTjBaVzVsY2lrN1hHNWNiaUFnYVdZZ0tDRjBhR2x6TGw5bGRtVnVkSE5iZEhsd1pWMHBJSHRjYmlBZ0lDQXZMeUJQY0hScGJXbDZaU0IwYUdVZ1kyRnpaU0J2WmlCdmJtVWdiR2x6ZEdWdVpYSXVJRVJ2YmlkMElHNWxaV1FnZEdobElHVjRkSEpoSUdGeWNtRjVJRzlpYW1WamRDNWNiaUFnSUNCMGFHbHpMbDlsZG1WdWRITmJkSGx3WlYwZ1BTQnNhWE4wWlc1bGNqdGNiaUFnZlNCbGJITmxJR2xtSUNocGMwRnljbUY1S0hSb2FYTXVYMlYyWlc1MGMxdDBlWEJsWFNrcElIdGNibHh1SUNBZ0lDOHZJRU5vWldOcklHWnZjaUJzYVhOMFpXNWxjaUJzWldGclhHNGdJQ0FnYVdZZ0tDRjBhR2x6TGw5bGRtVnVkSE5iZEhsd1pWMHVkMkZ5Ym1Wa0tTQjdYRzRnSUNBZ0lDQjJZWElnYlR0Y2JpQWdJQ0FnSUdsbUlDaDBhR2x6TGw5bGRtVnVkSE11YldGNFRHbHpkR1Z1WlhKeklDRTlQU0IxYm1SbFptbHVaV1FwSUh0Y2JpQWdJQ0FnSUNBZ2JTQTlJSFJvYVhNdVgyVjJaVzUwY3k1dFlYaE1hWE4wWlc1bGNuTTdYRzRnSUNBZ0lDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUNBZ0lDQnRJRDBnWkdWbVlYVnNkRTFoZUV4cGMzUmxibVZ5Y3p0Y2JpQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ2FXWWdLRzBnSmlZZ2JTQStJREFnSmlZZ2RHaHBjeTVmWlhabGJuUnpXM1I1Y0dWZExteGxibWQwYUNBK0lHMHBJSHRjYmlBZ0lDQWdJQ0FnZEdocGN5NWZaWFpsYm5SelczUjVjR1ZkTG5kaGNtNWxaQ0E5SUhSeWRXVTdYRzRnSUNBZ0lDQWdJR052Ym5OdmJHVXVaWEp5YjNJb0p5aHViMlJsS1NCM1lYSnVhVzVuT2lCd2IzTnphV0pzWlNCRmRtVnVkRVZ0YVhSMFpYSWdiV1Z0YjNKNUlDY2dLMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDZHNaV0ZySUdSbGRHVmpkR1ZrTGlBbFpDQnNhWE4wWlc1bGNuTWdZV1JrWldRdUlDY2dLMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDZFZjMlVnWlcxcGRIUmxjaTV6WlhSTllYaE1hWE4wWlc1bGNuTW9LU0IwYnlCcGJtTnlaV0Z6WlNCc2FXMXBkQzRuTEZ4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSFJvYVhNdVgyVjJaVzUwYzF0MGVYQmxYUzVzWlc1bmRHZ3BPMXh1SUNBZ0lDQWdJQ0JqYjI1emIyeGxMblJ5WVdObEtDazdYRzRnSUNBZ0lDQjlYRzRnSUNBZ2ZWeHVYRzRnSUNBZ0x5OGdTV1lnZDJVbmRtVWdZV3h5WldGa2VTQm5iM1FnWVc0Z1lYSnlZWGtzSUdwMWMzUWdZWEJ3Wlc1a0xseHVJQ0FnSUhSb2FYTXVYMlYyWlc1MGMxdDBlWEJsWFM1d2RYTm9LR3hwYzNSbGJtVnlLVHRjYmlBZ2ZTQmxiSE5sSUh0Y2JpQWdJQ0F2THlCQlpHUnBibWNnZEdobElITmxZMjl1WkNCbGJHVnRaVzUwTENCdVpXVmtJSFJ2SUdOb1lXNW5aU0IwYnlCaGNuSmhlUzVjYmlBZ0lDQjBhR2x6TGw5bGRtVnVkSE5iZEhsd1pWMGdQU0JiZEdocGN5NWZaWFpsYm5SelczUjVjR1ZkTENCc2FYTjBaVzVsY2wwN1hHNGdJSDFjYmx4dUlDQnlaWFIxY200Z2RHaHBjenRjYm4wN1hHNWNia1YyWlc1MFJXMXBkSFJsY2k1d2NtOTBiM1I1Y0dVdWIyNGdQU0JGZG1WdWRFVnRhWFIwWlhJdWNISnZkRzkwZVhCbExtRmtaRXhwYzNSbGJtVnlPMXh1WEc1RmRtVnVkRVZ0YVhSMFpYSXVjSEp2ZEc5MGVYQmxMbTl1WTJVZ1BTQm1kVzVqZEdsdmJpaDBlWEJsTENCc2FYTjBaVzVsY2lrZ2UxeHVJQ0IyWVhJZ2MyVnNaaUE5SUhSb2FYTTdYRzRnSUhObGJHWXViMjRvZEhsd1pTd2dablZ1WTNScGIyNGdaeWdwSUh0Y2JpQWdJQ0J6Wld4bUxuSmxiVzkyWlV4cGMzUmxibVZ5S0hSNWNHVXNJR2NwTzF4dUlDQWdJR3hwYzNSbGJtVnlMbUZ3Y0d4NUtIUm9hWE1zSUdGeVozVnRaVzUwY3lrN1hHNGdJSDBwTzF4dVhHNGdJSEpsZEhWeWJpQjBhR2x6TzF4dWZUdGNibHh1UlhabGJuUkZiV2wwZEdWeUxuQnliM1J2ZEhsd1pTNXlaVzF2ZG1WTWFYTjBaVzVsY2lBOUlHWjFibU4wYVc5dUtIUjVjR1VzSUd4cGMzUmxibVZ5S1NCN1hHNGdJR2xtSUNnblpuVnVZM1JwYjI0bklDRTlQU0IwZVhCbGIyWWdiR2x6ZEdWdVpYSXBJSHRjYmlBZ0lDQjBhSEp2ZHlCdVpYY2dSWEp5YjNJb0ozSmxiVzkyWlV4cGMzUmxibVZ5SUc5dWJIa2dkR0ZyWlhNZ2FXNXpkR0Z1WTJWeklHOW1JRVoxYm1OMGFXOXVKeWs3WEc0Z0lIMWNibHh1SUNBdkx5QmtiMlZ6SUc1dmRDQjFjMlVnYkdsemRHVnVaWEp6S0Nrc0lITnZJRzV2SUhOcFpHVWdaV1ptWldOMElHOW1JR055WldGMGFXNW5JRjlsZG1WdWRITmJkSGx3WlYxY2JpQWdhV1lnS0NGMGFHbHpMbDlsZG1WdWRITWdmSHdnSVhSb2FYTXVYMlYyWlc1MGMxdDBlWEJsWFNrZ2NtVjBkWEp1SUhSb2FYTTdYRzVjYmlBZ2RtRnlJR3hwYzNRZ1BTQjBhR2x6TGw5bGRtVnVkSE5iZEhsd1pWMDdYRzVjYmlBZ2FXWWdLR2x6UVhKeVlYa29iR2x6ZENrcElIdGNiaUFnSUNCMllYSWdhU0E5SUdsdVpHVjRUMllvYkdsemRDd2diR2x6ZEdWdVpYSXBPMXh1SUNBZ0lHbG1JQ2hwSUR3Z01Da2djbVYwZFhKdUlIUm9hWE03WEc0Z0lDQWdiR2x6ZEM1emNHeHBZMlVvYVN3Z01TazdYRzRnSUNBZ2FXWWdLR3hwYzNRdWJHVnVaM1JvSUQwOUlEQXBYRzRnSUNBZ0lDQmtaV3hsZEdVZ2RHaHBjeTVmWlhabGJuUnpXM1I1Y0dWZE8xeHVJQ0I5SUdWc2MyVWdhV1lnS0hSb2FYTXVYMlYyWlc1MGMxdDBlWEJsWFNBOVBUMGdiR2x6ZEdWdVpYSXBJSHRjYmlBZ0lDQmtaV3hsZEdVZ2RHaHBjeTVmWlhabGJuUnpXM1I1Y0dWZE8xeHVJQ0I5WEc1Y2JpQWdjbVYwZFhKdUlIUm9hWE03WEc1OU8xeHVYRzVGZG1WdWRFVnRhWFIwWlhJdWNISnZkRzkwZVhCbExuSmxiVzkyWlVGc2JFeHBjM1JsYm1WeWN5QTlJR1oxYm1OMGFXOXVLSFI1Y0dVcElIdGNiaUFnYVdZZ0tHRnlaM1Z0Wlc1MGN5NXNaVzVuZEdnZ1BUMDlJREFwSUh0Y2JpQWdJQ0IwYUdsekxsOWxkbVZ1ZEhNZ1BTQjdmVHRjYmlBZ0lDQnlaWFIxY200Z2RHaHBjenRjYmlBZ2ZWeHVYRzRnSUM4dklHUnZaWE1nYm05MElIVnpaU0JzYVhOMFpXNWxjbk1vS1N3Z2MyOGdibThnYzJsa1pTQmxabVpsWTNRZ2IyWWdZM0psWVhScGJtY2dYMlYyWlc1MGMxdDBlWEJsWFZ4dUlDQnBaaUFvZEhsd1pTQW1KaUIwYUdsekxsOWxkbVZ1ZEhNZ0ppWWdkR2hwY3k1ZlpYWmxiblJ6VzNSNWNHVmRLU0IwYUdsekxsOWxkbVZ1ZEhOYmRIbHdaVjBnUFNCdWRXeHNPMXh1SUNCeVpYUjFjbTRnZEdocGN6dGNibjA3WEc1Y2JrVjJaVzUwUlcxcGRIUmxjaTV3Y205MGIzUjVjR1V1YkdsemRHVnVaWEp6SUQwZ1puVnVZM1JwYjI0b2RIbHdaU2tnZTF4dUlDQnBaaUFvSVhSb2FYTXVYMlYyWlc1MGN5a2dkR2hwY3k1ZlpYWmxiblJ6SUQwZ2UzMDdYRzRnSUdsbUlDZ2hkR2hwY3k1ZlpYWmxiblJ6VzNSNWNHVmRLU0IwYUdsekxsOWxkbVZ1ZEhOYmRIbHdaVjBnUFNCYlhUdGNiaUFnYVdZZ0tDRnBjMEZ5Y21GNUtIUm9hWE11WDJWMlpXNTBjMXQwZVhCbFhTa3BJSHRjYmlBZ0lDQjBhR2x6TGw5bGRtVnVkSE5iZEhsd1pWMGdQU0JiZEdocGN5NWZaWFpsYm5SelczUjVjR1ZkWFR0Y2JpQWdmVnh1SUNCeVpYUjFjbTRnZEdocGN5NWZaWFpsYm5SelczUjVjR1ZkTzF4dWZUdGNibHh1ZlNrb2NtVnhkV2x5WlNoY0lsOWZZbkp2ZDNObGNtbG1lVjl3Y205alpYTnpYQ0lwS1NJc0lpOHZJSE5vYVcwZ1ptOXlJSFZ6YVc1bklIQnliMk5sYzNNZ2FXNGdZbkp2ZDNObGNseHVYRzUyWVhJZ2NISnZZMlZ6Y3lBOUlHMXZaSFZzWlM1bGVIQnZjblJ6SUQwZ2UzMDdYRzVjYm5CeWIyTmxjM011Ym1WNGRGUnBZMnNnUFNBb1puVnVZM1JwYjI0Z0tDa2dlMXh1SUNBZ0lIWmhjaUJqWVc1VFpYUkpiVzFsWkdsaGRHVWdQU0IwZVhCbGIyWWdkMmx1Wkc5M0lDRTlQU0FuZFc1a1pXWnBibVZrSjF4dUlDQWdJQ1ltSUhkcGJtUnZkeTV6WlhSSmJXMWxaR2xoZEdVN1hHNGdJQ0FnZG1GeUlHTmhibEJ2YzNRZ1BTQjBlWEJsYjJZZ2QybHVaRzkzSUNFOVBTQW5kVzVrWldacGJtVmtKMXh1SUNBZ0lDWW1JSGRwYm1SdmR5NXdiM04wVFdWemMyRm5aU0FtSmlCM2FXNWtiM2N1WVdSa1JYWmxiblJNYVhOMFpXNWxjbHh1SUNBZ0lEdGNibHh1SUNBZ0lHbG1JQ2hqWVc1VFpYUkpiVzFsWkdsaGRHVXBJSHRjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJR1oxYm1OMGFXOXVJQ2htS1NCN0lISmxkSFZ5YmlCM2FXNWtiM2N1YzJWMFNXMXRaV1JwWVhSbEtHWXBJSDA3WEc0Z0lDQWdmVnh1WEc0Z0lDQWdhV1lnS0dOaGJsQnZjM1FwSUh0Y2JpQWdJQ0FnSUNBZ2RtRnlJSEYxWlhWbElEMGdXMTA3WEc0Z0lDQWdJQ0FnSUhkcGJtUnZkeTVoWkdSRmRtVnVkRXhwYzNSbGJtVnlLQ2R0WlhOellXZGxKeXdnWm5WdVkzUnBiMjRnS0dWMktTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNCcFppQW9aWFl1YzI5MWNtTmxJRDA5UFNCM2FXNWtiM2NnSmlZZ1pYWXVaR0YwWVNBOVBUMGdKM0J5YjJObGMzTXRkR2xqYXljcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQmxkaTV6ZEc5d1VISnZjR0ZuWVhScGIyNG9LVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JwWmlBb2NYVmxkV1V1YkdWdVozUm9JRDRnTUNrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0IyWVhJZ1ptNGdQU0J4ZFdWMVpTNXphR2xtZENncE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JtYmlncE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ2ZTd2dkSEoxWlNrN1hHNWNiaUFnSUNBZ0lDQWdjbVYwZFhKdUlHWjFibU4wYVc5dUlHNWxlSFJVYVdOcktHWnVLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQnhkV1YxWlM1d2RYTm9LR1p1S1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJSGRwYm1SdmR5NXdiM04wVFdWemMyRm5aU2duY0hKdlkyVnpjeTEwYVdOckp5d2dKeW9uS1R0Y2JpQWdJQ0FnSUNBZ2ZUdGNiaUFnSUNCOVhHNWNiaUFnSUNCeVpYUjFjbTRnWm5WdVkzUnBiMjRnYm1WNGRGUnBZMnNvWm00cElIdGNiaUFnSUNBZ0lDQWdjMlYwVkdsdFpXOTFkQ2htYml3Z01DazdYRzRnSUNBZ2ZUdGNibjBwS0NrN1hHNWNibkJ5YjJObGMzTXVkR2wwYkdVZ1BTQW5Zbkp2ZDNObGNpYzdYRzV3Y205alpYTnpMbUp5YjNkelpYSWdQU0IwY25WbE8xeHVjSEp2WTJWemN5NWxibllnUFNCN2ZUdGNibkJ5YjJObGMzTXVZWEpuZGlBOUlGdGRPMXh1WEc1d2NtOWpaWE56TG1KcGJtUnBibWNnUFNCbWRXNWpkR2x2YmlBb2JtRnRaU2tnZTF4dUlDQWdJSFJvY205M0lHNWxkeUJGY25KdmNpZ25jSEp2WTJWemN5NWlhVzVrYVc1bklHbHpJRzV2ZENCemRYQndiM0owWldRbktUdGNibjFjYmx4dUx5OGdWRTlFVHloemFIUjViRzFoYmlsY2JuQnliMk5sYzNNdVkzZGtJRDBnWm5WdVkzUnBiMjRnS0NrZ2V5QnlaWFIxY200Z0p5OG5JSDA3WEc1d2NtOWpaWE56TG1Ob1pHbHlJRDBnWm5WdVkzUnBiMjRnS0dScGNpa2dlMXh1SUNBZ0lIUm9jbTkzSUc1bGR5QkZjbkp2Y2lnbmNISnZZMlZ6Y3k1amFHUnBjaUJwY3lCdWIzUWdjM1Z3Y0c5eWRHVmtKeWs3WEc1OU8xeHVJaXdpZG1GeUlFVjJaVzUwUlcxcGRIUmxjaUE5SUhKbGNYVnBjbVVvSjJWMlpXNTBjeWNwTGtWMlpXNTBSVzFwZEhSbGNqdGNibHh1ZG1GeUlGTkZVRUZTUVZSUFVpQTlJQ2M2Snp0Y2JseHVablZ1WTNScGIyNGdaWFpsYm5ReWJXVnpjMkZuWlNodVlXMWxMQ0JoY21kektTQjdYRzRnSUhaaGNpQnRaWE56WVdkbElEMGdibUZ0WlNBcklGTkZVRUZTUVZSUFVpQXJJRXBUVDA0dWMzUnlhVzVuYVdaNUtHRnlaM01wTzF4dVhHNGdJSEpsZEhWeWJpQnRaWE56WVdkbE8xeHVmVnh1WEc1bWRXNWpkR2x2YmlCdFpYTnpZV2RsTW1WMlpXNTBLRzFsYzNOaFoyVXBJSHRjYmlBZ2RtRnlJRzVoYldVc0lHRnlaM003WEc1Y2JpQWdkbUZ5SUdsdVpHVjRUMlpUWlhCaGNtRjBiM0lnUFNCdFpYTnpZV2RsTG1sdVpHVjRUMllvVTBWUVFWSkJWRTlTS1R0Y2JpQWdhV1lnS0g1cGJtUmxlRTltVTJWd1lYSmhkRzl5S1NCN1hHNGdJQ0FnYm1GdFpTQTlJRzFsYzNOaFoyVXVjM1ZpYzNSeWFXNW5LREFzSUdsdVpHVjRUMlpUWlhCaGNtRjBiM0lwTzF4dUlDQWdJR0Z5WjNNZ1BTQktVMDlPTG5CaGNuTmxLRzFsYzNOaFoyVXVjM1ZpYzNSeWFXNW5LR2x1WkdWNFQyWlRaWEJoY21GMGIzSWdLeUF4S1NrN1hHNGdJSDBnWld4elpTQjdYRzRnSUNBZ2JtRnRaU0E5SUcxbGMzTmhaMlU3WEc0Z0lDQWdZWEpuY3lBOUlIVnVaR1ZtYVc1bFpEdGNiaUFnZlZ4dVhHNGdJSEpsZEhWeWJpQjdYRzRnSUNBZ2JtRnRaVG9nYm1GdFpTeGNiaUFnSUNCaGNtZHpPaUJoY21kelhHNGdJSDA3WEc1OVhHNWNibVoxYm1OMGFXOXVJRTB5UlNoelpXNWtUV1Z6YzJGblpTa2dlMXh1SUNCMllYSWdiVEpsSUQwZ2JtVjNJRVYyWlc1MFJXMXBkSFJsY2p0Y2JseHVJQ0J0TW1VdWMyVnVaRTFsYzNOaFoyVWdQU0J6Wlc1a1RXVnpjMkZuWlR0Y2JseHVJQ0IyWVhJZ2JHOWpZV3hGYldsMElEMGdiVEpsTG1WdGFYUTdYRzVjYmlBZ2JUSmxMbVZ0YVhRZ1BWeHVJQ0JtZFc1amRHbHZiaUJ5WlcxdmRHVkZiV2wwS0NrZ2UxeHVJQ0FnSUdsbUlDZ2hkR2hwY3k1elpXNWtUV1Z6YzJGblpTa2dlMXh1SUNBZ0lDQWdkR2h5YjNjZ1JYSnliM0lvSjNObGJtUk5aWE56WVdkbElHbHpJRzV2ZENCa1pXWnBibVZrSnlrN1hHNGdJQ0FnZlZ4dVhHNGdJQ0FnZG1GeUlHRnlaM01nUFNCQmNuSmhlUzV3Y205MGIzUjVjR1V1YzJ4cFkyVXVZMkZzYkNoaGNtZDFiV1Z1ZEhNcE8xeHVJQ0FnSUhaaGNpQnVZVzFsSUQwZ1lYSm5jeTV6YUdsbWRDZ3BPMXh1WEc0Z0lDQWdhV1lnS0NGTk1rVXVjSEp2Y0dGbllYUmxUbVYzVEdsemRHVnVaWElnSmlZZ2JtRnRaU0E5UFQwZ0oyNWxkMHhwYzNSbGJtVnlKeWxjYmlBZ0lDQWdJSEpsZEhWeWJqdGNibHh1SUNBZ0lIWmhjaUJ0YzJjZ1BTQmxkbVZ1ZERKdFpYTnpZV2RsS0c1aGJXVXNJR0Z5WjNNcE8xeHVJQ0FnSUhSeWVTQjdYRzRnSUNBZ0lDQjBhR2x6TG5ObGJtUk5aWE56WVdkbEtHMXpaeWs3WEc0Z0lDQWdmU0JqWVhSamFDQW9aWEp5YjNJcElIdGNiaUFnSUNBZ0lHbG1JQ2gwYUdsekxteHBjM1JsYm1WeWN5aDBhR2x6TG1WeWNtOXlibUZ0WlNrdWJHVnVaM1JvS1Z4dUlDQWdJQ0FnSUNCRmRtVnVkRVZ0YVhSMFpYSXVjSEp2ZEc5MGVYQmxMblJ5YVdkblpYSXVZMkZzYkNoMGFHbHpMQ0IwYUdsekxtVnljbTl5Ym1GdFpTd2dXMlZ5Y205eVhTazdYRzRnSUNBZ0lDQmxiSE5sWEc0Z0lDQWdJQ0FnSUhSb2NtOTNJR1Z5Y205eU8xeHVJQ0FnSUgxY2JpQWdmVHRjYmx4dUlDQnRNbVV1YjI1TlpYTnpZV2RsSUQxY2JpQWdablZ1WTNScGIyNGdiMjVOWlhOellXZGxLRzF6WnlrZ2UxeHVJQ0FnSUhaaGNpQmxkblFnUFNCdFpYTnpZV2RsTW1WMlpXNTBLRzF6WnlrN1hHNGdJQ0FnZG1GeUlHRnlaM01nUFNCbGRuUXVZWEpuY3p0Y2JpQWdJQ0JoY21kekxuVnVjMmhwWm5Rb1pYWjBMbTVoYldVcE8xeHVJQ0FnSUd4dlkyRnNSVzFwZEM1aGNIQnNlU2h0TW1Vc0lHRnlaM01wTzF4dUlDQjlPMXh1WEc0Z0lISmxkSFZ5YmlCdE1tVTdYRzU5WEc1Y2JtMXZaSFZzWlM1bGVIQnZjblJ6SUQwZ1RUSkZPMXh1VFRKRkxtVjJaVzUwTW0xbGMzTmhaMlVnUFNCbGRtVnVkREp0WlhOellXZGxPMXh1VFRKRkxtMWxjM05oWjJVeVpYWmxiblFnUFNCdFpYTnpZV2RsTW1WMlpXNTBPMXh1SWl3aUtHWjFibU4wYVc5dUtDbDdkbUZ5SUUweVJTQTlJSEpsY1hWcGNtVW9KMjB5WlNjcE8xeHVYRzUyWVhJZ1kyaGhibTVsYkNBOUlHNWxkeUJOTWtVb2MyVnNaaTV3YjNOMFRXVnpjMkZuWlM1aWFXNWtLSE5sYkdZcEtUdGNibHh1Wm5WdVkzUnBiMjRnYkc5bktDa2dlMXh1SUNCMllYSWdZWEpuY3lBOUlFRnljbUY1TG5CeWIzUnZkSGx3WlM1emJHbGpaUzVqWVd4c0tHRnlaM1Z0Wlc1MGN5azdYRzRnSUdOb1lXNXVaV3d1WlcxcGRDZ25iRzluSnl3Z1lYSm5jeWs3WEc1OVhHNWNiaTh2Ykc5bktDZG9aV3hzYjI5dmJ5Y3BPMXh1WEc1MllYSWdjM1JoY25SVWN5QTlJRVJoZEdVdWJtOTNLQ2s3WEc1MllYSWdaMnh2WW1Gc0lEMGdlMzA3WEc1MllYSWdjSEp2WjNKaGJTQTlJQ2htZFc1amRHbHZiaUJuWlhSUWNtOW5jbUZ0S0Z4dUlDQWdJSE5sYkdZc1hHNGdJQ0FnZDJsdVpHOTNMRnh1SUNBZ0lHZHNiMkpoYkN4Y2JpQWdJQ0F2TDJ4dlp5eGNiaUFnSUNCaGNtZDFiV1Z1ZEhNc1hHNGdJQ0FnWlhaaGJDeGNiaUFnSUNCaGJHVnlkQ3hjYmlBZ0lDQndjbTl0Y0hRc1hHNGdJQ0FnY21WeGRXbHlaU3hjYmlBZ0lDQWtMRnh1SUNBZ0lHUnZZM1Z0Wlc1MExGeHVJQ0FnSUc1aGRtbG5ZWFJ2Y2l4Y2JpQWdJQ0JZVFV4SWRIUndVbVZ4ZFdWemRDeGNiaUFnSUNCR2RXNWpkR2x2Yml4Y2JpQWdJQ0JzYjJOaGRHbHZiaXhjYmlBZ0lDQmpiMjV6YjJ4bExGeHVJQ0FnSUd4dlkyRnNVM1J2Y21GblpTeGNiaUFnSUNCelpYTnphVzl1VTNSdmNtRm5aU3hjYmlBZ0lDQmhjSEJzYVdOaGRHbHZia05oWTJobExGeHVJQ0FnSUdOb2NtOXRaU3hjYmlBZ0lDQmpiRzl6WlN4Y2JpQWdJQ0JqYkdsbGJuUkpibVp2Y20xaGRHbHZiaXhjYmlBZ0lDQmpiMjVtYVhKdExGeHVJQ0FnSUdaeVlXMWxjeXhjYmlBZ0lDQm9hWE4wYjNKNUxGeHVJQ0FnSUhCeWFXNTBMRnh1SUNBZ0lIQnZjM1JOWlhOellXZGxMRnh1SUNBZ0lHOXViV1Z6YzJkbExGeHVJQ0FnSUhCaGNtVnVkQ3hjYmlBZ0lDQndjbTltYVd4bExGeHVJQ0FnSUhFc1hHNGdJQ0FnZEc5d0xGeHVJQ0FnSUZkdmNtdGxjaXhjYmx4dUlDQWdJQzh2SUd4dlkyRnNjMXh1SUNBZ0lITjBZWEowVkhNc1hHNGdJQ0FnY0hKdlozSmhiU3hjYmlBZ0lDQm5aWFJRY205bmNtRnRMRnh1SUNBZ0lHVnVaRlJ6TEZ4dUlDQWdJSEJ5YjJkeVlXMVVhVzFsWEc0Z0lDQWdLU0I3WEc1Y2JpQWdkbUZ5SUY5eVpYRjFhWEpsSUQwZ1VGSlBSMUpCVFNncE8xeHVJQ0JjYmlBZ2FXWWdLRjl5WlhGMWFYSmxMbTVoYldVZ1BUMDlJQ2RTZFc0bktWeHVJQ0FnSUhKbGRIVnliaUJmY21WeGRXbHlaVHRjYmlBZ1pXeHpaU0F2THlCMWMybHVaeUJpY205M2MyVnlhV1o1SUQ5Y2JpQWdJQ0J5WlhSMWNtNGdYM0psY1hWcGNtVW9NU2s3WEc1Y2JuMHBMbU5oYkd3b1oyeHZZbUZzTENCbmJHOWlZV3dzSUdkc2IySmhiQ2s3WEc1Y2JpaG1kVzVqZEdsdmJpQW9LU0I3WEc0Z0lITmxiR1l1WVdSa1JYWmxiblJNYVhOMFpXNWxjaWduYldWemMyRm5aU2NzSUdaMWJtTjBhVzl1S0dVcElIc2dZMmhoYm01bGJDNXZiazFsYzNOaFoyVW9aUzVrWVhSaEtUc2dmU2s3WEc1Y2JpQWdZMmhoYm01bGJDNXZiaWduWkdGMFlTY3NJRzl1UkdGMFlTazdYRzRnSUdOb1lXNXVaV3d1WlcxcGRDZ25jbVZoWkhrbkxDQkVZWFJsTG01dmR5Z3BJQzBnYzNSaGNuUlVjeWs3WEc1Y2JpQWdablZ1WTNScGIyNGdiMjVFWVhSaEtHUmhkR0VwSUh0Y2JpQWdJQ0IyWVhJZ2MzUmhjblFnUFNCRVlYUmxMbTV2ZHlncE8xeHVYRzRnSUNBZ2RtRnlJR0Z5WjNNZ1BTQmJaR0YwWVYwN1hHNWNiaUFnSUNCbWRXNWpkR2x2YmlCallpaHlaWE4xYkhRcElIdGNiaUFnSUNBZ0lIWmhjaUIwYVcxbElEMGdSR0YwWlM1dWIzY29LU0F0SUhOMFlYSjBPMXh1SUNBZ0lDQWdZMmhoYm01bGJDNWxiV2wwS0NkeVpYTjFiSFFuTENCeVpYTjFiSFFzSUhScGJXVXBPMXh1SUNBZ0lIMWNibHh1SUNBZ0lHbG1JQ2h3Y205bmNtRnRMbUZ6ZVc1aktWeHVJQ0FnSUNBZ1lYSm5jeTV3ZFhOb0tHTmlLVHRjYmx4dUlDQWdJSFpoY2lCeVpYTjFiSFE3WEc0Z0lDQWdkSEo1SUh0Y2JpQWdJQ0FnSUhKbGMzVnNkQ0E5SUhCeWIyZHlZVzB1WVhCd2JIa29iblZzYkN3Z1lYSm5jeWs3WEc0Z0lDQWdmU0JqWVhSamFDQW9aU2tnZTF4dUlDQWdJQ0FnWTJoaGJtNWxiQzVsYldsMEtDZG1ZV2xzSnl3Z2V5QnNhVzVsYm04NklHVXViR2x1Wlc1dkxDQnRaWE56WVdkbE9pQmxMbTFsYzNOaFoyVWdmU2s3WEc0Z0lDQWdJQ0J5WlhSMWNtNDdYRzRnSUNBZ2ZWeHVYRzRnSUNBZ2FXWWdLQ0Z3Y205bmNtRnRMbWx6UVhONWJtTXBYRzRnSUNBZ0lDQmpZaWh5WlhOMWJIUXBPMXh1SUNCOVhHNWNibjBwS0NrN1hHNWNibjBwS0NraVhYMD1cXG47XCI7XG5cbmZ1bmN0aW9uIGNyZWF0ZVdvcmtlciAocHJvZ3JhbSkge1xuICB2YXIgd29ya2VyQ29kZSA9IHdvcmtlckZpbGUucmVwbGFjZSgvUFJPR1JBTVxcKFxcKVxcOy8sIHRha2VPdXRGaXJzdEFuZExhc3RTZW1pQ29sb25zKHByb2dyYW0pKTtcbiAgdmFyIHdvcmtlckJsb2IgPSBuZXcgQmxvYihbd29ya2VyQ29kZV0sIHsgJ3R5cGUnIDogJ3RleHRcXC9qYXZhc2NyaXB0JyB9KTtcbiAgdmFyIHdvcmtlckJsb2JVcmwgPSBVUkwuY3JlYXRlT2JqZWN0VVJMKHdvcmtlckJsb2IpO1xuICB2YXIgd3cgPSBuZXcgV29ya2VyKHdvcmtlckJsb2JVcmwpO1xuXG4gIHZhciBjaGFubmVsID0gbmV3IE0yRSgpO1xuXG4gIGNoYW5uZWwuc2VuZE1lc3NhZ2UgPSB3dy5wb3N0TWVzc2FnZS5iaW5kKHd3KTtcbiAgd3cub25tZXNzYWdlID0gZnVuY3Rpb24obSkge1xuICAgIGNoYW5uZWwub25NZXNzYWdlKG0uZGF0YSk7XG4gIH07XG5cbiAgd3cub25lcnJvciA9IGZ1bmN0aW9uIChlcnIpIHtcbiAgICB2YXIgcHJvZ3JhbUVycm9yID0gcHJvcGVyUHJvZ3JhbUVycm9yKGVycik7XG4gICAgdmFyIGJhZCA9IHNvbWV0aGluZ1dlbnRCYWQocHJvZ3JhbUVycm9yKTtcbiAgICBnaXZlRmVlZGJhY2soYmFkKTtcbiAgfTtcblxuICBjaGFubmVsLm9uKCdsb2cnLCBmdW5jdGlvbiAoYXJncykge1xuICAgIGNvbnNvbGUubG9nLmFwcGx5KGNvbnNvbGUsIGFyZ3MpO1xuICB9KTtcblxuICBjaGFubmVsLm9uKCdpbXBsb2RlJywgZnVuY3Rpb24gKCkge1xuICAgIHd3LnRlcm1pbmF0ZSgpO1xuICB9KTtcblxuICByZXR1cm4gY2hhbm5lbDtcbn1cblxuZnVuY3Rpb24gdGFrZU91dEZpcnN0QW5kTGFzdFNlbWlDb2xvbnMoc3RyKSB7XG4gIGlmIChzdHJbMF0gPT09ICc7JyAmJiBzdHJbc3RyLmxlbmd0aCAtIDFdID09PSAnOycpXG4gICAgcmV0dXJuIHN0ci5zdWJzdHJpbmcoMSwgc3RyLmxlbmd0aCAtIDEpO1xuICByZXR1cm4gc3RyO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGNyZWF0ZVdvcmtlcjtcblxufSkoKSIsInZhciBzb21ldGhpbmdXZW50ID0gcmVxdWlyZSgnLi91aS9zb21ldGhpbmctd2VudCcpO1xudmFyIHNvbWV0aGluZ1dlbnRXZWxsID0gc29tZXRoaW5nV2VudC53ZWxsO1xudmFyIHNvbWV0aGluZ1dlbnRCYWQgPSBzb21ldGhpbmdXZW50LmJhZDtcbnZhciBnaXZlRmVlZGJhY2sgPSByZXF1aXJlKCcuL3VpL2dpdmUtZmVlZGJhY2snKTtcblxuZnVuY3Rpb24gZGVhbFdpdGhXb3JrZXJBbmRVcGRhdGVVSSAoY2hhbm5lbCkge1xuICBjaGFubmVsLm9uKCdyZXN1bHQnLCBmdW5jdGlvbiAocmVzdWx0LCB0aW1lKSB7XG4gICAgdmFyIG1zZyA9ICdyZXN1bHQgY29tcHV0ZWQgaW4gPHN0cm9uZz4nK3RpbWUrJ21zPC9zdHJvbmc+JztcbiAgICB2YXIgd2VsbCA9IHNvbWV0aGluZ1dlbnRXZWxsKG1zZyk7XG4gICAgZ2l2ZUZlZWRiYWNrKHdlbGwpO1xuICAgIHZhciBsYXN0UmVzdWx0ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI2xhc3RSZXN1bHQnKTtcbiAgICBsYXN0UmVzdWx0LmlubmVySFRNTCA9IEpTT04uc3RyaW5naWZ5KHJlc3VsdCk7XG4gIH0pO1xuXG4gIGNoYW5uZWwub24oJ3JlYWR5JywgZnVuY3Rpb24gKHByb2dyYW1UaW1lKSB7XG4gICAgdmFyIG1zZyA9ICdwcm9ncmFtbWVkIHdvcmtlciBpbjogPHN0cm9uZz4nK3Byb2dyYW1UaW1lKydtczwvc3Ryb25nPic7XG4gICAgdmFyIHdlbGwgPSBzb21ldGhpbmdXZW50V2VsbChtc2cpO1xuICAgIGdpdmVGZWVkYmFjayh3ZWxsKTtcbiAgfSk7XG5cbiAgY2hhbm5lbC5vbignZmFpbCcsIGZ1bmN0aW9uIChlcnIpIHtcbiAgICB2YXIgYmFkID0gc29tZXRoaW5nV2VudEJhZCgnZXJyb3I6ICcrSlNPTi5zdHJpbmdpZnkoZXJyKSk7XG4gICAgZ2l2ZUZlZWRiYWNrKGJhZCk7XG4gIH0pO1xuXG4gIGNoYW5uZWwub24oJ2ltcGxvZGUnLCBmdW5jdGlvbiAoKSB7XG4gICAgY29uc29sZS5sb2coJ0lNUExPREUhISBHT09EIEJZRSEnKTtcbiAgfSk7XG5cbiAgdmFyIGRhdGFVbml0RWwgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjZGF0YVVuaXQnKTtcblxuICBmdW5jdGlvbiBydW5EYXRhVW5pdCgpIHtcbiAgICB0cnkge1xuICAgICAgdmFyIGRhdGFVbml0ID0gSlNPTi5wYXJzZShkYXRhVW5pdEVsLnZhbHVlKTtcbiAgICAgIGNoYW5uZWwuZW1pdCgnZGF0YScsIGRhdGFVbml0KTtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIHZhciBiYWQgPSBzb21ldGhpbmdXZW50QmFkKCdpbnZhbGlkIEpTT04gaW4gZGF0YSB1bml0IDxici8+JytlcnIpO1xuICAgICAgZ2l2ZUZlZWRiYWNrKGJhZCk7XG4gICAgfVxuICB9XG5cbiAgaWYgKGRhdGFVbml0RWwudmFsdWUpIC8vIGlmIHRoZXJlJ3Mgc29tZXRoaW5nIHRoZXJlXG4gICAgcnVuRGF0YVVuaXQoKTsgLy8gcnVuIGl0IGFzIHNvb24gYXMgdGhlIHdvcmtlciBsb2Fkc1xuXG4gIHZhciB0ZXN0RWwgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjdGVzdCcpO1xuICB0ZXN0RWwub25jbGljayA9IHJ1bkRhdGFVbml0OyAvLyBhbmQgd2hlbiBzb21lb25lIGNsaWNrcyBvbiB0aGUgdGVzdCBidXR0b25cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBkZWFsV2l0aFdvcmtlckFuZFVwZGF0ZVVJO1xuIiwidmFyIGNyZWF0ZVdvcmtlciA9IHJlcXVpcmUoJy4vY3JlYXRlLXdvcmtlcicpO1xudmFyIGRlYWxXaXRoV29ya2VyQW5kVXBkYXRlVUkgPSByZXF1aXJlKCcuL2RlYWwtd2l0aC13b3JrZXItYW5kLXVwZGF0ZS1VSS5qcycpO1xudmFyIHdzID0gbmV3IFdlYlNvY2tldCgnd3M6Ly8nK3dpbmRvdy5sb2NhdGlvbi5ob3N0KTtcblxudmFyIHd3Q2hhbm5lbDtcblxud3Mub25vcGVuID0gZnVuY3Rpb24gKCkge1xuICBjb25zb2xlLmxvZygnV1MgY29ubmVjdGVkJyk7XG59O1xuXG53cy5vbm1lc3NhZ2UgPSBmdW5jdGlvbiAobXNnKSB7XG4gIGlmICh3d0NoYW5uZWwpXG4gICAgd3dDaGFubmVsLmVtaXQoJ2ltcGxvZGUnKTtcbiAgd3dDaGFubmVsID0gY3JlYXRlV29ya2VyKG1zZy5kYXRhKTtcbiAgZGVhbFdpdGhXb3JrZXJBbmRVcGRhdGVVSSh3d0NoYW5uZWwpO1xufTtcblxud3Mub25jbG9zZSA9IGZ1bmN0aW9uICgpIHtcbiAgd3MgPSBuZXcgV2ViU29ja2V0KCd3czovL2xvY2FsaG9zdDo4MDgxJyk7XG59O1xuIiwidmFyIGZlZWRiYWNrID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI2ZlZWRiYWNrJyk7XG5cbmZ1bmN0aW9uIGdpdmVGZWVkYmFjayAoZWwpIHtcbiAgaWYgKGZlZWRiYWNrLmNoaWxkcmVuLmxlbmd0aCA9PT0gMClcbiAgICBmZWVkYmFjay5hcHBlbmRDaGlsZChlbCk7XG4gIGVsc2VcbiAgICBmZWVkYmFjay5pbnNlcnRCZWZvcmUoZWwsIGZlZWRiYWNrLmNoaWxkcmVuWzBdKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBnaXZlRmVlZGJhY2s7IiwiZnVuY3Rpb24gcHJvcGVyUHJvZ3JhbUVycm9yKGVycikge1xuICB2YXIgbXNnID0gJ0FuIGVycm9yIG9jY3VycmVkIGxvYWRpbmcgeW91ciAnK1xuICAgICAgICAgICAgJzxhIGhyZWY9XCInK2Vyci5maWxlbmFtZSsnXCIgdGFyZ2V0PVwiX25ld1wiPnByb2dyYW08L2E+ICcrXG4gICAgICAgICAgICAnb24gbGluZSA8Yj4nK2Vyci5saW5lbm8rJzwvYj46PGJyLz4nK1xuICAgICAgICAgICAgJzxwcmU+PGNvZGU+JytlcnIubWVzc2FnZSsnPC9jb2RlPjwvcHJlPic7XG5cbiAgcmV0dXJuIG1zZztcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBwcm9wZXJQcm9ncmFtRXJyb3I7XG5cbi8qXG5cbiAgICBTYW1wbGUgZXJyb3Jcblxue1xuICBcImxpbmVub1wiOjY3LFxuICBcImZpbGVuYW1lXCI6XCJibG9iOmh0dHAlM0EvL2xvY2FsaG9zdCUzQTgwODEvMTQzODQzYWItYjNjOS00YzI4LWFlZTktZjdiMzc1Y2RmMDNjXCIsXG4gIFwibWVzc2FnZVwiOlwiVW5jYXVnaHQgU3ludGF4RXJyb3I6IFVuZXhwZWN0ZWQgaWRlbnRpZmllclwiLFxuICBcImNhbmNlbEJ1YmJsZVwiOmZhbHNlLFxuICBcInJldHVyblZhbHVlXCI6dHJ1ZSxcbiAgXCJzcmNFbGVtZW50XCI6e30sXG4gIFwiZGVmYXVsdFByZXZlbnRlZFwiOmZhbHNlLFxuICBcInRpbWVTdGFtcFwiOjEzNzU0NTQ3ODEyMTQsXG4gIFwiY2FuY2VsYWJsZVwiOnRydWUsXG4gIFwiYnViYmxlc1wiOmZhbHNlLFxuICBcImV2ZW50UGhhc2VcIjoyLFxuICBcImN1cnJlbnRUYXJnZXRcIjp7fSxcbiAgXCJ0YXJnZXRcIjp7fSxcbiAgXCJ0eXBlXCI6XCJlcnJvclwiXG59XG4qL1xuIiwiZnVuY3Rpb24gc29tZXRoaW5nV2VudCAobXNnLCBob3cpIHtcbiAgdmFyIGVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gIGVsLmNsYXNzTGlzdC5hZGQoJ2FsZXJ0Jyk7XG4gIGVsLmNsYXNzTGlzdC5hZGQoaG93KTtcbiAgZWwuaW5uZXJIVE1MID0gbXNnO1xuICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICBlbC5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKGVsKTtcbiAgfSwgMTAwMDApO1xuICByZXR1cm4gZWw7XG59XG5cbmZ1bmN0aW9uIHNvbWV0aGluZ1dlbnRXZWxsIChtc2cpIHtcbiAgcmV0dXJuIHNvbWV0aGluZ1dlbnQobXNnLCAnYWxlcnQtc3VjY2VzcycpO1xufVxuXG5mdW5jdGlvbiBzb21ldGhpbmdXZW50QmFkIChtc2cpIHtcbiAgcmV0dXJuIHNvbWV0aGluZ1dlbnQobXNnLCAnYWxlcnQtZXJyb3InKTtcbn1cblxuZXhwb3J0cy53ZWxsID0gc29tZXRoaW5nV2VudFdlbGw7XG5leHBvcnRzLmJhZCA9IHNvbWV0aGluZ1dlbnRCYWQ7Il19
;