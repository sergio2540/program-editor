var createWorker = require('./create-worker');
var dealWithWorkerAndUpdateUI = require('./deal-with-worker-and-update-UI.js');
var host = window.location.host;
var ws = new WebSocket('ws://'+host);

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