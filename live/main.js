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

var properProgramError = require('./ui/proper-program-error');
var somethingWentBad = require('./ui/something-went').bad;
var giveFeedback = require('./ui/give-feedback');

var workerFile = ";(function(e,t,n){function i(n,s){if(!t[n]){if(!e[n]){var o=typeof require==\"function\"&&require;if(!s&&o)return o(n,!0);if(r)return r(n,!0);throw new Error(\"Cannot find module '\"+n+\"'\")}var u=t[n]={exports:{}};e[n][0].call(u.exports,function(t){var r=e[n][1][t];return i(r?r:t)},u,u.exports)}return t[n].exports}var r=typeof require==\"function\"&&require;for(var s=0;s<n.length;s++)i(n[s]);return i})({1:[function(require,module,exports){\n(function(){var M2E = require('m2e');\n\nvar channel = new M2E(self.postMessage.bind(self));\n\nfunction log() {\n  var args = Array.prototype.slice.call(arguments);\n  channel.emit('log', args);\n}\n\n//log('helloooo');\n\nvar startTs = Date.now();\nvar global = {};\nvar program = (function getProgram(\n    self,\n    window,\n    global,\n    //log,\n    arguments,\n    eval,\n    alert,\n    prompt,\n    require,\n    $,\n    document,\n    navigator,\n    XMLHttpRequest,\n    Function,\n    location,\n    console,\n    localStorage,\n    sessionStorage,\n    applicationCache,\n    chrome,\n    close,\n    clientInformation,\n    confirm,\n    frames,\n    history,\n    print,\n    postMessage,\n    onmessge,\n    parent,\n    profile,\n    q,\n    top,\n    Worker,\n\n    // locals\n    startTs,\n    program,\n    getProgram,\n    endTs,\n    programTime\n    ) {\n\n  var _require = PROGRAM();\n  \n  if (_require.name === 'Run')\n    return _require;\n  else // using browserify ?\n    return _require(1);\n\n}).call(global, global, global);\n\n(function () {\n  self.addEventListener('message', function(e) { channel.onMessage(e.data); });\n\n  channel.on('data', onData);\n  channel.emit('ready', Date.now() - startTs);\n\n  function onData(data) {\n    var start = Date.now();\n\n    var args = [data];\n\n    function cb(result) {\n      var time = Date.now() - start;\n      channel.emit('result', result, time);\n    }\n\n    if (program.async)\n      args.push(cb);\n\n    var result;\n    try {\n      result = program.apply(null, args);\n    } catch (e) {\n      channel.emit('fail', { lineno: e.lineno, message: e.message });\n      return;\n    }\n\n    if (!program.isAsync)\n      cb(result);\n  }\n\n})();\n\n})()\n},{\"m2e\":2}],2:[function(require,module,exports){\nvar EventEmitter = require('events').EventEmitter;\n\nvar SEPARATOR = ':';\n\nfunction event2message(name, args) {\n  var message = name + SEPARATOR + JSON.stringify(args);\n\n  return message;\n}\n\nfunction message2event(message) {\n  var name, args;\n\n  var indexOfSeparator = message.indexOf(SEPARATOR);\n  if (~indexOfSeparator) {\n    name = message.substring(0, indexOfSeparator);\n    args = JSON.parse(message.substring(indexOfSeparator + 1));\n  } else {\n    name = message;\n    args = undefined;\n  }\n\n  return {\n    name: name,\n    args: args\n  };\n}\n\nfunction M2E(sendMessage) {\n  var m2e = new EventEmitter;\n\n  m2e.sendMessage = sendMessage;\n\n  var localEmit = m2e.emit;\n\n  m2e.emit =\n  function remoteEmit() {\n    if (!this.sendMessage) {\n      throw Error('sendMessage is not defined');\n    }\n\n    var args = Array.prototype.slice.call(arguments);\n    var name = args.shift();\n\n    if (!M2E.propagateNewListener && name === 'newListener')\n      return;\n\n    var msg = event2message(name, args);\n    try {\n      this.sendMessage(msg);\n    } catch (error) {\n      if (this.listeners(this.errorname).length)\n        EventEmitter.prototype.trigger.call(this, this.errorname, [error]);\n      else\n        throw error;\n    }\n  };\n\n  m2e.onMessage =\n  function onMessage(msg) {\n    var evt = message2event(msg);\n    var args = evt.args;\n    args.unshift(evt.name);\n    localEmit.apply(m2e, args);\n  };\n\n  return m2e;\n}\n\nmodule.exports = M2E;\nM2E.event2message = event2message;\nM2E.message2event = message2event;\n\n},{\"events\":3}],4:[function(require,module,exports){\n// shim for using process in browser\n\nvar process = module.exports = {};\n\nprocess.nextTick = (function () {\n    var canSetImmediate = typeof window !== 'undefined'\n    && window.setImmediate;\n    var canPost = typeof window !== 'undefined'\n    && window.postMessage && window.addEventListener\n    ;\n\n    if (canSetImmediate) {\n        return function (f) { return window.setImmediate(f) };\n    }\n\n    if (canPost) {\n        var queue = [];\n        window.addEventListener('message', function (ev) {\n            if (ev.source === window && ev.data === 'process-tick') {\n                ev.stopPropagation();\n                if (queue.length > 0) {\n                    var fn = queue.shift();\n                    fn();\n                }\n            }\n        }, true);\n\n        return function nextTick(fn) {\n            queue.push(fn);\n            window.postMessage('process-tick', '*');\n        };\n    }\n\n    return function nextTick(fn) {\n        setTimeout(fn, 0);\n    };\n})();\n\nprocess.title = 'browser';\nprocess.browser = true;\nprocess.env = {};\nprocess.argv = [];\n\nprocess.binding = function (name) {\n    throw new Error('process.binding is not supported');\n}\n\n// TODO(shtylman)\nprocess.cwd = function () { return '/' };\nprocess.chdir = function (dir) {\n    throw new Error('process.chdir is not supported');\n};\n\n},{}],3:[function(require,module,exports){\n(function(process){if (!process.EventEmitter) process.EventEmitter = function () {};\n\nvar EventEmitter = exports.EventEmitter = process.EventEmitter;\nvar isArray = typeof Array.isArray === 'function'\n    ? Array.isArray\n    : function (xs) {\n        return Object.prototype.toString.call(xs) === '[object Array]'\n    }\n;\nfunction indexOf (xs, x) {\n    if (xs.indexOf) return xs.indexOf(x);\n    for (var i = 0; i < xs.length; i++) {\n        if (x === xs[i]) return i;\n    }\n    return -1;\n}\n\n// By default EventEmitters will print a warning if more than\n// 10 listeners are added to it. This is a useful default which\n// helps finding memory leaks.\n//\n// Obviously not all Emitters should be limited to 10. This function allows\n// that to be increased. Set to zero for unlimited.\nvar defaultMaxListeners = 10;\nEventEmitter.prototype.setMaxListeners = function(n) {\n  if (!this._events) this._events = {};\n  this._events.maxListeners = n;\n};\n\n\nEventEmitter.prototype.emit = function(type) {\n  // If there is no 'error' event listener then throw.\n  if (type === 'error') {\n    if (!this._events || !this._events.error ||\n        (isArray(this._events.error) && !this._events.error.length))\n    {\n      if (arguments[1] instanceof Error) {\n        throw arguments[1]; // Unhandled 'error' event\n      } else {\n        throw new Error(\"Uncaught, unspecified 'error' event.\");\n      }\n      return false;\n    }\n  }\n\n  if (!this._events) return false;\n  var handler = this._events[type];\n  if (!handler) return false;\n\n  if (typeof handler == 'function') {\n    switch (arguments.length) {\n      // fast cases\n      case 1:\n        handler.call(this);\n        break;\n      case 2:\n        handler.call(this, arguments[1]);\n        break;\n      case 3:\n        handler.call(this, arguments[1], arguments[2]);\n        break;\n      // slower\n      default:\n        var args = Array.prototype.slice.call(arguments, 1);\n        handler.apply(this, args);\n    }\n    return true;\n\n  } else if (isArray(handler)) {\n    var args = Array.prototype.slice.call(arguments, 1);\n\n    var listeners = handler.slice();\n    for (var i = 0, l = listeners.length; i < l; i++) {\n      listeners[i].apply(this, args);\n    }\n    return true;\n\n  } else {\n    return false;\n  }\n};\n\n// EventEmitter is defined in src/node_events.cc\n// EventEmitter.prototype.emit() is also defined there.\nEventEmitter.prototype.addListener = function(type, listener) {\n  if ('function' !== typeof listener) {\n    throw new Error('addListener only takes instances of Function');\n  }\n\n  if (!this._events) this._events = {};\n\n  // To avoid recursion in the case that type == \"newListeners\"! Before\n  // adding it to the listeners, first emit \"newListeners\".\n  this.emit('newListener', type, listener);\n\n  if (!this._events[type]) {\n    // Optimize the case of one listener. Don't need the extra array object.\n    this._events[type] = listener;\n  } else if (isArray(this._events[type])) {\n\n    // Check for listener leak\n    if (!this._events[type].warned) {\n      var m;\n      if (this._events.maxListeners !== undefined) {\n        m = this._events.maxListeners;\n      } else {\n        m = defaultMaxListeners;\n      }\n\n      if (m && m > 0 && this._events[type].length > m) {\n        this._events[type].warned = true;\n        console.error('(node) warning: possible EventEmitter memory ' +\n                      'leak detected. %d listeners added. ' +\n                      'Use emitter.setMaxListeners() to increase limit.',\n                      this._events[type].length);\n        console.trace();\n      }\n    }\n\n    // If we've already got an array, just append.\n    this._events[type].push(listener);\n  } else {\n    // Adding the second element, need to change to array.\n    this._events[type] = [this._events[type], listener];\n  }\n\n  return this;\n};\n\nEventEmitter.prototype.on = EventEmitter.prototype.addListener;\n\nEventEmitter.prototype.once = function(type, listener) {\n  var self = this;\n  self.on(type, function g() {\n    self.removeListener(type, g);\n    listener.apply(this, arguments);\n  });\n\n  return this;\n};\n\nEventEmitter.prototype.removeListener = function(type, listener) {\n  if ('function' !== typeof listener) {\n    throw new Error('removeListener only takes instances of Function');\n  }\n\n  // does not use listeners(), so no side effect of creating _events[type]\n  if (!this._events || !this._events[type]) return this;\n\n  var list = this._events[type];\n\n  if (isArray(list)) {\n    var i = indexOf(list, listener);\n    if (i < 0) return this;\n    list.splice(i, 1);\n    if (list.length == 0)\n      delete this._events[type];\n  } else if (this._events[type] === listener) {\n    delete this._events[type];\n  }\n\n  return this;\n};\n\nEventEmitter.prototype.removeAllListeners = function(type) {\n  if (arguments.length === 0) {\n    this._events = {};\n    return this;\n  }\n\n  // does not use listeners(), so no side effect of creating _events[type]\n  if (type && this._events && this._events[type]) this._events[type] = null;\n  return this;\n};\n\nEventEmitter.prototype.listeners = function(type) {\n  if (!this._events) this._events = {};\n  if (!this._events[type]) this._events[type] = [];\n  if (!isArray(this._events[type])) {\n    this._events[type] = [this._events[type]];\n  }\n  return this._events[type];\n};\n\n})(require(\"__browserify_process\"))\n},{\"__browserify_process\":4}]},{},[1])\n//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvaG9tZS9qb2FvamVyb25pbW8vc3JjL2Nyb3dkcHJvY2Vzcy9wcm9ncmFtLWVkaXRvci9zcmMvd29ya2VyLmpzIiwiL2hvbWUvam9hb2plcm9uaW1vL3NyYy9jcm93ZHByb2Nlc3MvcHJvZ3JhbS1lZGl0b3Ivbm9kZV9tb2R1bGVzL20yZS9pbmRleC5qcyIsIi9ob21lL2pvYW9qZXJvbmltby9zcmMvY3Jvd2Rwcm9jZXNzL3Byb2dyYW0tZWRpdG9yL25vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9pbnNlcnQtbW9kdWxlLWdsb2JhbHMvbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyIsIi9ob21lL2pvYW9qZXJvbmltby9zcmMvY3Jvd2Rwcm9jZXNzL3Byb2dyYW0tZWRpdG9yL25vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXJlc29sdmUvYnVpbHRpbi9ldmVudHMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXt2YXIgTTJFID0gcmVxdWlyZSgnbTJlJyk7XG5cbnZhciBjaGFubmVsID0gbmV3IE0yRShzZWxmLnBvc3RNZXNzYWdlLmJpbmQoc2VsZikpO1xuXG5mdW5jdGlvbiBsb2coKSB7XG4gIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcbiAgY2hhbm5lbC5lbWl0KCdsb2cnLCBhcmdzKTtcbn1cblxuLy9sb2coJ2hlbGxvb29vJyk7XG5cbnZhciBzdGFydFRzID0gRGF0ZS5ub3coKTtcbnZhciBnbG9iYWwgPSB7fTtcbnZhciBwcm9ncmFtID0gKGZ1bmN0aW9uIGdldFByb2dyYW0oXG4gICAgc2VsZixcbiAgICB3aW5kb3csXG4gICAgZ2xvYmFsLFxuICAgIC8vbG9nLFxuICAgIGFyZ3VtZW50cyxcbiAgICBldmFsLFxuICAgIGFsZXJ0LFxuICAgIHByb21wdCxcbiAgICByZXF1aXJlLFxuICAgICQsXG4gICAgZG9jdW1lbnQsXG4gICAgbmF2aWdhdG9yLFxuICAgIFhNTEh0dHBSZXF1ZXN0LFxuICAgIEZ1bmN0aW9uLFxuICAgIGxvY2F0aW9uLFxuICAgIGNvbnNvbGUsXG4gICAgbG9jYWxTdG9yYWdlLFxuICAgIHNlc3Npb25TdG9yYWdlLFxuICAgIGFwcGxpY2F0aW9uQ2FjaGUsXG4gICAgY2hyb21lLFxuICAgIGNsb3NlLFxuICAgIGNsaWVudEluZm9ybWF0aW9uLFxuICAgIGNvbmZpcm0sXG4gICAgZnJhbWVzLFxuICAgIGhpc3RvcnksXG4gICAgcHJpbnQsXG4gICAgcG9zdE1lc3NhZ2UsXG4gICAgb25tZXNzZ2UsXG4gICAgcGFyZW50LFxuICAgIHByb2ZpbGUsXG4gICAgcSxcbiAgICB0b3AsXG4gICAgV29ya2VyLFxuXG4gICAgLy8gbG9jYWxzXG4gICAgc3RhcnRUcyxcbiAgICBwcm9ncmFtLFxuICAgIGdldFByb2dyYW0sXG4gICAgZW5kVHMsXG4gICAgcHJvZ3JhbVRpbWVcbiAgICApIHtcblxuICB2YXIgX3JlcXVpcmUgPSBQUk9HUkFNKCk7XG4gIFxuICBpZiAoX3JlcXVpcmUubmFtZSA9PT0gJ1J1bicpXG4gICAgcmV0dXJuIF9yZXF1aXJlO1xuICBlbHNlIC8vIHVzaW5nIGJyb3dzZXJpZnkgP1xuICAgIHJldHVybiBfcmVxdWlyZSgxKTtcblxufSkuY2FsbChnbG9iYWwsIGdsb2JhbCwgZ2xvYmFsKTtcblxuKGZ1bmN0aW9uICgpIHtcbiAgc2VsZi5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgZnVuY3Rpb24oZSkgeyBjaGFubmVsLm9uTWVzc2FnZShlLmRhdGEpOyB9KTtcblxuICBjaGFubmVsLm9uKCdkYXRhJywgb25EYXRhKTtcbiAgY2hhbm5lbC5lbWl0KCdyZWFkeScsIERhdGUubm93KCkgLSBzdGFydFRzKTtcblxuICBmdW5jdGlvbiBvbkRhdGEoZGF0YSkge1xuICAgIHZhciBzdGFydCA9IERhdGUubm93KCk7XG5cbiAgICB2YXIgYXJncyA9IFtkYXRhXTtcblxuICAgIGZ1bmN0aW9uIGNiKHJlc3VsdCkge1xuICAgICAgdmFyIHRpbWUgPSBEYXRlLm5vdygpIC0gc3RhcnQ7XG4gICAgICBjaGFubmVsLmVtaXQoJ3Jlc3VsdCcsIHJlc3VsdCwgdGltZSk7XG4gICAgfVxuXG4gICAgaWYgKHByb2dyYW0uYXN5bmMpXG4gICAgICBhcmdzLnB1c2goY2IpO1xuXG4gICAgdmFyIHJlc3VsdDtcbiAgICB0cnkge1xuICAgICAgcmVzdWx0ID0gcHJvZ3JhbS5hcHBseShudWxsLCBhcmdzKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBjaGFubmVsLmVtaXQoJ2ZhaWwnLCB7IGxpbmVubzogZS5saW5lbm8sIG1lc3NhZ2U6IGUubWVzc2FnZSB9KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAoIXByb2dyYW0uaXNBc3luYylcbiAgICAgIGNiKHJlc3VsdCk7XG4gIH1cblxufSkoKTtcblxufSkoKSIsInZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKCdldmVudHMnKS5FdmVudEVtaXR0ZXI7XG5cbnZhciBTRVBBUkFUT1IgPSAnOic7XG5cbmZ1bmN0aW9uIGV2ZW50Mm1lc3NhZ2UobmFtZSwgYXJncykge1xuICB2YXIgbWVzc2FnZSA9IG5hbWUgKyBTRVBBUkFUT1IgKyBKU09OLnN0cmluZ2lmeShhcmdzKTtcblxuICByZXR1cm4gbWVzc2FnZTtcbn1cblxuZnVuY3Rpb24gbWVzc2FnZTJldmVudChtZXNzYWdlKSB7XG4gIHZhciBuYW1lLCBhcmdzO1xuXG4gIHZhciBpbmRleE9mU2VwYXJhdG9yID0gbWVzc2FnZS5pbmRleE9mKFNFUEFSQVRPUik7XG4gIGlmICh+aW5kZXhPZlNlcGFyYXRvcikge1xuICAgIG5hbWUgPSBtZXNzYWdlLnN1YnN0cmluZygwLCBpbmRleE9mU2VwYXJhdG9yKTtcbiAgICBhcmdzID0gSlNPTi5wYXJzZShtZXNzYWdlLnN1YnN0cmluZyhpbmRleE9mU2VwYXJhdG9yICsgMSkpO1xuICB9IGVsc2Uge1xuICAgIG5hbWUgPSBtZXNzYWdlO1xuICAgIGFyZ3MgPSB1bmRlZmluZWQ7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIG5hbWU6IG5hbWUsXG4gICAgYXJnczogYXJnc1xuICB9O1xufVxuXG5mdW5jdGlvbiBNMkUoc2VuZE1lc3NhZ2UpIHtcbiAgdmFyIG0yZSA9IG5ldyBFdmVudEVtaXR0ZXI7XG5cbiAgbTJlLnNlbmRNZXNzYWdlID0gc2VuZE1lc3NhZ2U7XG5cbiAgdmFyIGxvY2FsRW1pdCA9IG0yZS5lbWl0O1xuXG4gIG0yZS5lbWl0ID1cbiAgZnVuY3Rpb24gcmVtb3RlRW1pdCgpIHtcbiAgICBpZiAoIXRoaXMuc2VuZE1lc3NhZ2UpIHtcbiAgICAgIHRocm93IEVycm9yKCdzZW5kTWVzc2FnZSBpcyBub3QgZGVmaW5lZCcpO1xuICAgIH1cblxuICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcbiAgICB2YXIgbmFtZSA9IGFyZ3Muc2hpZnQoKTtcblxuICAgIGlmICghTTJFLnByb3BhZ2F0ZU5ld0xpc3RlbmVyICYmIG5hbWUgPT09ICduZXdMaXN0ZW5lcicpXG4gICAgICByZXR1cm47XG5cbiAgICB2YXIgbXNnID0gZXZlbnQybWVzc2FnZShuYW1lLCBhcmdzKTtcbiAgICB0cnkge1xuICAgICAgdGhpcy5zZW5kTWVzc2FnZShtc2cpO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBpZiAodGhpcy5saXN0ZW5lcnModGhpcy5lcnJvcm5hbWUpLmxlbmd0aClcbiAgICAgICAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS50cmlnZ2VyLmNhbGwodGhpcywgdGhpcy5lcnJvcm5hbWUsIFtlcnJvcl0pO1xuICAgICAgZWxzZVxuICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG4gIH07XG5cbiAgbTJlLm9uTWVzc2FnZSA9XG4gIGZ1bmN0aW9uIG9uTWVzc2FnZShtc2cpIHtcbiAgICB2YXIgZXZ0ID0gbWVzc2FnZTJldmVudChtc2cpO1xuICAgIHZhciBhcmdzID0gZXZ0LmFyZ3M7XG4gICAgYXJncy51bnNoaWZ0KGV2dC5uYW1lKTtcbiAgICBsb2NhbEVtaXQuYXBwbHkobTJlLCBhcmdzKTtcbiAgfTtcblxuICByZXR1cm4gbTJlO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IE0yRTtcbk0yRS5ldmVudDJtZXNzYWdlID0gZXZlbnQybWVzc2FnZTtcbk0yRS5tZXNzYWdlMmV2ZW50ID0gbWVzc2FnZTJldmVudDtcbiIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxuXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbnByb2Nlc3MubmV4dFRpY2sgPSAoZnVuY3Rpb24gKCkge1xuICAgIHZhciBjYW5TZXRJbW1lZGlhdGUgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5zZXRJbW1lZGlhdGU7XG4gICAgdmFyIGNhblBvc3QgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5wb3N0TWVzc2FnZSAmJiB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lclxuICAgIDtcblxuICAgIGlmIChjYW5TZXRJbW1lZGlhdGUpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChmKSB7IHJldHVybiB3aW5kb3cuc2V0SW1tZWRpYXRlKGYpIH07XG4gICAgfVxuXG4gICAgaWYgKGNhblBvc3QpIHtcbiAgICAgICAgdmFyIHF1ZXVlID0gW107XG4gICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgZnVuY3Rpb24gKGV2KSB7XG4gICAgICAgICAgICBpZiAoZXYuc291cmNlID09PSB3aW5kb3cgJiYgZXYuZGF0YSA9PT0gJ3Byb2Nlc3MtdGljaycpIHtcbiAgICAgICAgICAgICAgICBldi5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgICBpZiAocXVldWUubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZm4gPSBxdWV1ZS5zaGlmdCgpO1xuICAgICAgICAgICAgICAgICAgICBmbigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgdHJ1ZSk7XG5cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgICAgICBxdWV1ZS5wdXNoKGZuKTtcbiAgICAgICAgICAgIHdpbmRvdy5wb3N0TWVzc2FnZSgncHJvY2Vzcy10aWNrJywgJyonKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgc2V0VGltZW91dChmbiwgMCk7XG4gICAgfTtcbn0pKCk7XG5cbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn1cblxuLy8gVE9ETyhzaHR5bG1hbilcbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuIiwiKGZ1bmN0aW9uKHByb2Nlc3Mpe2lmICghcHJvY2Vzcy5FdmVudEVtaXR0ZXIpIHByb2Nlc3MuRXZlbnRFbWl0dGVyID0gZnVuY3Rpb24gKCkge307XG5cbnZhciBFdmVudEVtaXR0ZXIgPSBleHBvcnRzLkV2ZW50RW1pdHRlciA9IHByb2Nlc3MuRXZlbnRFbWl0dGVyO1xudmFyIGlzQXJyYXkgPSB0eXBlb2YgQXJyYXkuaXNBcnJheSA9PT0gJ2Z1bmN0aW9uJ1xuICAgID8gQXJyYXkuaXNBcnJheVxuICAgIDogZnVuY3Rpb24gKHhzKSB7XG4gICAgICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoeHMpID09PSAnW29iamVjdCBBcnJheV0nXG4gICAgfVxuO1xuZnVuY3Rpb24gaW5kZXhPZiAoeHMsIHgpIHtcbiAgICBpZiAoeHMuaW5kZXhPZikgcmV0dXJuIHhzLmluZGV4T2YoeCk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB4cy5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAoeCA9PT0geHNbaV0pIHJldHVybiBpO1xuICAgIH1cbiAgICByZXR1cm4gLTE7XG59XG5cbi8vIEJ5IGRlZmF1bHQgRXZlbnRFbWl0dGVycyB3aWxsIHByaW50IGEgd2FybmluZyBpZiBtb3JlIHRoYW5cbi8vIDEwIGxpc3RlbmVycyBhcmUgYWRkZWQgdG8gaXQuIFRoaXMgaXMgYSB1c2VmdWwgZGVmYXVsdCB3aGljaFxuLy8gaGVscHMgZmluZGluZyBtZW1vcnkgbGVha3MuXG4vL1xuLy8gT2J2aW91c2x5IG5vdCBhbGwgRW1pdHRlcnMgc2hvdWxkIGJlIGxpbWl0ZWQgdG8gMTAuIFRoaXMgZnVuY3Rpb24gYWxsb3dzXG4vLyB0aGF0IHRvIGJlIGluY3JlYXNlZC4gU2V0IHRvIHplcm8gZm9yIHVubGltaXRlZC5cbnZhciBkZWZhdWx0TWF4TGlzdGVuZXJzID0gMTA7XG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnNldE1heExpc3RlbmVycyA9IGZ1bmN0aW9uKG4pIHtcbiAgaWYgKCF0aGlzLl9ldmVudHMpIHRoaXMuX2V2ZW50cyA9IHt9O1xuICB0aGlzLl9ldmVudHMubWF4TGlzdGVuZXJzID0gbjtcbn07XG5cblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5lbWl0ID0gZnVuY3Rpb24odHlwZSkge1xuICAvLyBJZiB0aGVyZSBpcyBubyAnZXJyb3InIGV2ZW50IGxpc3RlbmVyIHRoZW4gdGhyb3cuXG4gIGlmICh0eXBlID09PSAnZXJyb3InKSB7XG4gICAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50cy5lcnJvciB8fFxuICAgICAgICAoaXNBcnJheSh0aGlzLl9ldmVudHMuZXJyb3IpICYmICF0aGlzLl9ldmVudHMuZXJyb3IubGVuZ3RoKSlcbiAgICB7XG4gICAgICBpZiAoYXJndW1lbnRzWzFdIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgdGhyb3cgYXJndW1lbnRzWzFdOyAvLyBVbmhhbmRsZWQgJ2Vycm9yJyBldmVudFxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVW5jYXVnaHQsIHVuc3BlY2lmaWVkICdlcnJvcicgZXZlbnQuXCIpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIGlmICghdGhpcy5fZXZlbnRzKSByZXR1cm4gZmFsc2U7XG4gIHZhciBoYW5kbGVyID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuICBpZiAoIWhhbmRsZXIpIHJldHVybiBmYWxzZTtcblxuICBpZiAodHlwZW9mIGhhbmRsZXIgPT0gJ2Z1bmN0aW9uJykge1xuICAgIHN3aXRjaCAoYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgLy8gZmFzdCBjYXNlc1xuICAgICAgY2FzZSAxOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcyk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAyOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDM6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0sIGFyZ3VtZW50c1syXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgLy8gc2xvd2VyXG4gICAgICBkZWZhdWx0OlxuICAgICAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG4gICAgICAgIGhhbmRsZXIuYXBwbHkodGhpcywgYXJncyk7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuXG4gIH0gZWxzZSBpZiAoaXNBcnJheShoYW5kbGVyKSkge1xuICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcblxuICAgIHZhciBsaXN0ZW5lcnMgPSBoYW5kbGVyLnNsaWNlKCk7XG4gICAgZm9yICh2YXIgaSA9IDAsIGwgPSBsaXN0ZW5lcnMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICBsaXN0ZW5lcnNbaV0uYXBwbHkodGhpcywgYXJncyk7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuXG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59O1xuXG4vLyBFdmVudEVtaXR0ZXIgaXMgZGVmaW5lZCBpbiBzcmMvbm9kZV9ldmVudHMuY2Ncbi8vIEV2ZW50RW1pdHRlci5wcm90b3R5cGUuZW1pdCgpIGlzIGFsc28gZGVmaW5lZCB0aGVyZS5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICBpZiAoJ2Z1bmN0aW9uJyAhPT0gdHlwZW9mIGxpc3RlbmVyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdhZGRMaXN0ZW5lciBvbmx5IHRha2VzIGluc3RhbmNlcyBvZiBGdW5jdGlvbicpO1xuICB9XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIFRvIGF2b2lkIHJlY3Vyc2lvbiBpbiB0aGUgY2FzZSB0aGF0IHR5cGUgPT0gXCJuZXdMaXN0ZW5lcnNcIiEgQmVmb3JlXG4gIC8vIGFkZGluZyBpdCB0byB0aGUgbGlzdGVuZXJzLCBmaXJzdCBlbWl0IFwibmV3TGlzdGVuZXJzXCIuXG4gIHRoaXMuZW1pdCgnbmV3TGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHNbdHlwZV0pIHtcbiAgICAvLyBPcHRpbWl6ZSB0aGUgY2FzZSBvZiBvbmUgbGlzdGVuZXIuIERvbid0IG5lZWQgdGhlIGV4dHJhIGFycmF5IG9iamVjdC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBsaXN0ZW5lcjtcbiAgfSBlbHNlIGlmIChpc0FycmF5KHRoaXMuX2V2ZW50c1t0eXBlXSkpIHtcblxuICAgIC8vIENoZWNrIGZvciBsaXN0ZW5lciBsZWFrXG4gICAgaWYgKCF0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkKSB7XG4gICAgICB2YXIgbTtcbiAgICAgIGlmICh0aGlzLl9ldmVudHMubWF4TGlzdGVuZXJzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgbSA9IHRoaXMuX2V2ZW50cy5tYXhMaXN0ZW5lcnM7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBtID0gZGVmYXVsdE1heExpc3RlbmVycztcbiAgICAgIH1cblxuICAgICAgaWYgKG0gJiYgbSA+IDAgJiYgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCA+IG0pIHtcbiAgICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCA9IHRydWU7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJyhub2RlKSB3YXJuaW5nOiBwb3NzaWJsZSBFdmVudEVtaXR0ZXIgbWVtb3J5ICcgK1xuICAgICAgICAgICAgICAgICAgICAgICdsZWFrIGRldGVjdGVkLiAlZCBsaXN0ZW5lcnMgYWRkZWQuICcgK1xuICAgICAgICAgICAgICAgICAgICAgICdVc2UgZW1pdHRlci5zZXRNYXhMaXN0ZW5lcnMoKSB0byBpbmNyZWFzZSBsaW1pdC4nLFxuICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGgpO1xuICAgICAgICBjb25zb2xlLnRyYWNlKCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gSWYgd2UndmUgYWxyZWFkeSBnb3QgYW4gYXJyYXksIGp1c3QgYXBwZW5kLlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5wdXNoKGxpc3RlbmVyKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBBZGRpbmcgdGhlIHNlY29uZCBlbGVtZW50LCBuZWVkIHRvIGNoYW5nZSB0byBhcnJheS5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBbdGhpcy5fZXZlbnRzW3R5cGVdLCBsaXN0ZW5lcl07XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub24gPSBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uY2UgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHNlbGYub24odHlwZSwgZnVuY3Rpb24gZygpIHtcbiAgICBzZWxmLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGcpO1xuICAgIGxpc3RlbmVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIH0pO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIGlmICgnZnVuY3Rpb24nICE9PSB0eXBlb2YgbGlzdGVuZXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3JlbW92ZUxpc3RlbmVyIG9ubHkgdGFrZXMgaW5zdGFuY2VzIG9mIEZ1bmN0aW9uJyk7XG4gIH1cblxuICAvLyBkb2VzIG5vdCB1c2UgbGlzdGVuZXJzKCksIHNvIG5vIHNpZGUgZWZmZWN0IG9mIGNyZWF0aW5nIF9ldmVudHNbdHlwZV1cbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSkgcmV0dXJuIHRoaXM7XG5cbiAgdmFyIGxpc3QgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzQXJyYXkobGlzdCkpIHtcbiAgICB2YXIgaSA9IGluZGV4T2YobGlzdCwgbGlzdGVuZXIpO1xuICAgIGlmIChpIDwgMCkgcmV0dXJuIHRoaXM7XG4gICAgbGlzdC5zcGxpY2UoaSwgMSk7XG4gICAgaWYgKGxpc3QubGVuZ3RoID09IDApXG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICB9IGVsc2UgaWYgKHRoaXMuX2V2ZW50c1t0eXBlXSA9PT0gbGlzdGVuZXIpIHtcbiAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUFsbExpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8vIGRvZXMgbm90IHVzZSBsaXN0ZW5lcnMoKSwgc28gbm8gc2lkZSBlZmZlY3Qgb2YgY3JlYXRpbmcgX2V2ZW50c1t0eXBlXVxuICBpZiAodHlwZSAmJiB0aGlzLl9ldmVudHMgJiYgdGhpcy5fZXZlbnRzW3R5cGVdKSB0aGlzLl9ldmVudHNbdHlwZV0gPSBudWxsO1xuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICBpZiAoIXRoaXMuX2V2ZW50cykgdGhpcy5fZXZlbnRzID0ge307XG4gIGlmICghdGhpcy5fZXZlbnRzW3R5cGVdKSB0aGlzLl9ldmVudHNbdHlwZV0gPSBbXTtcbiAgaWYgKCFpc0FycmF5KHRoaXMuX2V2ZW50c1t0eXBlXSkpIHtcbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBbdGhpcy5fZXZlbnRzW3R5cGVdXTtcbiAgfVxuICByZXR1cm4gdGhpcy5fZXZlbnRzW3R5cGVdO1xufTtcblxufSkocmVxdWlyZShcIl9fYnJvd3NlcmlmeV9wcm9jZXNzXCIpKSJdfQ==\n;";

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
},{"fs":6,"path":8,"./ui/proper-program-error":9,"./ui/something-went":5,"./ui/give-feedback":4,"m2e":10}],10:[function(require,module,exports){
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

},{"events":11}],4:[function(require,module,exports){
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
},{}],11:[function(require,module,exports){
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
},{"__browserify_process":7}],9:[function(require,module,exports){
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

},{}]},{},[1])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvaG9tZS9qb2FvamVyb25pbW8vc3JjL2Nyb3dkcHJvY2Vzcy9wcm9ncmFtLWVkaXRvci9zcmMvbWFpbi5qcyIsIi9ob21lL2pvYW9qZXJvbmltby9zcmMvY3Jvd2Rwcm9jZXNzL3Byb2dyYW0tZWRpdG9yL3NyYy9kZWFsLXdpdGgtd29ya2VyLWFuZC11cGRhdGUtVUkuanMiLCIvaG9tZS9qb2FvamVyb25pbW8vc3JjL2Nyb3dkcHJvY2Vzcy9wcm9ncmFtLWVkaXRvci9ub2RlX21vZHVsZXMvZ3J1bnQtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1yZXNvbHZlL2J1aWx0aW4vZnMuanMiLCIvaG9tZS9qb2FvamVyb25pbW8vc3JjL2Nyb3dkcHJvY2Vzcy9wcm9ncmFtLWVkaXRvci9ub2RlX21vZHVsZXMvZ3J1bnQtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvaW5zZXJ0LW1vZHVsZS1nbG9iYWxzL25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCIvaG9tZS9qb2FvamVyb25pbW8vc3JjL2Nyb3dkcHJvY2Vzcy9wcm9ncmFtLWVkaXRvci9ub2RlX21vZHVsZXMvZ3J1bnQtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1yZXNvbHZlL2J1aWx0aW4vcGF0aC5qcyIsIi9ob21lL2pvYW9qZXJvbmltby9zcmMvY3Jvd2Rwcm9jZXNzL3Byb2dyYW0tZWRpdG9yL3NyYy9jcmVhdGUtd29ya2VyLmpzIiwiL2hvbWUvam9hb2plcm9uaW1vL3NyYy9jcm93ZHByb2Nlc3MvcHJvZ3JhbS1lZGl0b3Ivbm9kZV9tb2R1bGVzL20yZS9pbmRleC5qcyIsIi9ob21lL2pvYW9qZXJvbmltby9zcmMvY3Jvd2Rwcm9jZXNzL3Byb2dyYW0tZWRpdG9yL3NyYy91aS9naXZlLWZlZWRiYWNrLmpzIiwiL2hvbWUvam9hb2plcm9uaW1vL3NyYy9jcm93ZHByb2Nlc3MvcHJvZ3JhbS1lZGl0b3Ivc3JjL3VpL3NvbWV0aGluZy13ZW50LmpzIiwiL2hvbWUvam9hb2plcm9uaW1vL3NyYy9jcm93ZHByb2Nlc3MvcHJvZ3JhbS1lZGl0b3Ivbm9kZV9tb2R1bGVzL2dydW50LWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcmVzb2x2ZS9idWlsdGluL2V2ZW50cy5qcyIsIi9ob21lL2pvYW9qZXJvbmltby9zcmMvY3Jvd2Rwcm9jZXNzL3Byb2dyYW0tZWRpdG9yL3NyYy91aS9wcm9wZXItcHJvZ3JhbS1lcnJvci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pEQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeExBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXNDb250ZW50IjpbInZhciBjcmVhdGVXb3JrZXIgPSByZXF1aXJlKCcuL2NyZWF0ZS13b3JrZXInKTtcbnZhciBkZWFsV2l0aFdvcmtlckFuZFVwZGF0ZVVJID0gcmVxdWlyZSgnLi9kZWFsLXdpdGgtd29ya2VyLWFuZC11cGRhdGUtVUkuanMnKTtcbnZhciB3cyA9IG5ldyBXZWJTb2NrZXQoJ3dzOi8vJyt3aW5kb3cubG9jYXRpb24uaG9zdCk7XG5cbnZhciB3d0NoYW5uZWw7XG5cbndzLm9ub3BlbiA9IGZ1bmN0aW9uICgpIHtcbiAgY29uc29sZS5sb2coJ1dTIGNvbm5lY3RlZCcpO1xufTtcblxud3Mub25tZXNzYWdlID0gZnVuY3Rpb24gKG1zZykge1xuICBpZiAod3dDaGFubmVsKVxuICAgIHd3Q2hhbm5lbC5lbWl0KCdpbXBsb2RlJyk7XG4gIHd3Q2hhbm5lbCA9IGNyZWF0ZVdvcmtlcihtc2cuZGF0YSk7XG4gIGRlYWxXaXRoV29ya2VyQW5kVXBkYXRlVUkod3dDaGFubmVsKTtcbn07XG5cbndzLm9uY2xvc2UgPSBmdW5jdGlvbiAoKSB7XG4gIHdzID0gbmV3IFdlYlNvY2tldCgnd3M6Ly9sb2NhbGhvc3Q6ODA4MScpO1xufTtcbiIsInZhciBzb21ldGhpbmdXZW50ID0gcmVxdWlyZSgnLi91aS9zb21ldGhpbmctd2VudCcpO1xudmFyIHNvbWV0aGluZ1dlbnRXZWxsID0gc29tZXRoaW5nV2VudC53ZWxsO1xudmFyIHNvbWV0aGluZ1dlbnRCYWQgPSBzb21ldGhpbmdXZW50LmJhZDtcbnZhciBnaXZlRmVlZGJhY2sgPSByZXF1aXJlKCcuL3VpL2dpdmUtZmVlZGJhY2snKTtcblxuZnVuY3Rpb24gZGVhbFdpdGhXb3JrZXJBbmRVcGRhdGVVSSAoY2hhbm5lbCkge1xuICBjaGFubmVsLm9uKCdyZXN1bHQnLCBmdW5jdGlvbiAocmVzdWx0LCB0aW1lKSB7XG4gICAgdmFyIG1zZyA9ICdyZXN1bHQgY29tcHV0ZWQgaW4gPHN0cm9uZz4nK3RpbWUrJ21zPC9zdHJvbmc+JztcbiAgICB2YXIgd2VsbCA9IHNvbWV0aGluZ1dlbnRXZWxsKG1zZyk7XG4gICAgZ2l2ZUZlZWRiYWNrKHdlbGwpO1xuICAgIHZhciBsYXN0UmVzdWx0ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI2xhc3RSZXN1bHQnKTtcbiAgICBsYXN0UmVzdWx0LmlubmVySFRNTCA9IEpTT04uc3RyaW5naWZ5KHJlc3VsdCk7XG4gIH0pO1xuXG4gIGNoYW5uZWwub24oJ3JlYWR5JywgZnVuY3Rpb24gKHByb2dyYW1UaW1lKSB7XG4gICAgdmFyIG1zZyA9ICdwcm9ncmFtbWVkIHdvcmtlciBpbjogPHN0cm9uZz4nK3Byb2dyYW1UaW1lKydtczwvc3Ryb25nPic7XG4gICAgdmFyIHdlbGwgPSBzb21ldGhpbmdXZW50V2VsbChtc2cpO1xuICAgIGdpdmVGZWVkYmFjayh3ZWxsKTtcbiAgfSk7XG5cbiAgY2hhbm5lbC5vbignZmFpbCcsIGZ1bmN0aW9uIChlcnIpIHtcbiAgICB2YXIgYmFkID0gc29tZXRoaW5nV2VudEJhZCgnZXJyb3I6ICcrSlNPTi5zdHJpbmdpZnkoZXJyKSk7XG4gICAgZ2l2ZUZlZWRiYWNrKGJhZCk7XG4gIH0pO1xuXG4gIGNoYW5uZWwub24oJ2ltcGxvZGUnLCBmdW5jdGlvbiAoKSB7XG4gICAgY29uc29sZS5sb2coJ0lNUExPREUhISBHT09EIEJZRSEnKTtcbiAgfSk7XG5cbiAgdmFyIGRhdGFVbml0RWwgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjZGF0YVVuaXQnKTtcblxuICBmdW5jdGlvbiBydW5EYXRhVW5pdCgpIHtcbiAgICB0cnkge1xuICAgICAgdmFyIGRhdGFVbml0ID0gSlNPTi5wYXJzZShkYXRhVW5pdEVsLnZhbHVlKTtcbiAgICAgIGNoYW5uZWwuZW1pdCgnZGF0YScsIGRhdGFVbml0KTtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIHZhciBiYWQgPSBzb21ldGhpbmdXZW50QmFkKCdpbnZhbGlkIEpTT04gaW4gZGF0YSB1bml0IDxici8+JytlcnIpO1xuICAgICAgZ2l2ZUZlZWRiYWNrKGJhZCk7XG4gICAgfVxuICB9XG5cbiAgaWYgKGRhdGFVbml0RWwudmFsdWUpIC8vIGlmIHRoZXJlJ3Mgc29tZXRoaW5nIHRoZXJlXG4gICAgcnVuRGF0YVVuaXQoKTsgLy8gcnVuIGl0IGFzIHNvb24gYXMgdGhlIHdvcmtlciBsb2Fkc1xuXG4gIHZhciB0ZXN0RWwgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjdGVzdCcpO1xuICB0ZXN0RWwub25jbGljayA9IHJ1bkRhdGFVbml0OyAvLyBhbmQgd2hlbiBzb21lb25lIGNsaWNrcyBvbiB0aGUgdGVzdCBidXR0b25cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBkZWFsV2l0aFdvcmtlckFuZFVwZGF0ZVVJO1xuIiwiLy8gbm90aGluZyB0byBzZWUgaGVyZS4uLiBubyBmaWxlIG1ldGhvZHMgZm9yIHRoZSBicm93c2VyXG4iLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcblxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG5wcm9jZXNzLm5leHRUaWNrID0gKGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgY2FuU2V0SW1tZWRpYXRlID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cuc2V0SW1tZWRpYXRlO1xuICAgIHZhciBjYW5Qb3N0ID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cucG9zdE1lc3NhZ2UgJiYgd2luZG93LmFkZEV2ZW50TGlzdGVuZXJcbiAgICA7XG5cbiAgICBpZiAoY2FuU2V0SW1tZWRpYXRlKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoZikgeyByZXR1cm4gd2luZG93LnNldEltbWVkaWF0ZShmKSB9O1xuICAgIH1cblxuICAgIGlmIChjYW5Qb3N0KSB7XG4gICAgICAgIHZhciBxdWV1ZSA9IFtdO1xuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIGZ1bmN0aW9uIChldikge1xuICAgICAgICAgICAgaWYgKGV2LnNvdXJjZSA9PT0gd2luZG93ICYmIGV2LmRhdGEgPT09ICdwcm9jZXNzLXRpY2snKSB7XG4gICAgICAgICAgICAgICAgZXYuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICAgICAgaWYgKHF1ZXVlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGZuID0gcXVldWUuc2hpZnQoKTtcbiAgICAgICAgICAgICAgICAgICAgZm4oKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIHRydWUpO1xuXG4gICAgICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICAgICAgcXVldWUucHVzaChmbik7XG4gICAgICAgICAgICB3aW5kb3cucG9zdE1lc3NhZ2UoJ3Byb2Nlc3MtdGljaycsICcqJyk7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZm4sIDApO1xuICAgIH07XG59KSgpO1xuXG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59XG5cbi8vIFRPRE8oc2h0eWxtYW4pXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbiIsIihmdW5jdGlvbihwcm9jZXNzKXtmdW5jdGlvbiBmaWx0ZXIgKHhzLCBmbikge1xuICAgIHZhciByZXMgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHhzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmIChmbih4c1tpXSwgaSwgeHMpKSByZXMucHVzaCh4c1tpXSk7XG4gICAgfVxuICAgIHJldHVybiByZXM7XG59XG5cbi8vIHJlc29sdmVzIC4gYW5kIC4uIGVsZW1lbnRzIGluIGEgcGF0aCBhcnJheSB3aXRoIGRpcmVjdG9yeSBuYW1lcyB0aGVyZVxuLy8gbXVzdCBiZSBubyBzbGFzaGVzLCBlbXB0eSBlbGVtZW50cywgb3IgZGV2aWNlIG5hbWVzIChjOlxcKSBpbiB0aGUgYXJyYXlcbi8vIChzbyBhbHNvIG5vIGxlYWRpbmcgYW5kIHRyYWlsaW5nIHNsYXNoZXMgLSBpdCBkb2VzIG5vdCBkaXN0aW5ndWlzaFxuLy8gcmVsYXRpdmUgYW5kIGFic29sdXRlIHBhdGhzKVxuZnVuY3Rpb24gbm9ybWFsaXplQXJyYXkocGFydHMsIGFsbG93QWJvdmVSb290KSB7XG4gIC8vIGlmIHRoZSBwYXRoIHRyaWVzIHRvIGdvIGFib3ZlIHRoZSByb290LCBgdXBgIGVuZHMgdXAgPiAwXG4gIHZhciB1cCA9IDA7XG4gIGZvciAodmFyIGkgPSBwYXJ0cy5sZW5ndGg7IGkgPj0gMDsgaS0tKSB7XG4gICAgdmFyIGxhc3QgPSBwYXJ0c1tpXTtcbiAgICBpZiAobGFzdCA9PSAnLicpIHtcbiAgICAgIHBhcnRzLnNwbGljZShpLCAxKTtcbiAgICB9IGVsc2UgaWYgKGxhc3QgPT09ICcuLicpIHtcbiAgICAgIHBhcnRzLnNwbGljZShpLCAxKTtcbiAgICAgIHVwKys7XG4gICAgfSBlbHNlIGlmICh1cCkge1xuICAgICAgcGFydHMuc3BsaWNlKGksIDEpO1xuICAgICAgdXAtLTtcbiAgICB9XG4gIH1cblxuICAvLyBpZiB0aGUgcGF0aCBpcyBhbGxvd2VkIHRvIGdvIGFib3ZlIHRoZSByb290LCByZXN0b3JlIGxlYWRpbmcgLi5zXG4gIGlmIChhbGxvd0Fib3ZlUm9vdCkge1xuICAgIGZvciAoOyB1cC0tOyB1cCkge1xuICAgICAgcGFydHMudW5zaGlmdCgnLi4nKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcGFydHM7XG59XG5cbi8vIFJlZ2V4IHRvIHNwbGl0IGEgZmlsZW5hbWUgaW50byBbKiwgZGlyLCBiYXNlbmFtZSwgZXh0XVxuLy8gcG9zaXggdmVyc2lvblxudmFyIHNwbGl0UGF0aFJlID0gL14oLitcXC8oPyEkKXxcXC8pPygoPzouKz8pPyhcXC5bXi5dKik/KSQvO1xuXG4vLyBwYXRoLnJlc29sdmUoW2Zyb20gLi4uXSwgdG8pXG4vLyBwb3NpeCB2ZXJzaW9uXG5leHBvcnRzLnJlc29sdmUgPSBmdW5jdGlvbigpIHtcbnZhciByZXNvbHZlZFBhdGggPSAnJyxcbiAgICByZXNvbHZlZEFic29sdXRlID0gZmFsc2U7XG5cbmZvciAodmFyIGkgPSBhcmd1bWVudHMubGVuZ3RoOyBpID49IC0xICYmICFyZXNvbHZlZEFic29sdXRlOyBpLS0pIHtcbiAgdmFyIHBhdGggPSAoaSA+PSAwKVxuICAgICAgPyBhcmd1bWVudHNbaV1cbiAgICAgIDogcHJvY2Vzcy5jd2QoKTtcblxuICAvLyBTa2lwIGVtcHR5IGFuZCBpbnZhbGlkIGVudHJpZXNcbiAgaWYgKHR5cGVvZiBwYXRoICE9PSAnc3RyaW5nJyB8fCAhcGF0aCkge1xuICAgIGNvbnRpbnVlO1xuICB9XG5cbiAgcmVzb2x2ZWRQYXRoID0gcGF0aCArICcvJyArIHJlc29sdmVkUGF0aDtcbiAgcmVzb2x2ZWRBYnNvbHV0ZSA9IHBhdGguY2hhckF0KDApID09PSAnLyc7XG59XG5cbi8vIEF0IHRoaXMgcG9pbnQgdGhlIHBhdGggc2hvdWxkIGJlIHJlc29sdmVkIHRvIGEgZnVsbCBhYnNvbHV0ZSBwYXRoLCBidXRcbi8vIGhhbmRsZSByZWxhdGl2ZSBwYXRocyB0byBiZSBzYWZlIChtaWdodCBoYXBwZW4gd2hlbiBwcm9jZXNzLmN3ZCgpIGZhaWxzKVxuXG4vLyBOb3JtYWxpemUgdGhlIHBhdGhcbnJlc29sdmVkUGF0aCA9IG5vcm1hbGl6ZUFycmF5KGZpbHRlcihyZXNvbHZlZFBhdGguc3BsaXQoJy8nKSwgZnVuY3Rpb24ocCkge1xuICAgIHJldHVybiAhIXA7XG4gIH0pLCAhcmVzb2x2ZWRBYnNvbHV0ZSkuam9pbignLycpO1xuXG4gIHJldHVybiAoKHJlc29sdmVkQWJzb2x1dGUgPyAnLycgOiAnJykgKyByZXNvbHZlZFBhdGgpIHx8ICcuJztcbn07XG5cbi8vIHBhdGgubm9ybWFsaXplKHBhdGgpXG4vLyBwb3NpeCB2ZXJzaW9uXG5leHBvcnRzLm5vcm1hbGl6ZSA9IGZ1bmN0aW9uKHBhdGgpIHtcbnZhciBpc0Fic29sdXRlID0gcGF0aC5jaGFyQXQoMCkgPT09ICcvJyxcbiAgICB0cmFpbGluZ1NsYXNoID0gcGF0aC5zbGljZSgtMSkgPT09ICcvJztcblxuLy8gTm9ybWFsaXplIHRoZSBwYXRoXG5wYXRoID0gbm9ybWFsaXplQXJyYXkoZmlsdGVyKHBhdGguc3BsaXQoJy8nKSwgZnVuY3Rpb24ocCkge1xuICAgIHJldHVybiAhIXA7XG4gIH0pLCAhaXNBYnNvbHV0ZSkuam9pbignLycpO1xuXG4gIGlmICghcGF0aCAmJiAhaXNBYnNvbHV0ZSkge1xuICAgIHBhdGggPSAnLic7XG4gIH1cbiAgaWYgKHBhdGggJiYgdHJhaWxpbmdTbGFzaCkge1xuICAgIHBhdGggKz0gJy8nO1xuICB9XG4gIFxuICByZXR1cm4gKGlzQWJzb2x1dGUgPyAnLycgOiAnJykgKyBwYXRoO1xufTtcblxuXG4vLyBwb3NpeCB2ZXJzaW9uXG5leHBvcnRzLmpvaW4gPSBmdW5jdGlvbigpIHtcbiAgdmFyIHBhdGhzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAwKTtcbiAgcmV0dXJuIGV4cG9ydHMubm9ybWFsaXplKGZpbHRlcihwYXRocywgZnVuY3Rpb24ocCwgaW5kZXgpIHtcbiAgICByZXR1cm4gcCAmJiB0eXBlb2YgcCA9PT0gJ3N0cmluZyc7XG4gIH0pLmpvaW4oJy8nKSk7XG59O1xuXG5cbmV4cG9ydHMuZGlybmFtZSA9IGZ1bmN0aW9uKHBhdGgpIHtcbiAgdmFyIGRpciA9IHNwbGl0UGF0aFJlLmV4ZWMocGF0aClbMV0gfHwgJyc7XG4gIHZhciBpc1dpbmRvd3MgPSBmYWxzZTtcbiAgaWYgKCFkaXIpIHtcbiAgICAvLyBObyBkaXJuYW1lXG4gICAgcmV0dXJuICcuJztcbiAgfSBlbHNlIGlmIChkaXIubGVuZ3RoID09PSAxIHx8XG4gICAgICAoaXNXaW5kb3dzICYmIGRpci5sZW5ndGggPD0gMyAmJiBkaXIuY2hhckF0KDEpID09PSAnOicpKSB7XG4gICAgLy8gSXQgaXMganVzdCBhIHNsYXNoIG9yIGEgZHJpdmUgbGV0dGVyIHdpdGggYSBzbGFzaFxuICAgIHJldHVybiBkaXI7XG4gIH0gZWxzZSB7XG4gICAgLy8gSXQgaXMgYSBmdWxsIGRpcm5hbWUsIHN0cmlwIHRyYWlsaW5nIHNsYXNoXG4gICAgcmV0dXJuIGRpci5zdWJzdHJpbmcoMCwgZGlyLmxlbmd0aCAtIDEpO1xuICB9XG59O1xuXG5cbmV4cG9ydHMuYmFzZW5hbWUgPSBmdW5jdGlvbihwYXRoLCBleHQpIHtcbiAgdmFyIGYgPSBzcGxpdFBhdGhSZS5leGVjKHBhdGgpWzJdIHx8ICcnO1xuICAvLyBUT0RPOiBtYWtlIHRoaXMgY29tcGFyaXNvbiBjYXNlLWluc2Vuc2l0aXZlIG9uIHdpbmRvd3M/XG4gIGlmIChleHQgJiYgZi5zdWJzdHIoLTEgKiBleHQubGVuZ3RoKSA9PT0gZXh0KSB7XG4gICAgZiA9IGYuc3Vic3RyKDAsIGYubGVuZ3RoIC0gZXh0Lmxlbmd0aCk7XG4gIH1cbiAgcmV0dXJuIGY7XG59O1xuXG5cbmV4cG9ydHMuZXh0bmFtZSA9IGZ1bmN0aW9uKHBhdGgpIHtcbiAgcmV0dXJuIHNwbGl0UGF0aFJlLmV4ZWMocGF0aClbM10gfHwgJyc7XG59O1xuXG5leHBvcnRzLnJlbGF0aXZlID0gZnVuY3Rpb24oZnJvbSwgdG8pIHtcbiAgZnJvbSA9IGV4cG9ydHMucmVzb2x2ZShmcm9tKS5zdWJzdHIoMSk7XG4gIHRvID0gZXhwb3J0cy5yZXNvbHZlKHRvKS5zdWJzdHIoMSk7XG5cbiAgZnVuY3Rpb24gdHJpbShhcnIpIHtcbiAgICB2YXIgc3RhcnQgPSAwO1xuICAgIGZvciAoOyBzdGFydCA8IGFyci5sZW5ndGg7IHN0YXJ0KyspIHtcbiAgICAgIGlmIChhcnJbc3RhcnRdICE9PSAnJykgYnJlYWs7XG4gICAgfVxuXG4gICAgdmFyIGVuZCA9IGFyci5sZW5ndGggLSAxO1xuICAgIGZvciAoOyBlbmQgPj0gMDsgZW5kLS0pIHtcbiAgICAgIGlmIChhcnJbZW5kXSAhPT0gJycpIGJyZWFrO1xuICAgIH1cblxuICAgIGlmIChzdGFydCA+IGVuZCkgcmV0dXJuIFtdO1xuICAgIHJldHVybiBhcnIuc2xpY2Uoc3RhcnQsIGVuZCAtIHN0YXJ0ICsgMSk7XG4gIH1cblxuICB2YXIgZnJvbVBhcnRzID0gdHJpbShmcm9tLnNwbGl0KCcvJykpO1xuICB2YXIgdG9QYXJ0cyA9IHRyaW0odG8uc3BsaXQoJy8nKSk7XG5cbiAgdmFyIGxlbmd0aCA9IE1hdGgubWluKGZyb21QYXJ0cy5sZW5ndGgsIHRvUGFydHMubGVuZ3RoKTtcbiAgdmFyIHNhbWVQYXJ0c0xlbmd0aCA9IGxlbmd0aDtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgIGlmIChmcm9tUGFydHNbaV0gIT09IHRvUGFydHNbaV0pIHtcbiAgICAgIHNhbWVQYXJ0c0xlbmd0aCA9IGk7XG4gICAgICBicmVhaztcbiAgICB9XG4gIH1cblxuICB2YXIgb3V0cHV0UGFydHMgPSBbXTtcbiAgZm9yICh2YXIgaSA9IHNhbWVQYXJ0c0xlbmd0aDsgaSA8IGZyb21QYXJ0cy5sZW5ndGg7IGkrKykge1xuICAgIG91dHB1dFBhcnRzLnB1c2goJy4uJyk7XG4gIH1cblxuICBvdXRwdXRQYXJ0cyA9IG91dHB1dFBhcnRzLmNvbmNhdCh0b1BhcnRzLnNsaWNlKHNhbWVQYXJ0c0xlbmd0aCkpO1xuXG4gIHJldHVybiBvdXRwdXRQYXJ0cy5qb2luKCcvJyk7XG59O1xuXG59KShyZXF1aXJlKFwiX19icm93c2VyaWZ5X3Byb2Nlc3NcIikpIiwiKGZ1bmN0aW9uKCl7dmFyIE0yRSA9IHJlcXVpcmUoJ20yZScpO1xudmFyIGZzID0gcmVxdWlyZSgnZnMnKTtcbnZhciBwYXRoID0gcmVxdWlyZSgncGF0aCcpO1xuXG52YXIgcHJvcGVyUHJvZ3JhbUVycm9yID0gcmVxdWlyZSgnLi91aS9wcm9wZXItcHJvZ3JhbS1lcnJvcicpO1xudmFyIHNvbWV0aGluZ1dlbnRCYWQgPSByZXF1aXJlKCcuL3VpL3NvbWV0aGluZy13ZW50JykuYmFkO1xudmFyIGdpdmVGZWVkYmFjayA9IHJlcXVpcmUoJy4vdWkvZ2l2ZS1mZWVkYmFjaycpO1xuXG52YXIgd29ya2VyRmlsZSA9IFwiOyhmdW5jdGlvbihlLHQsbil7ZnVuY3Rpb24gaShuLHMpe2lmKCF0W25dKXtpZighZVtuXSl7dmFyIG89dHlwZW9mIHJlcXVpcmU9PVxcXCJmdW5jdGlvblxcXCImJnJlcXVpcmU7aWYoIXMmJm8pcmV0dXJuIG8obiwhMCk7aWYocilyZXR1cm4gcihuLCEwKTt0aHJvdyBuZXcgRXJyb3IoXFxcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXFxcIituK1xcXCInXFxcIil9dmFyIHU9dFtuXT17ZXhwb3J0czp7fX07ZVtuXVswXS5jYWxsKHUuZXhwb3J0cyxmdW5jdGlvbih0KXt2YXIgcj1lW25dWzFdW3RdO3JldHVybiBpKHI/cjp0KX0sdSx1LmV4cG9ydHMpfXJldHVybiB0W25dLmV4cG9ydHN9dmFyIHI9dHlwZW9mIHJlcXVpcmU9PVxcXCJmdW5jdGlvblxcXCImJnJlcXVpcmU7Zm9yKHZhciBzPTA7czxuLmxlbmd0aDtzKyspaShuW3NdKTtyZXR1cm4gaX0pKHsxOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcXG4oZnVuY3Rpb24oKXt2YXIgTTJFID0gcmVxdWlyZSgnbTJlJyk7XFxuXFxudmFyIGNoYW5uZWwgPSBuZXcgTTJFKHNlbGYucG9zdE1lc3NhZ2UuYmluZChzZWxmKSk7XFxuXFxuZnVuY3Rpb24gbG9nKCkge1xcbiAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpO1xcbiAgY2hhbm5lbC5lbWl0KCdsb2cnLCBhcmdzKTtcXG59XFxuXFxuLy9sb2coJ2hlbGxvb29vJyk7XFxuXFxudmFyIHN0YXJ0VHMgPSBEYXRlLm5vdygpO1xcbnZhciBnbG9iYWwgPSB7fTtcXG52YXIgcHJvZ3JhbSA9IChmdW5jdGlvbiBnZXRQcm9ncmFtKFxcbiAgICBzZWxmLFxcbiAgICB3aW5kb3csXFxuICAgIGdsb2JhbCxcXG4gICAgLy9sb2csXFxuICAgIGFyZ3VtZW50cyxcXG4gICAgZXZhbCxcXG4gICAgYWxlcnQsXFxuICAgIHByb21wdCxcXG4gICAgcmVxdWlyZSxcXG4gICAgJCxcXG4gICAgZG9jdW1lbnQsXFxuICAgIG5hdmlnYXRvcixcXG4gICAgWE1MSHR0cFJlcXVlc3QsXFxuICAgIEZ1bmN0aW9uLFxcbiAgICBsb2NhdGlvbixcXG4gICAgY29uc29sZSxcXG4gICAgbG9jYWxTdG9yYWdlLFxcbiAgICBzZXNzaW9uU3RvcmFnZSxcXG4gICAgYXBwbGljYXRpb25DYWNoZSxcXG4gICAgY2hyb21lLFxcbiAgICBjbG9zZSxcXG4gICAgY2xpZW50SW5mb3JtYXRpb24sXFxuICAgIGNvbmZpcm0sXFxuICAgIGZyYW1lcyxcXG4gICAgaGlzdG9yeSxcXG4gICAgcHJpbnQsXFxuICAgIHBvc3RNZXNzYWdlLFxcbiAgICBvbm1lc3NnZSxcXG4gICAgcGFyZW50LFxcbiAgICBwcm9maWxlLFxcbiAgICBxLFxcbiAgICB0b3AsXFxuICAgIFdvcmtlcixcXG5cXG4gICAgLy8gbG9jYWxzXFxuICAgIHN0YXJ0VHMsXFxuICAgIHByb2dyYW0sXFxuICAgIGdldFByb2dyYW0sXFxuICAgIGVuZFRzLFxcbiAgICBwcm9ncmFtVGltZVxcbiAgICApIHtcXG5cXG4gIHZhciBfcmVxdWlyZSA9IFBST0dSQU0oKTtcXG4gIFxcbiAgaWYgKF9yZXF1aXJlLm5hbWUgPT09ICdSdW4nKVxcbiAgICByZXR1cm4gX3JlcXVpcmU7XFxuICBlbHNlIC8vIHVzaW5nIGJyb3dzZXJpZnkgP1xcbiAgICByZXR1cm4gX3JlcXVpcmUoMSk7XFxuXFxufSkuY2FsbChnbG9iYWwsIGdsb2JhbCwgZ2xvYmFsKTtcXG5cXG4oZnVuY3Rpb24gKCkge1xcbiAgc2VsZi5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgZnVuY3Rpb24oZSkgeyBjaGFubmVsLm9uTWVzc2FnZShlLmRhdGEpOyB9KTtcXG5cXG4gIGNoYW5uZWwub24oJ2RhdGEnLCBvbkRhdGEpO1xcbiAgY2hhbm5lbC5lbWl0KCdyZWFkeScsIERhdGUubm93KCkgLSBzdGFydFRzKTtcXG5cXG4gIGZ1bmN0aW9uIG9uRGF0YShkYXRhKSB7XFxuICAgIHZhciBzdGFydCA9IERhdGUubm93KCk7XFxuXFxuICAgIHZhciBhcmdzID0gW2RhdGFdO1xcblxcbiAgICBmdW5jdGlvbiBjYihyZXN1bHQpIHtcXG4gICAgICB2YXIgdGltZSA9IERhdGUubm93KCkgLSBzdGFydDtcXG4gICAgICBjaGFubmVsLmVtaXQoJ3Jlc3VsdCcsIHJlc3VsdCwgdGltZSk7XFxuICAgIH1cXG5cXG4gICAgaWYgKHByb2dyYW0uYXN5bmMpXFxuICAgICAgYXJncy5wdXNoKGNiKTtcXG5cXG4gICAgdmFyIHJlc3VsdDtcXG4gICAgdHJ5IHtcXG4gICAgICByZXN1bHQgPSBwcm9ncmFtLmFwcGx5KG51bGwsIGFyZ3MpO1xcbiAgICB9IGNhdGNoIChlKSB7XFxuICAgICAgY2hhbm5lbC5lbWl0KCdmYWlsJywgeyBsaW5lbm86IGUubGluZW5vLCBtZXNzYWdlOiBlLm1lc3NhZ2UgfSk7XFxuICAgICAgcmV0dXJuO1xcbiAgICB9XFxuXFxuICAgIGlmICghcHJvZ3JhbS5pc0FzeW5jKVxcbiAgICAgIGNiKHJlc3VsdCk7XFxuICB9XFxuXFxufSkoKTtcXG5cXG59KSgpXFxufSx7XFxcIm0yZVxcXCI6Mn1dLDI6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xcbnZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKCdldmVudHMnKS5FdmVudEVtaXR0ZXI7XFxuXFxudmFyIFNFUEFSQVRPUiA9ICc6JztcXG5cXG5mdW5jdGlvbiBldmVudDJtZXNzYWdlKG5hbWUsIGFyZ3MpIHtcXG4gIHZhciBtZXNzYWdlID0gbmFtZSArIFNFUEFSQVRPUiArIEpTT04uc3RyaW5naWZ5KGFyZ3MpO1xcblxcbiAgcmV0dXJuIG1lc3NhZ2U7XFxufVxcblxcbmZ1bmN0aW9uIG1lc3NhZ2UyZXZlbnQobWVzc2FnZSkge1xcbiAgdmFyIG5hbWUsIGFyZ3M7XFxuXFxuICB2YXIgaW5kZXhPZlNlcGFyYXRvciA9IG1lc3NhZ2UuaW5kZXhPZihTRVBBUkFUT1IpO1xcbiAgaWYgKH5pbmRleE9mU2VwYXJhdG9yKSB7XFxuICAgIG5hbWUgPSBtZXNzYWdlLnN1YnN0cmluZygwLCBpbmRleE9mU2VwYXJhdG9yKTtcXG4gICAgYXJncyA9IEpTT04ucGFyc2UobWVzc2FnZS5zdWJzdHJpbmcoaW5kZXhPZlNlcGFyYXRvciArIDEpKTtcXG4gIH0gZWxzZSB7XFxuICAgIG5hbWUgPSBtZXNzYWdlO1xcbiAgICBhcmdzID0gdW5kZWZpbmVkO1xcbiAgfVxcblxcbiAgcmV0dXJuIHtcXG4gICAgbmFtZTogbmFtZSxcXG4gICAgYXJnczogYXJnc1xcbiAgfTtcXG59XFxuXFxuZnVuY3Rpb24gTTJFKHNlbmRNZXNzYWdlKSB7XFxuICB2YXIgbTJlID0gbmV3IEV2ZW50RW1pdHRlcjtcXG5cXG4gIG0yZS5zZW5kTWVzc2FnZSA9IHNlbmRNZXNzYWdlO1xcblxcbiAgdmFyIGxvY2FsRW1pdCA9IG0yZS5lbWl0O1xcblxcbiAgbTJlLmVtaXQgPVxcbiAgZnVuY3Rpb24gcmVtb3RlRW1pdCgpIHtcXG4gICAgaWYgKCF0aGlzLnNlbmRNZXNzYWdlKSB7XFxuICAgICAgdGhyb3cgRXJyb3IoJ3NlbmRNZXNzYWdlIGlzIG5vdCBkZWZpbmVkJyk7XFxuICAgIH1cXG5cXG4gICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpO1xcbiAgICB2YXIgbmFtZSA9IGFyZ3Muc2hpZnQoKTtcXG5cXG4gICAgaWYgKCFNMkUucHJvcGFnYXRlTmV3TGlzdGVuZXIgJiYgbmFtZSA9PT0gJ25ld0xpc3RlbmVyJylcXG4gICAgICByZXR1cm47XFxuXFxuICAgIHZhciBtc2cgPSBldmVudDJtZXNzYWdlKG5hbWUsIGFyZ3MpO1xcbiAgICB0cnkge1xcbiAgICAgIHRoaXMuc2VuZE1lc3NhZ2UobXNnKTtcXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcXG4gICAgICBpZiAodGhpcy5saXN0ZW5lcnModGhpcy5lcnJvcm5hbWUpLmxlbmd0aClcXG4gICAgICAgIEV2ZW50RW1pdHRlci5wcm90b3R5cGUudHJpZ2dlci5jYWxsKHRoaXMsIHRoaXMuZXJyb3JuYW1lLCBbZXJyb3JdKTtcXG4gICAgICBlbHNlXFxuICAgICAgICB0aHJvdyBlcnJvcjtcXG4gICAgfVxcbiAgfTtcXG5cXG4gIG0yZS5vbk1lc3NhZ2UgPVxcbiAgZnVuY3Rpb24gb25NZXNzYWdlKG1zZykge1xcbiAgICB2YXIgZXZ0ID0gbWVzc2FnZTJldmVudChtc2cpO1xcbiAgICB2YXIgYXJncyA9IGV2dC5hcmdzO1xcbiAgICBhcmdzLnVuc2hpZnQoZXZ0Lm5hbWUpO1xcbiAgICBsb2NhbEVtaXQuYXBwbHkobTJlLCBhcmdzKTtcXG4gIH07XFxuXFxuICByZXR1cm4gbTJlO1xcbn1cXG5cXG5tb2R1bGUuZXhwb3J0cyA9IE0yRTtcXG5NMkUuZXZlbnQybWVzc2FnZSA9IGV2ZW50Mm1lc3NhZ2U7XFxuTTJFLm1lc3NhZ2UyZXZlbnQgPSBtZXNzYWdlMmV2ZW50O1xcblxcbn0se1xcXCJldmVudHNcXFwiOjN9XSw0OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcXG4vLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcXG5cXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XFxuXFxucHJvY2Vzcy5uZXh0VGljayA9IChmdW5jdGlvbiAoKSB7XFxuICAgIHZhciBjYW5TZXRJbW1lZGlhdGUgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xcbiAgICAmJiB3aW5kb3cuc2V0SW1tZWRpYXRlO1xcbiAgICB2YXIgY2FuUG9zdCA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXFxuICAgICYmIHdpbmRvdy5wb3N0TWVzc2FnZSAmJiB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lclxcbiAgICA7XFxuXFxuICAgIGlmIChjYW5TZXRJbW1lZGlhdGUpIHtcXG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoZikgeyByZXR1cm4gd2luZG93LnNldEltbWVkaWF0ZShmKSB9O1xcbiAgICB9XFxuXFxuICAgIGlmIChjYW5Qb3N0KSB7XFxuICAgICAgICB2YXIgcXVldWUgPSBbXTtcXG4gICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgZnVuY3Rpb24gKGV2KSB7XFxuICAgICAgICAgICAgaWYgKGV2LnNvdXJjZSA9PT0gd2luZG93ICYmIGV2LmRhdGEgPT09ICdwcm9jZXNzLXRpY2snKSB7XFxuICAgICAgICAgICAgICAgIGV2LnN0b3BQcm9wYWdhdGlvbigpO1xcbiAgICAgICAgICAgICAgICBpZiAocXVldWUubGVuZ3RoID4gMCkge1xcbiAgICAgICAgICAgICAgICAgICAgdmFyIGZuID0gcXVldWUuc2hpZnQoKTtcXG4gICAgICAgICAgICAgICAgICAgIGZuKCk7XFxuICAgICAgICAgICAgICAgIH1cXG4gICAgICAgICAgICB9XFxuICAgICAgICB9LCB0cnVlKTtcXG5cXG4gICAgICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xcbiAgICAgICAgICAgIHF1ZXVlLnB1c2goZm4pO1xcbiAgICAgICAgICAgIHdpbmRvdy5wb3N0TWVzc2FnZSgncHJvY2Vzcy10aWNrJywgJyonKTtcXG4gICAgICAgIH07XFxuICAgIH1cXG5cXG4gICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XFxuICAgICAgICBzZXRUaW1lb3V0KGZuLCAwKTtcXG4gICAgfTtcXG59KSgpO1xcblxcbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XFxucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcXG5wcm9jZXNzLmVudiA9IHt9O1xcbnByb2Nlc3MuYXJndiA9IFtdO1xcblxcbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XFxuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcXG59XFxuXFxuLy8gVE9ETyhzaHR5bG1hbilcXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XFxuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XFxufTtcXG5cXG59LHt9XSwzOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcXG4oZnVuY3Rpb24ocHJvY2Vzcyl7aWYgKCFwcm9jZXNzLkV2ZW50RW1pdHRlcikgcHJvY2Vzcy5FdmVudEVtaXR0ZXIgPSBmdW5jdGlvbiAoKSB7fTtcXG5cXG52YXIgRXZlbnRFbWl0dGVyID0gZXhwb3J0cy5FdmVudEVtaXR0ZXIgPSBwcm9jZXNzLkV2ZW50RW1pdHRlcjtcXG52YXIgaXNBcnJheSA9IHR5cGVvZiBBcnJheS5pc0FycmF5ID09PSAnZnVuY3Rpb24nXFxuICAgID8gQXJyYXkuaXNBcnJheVxcbiAgICA6IGZ1bmN0aW9uICh4cykge1xcbiAgICAgICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh4cykgPT09ICdbb2JqZWN0IEFycmF5XSdcXG4gICAgfVxcbjtcXG5mdW5jdGlvbiBpbmRleE9mICh4cywgeCkge1xcbiAgICBpZiAoeHMuaW5kZXhPZikgcmV0dXJuIHhzLmluZGV4T2YoeCk7XFxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgeHMubGVuZ3RoOyBpKyspIHtcXG4gICAgICAgIGlmICh4ID09PSB4c1tpXSkgcmV0dXJuIGk7XFxuICAgIH1cXG4gICAgcmV0dXJuIC0xO1xcbn1cXG5cXG4vLyBCeSBkZWZhdWx0IEV2ZW50RW1pdHRlcnMgd2lsbCBwcmludCBhIHdhcm5pbmcgaWYgbW9yZSB0aGFuXFxuLy8gMTAgbGlzdGVuZXJzIGFyZSBhZGRlZCB0byBpdC4gVGhpcyBpcyBhIHVzZWZ1bCBkZWZhdWx0IHdoaWNoXFxuLy8gaGVscHMgZmluZGluZyBtZW1vcnkgbGVha3MuXFxuLy9cXG4vLyBPYnZpb3VzbHkgbm90IGFsbCBFbWl0dGVycyBzaG91bGQgYmUgbGltaXRlZCB0byAxMC4gVGhpcyBmdW5jdGlvbiBhbGxvd3NcXG4vLyB0aGF0IHRvIGJlIGluY3JlYXNlZC4gU2V0IHRvIHplcm8gZm9yIHVubGltaXRlZC5cXG52YXIgZGVmYXVsdE1heExpc3RlbmVycyA9IDEwO1xcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuc2V0TWF4TGlzdGVuZXJzID0gZnVuY3Rpb24obikge1xcbiAgaWYgKCF0aGlzLl9ldmVudHMpIHRoaXMuX2V2ZW50cyA9IHt9O1xcbiAgdGhpcy5fZXZlbnRzLm1heExpc3RlbmVycyA9IG47XFxufTtcXG5cXG5cXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmVtaXQgPSBmdW5jdGlvbih0eXBlKSB7XFxuICAvLyBJZiB0aGVyZSBpcyBubyAnZXJyb3InIGV2ZW50IGxpc3RlbmVyIHRoZW4gdGhyb3cuXFxuICBpZiAodHlwZSA9PT0gJ2Vycm9yJykge1xcbiAgICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzLmVycm9yIHx8XFxuICAgICAgICAoaXNBcnJheSh0aGlzLl9ldmVudHMuZXJyb3IpICYmICF0aGlzLl9ldmVudHMuZXJyb3IubGVuZ3RoKSlcXG4gICAge1xcbiAgICAgIGlmIChhcmd1bWVudHNbMV0gaW5zdGFuY2VvZiBFcnJvcikge1xcbiAgICAgICAgdGhyb3cgYXJndW1lbnRzWzFdOyAvLyBVbmhhbmRsZWQgJ2Vycm9yJyBldmVudFxcbiAgICAgIH0gZWxzZSB7XFxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXFxcIlVuY2F1Z2h0LCB1bnNwZWNpZmllZCAnZXJyb3InIGV2ZW50LlxcXCIpO1xcbiAgICAgIH1cXG4gICAgICByZXR1cm4gZmFsc2U7XFxuICAgIH1cXG4gIH1cXG5cXG4gIGlmICghdGhpcy5fZXZlbnRzKSByZXR1cm4gZmFsc2U7XFxuICB2YXIgaGFuZGxlciA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcXG4gIGlmICghaGFuZGxlcikgcmV0dXJuIGZhbHNlO1xcblxcbiAgaWYgKHR5cGVvZiBoYW5kbGVyID09ICdmdW5jdGlvbicpIHtcXG4gICAgc3dpdGNoIChhcmd1bWVudHMubGVuZ3RoKSB7XFxuICAgICAgLy8gZmFzdCBjYXNlc1xcbiAgICAgIGNhc2UgMTpcXG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzKTtcXG4gICAgICAgIGJyZWFrO1xcbiAgICAgIGNhc2UgMjpcXG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0pO1xcbiAgICAgICAgYnJlYWs7XFxuICAgICAgY2FzZSAzOlxcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSwgYXJndW1lbnRzWzJdKTtcXG4gICAgICAgIGJyZWFrO1xcbiAgICAgIC8vIHNsb3dlclxcbiAgICAgIGRlZmF1bHQ6XFxuICAgICAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XFxuICAgICAgICBoYW5kbGVyLmFwcGx5KHRoaXMsIGFyZ3MpO1xcbiAgICB9XFxuICAgIHJldHVybiB0cnVlO1xcblxcbiAgfSBlbHNlIGlmIChpc0FycmF5KGhhbmRsZXIpKSB7XFxuICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcXG5cXG4gICAgdmFyIGxpc3RlbmVycyA9IGhhbmRsZXIuc2xpY2UoKTtcXG4gICAgZm9yICh2YXIgaSA9IDAsIGwgPSBsaXN0ZW5lcnMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XFxuICAgICAgbGlzdGVuZXJzW2ldLmFwcGx5KHRoaXMsIGFyZ3MpO1xcbiAgICB9XFxuICAgIHJldHVybiB0cnVlO1xcblxcbiAgfSBlbHNlIHtcXG4gICAgcmV0dXJuIGZhbHNlO1xcbiAgfVxcbn07XFxuXFxuLy8gRXZlbnRFbWl0dGVyIGlzIGRlZmluZWQgaW4gc3JjL25vZGVfZXZlbnRzLmNjXFxuLy8gRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5lbWl0KCkgaXMgYWxzbyBkZWZpbmVkIHRoZXJlLlxcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xcbiAgaWYgKCdmdW5jdGlvbicgIT09IHR5cGVvZiBsaXN0ZW5lcikge1xcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2FkZExpc3RlbmVyIG9ubHkgdGFrZXMgaW5zdGFuY2VzIG9mIEZ1bmN0aW9uJyk7XFxuICB9XFxuXFxuICBpZiAoIXRoaXMuX2V2ZW50cykgdGhpcy5fZXZlbnRzID0ge307XFxuXFxuICAvLyBUbyBhdm9pZCByZWN1cnNpb24gaW4gdGhlIGNhc2UgdGhhdCB0eXBlID09IFxcXCJuZXdMaXN0ZW5lcnNcXFwiISBCZWZvcmVcXG4gIC8vIGFkZGluZyBpdCB0byB0aGUgbGlzdGVuZXJzLCBmaXJzdCBlbWl0IFxcXCJuZXdMaXN0ZW5lcnNcXFwiLlxcbiAgdGhpcy5lbWl0KCduZXdMaXN0ZW5lcicsIHR5cGUsIGxpc3RlbmVyKTtcXG5cXG4gIGlmICghdGhpcy5fZXZlbnRzW3R5cGVdKSB7XFxuICAgIC8vIE9wdGltaXplIHRoZSBjYXNlIG9mIG9uZSBsaXN0ZW5lci4gRG9uJ3QgbmVlZCB0aGUgZXh0cmEgYXJyYXkgb2JqZWN0LlxcbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBsaXN0ZW5lcjtcXG4gIH0gZWxzZSBpZiAoaXNBcnJheSh0aGlzLl9ldmVudHNbdHlwZV0pKSB7XFxuXFxuICAgIC8vIENoZWNrIGZvciBsaXN0ZW5lciBsZWFrXFxuICAgIGlmICghdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCkge1xcbiAgICAgIHZhciBtO1xcbiAgICAgIGlmICh0aGlzLl9ldmVudHMubWF4TGlzdGVuZXJzICE9PSB1bmRlZmluZWQpIHtcXG4gICAgICAgIG0gPSB0aGlzLl9ldmVudHMubWF4TGlzdGVuZXJzO1xcbiAgICAgIH0gZWxzZSB7XFxuICAgICAgICBtID0gZGVmYXVsdE1heExpc3RlbmVycztcXG4gICAgICB9XFxuXFxuICAgICAgaWYgKG0gJiYgbSA+IDAgJiYgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCA+IG0pIHtcXG4gICAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQgPSB0cnVlO1xcbiAgICAgICAgY29uc29sZS5lcnJvcignKG5vZGUpIHdhcm5pbmc6IHBvc3NpYmxlIEV2ZW50RW1pdHRlciBtZW1vcnkgJyArXFxuICAgICAgICAgICAgICAgICAgICAgICdsZWFrIGRldGVjdGVkLiAlZCBsaXN0ZW5lcnMgYWRkZWQuICcgK1xcbiAgICAgICAgICAgICAgICAgICAgICAnVXNlIGVtaXR0ZXIuc2V0TWF4TGlzdGVuZXJzKCkgdG8gaW5jcmVhc2UgbGltaXQuJyxcXG4gICAgICAgICAgICAgICAgICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCk7XFxuICAgICAgICBjb25zb2xlLnRyYWNlKCk7XFxuICAgICAgfVxcbiAgICB9XFxuXFxuICAgIC8vIElmIHdlJ3ZlIGFscmVhZHkgZ290IGFuIGFycmF5LCBqdXN0IGFwcGVuZC5cXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdLnB1c2gobGlzdGVuZXIpO1xcbiAgfSBlbHNlIHtcXG4gICAgLy8gQWRkaW5nIHRoZSBzZWNvbmQgZWxlbWVudCwgbmVlZCB0byBjaGFuZ2UgdG8gYXJyYXkuXFxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IFt0aGlzLl9ldmVudHNbdHlwZV0sIGxpc3RlbmVyXTtcXG4gIH1cXG5cXG4gIHJldHVybiB0aGlzO1xcbn07XFxuXFxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbiA9IEV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXI7XFxuXFxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbmNlID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcXG4gIHZhciBzZWxmID0gdGhpcztcXG4gIHNlbGYub24odHlwZSwgZnVuY3Rpb24gZygpIHtcXG4gICAgc2VsZi5yZW1vdmVMaXN0ZW5lcih0eXBlLCBnKTtcXG4gICAgbGlzdGVuZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcXG4gIH0pO1xcblxcbiAgcmV0dXJuIHRoaXM7XFxufTtcXG5cXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcXG4gIGlmICgnZnVuY3Rpb24nICE9PSB0eXBlb2YgbGlzdGVuZXIpIHtcXG4gICAgdGhyb3cgbmV3IEVycm9yKCdyZW1vdmVMaXN0ZW5lciBvbmx5IHRha2VzIGluc3RhbmNlcyBvZiBGdW5jdGlvbicpO1xcbiAgfVxcblxcbiAgLy8gZG9lcyBub3QgdXNlIGxpc3RlbmVycygpLCBzbyBubyBzaWRlIGVmZmVjdCBvZiBjcmVhdGluZyBfZXZlbnRzW3R5cGVdXFxuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW3R5cGVdKSByZXR1cm4gdGhpcztcXG5cXG4gIHZhciBsaXN0ID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xcblxcbiAgaWYgKGlzQXJyYXkobGlzdCkpIHtcXG4gICAgdmFyIGkgPSBpbmRleE9mKGxpc3QsIGxpc3RlbmVyKTtcXG4gICAgaWYgKGkgPCAwKSByZXR1cm4gdGhpcztcXG4gICAgbGlzdC5zcGxpY2UoaSwgMSk7XFxuICAgIGlmIChsaXN0Lmxlbmd0aCA9PSAwKVxcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XFxuICB9IGVsc2UgaWYgKHRoaXMuX2V2ZW50c1t0eXBlXSA9PT0gbGlzdGVuZXIpIHtcXG4gICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcXG4gIH1cXG5cXG4gIHJldHVybiB0aGlzO1xcbn07XFxuXFxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XFxuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcXG4gICAgcmV0dXJuIHRoaXM7XFxuICB9XFxuXFxuICAvLyBkb2VzIG5vdCB1c2UgbGlzdGVuZXJzKCksIHNvIG5vIHNpZGUgZWZmZWN0IG9mIGNyZWF0aW5nIF9ldmVudHNbdHlwZV1cXG4gIGlmICh0eXBlICYmIHRoaXMuX2V2ZW50cyAmJiB0aGlzLl9ldmVudHNbdHlwZV0pIHRoaXMuX2V2ZW50c1t0eXBlXSA9IG51bGw7XFxuICByZXR1cm4gdGhpcztcXG59O1xcblxcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xcbiAgaWYgKCF0aGlzLl9ldmVudHMpIHRoaXMuX2V2ZW50cyA9IHt9O1xcbiAgaWYgKCF0aGlzLl9ldmVudHNbdHlwZV0pIHRoaXMuX2V2ZW50c1t0eXBlXSA9IFtdO1xcbiAgaWYgKCFpc0FycmF5KHRoaXMuX2V2ZW50c1t0eXBlXSkpIHtcXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gW3RoaXMuX2V2ZW50c1t0eXBlXV07XFxuICB9XFxuICByZXR1cm4gdGhpcy5fZXZlbnRzW3R5cGVdO1xcbn07XFxuXFxufSkocmVxdWlyZShcXFwiX19icm93c2VyaWZ5X3Byb2Nlc3NcXFwiKSlcXG59LHtcXFwiX19icm93c2VyaWZ5X3Byb2Nlc3NcXFwiOjR9XX0se30sWzFdKVxcbi8vQCBzb3VyY2VNYXBwaW5nVVJMPWRhdGE6YXBwbGljYXRpb24vanNvbjtiYXNlNjQsZXlKMlpYSnphVzl1SWpvekxDSm1hV3hsSWpvaVoyVnVaWEpoZEdWa0xtcHpJaXdpYzI5MWNtTmxjeUk2V3lJdmFHOXRaUzlxYjJGdmFtVnliMjVwYlc4dmMzSmpMMk55YjNka2NISnZZMlZ6Y3k5d2NtOW5jbUZ0TFdWa2FYUnZjaTl6Y21NdmQyOXlhMlZ5TG1weklpd2lMMmh2YldVdmFtOWhiMnBsY205dWFXMXZMM055WXk5amNtOTNaSEJ5YjJObGMzTXZjSEp2WjNKaGJTMWxaR2wwYjNJdmJtOWtaVjl0YjJSMWJHVnpMMjB5WlM5cGJtUmxlQzVxY3lJc0lpOW9iMjFsTDJwdllXOXFaWEp2Ym1sdGJ5OXpjbU12WTNKdmQyUndjbTlqWlhOekwzQnliMmR5WVcwdFpXUnBkRzl5TDI1dlpHVmZiVzlrZFd4bGN5OW5jblZ1ZEMxaWNtOTNjMlZ5YVdaNUwyNXZaR1ZmYlc5a2RXeGxjeTlpY205M2MyVnlhV1o1TDI1dlpHVmZiVzlrZFd4bGN5OXBibk5sY25RdGJXOWtkV3hsTFdkc2IySmhiSE12Ym05a1pWOXRiMlIxYkdWekwzQnliMk5sYzNNdlluSnZkM05sY2k1cWN5SXNJaTlvYjIxbEwycHZZVzlxWlhKdmJtbHRieTl6Y21NdlkzSnZkMlJ3Y205alpYTnpMM0J5YjJkeVlXMHRaV1JwZEc5eUwyNXZaR1ZmYlc5a2RXeGxjeTluY25WdWRDMWljbTkzYzJWeWFXWjVMMjV2WkdWZmJXOWtkV3hsY3k5aWNtOTNjMlZ5YVdaNUwyNXZaR1ZmYlc5a2RXeGxjeTlpY205M2MyVnlMWEpsYzI5c2RtVXZZblZwYkhScGJpOWxkbVZ1ZEhNdWFuTWlYU3dpYm1GdFpYTWlPbHRkTENKdFlYQndhVzVuY3lJNklqdEJRVUZCTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUczdRVU5zUjBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN08wRkRlRVZCTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3TzBGRGNFUkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEVpTENKemIzVnlZMlZ6UTI5dWRHVnVkQ0k2V3lJb1puVnVZM1JwYjI0b0tYdDJZWElnVFRKRklEMGdjbVZ4ZFdseVpTZ25iVEpsSnlrN1hHNWNiblpoY2lCamFHRnVibVZzSUQwZ2JtVjNJRTB5UlNoelpXeG1MbkJ2YzNSTlpYTnpZV2RsTG1KcGJtUW9jMlZzWmlrcE8xeHVYRzVtZFc1amRHbHZiaUJzYjJjb0tTQjdYRzRnSUhaaGNpQmhjbWR6SUQwZ1FYSnlZWGt1Y0hKdmRHOTBlWEJsTG5Oc2FXTmxMbU5oYkd3b1lYSm5kVzFsYm5SektUdGNiaUFnWTJoaGJtNWxiQzVsYldsMEtDZHNiMmNuTENCaGNtZHpLVHRjYm4xY2JseHVMeTlzYjJjb0oyaGxiR3h2YjI5dkp5azdYRzVjYm5aaGNpQnpkR0Z5ZEZSeklEMGdSR0YwWlM1dWIzY29LVHRjYm5aaGNpQm5iRzlpWVd3Z1BTQjdmVHRjYm5aaGNpQndjbTluY21GdElEMGdLR1oxYm1OMGFXOXVJR2RsZEZCeWIyZHlZVzBvWEc0Z0lDQWdjMlZzWml4Y2JpQWdJQ0IzYVc1a2IzY3NYRzRnSUNBZ1oyeHZZbUZzTEZ4dUlDQWdJQzh2Ykc5bkxGeHVJQ0FnSUdGeVozVnRaVzUwY3l4Y2JpQWdJQ0JsZG1Gc0xGeHVJQ0FnSUdGc1pYSjBMRnh1SUNBZ0lIQnliMjF3ZEN4Y2JpQWdJQ0J5WlhGMWFYSmxMRnh1SUNBZ0lDUXNYRzRnSUNBZ1pHOWpkVzFsYm5Rc1hHNGdJQ0FnYm1GMmFXZGhkRzl5TEZ4dUlDQWdJRmhOVEVoMGRIQlNaWEYxWlhOMExGeHVJQ0FnSUVaMWJtTjBhVzl1TEZ4dUlDQWdJR3h2WTJGMGFXOXVMRnh1SUNBZ0lHTnZibk52YkdVc1hHNGdJQ0FnYkc5allXeFRkRzl5WVdkbExGeHVJQ0FnSUhObGMzTnBiMjVUZEc5eVlXZGxMRnh1SUNBZ0lHRndjR3hwWTJGMGFXOXVRMkZqYUdVc1hHNGdJQ0FnWTJoeWIyMWxMRnh1SUNBZ0lHTnNiM05sTEZ4dUlDQWdJR05zYVdWdWRFbHVabTl5YldGMGFXOXVMRnh1SUNBZ0lHTnZibVpwY20wc1hHNGdJQ0FnWm5KaGJXVnpMRnh1SUNBZ0lHaHBjM1J2Y25rc1hHNGdJQ0FnY0hKcGJuUXNYRzRnSUNBZ2NHOXpkRTFsYzNOaFoyVXNYRzRnSUNBZ2IyNXRaWE56WjJVc1hHNGdJQ0FnY0dGeVpXNTBMRnh1SUNBZ0lIQnliMlpwYkdVc1hHNGdJQ0FnY1N4Y2JpQWdJQ0IwYjNBc1hHNGdJQ0FnVjI5eWEyVnlMRnh1WEc0Z0lDQWdMeThnYkc5allXeHpYRzRnSUNBZ2MzUmhjblJVY3l4Y2JpQWdJQ0J3Y205bmNtRnRMRnh1SUNBZ0lHZGxkRkJ5YjJkeVlXMHNYRzRnSUNBZ1pXNWtWSE1zWEc0Z0lDQWdjSEp2WjNKaGJWUnBiV1ZjYmlBZ0lDQXBJSHRjYmx4dUlDQjJZWElnWDNKbGNYVnBjbVVnUFNCUVVrOUhVa0ZOS0NrN1hHNGdJRnh1SUNCcFppQW9YM0psY1hWcGNtVXVibUZ0WlNBOVBUMGdKMUoxYmljcFhHNGdJQ0FnY21WMGRYSnVJRjl5WlhGMWFYSmxPMXh1SUNCbGJITmxJQzh2SUhWemFXNW5JR0p5YjNkelpYSnBabmtnUDF4dUlDQWdJSEpsZEhWeWJpQmZjbVZ4ZFdseVpTZ3hLVHRjYmx4dWZTa3VZMkZzYkNobmJHOWlZV3dzSUdkc2IySmhiQ3dnWjJ4dlltRnNLVHRjYmx4dUtHWjFibU4wYVc5dUlDZ3BJSHRjYmlBZ2MyVnNaaTVoWkdSRmRtVnVkRXhwYzNSbGJtVnlLQ2R0WlhOellXZGxKeXdnWm5WdVkzUnBiMjRvWlNrZ2V5QmphR0Z1Ym1Wc0xtOXVUV1Z6YzJGblpTaGxMbVJoZEdFcE95QjlLVHRjYmx4dUlDQmphR0Z1Ym1Wc0xtOXVLQ2RrWVhSaEp5d2diMjVFWVhSaEtUdGNiaUFnWTJoaGJtNWxiQzVsYldsMEtDZHlaV0ZrZVNjc0lFUmhkR1V1Ym05M0tDa2dMU0J6ZEdGeWRGUnpLVHRjYmx4dUlDQm1kVzVqZEdsdmJpQnZia1JoZEdFb1pHRjBZU2tnZTF4dUlDQWdJSFpoY2lCemRHRnlkQ0E5SUVSaGRHVXVibTkzS0NrN1hHNWNiaUFnSUNCMllYSWdZWEpuY3lBOUlGdGtZWFJoWFR0Y2JseHVJQ0FnSUdaMWJtTjBhVzl1SUdOaUtISmxjM1ZzZENrZ2UxeHVJQ0FnSUNBZ2RtRnlJSFJwYldVZ1BTQkVZWFJsTG01dmR5Z3BJQzBnYzNSaGNuUTdYRzRnSUNBZ0lDQmphR0Z1Ym1Wc0xtVnRhWFFvSjNKbGMzVnNkQ2NzSUhKbGMzVnNkQ3dnZEdsdFpTazdYRzRnSUNBZ2ZWeHVYRzRnSUNBZ2FXWWdLSEJ5YjJkeVlXMHVZWE41Ym1NcFhHNGdJQ0FnSUNCaGNtZHpMbkIxYzJnb1kySXBPMXh1WEc0Z0lDQWdkbUZ5SUhKbGMzVnNkRHRjYmlBZ0lDQjBjbmtnZTF4dUlDQWdJQ0FnY21WemRXeDBJRDBnY0hKdlozSmhiUzVoY0hCc2VTaHVkV3hzTENCaGNtZHpLVHRjYmlBZ0lDQjlJR05oZEdOb0lDaGxLU0I3WEc0Z0lDQWdJQ0JqYUdGdWJtVnNMbVZ0YVhRb0oyWmhhV3duTENCN0lHeHBibVZ1YnpvZ1pTNXNhVzVsYm04c0lHMWxjM05oWjJVNklHVXViV1Z6YzJGblpTQjlLVHRjYmlBZ0lDQWdJSEpsZEhWeWJqdGNiaUFnSUNCOVhHNWNiaUFnSUNCcFppQW9JWEJ5YjJkeVlXMHVhWE5CYzNsdVl5bGNiaUFnSUNBZ0lHTmlLSEpsYzNWc2RDazdYRzRnSUgxY2JseHVmU2tvS1R0Y2JseHVmU2tvS1NJc0luWmhjaUJGZG1WdWRFVnRhWFIwWlhJZ1BTQnlaWEYxYVhKbEtDZGxkbVZ1ZEhNbktTNUZkbVZ1ZEVWdGFYUjBaWEk3WEc1Y2JuWmhjaUJUUlZCQlVrRlVUMUlnUFNBbk9pYzdYRzVjYm1aMWJtTjBhVzl1SUdWMlpXNTBNbTFsYzNOaFoyVW9ibUZ0WlN3Z1lYSm5jeWtnZTF4dUlDQjJZWElnYldWemMyRm5aU0E5SUc1aGJXVWdLeUJUUlZCQlVrRlVUMUlnS3lCS1UwOU9Mbk4wY21sdVoybG1lU2hoY21kektUdGNibHh1SUNCeVpYUjFjbTRnYldWemMyRm5aVHRjYm4xY2JseHVablZ1WTNScGIyNGdiV1Z6YzJGblpUSmxkbVZ1ZENodFpYTnpZV2RsS1NCN1hHNGdJSFpoY2lCdVlXMWxMQ0JoY21kek8xeHVYRzRnSUhaaGNpQnBibVJsZUU5bVUyVndZWEpoZEc5eUlEMGdiV1Z6YzJGblpTNXBibVJsZUU5bUtGTkZVRUZTUVZSUFVpazdYRzRnSUdsbUlDaCthVzVrWlhoUFpsTmxjR0Z5WVhSdmNpa2dlMXh1SUNBZ0lHNWhiV1VnUFNCdFpYTnpZV2RsTG5OMVluTjBjbWx1Wnlnd0xDQnBibVJsZUU5bVUyVndZWEpoZEc5eUtUdGNiaUFnSUNCaGNtZHpJRDBnU2xOUFRpNXdZWEp6WlNodFpYTnpZV2RsTG5OMVluTjBjbWx1WnlocGJtUmxlRTltVTJWd1lYSmhkRzl5SUNzZ01Ta3BPMXh1SUNCOUlHVnNjMlVnZTF4dUlDQWdJRzVoYldVZ1BTQnRaWE56WVdkbE8xeHVJQ0FnSUdGeVozTWdQU0IxYm1SbFptbHVaV1E3WEc0Z0lIMWNibHh1SUNCeVpYUjFjbTRnZTF4dUlDQWdJRzVoYldVNklHNWhiV1VzWEc0Z0lDQWdZWEpuY3pvZ1lYSm5jMXh1SUNCOU8xeHVmVnh1WEc1bWRXNWpkR2x2YmlCTk1rVW9jMlZ1WkUxbGMzTmhaMlVwSUh0Y2JpQWdkbUZ5SUcweVpTQTlJRzVsZHlCRmRtVnVkRVZ0YVhSMFpYSTdYRzVjYmlBZ2JUSmxMbk5sYm1STlpYTnpZV2RsSUQwZ2MyVnVaRTFsYzNOaFoyVTdYRzVjYmlBZ2RtRnlJR3h2WTJGc1JXMXBkQ0E5SUcweVpTNWxiV2wwTzF4dVhHNGdJRzB5WlM1bGJXbDBJRDFjYmlBZ1puVnVZM1JwYjI0Z2NtVnRiM1JsUlcxcGRDZ3BJSHRjYmlBZ0lDQnBaaUFvSVhSb2FYTXVjMlZ1WkUxbGMzTmhaMlVwSUh0Y2JpQWdJQ0FnSUhSb2NtOTNJRVZ5Y205eUtDZHpaVzVrVFdWemMyRm5aU0JwY3lCdWIzUWdaR1ZtYVc1bFpDY3BPMXh1SUNBZ0lIMWNibHh1SUNBZ0lIWmhjaUJoY21keklEMGdRWEp5WVhrdWNISnZkRzkwZVhCbExuTnNhV05sTG1OaGJHd29ZWEpuZFcxbGJuUnpLVHRjYmlBZ0lDQjJZWElnYm1GdFpTQTlJR0Z5WjNNdWMyaHBablFvS1R0Y2JseHVJQ0FnSUdsbUlDZ2hUVEpGTG5CeWIzQmhaMkYwWlU1bGQweHBjM1JsYm1WeUlDWW1JRzVoYldVZ1BUMDlJQ2R1WlhkTWFYTjBaVzVsY2ljcFhHNGdJQ0FnSUNCeVpYUjFjbTQ3WEc1Y2JpQWdJQ0IyWVhJZ2JYTm5JRDBnWlhabGJuUXliV1Z6YzJGblpTaHVZVzFsTENCaGNtZHpLVHRjYmlBZ0lDQjBjbmtnZTF4dUlDQWdJQ0FnZEdocGN5NXpaVzVrVFdWemMyRm5aU2h0YzJjcE8xeHVJQ0FnSUgwZ1kyRjBZMmdnS0dWeWNtOXlLU0I3WEc0Z0lDQWdJQ0JwWmlBb2RHaHBjeTVzYVhOMFpXNWxjbk1vZEdocGN5NWxjbkp2Y201aGJXVXBMbXhsYm1kMGFDbGNiaUFnSUNBZ0lDQWdSWFpsYm5SRmJXbDBkR1Z5TG5CeWIzUnZkSGx3WlM1MGNtbG5aMlZ5TG1OaGJHd29kR2hwY3l3Z2RHaHBjeTVsY25KdmNtNWhiV1VzSUZ0bGNuSnZjbDBwTzF4dUlDQWdJQ0FnWld4elpWeHVJQ0FnSUNBZ0lDQjBhSEp2ZHlCbGNuSnZjanRjYmlBZ0lDQjlYRzRnSUgwN1hHNWNiaUFnYlRKbExtOXVUV1Z6YzJGblpTQTlYRzRnSUdaMWJtTjBhVzl1SUc5dVRXVnpjMkZuWlNodGMyY3BJSHRjYmlBZ0lDQjJZWElnWlhaMElEMGdiV1Z6YzJGblpUSmxkbVZ1ZENodGMyY3BPMXh1SUNBZ0lIWmhjaUJoY21keklEMGdaWFowTG1GeVozTTdYRzRnSUNBZ1lYSm5jeTUxYm5Ob2FXWjBLR1YyZEM1dVlXMWxLVHRjYmlBZ0lDQnNiMk5oYkVWdGFYUXVZWEJ3Ykhrb2JUSmxMQ0JoY21kektUdGNiaUFnZlR0Y2JseHVJQ0J5WlhSMWNtNGdiVEpsTzF4dWZWeHVYRzV0YjJSMWJHVXVaWGh3YjNKMGN5QTlJRTB5UlR0Y2JrMHlSUzVsZG1WdWRESnRaWE56WVdkbElEMGdaWFpsYm5ReWJXVnpjMkZuWlR0Y2JrMHlSUzV0WlhOellXZGxNbVYyWlc1MElEMGdiV1Z6YzJGblpUSmxkbVZ1ZER0Y2JpSXNJaTh2SUhOb2FXMGdabTl5SUhWemFXNW5JSEJ5YjJObGMzTWdhVzRnWW5KdmQzTmxjbHh1WEc1MllYSWdjSEp2WTJWemN5QTlJRzF2WkhWc1pTNWxlSEJ2Y25SeklEMGdlMzA3WEc1Y2JuQnliMk5sYzNNdWJtVjRkRlJwWTJzZ1BTQW9ablZ1WTNScGIyNGdLQ2tnZTF4dUlDQWdJSFpoY2lCallXNVRaWFJKYlcxbFpHbGhkR1VnUFNCMGVYQmxiMllnZDJsdVpHOTNJQ0U5UFNBbmRXNWtaV1pwYm1Wa0oxeHVJQ0FnSUNZbUlIZHBibVJ2ZHk1elpYUkpiVzFsWkdsaGRHVTdYRzRnSUNBZ2RtRnlJR05oYmxCdmMzUWdQU0IwZVhCbGIyWWdkMmx1Wkc5M0lDRTlQU0FuZFc1a1pXWnBibVZrSjF4dUlDQWdJQ1ltSUhkcGJtUnZkeTV3YjNOMFRXVnpjMkZuWlNBbUppQjNhVzVrYjNjdVlXUmtSWFpsYm5STWFYTjBaVzVsY2x4dUlDQWdJRHRjYmx4dUlDQWdJR2xtSUNoallXNVRaWFJKYlcxbFpHbGhkR1VwSUh0Y2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUdaMWJtTjBhVzl1SUNobUtTQjdJSEpsZEhWeWJpQjNhVzVrYjNjdWMyVjBTVzF0WldScFlYUmxLR1lwSUgwN1hHNGdJQ0FnZlZ4dVhHNGdJQ0FnYVdZZ0tHTmhibEJ2YzNRcElIdGNiaUFnSUNBZ0lDQWdkbUZ5SUhGMVpYVmxJRDBnVzEwN1hHNGdJQ0FnSUNBZ0lIZHBibVJ2ZHk1aFpHUkZkbVZ1ZEV4cGMzUmxibVZ5S0NkdFpYTnpZV2RsSnl3Z1puVnVZM1JwYjI0Z0tHVjJLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQnBaaUFvWlhZdWMyOTFjbU5sSUQwOVBTQjNhVzVrYjNjZ0ppWWdaWFl1WkdGMFlTQTlQVDBnSjNCeWIyTmxjM010ZEdsamF5Y3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JsZGk1emRHOXdVSEp2Y0dGbllYUnBiMjRvS1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCcFppQW9jWFZsZFdVdWJHVnVaM1JvSUQ0Z01Da2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCMllYSWdabTRnUFNCeGRXVjFaUzV6YUdsbWRDZ3BPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCbWJpZ3BPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lDQWdmU3dnZEhKMVpTazdYRzVjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJR1oxYm1OMGFXOXVJRzVsZUhSVWFXTnJLR1p1S1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0J4ZFdWMVpTNXdkWE5vS0dadUtUdGNiaUFnSUNBZ0lDQWdJQ0FnSUhkcGJtUnZkeTV3YjNOMFRXVnpjMkZuWlNnbmNISnZZMlZ6Y3kxMGFXTnJKeXdnSnlvbktUdGNiaUFnSUNBZ0lDQWdmVHRjYmlBZ0lDQjlYRzVjYmlBZ0lDQnlaWFIxY200Z1puVnVZM1JwYjI0Z2JtVjRkRlJwWTJzb1ptNHBJSHRjYmlBZ0lDQWdJQ0FnYzJWMFZHbHRaVzkxZENobWJpd2dNQ2s3WEc0Z0lDQWdmVHRjYm4wcEtDazdYRzVjYm5CeWIyTmxjM011ZEdsMGJHVWdQU0FuWW5KdmQzTmxjaWM3WEc1d2NtOWpaWE56TG1KeWIzZHpaWElnUFNCMGNuVmxPMXh1Y0hKdlkyVnpjeTVsYm5ZZ1BTQjdmVHRjYm5CeWIyTmxjM011WVhKbmRpQTlJRnRkTzF4dVhHNXdjbTlqWlhOekxtSnBibVJwYm1jZ1BTQm1kVzVqZEdsdmJpQW9ibUZ0WlNrZ2UxeHVJQ0FnSUhSb2NtOTNJRzVsZHlCRmNuSnZjaWduY0hKdlkyVnpjeTVpYVc1a2FXNW5JR2x6SUc1dmRDQnpkWEJ3YjNKMFpXUW5LVHRjYm4xY2JseHVMeThnVkU5RVR5aHphSFI1YkcxaGJpbGNibkJ5YjJObGMzTXVZM2RrSUQwZ1puVnVZM1JwYjI0Z0tDa2dleUJ5WlhSMWNtNGdKeThuSUgwN1hHNXdjbTlqWlhOekxtTm9aR2x5SUQwZ1puVnVZM1JwYjI0Z0tHUnBjaWtnZTF4dUlDQWdJSFJvY205M0lHNWxkeUJGY25KdmNpZ25jSEp2WTJWemN5NWphR1JwY2lCcGN5QnViM1FnYzNWd2NHOXlkR1ZrSnlrN1hHNTlPMXh1SWl3aUtHWjFibU4wYVc5dUtIQnliMk5sYzNNcGUybG1JQ2doY0hKdlkyVnpjeTVGZG1WdWRFVnRhWFIwWlhJcElIQnliMk5sYzNNdVJYWmxiblJGYldsMGRHVnlJRDBnWm5WdVkzUnBiMjRnS0NrZ2UzMDdYRzVjYm5aaGNpQkZkbVZ1ZEVWdGFYUjBaWElnUFNCbGVIQnZjblJ6TGtWMlpXNTBSVzFwZEhSbGNpQTlJSEJ5YjJObGMzTXVSWFpsYm5SRmJXbDBkR1Z5TzF4dWRtRnlJR2x6UVhKeVlYa2dQU0IwZVhCbGIyWWdRWEp5WVhrdWFYTkJjbkpoZVNBOVBUMGdKMloxYm1OMGFXOXVKMXh1SUNBZ0lEOGdRWEp5WVhrdWFYTkJjbkpoZVZ4dUlDQWdJRG9nWm5WdVkzUnBiMjRnS0hoektTQjdYRzRnSUNBZ0lDQWdJSEpsZEhWeWJpQlBZbXBsWTNRdWNISnZkRzkwZVhCbExuUnZVM1J5YVc1bkxtTmhiR3dvZUhNcElEMDlQU0FuVzI5aWFtVmpkQ0JCY25KaGVWMG5YRzRnSUNBZ2ZWeHVPMXh1Wm5WdVkzUnBiMjRnYVc1a1pYaFBaaUFvZUhNc0lIZ3BJSHRjYmlBZ0lDQnBaaUFvZUhNdWFXNWtaWGhQWmlrZ2NtVjBkWEp1SUhoekxtbHVaR1Y0VDJZb2VDazdYRzRnSUNBZ1ptOXlJQ2gyWVhJZ2FTQTlJREE3SUdrZ1BDQjRjeTVzWlc1bmRHZzdJR2tyS3lrZ2UxeHVJQ0FnSUNBZ0lDQnBaaUFvZUNBOVBUMGdlSE5iYVYwcElISmxkSFZ5YmlCcE8xeHVJQ0FnSUgxY2JpQWdJQ0J5WlhSMWNtNGdMVEU3WEc1OVhHNWNiaTh2SUVKNUlHUmxabUYxYkhRZ1JYWmxiblJGYldsMGRHVnljeUIzYVd4c0lIQnlhVzUwSUdFZ2QyRnlibWx1WnlCcFppQnRiM0psSUhSb1lXNWNiaTh2SURFd0lHeHBjM1JsYm1WeWN5QmhjbVVnWVdSa1pXUWdkRzhnYVhRdUlGUm9hWE1nYVhNZ1lTQjFjMlZtZFd3Z1pHVm1ZWFZzZENCM2FHbGphRnh1THk4Z2FHVnNjSE1nWm1sdVpHbHVaeUJ0WlcxdmNua2diR1ZoYTNNdVhHNHZMMXh1THk4Z1QySjJhVzkxYzJ4NUlHNXZkQ0JoYkd3Z1JXMXBkSFJsY25NZ2MyaHZkV3hrSUdKbElHeHBiV2wwWldRZ2RHOGdNVEF1SUZSb2FYTWdablZ1WTNScGIyNGdZV3hzYjNkelhHNHZMeUIwYUdGMElIUnZJR0psSUdsdVkzSmxZWE5sWkM0Z1UyVjBJSFJ2SUhwbGNtOGdabTl5SUhWdWJHbHRhWFJsWkM1Y2JuWmhjaUJrWldaaGRXeDBUV0Y0VEdsemRHVnVaWEp6SUQwZ01UQTdYRzVGZG1WdWRFVnRhWFIwWlhJdWNISnZkRzkwZVhCbExuTmxkRTFoZUV4cGMzUmxibVZ5Y3lBOUlHWjFibU4wYVc5dUtHNHBJSHRjYmlBZ2FXWWdLQ0YwYUdsekxsOWxkbVZ1ZEhNcElIUm9hWE11WDJWMlpXNTBjeUE5SUh0OU8xeHVJQ0IwYUdsekxsOWxkbVZ1ZEhNdWJXRjRUR2x6ZEdWdVpYSnpJRDBnYmp0Y2JuMDdYRzVjYmx4dVJYWmxiblJGYldsMGRHVnlMbkJ5YjNSdmRIbHdaUzVsYldsMElEMGdablZ1WTNScGIyNG9kSGx3WlNrZ2UxeHVJQ0F2THlCSlppQjBhR1Z5WlNCcGN5QnVieUFuWlhKeWIzSW5JR1YyWlc1MElHeHBjM1JsYm1WeUlIUm9aVzRnZEdoeWIzY3VYRzRnSUdsbUlDaDBlWEJsSUQwOVBTQW5aWEp5YjNJbktTQjdYRzRnSUNBZ2FXWWdLQ0YwYUdsekxsOWxkbVZ1ZEhNZ2ZId2dJWFJvYVhNdVgyVjJaVzUwY3k1bGNuSnZjaUI4ZkZ4dUlDQWdJQ0FnSUNBb2FYTkJjbkpoZVNoMGFHbHpMbDlsZG1WdWRITXVaWEp5YjNJcElDWW1JQ0YwYUdsekxsOWxkbVZ1ZEhNdVpYSnliM0l1YkdWdVozUm9LU2xjYmlBZ0lDQjdYRzRnSUNBZ0lDQnBaaUFvWVhKbmRXMWxiblJ6V3pGZElHbHVjM1JoYm1ObGIyWWdSWEp5YjNJcElIdGNiaUFnSUNBZ0lDQWdkR2h5YjNjZ1lYSm5kVzFsYm5Seld6RmRPeUF2THlCVmJtaGhibVJzWldRZ0oyVnljbTl5SnlCbGRtVnVkRnh1SUNBZ0lDQWdmU0JsYkhObElIdGNiaUFnSUNBZ0lDQWdkR2h5YjNjZ2JtVjNJRVZ5Y205eUtGd2lWVzVqWVhWbmFIUXNJSFZ1YzNCbFkybG1hV1ZrSUNkbGNuSnZjaWNnWlhabGJuUXVYQ0lwTzF4dUlDQWdJQ0FnZlZ4dUlDQWdJQ0FnY21WMGRYSnVJR1poYkhObE8xeHVJQ0FnSUgxY2JpQWdmVnh1WEc0Z0lHbG1JQ2doZEdocGN5NWZaWFpsYm5SektTQnlaWFIxY200Z1ptRnNjMlU3WEc0Z0lIWmhjaUJvWVc1a2JHVnlJRDBnZEdocGN5NWZaWFpsYm5SelczUjVjR1ZkTzF4dUlDQnBaaUFvSVdoaGJtUnNaWElwSUhKbGRIVnliaUJtWVd4elpUdGNibHh1SUNCcFppQW9kSGx3Wlc5bUlHaGhibVJzWlhJZ1BUMGdKMloxYm1OMGFXOXVKeWtnZTF4dUlDQWdJSE4zYVhSamFDQW9ZWEpuZFcxbGJuUnpMbXhsYm1kMGFDa2dlMXh1SUNBZ0lDQWdMeThnWm1GemRDQmpZWE5sYzF4dUlDQWdJQ0FnWTJGelpTQXhPbHh1SUNBZ0lDQWdJQ0JvWVc1a2JHVnlMbU5oYkd3b2RHaHBjeWs3WEc0Z0lDQWdJQ0FnSUdKeVpXRnJPMXh1SUNBZ0lDQWdZMkZ6WlNBeU9seHVJQ0FnSUNBZ0lDQm9ZVzVrYkdWeUxtTmhiR3dvZEdocGN5d2dZWEpuZFcxbGJuUnpXekZkS1R0Y2JpQWdJQ0FnSUNBZ1luSmxZV3M3WEc0Z0lDQWdJQ0JqWVhObElETTZYRzRnSUNBZ0lDQWdJR2hoYm1Sc1pYSXVZMkZzYkNoMGFHbHpMQ0JoY21kMWJXVnVkSE5iTVYwc0lHRnlaM1Z0Wlc1MGMxc3lYU2s3WEc0Z0lDQWdJQ0FnSUdKeVpXRnJPMXh1SUNBZ0lDQWdMeThnYzJ4dmQyVnlYRzRnSUNBZ0lDQmtaV1poZFd4ME9seHVJQ0FnSUNBZ0lDQjJZWElnWVhKbmN5QTlJRUZ5Y21GNUxuQnliM1J2ZEhsd1pTNXpiR2xqWlM1allXeHNLR0Z5WjNWdFpXNTBjeXdnTVNrN1hHNGdJQ0FnSUNBZ0lHaGhibVJzWlhJdVlYQndiSGtvZEdocGN5d2dZWEpuY3lrN1hHNGdJQ0FnZlZ4dUlDQWdJSEpsZEhWeWJpQjBjblZsTzF4dVhHNGdJSDBnWld4elpTQnBaaUFvYVhOQmNuSmhlU2hvWVc1a2JHVnlLU2tnZTF4dUlDQWdJSFpoY2lCaGNtZHpJRDBnUVhKeVlYa3VjSEp2ZEc5MGVYQmxMbk5zYVdObExtTmhiR3dvWVhKbmRXMWxiblJ6TENBeEtUdGNibHh1SUNBZ0lIWmhjaUJzYVhOMFpXNWxjbk1nUFNCb1lXNWtiR1Z5TG5Oc2FXTmxLQ2s3WEc0Z0lDQWdabTl5SUNoMllYSWdhU0E5SURBc0lHd2dQU0JzYVhOMFpXNWxjbk11YkdWdVozUm9PeUJwSUR3Z2JEc2dhU3NyS1NCN1hHNGdJQ0FnSUNCc2FYTjBaVzVsY25OYmFWMHVZWEJ3Ykhrb2RHaHBjeXdnWVhKbmN5azdYRzRnSUNBZ2ZWeHVJQ0FnSUhKbGRIVnliaUIwY25WbE8xeHVYRzRnSUgwZ1pXeHpaU0I3WEc0Z0lDQWdjbVYwZFhKdUlHWmhiSE5sTzF4dUlDQjlYRzU5TzF4dVhHNHZMeUJGZG1WdWRFVnRhWFIwWlhJZ2FYTWdaR1ZtYVc1bFpDQnBiaUJ6Y21NdmJtOWtaVjlsZG1WdWRITXVZMk5jYmk4dklFVjJaVzUwUlcxcGRIUmxjaTV3Y205MGIzUjVjR1V1WlcxcGRDZ3BJR2x6SUdGc2MyOGdaR1ZtYVc1bFpDQjBhR1Z5WlM1Y2JrVjJaVzUwUlcxcGRIUmxjaTV3Y205MGIzUjVjR1V1WVdSa1RHbHpkR1Z1WlhJZ1BTQm1kVzVqZEdsdmJpaDBlWEJsTENCc2FYTjBaVzVsY2lrZ2UxeHVJQ0JwWmlBb0oyWjFibU4wYVc5dUp5QWhQVDBnZEhsd1pXOW1JR3hwYzNSbGJtVnlLU0I3WEc0Z0lDQWdkR2h5YjNjZ2JtVjNJRVZ5Y205eUtDZGhaR1JNYVhOMFpXNWxjaUJ2Ym14NUlIUmhhMlZ6SUdsdWMzUmhibU5sY3lCdlppQkdkVzVqZEdsdmJpY3BPMXh1SUNCOVhHNWNiaUFnYVdZZ0tDRjBhR2x6TGw5bGRtVnVkSE1wSUhSb2FYTXVYMlYyWlc1MGN5QTlJSHQ5TzF4dVhHNGdJQzh2SUZSdklHRjJiMmxrSUhKbFkzVnljMmx2YmlCcGJpQjBhR1VnWTJGelpTQjBhR0YwSUhSNWNHVWdQVDBnWENKdVpYZE1hWE4wWlc1bGNuTmNJaUVnUW1WbWIzSmxYRzRnSUM4dklHRmtaR2x1WnlCcGRDQjBieUIwYUdVZ2JHbHpkR1Z1WlhKekxDQm1hWEp6ZENCbGJXbDBJRndpYm1WM1RHbHpkR1Z1WlhKelhDSXVYRzRnSUhSb2FYTXVaVzFwZENnbmJtVjNUR2x6ZEdWdVpYSW5MQ0IwZVhCbExDQnNhWE4wWlc1bGNpazdYRzVjYmlBZ2FXWWdLQ0YwYUdsekxsOWxkbVZ1ZEhOYmRIbHdaVjBwSUh0Y2JpQWdJQ0F2THlCUGNIUnBiV2w2WlNCMGFHVWdZMkZ6WlNCdlppQnZibVVnYkdsemRHVnVaWEl1SUVSdmJpZDBJRzVsWldRZ2RHaGxJR1Y0ZEhKaElHRnljbUY1SUc5aWFtVmpkQzVjYmlBZ0lDQjBhR2x6TGw5bGRtVnVkSE5iZEhsd1pWMGdQU0JzYVhOMFpXNWxjanRjYmlBZ2ZTQmxiSE5sSUdsbUlDaHBjMEZ5Y21GNUtIUm9hWE11WDJWMlpXNTBjMXQwZVhCbFhTa3BJSHRjYmx4dUlDQWdJQzh2SUVOb1pXTnJJR1p2Y2lCc2FYTjBaVzVsY2lCc1pXRnJYRzRnSUNBZ2FXWWdLQ0YwYUdsekxsOWxkbVZ1ZEhOYmRIbHdaVjB1ZDJGeWJtVmtLU0I3WEc0Z0lDQWdJQ0IyWVhJZ2JUdGNiaUFnSUNBZ0lHbG1JQ2gwYUdsekxsOWxkbVZ1ZEhNdWJXRjRUR2x6ZEdWdVpYSnpJQ0U5UFNCMWJtUmxabWx1WldRcElIdGNiaUFnSUNBZ0lDQWdiU0E5SUhSb2FYTXVYMlYyWlc1MGN5NXRZWGhNYVhOMFpXNWxjbk03WEc0Z0lDQWdJQ0I5SUdWc2MyVWdlMXh1SUNBZ0lDQWdJQ0J0SUQwZ1pHVm1ZWFZzZEUxaGVFeHBjM1JsYm1WeWN6dGNiaUFnSUNBZ0lIMWNibHh1SUNBZ0lDQWdhV1lnS0cwZ0ppWWdiU0ErSURBZ0ppWWdkR2hwY3k1ZlpYWmxiblJ6VzNSNWNHVmRMbXhsYm1kMGFDQStJRzBwSUh0Y2JpQWdJQ0FnSUNBZ2RHaHBjeTVmWlhabGJuUnpXM1I1Y0dWZExuZGhjbTVsWkNBOUlIUnlkV1U3WEc0Z0lDQWdJQ0FnSUdOdmJuTnZiR1V1WlhKeWIzSW9KeWh1YjJSbEtTQjNZWEp1YVc1bk9pQndiM056YVdKc1pTQkZkbVZ1ZEVWdGFYUjBaWElnYldWdGIzSjVJQ2NnSzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ2RzWldGcklHUmxkR1ZqZEdWa0xpQWxaQ0JzYVhOMFpXNWxjbk1nWVdSa1pXUXVJQ2NnSzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ2RWYzJVZ1pXMXBkSFJsY2k1elpYUk5ZWGhNYVhOMFpXNWxjbk1vS1NCMGJ5QnBibU55WldGelpTQnNhVzFwZEM0bkxGeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhSb2FYTXVYMlYyWlc1MGMxdDBlWEJsWFM1c1pXNW5kR2dwTzF4dUlDQWdJQ0FnSUNCamIyNXpiMnhsTG5SeVlXTmxLQ2s3WEc0Z0lDQWdJQ0I5WEc0Z0lDQWdmVnh1WEc0Z0lDQWdMeThnU1dZZ2QyVW5kbVVnWVd4eVpXRmtlU0JuYjNRZ1lXNGdZWEp5WVhrc0lHcDFjM1FnWVhCd1pXNWtMbHh1SUNBZ0lIUm9hWE11WDJWMlpXNTBjMXQwZVhCbFhTNXdkWE5vS0d4cGMzUmxibVZ5S1R0Y2JpQWdmU0JsYkhObElIdGNiaUFnSUNBdkx5QkJaR1JwYm1jZ2RHaGxJSE5sWTI5dVpDQmxiR1Z0Wlc1MExDQnVaV1ZrSUhSdklHTm9ZVzVuWlNCMGJ5QmhjbkpoZVM1Y2JpQWdJQ0IwYUdsekxsOWxkbVZ1ZEhOYmRIbHdaVjBnUFNCYmRHaHBjeTVmWlhabGJuUnpXM1I1Y0dWZExDQnNhWE4wWlc1bGNsMDdYRzRnSUgxY2JseHVJQ0J5WlhSMWNtNGdkR2hwY3p0Y2JuMDdYRzVjYmtWMlpXNTBSVzFwZEhSbGNpNXdjbTkwYjNSNWNHVXViMjRnUFNCRmRtVnVkRVZ0YVhSMFpYSXVjSEp2ZEc5MGVYQmxMbUZrWkV4cGMzUmxibVZ5TzF4dVhHNUZkbVZ1ZEVWdGFYUjBaWEl1Y0hKdmRHOTBlWEJsTG05dVkyVWdQU0JtZFc1amRHbHZiaWgwZVhCbExDQnNhWE4wWlc1bGNpa2dlMXh1SUNCMllYSWdjMlZzWmlBOUlIUm9hWE03WEc0Z0lITmxiR1l1YjI0b2RIbHdaU3dnWm5WdVkzUnBiMjRnWnlncElIdGNiaUFnSUNCelpXeG1MbkpsYlc5MlpVeHBjM1JsYm1WeUtIUjVjR1VzSUdjcE8xeHVJQ0FnSUd4cGMzUmxibVZ5TG1Gd2NHeDVLSFJvYVhNc0lHRnlaM1Z0Wlc1MGN5azdYRzRnSUgwcE8xeHVYRzRnSUhKbGRIVnliaUIwYUdsek8xeHVmVHRjYmx4dVJYWmxiblJGYldsMGRHVnlMbkJ5YjNSdmRIbHdaUzV5WlcxdmRtVk1hWE4wWlc1bGNpQTlJR1oxYm1OMGFXOXVLSFI1Y0dVc0lHeHBjM1JsYm1WeUtTQjdYRzRnSUdsbUlDZ25ablZ1WTNScGIyNG5JQ0U5UFNCMGVYQmxiMllnYkdsemRHVnVaWElwSUh0Y2JpQWdJQ0IwYUhKdmR5QnVaWGNnUlhKeWIzSW9KM0psYlc5MlpVeHBjM1JsYm1WeUlHOXViSGtnZEdGclpYTWdhVzV6ZEdGdVkyVnpJRzltSUVaMWJtTjBhVzl1SnlrN1hHNGdJSDFjYmx4dUlDQXZMeUJrYjJWeklHNXZkQ0IxYzJVZ2JHbHpkR1Z1WlhKektDa3NJSE52SUc1dklITnBaR1VnWldabVpXTjBJRzltSUdOeVpXRjBhVzVuSUY5bGRtVnVkSE5iZEhsd1pWMWNiaUFnYVdZZ0tDRjBhR2x6TGw5bGRtVnVkSE1nZkh3Z0lYUm9hWE11WDJWMlpXNTBjMXQwZVhCbFhTa2djbVYwZFhKdUlIUm9hWE03WEc1Y2JpQWdkbUZ5SUd4cGMzUWdQU0IwYUdsekxsOWxkbVZ1ZEhOYmRIbHdaVjA3WEc1Y2JpQWdhV1lnS0dselFYSnlZWGtvYkdsemRDa3BJSHRjYmlBZ0lDQjJZWElnYVNBOUlHbHVaR1Y0VDJZb2JHbHpkQ3dnYkdsemRHVnVaWElwTzF4dUlDQWdJR2xtSUNocElEd2dNQ2tnY21WMGRYSnVJSFJvYVhNN1hHNGdJQ0FnYkdsemRDNXpjR3hwWTJVb2FTd2dNU2s3WEc0Z0lDQWdhV1lnS0d4cGMzUXViR1Z1WjNSb0lEMDlJREFwWEc0Z0lDQWdJQ0JrWld4bGRHVWdkR2hwY3k1ZlpYWmxiblJ6VzNSNWNHVmRPMXh1SUNCOUlHVnNjMlVnYVdZZ0tIUm9hWE11WDJWMlpXNTBjMXQwZVhCbFhTQTlQVDBnYkdsemRHVnVaWElwSUh0Y2JpQWdJQ0JrWld4bGRHVWdkR2hwY3k1ZlpYWmxiblJ6VzNSNWNHVmRPMXh1SUNCOVhHNWNiaUFnY21WMGRYSnVJSFJvYVhNN1hHNTlPMXh1WEc1RmRtVnVkRVZ0YVhSMFpYSXVjSEp2ZEc5MGVYQmxMbkpsYlc5MlpVRnNiRXhwYzNSbGJtVnljeUE5SUdaMWJtTjBhVzl1S0hSNWNHVXBJSHRjYmlBZ2FXWWdLR0Z5WjNWdFpXNTBjeTVzWlc1bmRHZ2dQVDA5SURBcElIdGNiaUFnSUNCMGFHbHpMbDlsZG1WdWRITWdQU0I3ZlR0Y2JpQWdJQ0J5WlhSMWNtNGdkR2hwY3p0Y2JpQWdmVnh1WEc0Z0lDOHZJR1J2WlhNZ2JtOTBJSFZ6WlNCc2FYTjBaVzVsY25Nb0tTd2djMjhnYm04Z2MybGtaU0JsWm1abFkzUWdiMllnWTNKbFlYUnBibWNnWDJWMlpXNTBjMXQwZVhCbFhWeHVJQ0JwWmlBb2RIbHdaU0FtSmlCMGFHbHpMbDlsZG1WdWRITWdKaVlnZEdocGN5NWZaWFpsYm5SelczUjVjR1ZkS1NCMGFHbHpMbDlsZG1WdWRITmJkSGx3WlYwZ1BTQnVkV3hzTzF4dUlDQnlaWFIxY200Z2RHaHBjenRjYm4wN1hHNWNia1YyWlc1MFJXMXBkSFJsY2k1d2NtOTBiM1I1Y0dVdWJHbHpkR1Z1WlhKeklEMGdablZ1WTNScGIyNG9kSGx3WlNrZ2UxeHVJQ0JwWmlBb0lYUm9hWE11WDJWMlpXNTBjeWtnZEdocGN5NWZaWFpsYm5SeklEMGdlMzA3WEc0Z0lHbG1JQ2doZEdocGN5NWZaWFpsYm5SelczUjVjR1ZkS1NCMGFHbHpMbDlsZG1WdWRITmJkSGx3WlYwZ1BTQmJYVHRjYmlBZ2FXWWdLQ0ZwYzBGeWNtRjVLSFJvYVhNdVgyVjJaVzUwYzF0MGVYQmxYU2twSUh0Y2JpQWdJQ0IwYUdsekxsOWxkbVZ1ZEhOYmRIbHdaVjBnUFNCYmRHaHBjeTVmWlhabGJuUnpXM1I1Y0dWZFhUdGNiaUFnZlZ4dUlDQnlaWFIxY200Z2RHaHBjeTVmWlhabGJuUnpXM1I1Y0dWZE8xeHVmVHRjYmx4dWZTa29jbVZ4ZFdseVpTaGNJbDlmWW5KdmQzTmxjbWxtZVY5d2NtOWpaWE56WENJcEtTSmRmUT09XFxuO1wiO1xuXG5mdW5jdGlvbiBjcmVhdGVXb3JrZXIgKHByb2dyYW0pIHtcbiAgdmFyIHdvcmtlckNvZGUgPSB3b3JrZXJGaWxlLnJlcGxhY2UoL1BST0dSQU1cXChcXClcXDsvLCB0YWtlT3V0Rmlyc3RBbmRMYXN0U2VtaUNvbG9ucyhwcm9ncmFtKSk7XG4gIHZhciB3b3JrZXJCbG9iID0gbmV3IEJsb2IoW3dvcmtlckNvZGVdLCB7ICd0eXBlJyA6ICd0ZXh0XFwvamF2YXNjcmlwdCcgfSk7XG4gIHZhciB3b3JrZXJCbG9iVXJsID0gVVJMLmNyZWF0ZU9iamVjdFVSTCh3b3JrZXJCbG9iKTtcbiAgdmFyIHd3ID0gbmV3IFdvcmtlcih3b3JrZXJCbG9iVXJsKTtcblxuICB2YXIgY2hhbm5lbCA9IG5ldyBNMkUoKTtcblxuICBjaGFubmVsLnNlbmRNZXNzYWdlID0gd3cucG9zdE1lc3NhZ2UuYmluZCh3dyk7XG4gIHd3Lm9ubWVzc2FnZSA9IGZ1bmN0aW9uKG0pIHtcbiAgICBjaGFubmVsLm9uTWVzc2FnZShtLmRhdGEpO1xuICB9O1xuXG4gIHd3Lm9uZXJyb3IgPSBmdW5jdGlvbiAoZXJyKSB7XG4gICAgdmFyIHByb2dyYW1FcnJvciA9IHByb3BlclByb2dyYW1FcnJvcihlcnIpO1xuICAgIHZhciBiYWQgPSBzb21ldGhpbmdXZW50QmFkKHByb2dyYW1FcnJvcik7XG4gICAgZ2l2ZUZlZWRiYWNrKGJhZCk7XG4gIH07XG5cbiAgY2hhbm5lbC5vbignbG9nJywgZnVuY3Rpb24gKGFyZ3MpIHtcbiAgICBjb25zb2xlLmxvZy5hcHBseShjb25zb2xlLCBhcmdzKTtcbiAgfSk7XG5cbiAgY2hhbm5lbC5vbignaW1wbG9kZScsIGZ1bmN0aW9uICgpIHtcbiAgICB3dy50ZXJtaW5hdGUoKTtcbiAgfSk7XG5cbiAgcmV0dXJuIGNoYW5uZWw7XG59XG5cbmZ1bmN0aW9uIHRha2VPdXRGaXJzdEFuZExhc3RTZW1pQ29sb25zKHN0cikge1xuICBpZiAoc3RyWzBdID09PSAnOycgJiYgc3RyW3N0ci5sZW5ndGggLSAxXSA9PT0gJzsnKVxuICAgIHJldHVybiBzdHIuc3Vic3RyaW5nKDEsIHN0ci5sZW5ndGggLSAxKTtcbiAgcmV0dXJuIHN0cjtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBjcmVhdGVXb3JrZXI7XG5cbn0pKCkiLCJ2YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZSgnZXZlbnRzJykuRXZlbnRFbWl0dGVyO1xuXG52YXIgU0VQQVJBVE9SID0gJzonO1xuXG5mdW5jdGlvbiBldmVudDJtZXNzYWdlKG5hbWUsIGFyZ3MpIHtcbiAgdmFyIG1lc3NhZ2UgPSBuYW1lICsgU0VQQVJBVE9SICsgSlNPTi5zdHJpbmdpZnkoYXJncyk7XG5cbiAgcmV0dXJuIG1lc3NhZ2U7XG59XG5cbmZ1bmN0aW9uIG1lc3NhZ2UyZXZlbnQobWVzc2FnZSkge1xuICB2YXIgbmFtZSwgYXJncztcblxuICB2YXIgaW5kZXhPZlNlcGFyYXRvciA9IG1lc3NhZ2UuaW5kZXhPZihTRVBBUkFUT1IpO1xuICBpZiAofmluZGV4T2ZTZXBhcmF0b3IpIHtcbiAgICBuYW1lID0gbWVzc2FnZS5zdWJzdHJpbmcoMCwgaW5kZXhPZlNlcGFyYXRvcik7XG4gICAgYXJncyA9IEpTT04ucGFyc2UobWVzc2FnZS5zdWJzdHJpbmcoaW5kZXhPZlNlcGFyYXRvciArIDEpKTtcbiAgfSBlbHNlIHtcbiAgICBuYW1lID0gbWVzc2FnZTtcbiAgICBhcmdzID0gdW5kZWZpbmVkO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBuYW1lOiBuYW1lLFxuICAgIGFyZ3M6IGFyZ3NcbiAgfTtcbn1cblxuZnVuY3Rpb24gTTJFKHNlbmRNZXNzYWdlKSB7XG4gIHZhciBtMmUgPSBuZXcgRXZlbnRFbWl0dGVyO1xuXG4gIG0yZS5zZW5kTWVzc2FnZSA9IHNlbmRNZXNzYWdlO1xuXG4gIHZhciBsb2NhbEVtaXQgPSBtMmUuZW1pdDtcblxuICBtMmUuZW1pdCA9XG4gIGZ1bmN0aW9uIHJlbW90ZUVtaXQoKSB7XG4gICAgaWYgKCF0aGlzLnNlbmRNZXNzYWdlKSB7XG4gICAgICB0aHJvdyBFcnJvcignc2VuZE1lc3NhZ2UgaXMgbm90IGRlZmluZWQnKTtcbiAgICB9XG5cbiAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XG4gICAgdmFyIG5hbWUgPSBhcmdzLnNoaWZ0KCk7XG5cbiAgICBpZiAoIU0yRS5wcm9wYWdhdGVOZXdMaXN0ZW5lciAmJiBuYW1lID09PSAnbmV3TGlzdGVuZXInKVxuICAgICAgcmV0dXJuO1xuXG4gICAgdmFyIG1zZyA9IGV2ZW50Mm1lc3NhZ2UobmFtZSwgYXJncyk7XG4gICAgdHJ5IHtcbiAgICAgIHRoaXMuc2VuZE1lc3NhZ2UobXNnKTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgaWYgKHRoaXMubGlzdGVuZXJzKHRoaXMuZXJyb3JuYW1lKS5sZW5ndGgpXG4gICAgICAgIEV2ZW50RW1pdHRlci5wcm90b3R5cGUudHJpZ2dlci5jYWxsKHRoaXMsIHRoaXMuZXJyb3JuYW1lLCBbZXJyb3JdKTtcbiAgICAgIGVsc2VcbiAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgfVxuICB9O1xuXG4gIG0yZS5vbk1lc3NhZ2UgPVxuICBmdW5jdGlvbiBvbk1lc3NhZ2UobXNnKSB7XG4gICAgdmFyIGV2dCA9IG1lc3NhZ2UyZXZlbnQobXNnKTtcbiAgICB2YXIgYXJncyA9IGV2dC5hcmdzO1xuICAgIGFyZ3MudW5zaGlmdChldnQubmFtZSk7XG4gICAgbG9jYWxFbWl0LmFwcGx5KG0yZSwgYXJncyk7XG4gIH07XG5cbiAgcmV0dXJuIG0yZTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBNMkU7XG5NMkUuZXZlbnQybWVzc2FnZSA9IGV2ZW50Mm1lc3NhZ2U7XG5NMkUubWVzc2FnZTJldmVudCA9IG1lc3NhZ2UyZXZlbnQ7XG4iLCJ2YXIgZmVlZGJhY2sgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjZmVlZGJhY2snKTtcblxuZnVuY3Rpb24gZ2l2ZUZlZWRiYWNrIChlbCkge1xuICBpZiAoZmVlZGJhY2suY2hpbGRyZW4ubGVuZ3RoID09PSAwKVxuICAgIGZlZWRiYWNrLmFwcGVuZENoaWxkKGVsKTtcbiAgZWxzZVxuICAgIGZlZWRiYWNrLmluc2VydEJlZm9yZShlbCwgZmVlZGJhY2suY2hpbGRyZW5bMF0pO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGdpdmVGZWVkYmFjazsiLCJmdW5jdGlvbiBzb21ldGhpbmdXZW50IChtc2csIGhvdykge1xuICB2YXIgZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgZWwuY2xhc3NMaXN0LmFkZCgnYWxlcnQnKTtcbiAgZWwuY2xhc3NMaXN0LmFkZChob3cpO1xuICBlbC5pbm5lckhUTUwgPSBtc2c7XG4gIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgIGVsLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoZWwpO1xuICB9LCAxMDAwMCk7XG4gIHJldHVybiBlbDtcbn1cblxuZnVuY3Rpb24gc29tZXRoaW5nV2VudFdlbGwgKG1zZykge1xuICByZXR1cm4gc29tZXRoaW5nV2VudChtc2csICdhbGVydC1zdWNjZXNzJyk7XG59XG5cbmZ1bmN0aW9uIHNvbWV0aGluZ1dlbnRCYWQgKG1zZykge1xuICByZXR1cm4gc29tZXRoaW5nV2VudChtc2csICdhbGVydC1lcnJvcicpO1xufVxuXG5leHBvcnRzLndlbGwgPSBzb21ldGhpbmdXZW50V2VsbDtcbmV4cG9ydHMuYmFkID0gc29tZXRoaW5nV2VudEJhZDsiLCIoZnVuY3Rpb24ocHJvY2Vzcyl7aWYgKCFwcm9jZXNzLkV2ZW50RW1pdHRlcikgcHJvY2Vzcy5FdmVudEVtaXR0ZXIgPSBmdW5jdGlvbiAoKSB7fTtcblxudmFyIEV2ZW50RW1pdHRlciA9IGV4cG9ydHMuRXZlbnRFbWl0dGVyID0gcHJvY2Vzcy5FdmVudEVtaXR0ZXI7XG52YXIgaXNBcnJheSA9IHR5cGVvZiBBcnJheS5pc0FycmF5ID09PSAnZnVuY3Rpb24nXG4gICAgPyBBcnJheS5pc0FycmF5XG4gICAgOiBmdW5jdGlvbiAoeHMpIHtcbiAgICAgICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh4cykgPT09ICdbb2JqZWN0IEFycmF5XSdcbiAgICB9XG47XG5mdW5jdGlvbiBpbmRleE9mICh4cywgeCkge1xuICAgIGlmICh4cy5pbmRleE9mKSByZXR1cm4geHMuaW5kZXhPZih4KTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHhzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmICh4ID09PSB4c1tpXSkgcmV0dXJuIGk7XG4gICAgfVxuICAgIHJldHVybiAtMTtcbn1cblxuLy8gQnkgZGVmYXVsdCBFdmVudEVtaXR0ZXJzIHdpbGwgcHJpbnQgYSB3YXJuaW5nIGlmIG1vcmUgdGhhblxuLy8gMTAgbGlzdGVuZXJzIGFyZSBhZGRlZCB0byBpdC4gVGhpcyBpcyBhIHVzZWZ1bCBkZWZhdWx0IHdoaWNoXG4vLyBoZWxwcyBmaW5kaW5nIG1lbW9yeSBsZWFrcy5cbi8vXG4vLyBPYnZpb3VzbHkgbm90IGFsbCBFbWl0dGVycyBzaG91bGQgYmUgbGltaXRlZCB0byAxMC4gVGhpcyBmdW5jdGlvbiBhbGxvd3Ncbi8vIHRoYXQgdG8gYmUgaW5jcmVhc2VkLiBTZXQgdG8gemVybyBmb3IgdW5saW1pdGVkLlxudmFyIGRlZmF1bHRNYXhMaXN0ZW5lcnMgPSAxMDtcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuc2V0TWF4TGlzdGVuZXJzID0gZnVuY3Rpb24obikge1xuICBpZiAoIXRoaXMuX2V2ZW50cykgdGhpcy5fZXZlbnRzID0ge307XG4gIHRoaXMuX2V2ZW50cy5tYXhMaXN0ZW5lcnMgPSBuO1xufTtcblxuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmVtaXQgPSBmdW5jdGlvbih0eXBlKSB7XG4gIC8vIElmIHRoZXJlIGlzIG5vICdlcnJvcicgZXZlbnQgbGlzdGVuZXIgdGhlbiB0aHJvdy5cbiAgaWYgKHR5cGUgPT09ICdlcnJvcicpIHtcbiAgICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzLmVycm9yIHx8XG4gICAgICAgIChpc0FycmF5KHRoaXMuX2V2ZW50cy5lcnJvcikgJiYgIXRoaXMuX2V2ZW50cy5lcnJvci5sZW5ndGgpKVxuICAgIHtcbiAgICAgIGlmIChhcmd1bWVudHNbMV0gaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgICB0aHJvdyBhcmd1bWVudHNbMV07IC8vIFVuaGFuZGxlZCAnZXJyb3InIGV2ZW50XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJVbmNhdWdodCwgdW5zcGVjaWZpZWQgJ2Vycm9yJyBldmVudC5cIik7XG4gICAgICB9XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpIHJldHVybiBmYWxzZTtcbiAgdmFyIGhhbmRsZXIgPSB0aGlzLl9ldmVudHNbdHlwZV07XG4gIGlmICghaGFuZGxlcikgcmV0dXJuIGZhbHNlO1xuXG4gIGlmICh0eXBlb2YgaGFuZGxlciA9PSAnZnVuY3Rpb24nKSB7XG4gICAgc3dpdGNoIChhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICAvLyBmYXN0IGNhc2VzXG4gICAgICBjYXNlIDE6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDI6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0pO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMzpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSwgYXJndW1lbnRzWzJdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICAvLyBzbG93ZXJcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICAgICAgaGFuZGxlci5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG5cbiAgfSBlbHNlIGlmIChpc0FycmF5KGhhbmRsZXIpKSB7XG4gICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuXG4gICAgdmFyIGxpc3RlbmVycyA9IGhhbmRsZXIuc2xpY2UoKTtcbiAgICBmb3IgKHZhciBpID0gMCwgbCA9IGxpc3RlbmVycy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgIGxpc3RlbmVyc1tpXS5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG5cbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn07XG5cbi8vIEV2ZW50RW1pdHRlciBpcyBkZWZpbmVkIGluIHNyYy9ub2RlX2V2ZW50cy5jY1xuLy8gRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5lbWl0KCkgaXMgYWxzbyBkZWZpbmVkIHRoZXJlLlxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIGlmICgnZnVuY3Rpb24nICE9PSB0eXBlb2YgbGlzdGVuZXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2FkZExpc3RlbmVyIG9ubHkgdGFrZXMgaW5zdGFuY2VzIG9mIEZ1bmN0aW9uJyk7XG4gIH1cblxuICBpZiAoIXRoaXMuX2V2ZW50cykgdGhpcy5fZXZlbnRzID0ge307XG5cbiAgLy8gVG8gYXZvaWQgcmVjdXJzaW9uIGluIHRoZSBjYXNlIHRoYXQgdHlwZSA9PSBcIm5ld0xpc3RlbmVyc1wiISBCZWZvcmVcbiAgLy8gYWRkaW5nIGl0IHRvIHRoZSBsaXN0ZW5lcnMsIGZpcnN0IGVtaXQgXCJuZXdMaXN0ZW5lcnNcIi5cbiAgdGhpcy5lbWl0KCduZXdMaXN0ZW5lcicsIHR5cGUsIGxpc3RlbmVyKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50c1t0eXBlXSkge1xuICAgIC8vIE9wdGltaXplIHRoZSBjYXNlIG9mIG9uZSBsaXN0ZW5lci4gRG9uJ3QgbmVlZCB0aGUgZXh0cmEgYXJyYXkgb2JqZWN0LlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IGxpc3RlbmVyO1xuICB9IGVsc2UgaWYgKGlzQXJyYXkodGhpcy5fZXZlbnRzW3R5cGVdKSkge1xuXG4gICAgLy8gQ2hlY2sgZm9yIGxpc3RlbmVyIGxlYWtcbiAgICBpZiAoIXRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQpIHtcbiAgICAgIHZhciBtO1xuICAgICAgaWYgKHRoaXMuX2V2ZW50cy5tYXhMaXN0ZW5lcnMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBtID0gdGhpcy5fZXZlbnRzLm1heExpc3RlbmVycztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG0gPSBkZWZhdWx0TWF4TGlzdGVuZXJzO1xuICAgICAgfVxuXG4gICAgICBpZiAobSAmJiBtID4gMCAmJiB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoID4gbSkge1xuICAgICAgICB0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkID0gdHJ1ZTtcbiAgICAgICAgY29uc29sZS5lcnJvcignKG5vZGUpIHdhcm5pbmc6IHBvc3NpYmxlIEV2ZW50RW1pdHRlciBtZW1vcnkgJyArXG4gICAgICAgICAgICAgICAgICAgICAgJ2xlYWsgZGV0ZWN0ZWQuICVkIGxpc3RlbmVycyBhZGRlZC4gJyArXG4gICAgICAgICAgICAgICAgICAgICAgJ1VzZSBlbWl0dGVyLnNldE1heExpc3RlbmVycygpIHRvIGluY3JlYXNlIGxpbWl0LicsXG4gICAgICAgICAgICAgICAgICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCk7XG4gICAgICAgIGNvbnNvbGUudHJhY2UoKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBJZiB3ZSd2ZSBhbHJlYWR5IGdvdCBhbiBhcnJheSwganVzdCBhcHBlbmQuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdLnB1c2gobGlzdGVuZXIpO1xuICB9IGVsc2Uge1xuICAgIC8vIEFkZGluZyB0aGUgc2Vjb25kIGVsZW1lbnQsIG5lZWQgdG8gY2hhbmdlIHRvIGFycmF5LlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IFt0aGlzLl9ldmVudHNbdHlwZV0sIGxpc3RlbmVyXTtcbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbiA9IEV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub25jZSA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgc2VsZi5vbih0eXBlLCBmdW5jdGlvbiBnKCkge1xuICAgIHNlbGYucmVtb3ZlTGlzdGVuZXIodHlwZSwgZyk7XG4gICAgbGlzdGVuZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgfSk7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgaWYgKCdmdW5jdGlvbicgIT09IHR5cGVvZiBsaXN0ZW5lcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncmVtb3ZlTGlzdGVuZXIgb25seSB0YWtlcyBpbnN0YW5jZXMgb2YgRnVuY3Rpb24nKTtcbiAgfVxuXG4gIC8vIGRvZXMgbm90IHVzZSBsaXN0ZW5lcnMoKSwgc28gbm8gc2lkZSBlZmZlY3Qgb2YgY3JlYXRpbmcgX2V2ZW50c1t0eXBlXVxuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW3R5cGVdKSByZXR1cm4gdGhpcztcblxuICB2YXIgbGlzdCA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAoaXNBcnJheShsaXN0KSkge1xuICAgIHZhciBpID0gaW5kZXhPZihsaXN0LCBsaXN0ZW5lcik7XG4gICAgaWYgKGkgPCAwKSByZXR1cm4gdGhpcztcbiAgICBsaXN0LnNwbGljZShpLCAxKTtcbiAgICBpZiAobGlzdC5sZW5ndGggPT0gMClcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gIH0gZWxzZSBpZiAodGhpcy5fZXZlbnRzW3R5cGVdID09PSBsaXN0ZW5lcikge1xuICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlQWxsTGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLy8gZG9lcyBub3QgdXNlIGxpc3RlbmVycygpLCBzbyBubyBzaWRlIGVmZmVjdCBvZiBjcmVhdGluZyBfZXZlbnRzW3R5cGVdXG4gIGlmICh0eXBlICYmIHRoaXMuX2V2ZW50cyAmJiB0aGlzLl9ldmVudHNbdHlwZV0pIHRoaXMuX2V2ZW50c1t0eXBlXSA9IG51bGw7XG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gIGlmICghdGhpcy5fZXZlbnRzKSB0aGlzLl9ldmVudHMgPSB7fTtcbiAgaWYgKCF0aGlzLl9ldmVudHNbdHlwZV0pIHRoaXMuX2V2ZW50c1t0eXBlXSA9IFtdO1xuICBpZiAoIWlzQXJyYXkodGhpcy5fZXZlbnRzW3R5cGVdKSkge1xuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IFt0aGlzLl9ldmVudHNbdHlwZV1dO1xuICB9XG4gIHJldHVybiB0aGlzLl9ldmVudHNbdHlwZV07XG59O1xuXG59KShyZXF1aXJlKFwiX19icm93c2VyaWZ5X3Byb2Nlc3NcIikpIiwiZnVuY3Rpb24gcHJvcGVyUHJvZ3JhbUVycm9yKGVycikge1xuICB2YXIgbXNnID0gJ0FuIGVycm9yIG9jY3VycmVkIGxvYWRpbmcgeW91ciAnK1xuICAgICAgICAgICAgJzxhIGhyZWY9XCInK2Vyci5maWxlbmFtZSsnXCIgdGFyZ2V0PVwiX25ld1wiPnByb2dyYW08L2E+ICcrXG4gICAgICAgICAgICAnb24gbGluZSA8Yj4nK2Vyci5saW5lbm8rJzwvYj46PGJyLz4nK1xuICAgICAgICAgICAgJzxwcmU+PGNvZGU+JytlcnIubWVzc2FnZSsnPC9jb2RlPjwvcHJlPic7XG5cbiAgcmV0dXJuIG1zZztcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBwcm9wZXJQcm9ncmFtRXJyb3I7XG5cbi8qXG5cbiAgICBTYW1wbGUgZXJyb3Jcblxue1xuICBcImxpbmVub1wiOjY3LFxuICBcImZpbGVuYW1lXCI6XCJibG9iOmh0dHAlM0EvL2xvY2FsaG9zdCUzQTgwODEvMTQzODQzYWItYjNjOS00YzI4LWFlZTktZjdiMzc1Y2RmMDNjXCIsXG4gIFwibWVzc2FnZVwiOlwiVW5jYXVnaHQgU3ludGF4RXJyb3I6IFVuZXhwZWN0ZWQgaWRlbnRpZmllclwiLFxuICBcImNhbmNlbEJ1YmJsZVwiOmZhbHNlLFxuICBcInJldHVyblZhbHVlXCI6dHJ1ZSxcbiAgXCJzcmNFbGVtZW50XCI6e30sXG4gIFwiZGVmYXVsdFByZXZlbnRlZFwiOmZhbHNlLFxuICBcInRpbWVTdGFtcFwiOjEzNzU0NTQ3ODEyMTQsXG4gIFwiY2FuY2VsYWJsZVwiOnRydWUsXG4gIFwiYnViYmxlc1wiOmZhbHNlLFxuICBcImV2ZW50UGhhc2VcIjoyLFxuICBcImN1cnJlbnRUYXJnZXRcIjp7fSxcbiAgXCJ0YXJnZXRcIjp7fSxcbiAgXCJ0eXBlXCI6XCJlcnJvclwiXG59XG4qL1xuIl19
;