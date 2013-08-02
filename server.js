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

    fs.watchFile(programPath, {
      persistent: true,
      interval: 200
    }, function (prev, cur) {
      sendProgram(ws, programPath, sentProgram);
    });

    ws.on('close', function() {
      fs.unwatchFile(programPath);
    });
  });

  return server;
}

function sentProgram (err) {
  if (err)
    throw new Error(err);
}

module.exports = createServer;
