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