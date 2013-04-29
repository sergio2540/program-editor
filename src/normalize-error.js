function normalizeError(error) {
  var obj = {};
  for (var p in error)
    obj[p] = error[p];

  var props = [
    'message',
    'name',
    'stack',
    'fileName',
    'lineNumber'
  ];

  for (var i=0; i<props.length; ++i) {
    obj[props[i]] = error[props[i]];
  }

  return obj;
}

module.exports = normalizeError;