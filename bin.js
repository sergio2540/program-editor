#!/usr/bin/env node
var optimist = require('optimist');
var argv = optimist
  .usage('Usage: program-editor -p program.js')
  .describe('p', 'Path to your program')
  .string('p')
  .alias('p', 'program')
  .demand('p')
  .argv;

var createServer = require('./server');

var path = require('path');
var programPath = path.resolve(argv.p);

var server = createServer(programPath);
server.listen(8081, function () {
  console.log('Point your browser to http://localhost:8081');
});
