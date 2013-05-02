var http = require('http');
var fs = require('fs');
var path = require('path');
var express = require('express');
var ws = require('ws');

var program = process.env.program || './program/build/program.min.js';
var PROGRAM = path.normalize(program);

var app = express();

app.use(express.static('live', { maxAge: 0 }));


var WebSocketServer = ws.Server;


var server = http.createServer(app);
var wss = new WebSocketServer({server: server});
var sendProgram = require('./lib/send-program');

wss.on('connection', function(ws) {

  sendProgram(ws, PROGRAM, sentProgram);

  fs.watch(PROGRAM, function (event, filename) {
    if (event === 'change')
      sendProgram(ws, PROGRAM, sentProgram);
  });

  ws.on('close', function() {
    fs.unwatchFile(PROGRAM);
  });
});

function sentProgram (err) {
  if (err)
    throw new Error(err);
  console.log('sent new program');
}

server.listen(8081);