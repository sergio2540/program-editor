var M2E = require('m2e');
var normalizeError = require('./normalize-error');


var channel = new M2E();
channel.sendMessage = self.postMessage.bind(self);
self.onmessage = function(event) {
  channel.onmessage(event.data);
};

channel.on('data', onData);

var startTs = Date.now();
var program = (function getProgram(
    self,
    arguments,
    eval,
    alert,
    prompt,
    $,
    document,
    window,
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
    parent,
    profile,
    q,
    top,
    Worker,
    program,
    getProgram,
    startTs,
    endTs,
    programTime
    ) {

  var Run = require('./program'); // maybe some npm link magic ?
  var res = { fn: Run };
  return res;
}).call({});
var programTime = Date.now() - startTs;
channel.emit('ready', programTime);


function onData (data) {
  var start = Date.now();
  var args = [data];

  function cb(result) {
    var time = Date.now() - start;
    channel.emit('result', result, time);
  }

  var isAsync = program.fn.length === 2;
  if (isAsync)
    args.push(cb);

  var result;
  try {
    result = program.fn.apply(null, args);
  } catch (error) {
    channel.emit('fail', normalizeError(error));
  }

  if (!isAsync)
    cb(result);
}