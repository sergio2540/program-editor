var http = require('http');
var fs = require('fs');
var path = require('path');
var express = require('express');
var ws = require('ws');

var programPath; // will be defined at usage time

var app = express();
app.use(express.static(__dirname + '/live', { maxAge: 0 }));
var WebSocketServer = ws.Server;

var server = http.createServer(app);
var wss = new WebSocketServer({server: server});
var sendProgram = require('./lib/send-program');

function createServer(programPath) {
  wss.on('connection', function(ws) {
    sendProgram(ws, programPath, sentProgram);

    fs.watch(programPath, function (ev, filename) {
      if (ev !== 'change')
        return; // don't care
      sendProgram(ws, programPath, sentProgram);
    });

    ws.on('close', function() {
      console.log('unwatching!');
      fs.unwatchFile(programPath);
    });
  });

  return server;
}

function sentProgram (err) {
  if (err)
    throw new Error(err);
  console.log('sent new program');
}

module.exports = createServer;
