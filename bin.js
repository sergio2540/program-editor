#!/usr/bin/env node
var optimist = require('optimist');
var argv = optimist
  .usage('Usage: ploy')
  .describe('p', 'Path to your program')
  .string('p')
  .alias('p', 'program')
  .argv;

var createServer = require('./server');

var server = createServer(argv.p);
server.listen(8081, function () {
  console.log('Point your browser to http://localhost:8081');
});
