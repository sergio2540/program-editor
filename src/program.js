/*
    You are expected to delete all this and
    make some npm link magic, and put one line
    here like "module.exports = require('myOwnProgram')"
*/

var assert = require('assert');

function Run (dataUnit) {
  assert.ok(dataUnit === 1);
  return dataUnit;
}

module.exports = Run;