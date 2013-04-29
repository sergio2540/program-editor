var M2E = require('m2e');
var somethingWent = require('./ui/something-went');
var somethingWentWell = somethingWent.well;
var somethingWentBad = somethingWent.bad;

var feedback = document.querySelector('#feedback');
var lastResult = document.querySelector('#lastResult');
var ww = new Worker('./worker.js');
var channel = new M2E();
channel.sendMessage = ww.postMessage.bind(ww);
ww.onmessage = function(m) {
  channel.onmessage(m.data);
};

channel.on('result', function (result, time) {
  var msg = 'result computed in <strong>'+time+'ms</strong>';
  var well = somethingWentWell(msg);
  feedback.appendChild(well);
  lastResult.innerHTML = JSON.stringify(result);
});

channel.on('ready', function (programTime) {
  var msg = 'programmed worker in: <strong>'+programTime+'ms</strong>';
  var well = somethingWentWell(msg);
  feedback.appendChild(well);
});

channel.on('fail', function (err) {
  var bad = somethingWentBad('error: '+JSON.stringify(err));
  feedback.appendChild(bad);
});

var testEl = document.querySelector('#test');
testEl.onclick = function () {
  try {
    var dataUnit = JSON.parse(document.querySelector('#dataUnit').value);
    channel.emit('data', dataUnit);
  } catch (err) {
    var bad = somethingWentBad('invalid JSON in data unit <br/>'+err);
    feedback.appendChild(bad);
  }
};