var feedback = document.querySelector('#feedback');

function giveFeedback (el) {
  if (feedback.children.length === 0)
    feedback.appendChild(el);
  else
    feedback.insertBefore(el, feedback.children[0]);
}

module.exports = giveFeedback;