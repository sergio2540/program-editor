var M2E = require('m2e');
var fs = require('fs');
var path = require('path');

var workerLocation = path.normalize(__dirname + '../live/worker.js');
var workerFile = fs.readFileSync('/home/joaojeronimo/src/crowdprocess/program-editor/live/worker.js');

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
