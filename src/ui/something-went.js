function somethingWent (msg, how) {
  var el = document.createElement('div');
  el.classList.add('alert');
  el.classList.add(how);
  el.innerHTML = msg;
  setTimeout(function () {
    el.style.display = 'none'; // hacky shit
  }, 10000);
  return el;
}

function somethingWentWell (msg) {
  return somethingWent(msg, 'alert-success');
}

function somethingWentBad (msg) {
  return somethingWent(msg, 'alert-error');
}

exports.well = somethingWentWell;
exports.bad = somethingWentBad;