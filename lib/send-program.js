var fs = require('fs');

/*
  Everytime you save something with vim, 3 rename events and 1 change events happen,
  everytime you save something with Sublime Text 2, 2 change events happen,
  so we will only send a program if the last time we sent one was 100ms ago.
*/
var lastTimeSent = 0;

function sendProgram (ws, location, callback) {
  if (lastTimeSent < Date.now() - 100) {
    lastTimeSent = Date.now();
    fs.readFile(location, function (err, program) {
      if (err) {
        callback(err);
        return;
      }

      ws.send(program, callback);

    });
  }
}

module.exports = sendProgram;