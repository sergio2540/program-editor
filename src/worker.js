var M2E = require('m2e');

var channel = new M2E(self.postMessage.bind(self));

function log() {
  var args = Array.prototype.slice.call(arguments);
  channel.emit('log', args);
}

//log('helloooo');

var startTs = Date.now();
var global = {};
var program = (function getProgram(
    self,
    window,
    global,
    //log,
    arguments,
    eval,
    alert,
    prompt,
    require,
    $,
    document,
    navigator,
    XMLHttpRequest,
    Function,
    location,
    console,
    localStorage,
    sessionStorage,
    applicationCache,
    chrome,
    close,
    clientInformation,
    confirm,
    frames,
    history,
    print,
    postMessage,
    onmessge,
    parent,
    profile,
    q,
    top,
    Worker,

    // locals
    startTs,
    program,
    getProgram,
    endTs,
    programTime
    ) {

  var _require = PROGRAM();
  
  if (_require.name === 'Run')
    return _require;
  else // using browserify ?
    return _require(1);

}).call(global, global, global);

(function () {
  self.addEventListener('message', function(e) { channel.onMessage(e.data); });

  channel.on('data', onData);
  channel.emit('ready', Date.now() - startTs);

  function onData(data) {
    var start = Date.now();

    var args = [data];

    function cb(result) {
      var time = Date.now() - start;
      channel.emit('result', result, time);
    }

    if (program.async)
      args.push(cb);

    var result;
    try {
      result = program.apply(null, args);
    } catch (e) {
      channel.emit('fail', { lineno: e.lineno, message: e.message });
      return;
    }

    if (!program.isAsync)
      cb(result);
  }

})();
