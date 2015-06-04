'use strict';

var t = function(scope, msg) {
  if(msg === undefined) {
    msg = scope;
    scope = global;
  }
  if(msg == null) return null;

  if(scope === 'confirm') {
    if(/unique constraint.*email/.test(msg)) {
      return "We won't send more than one email every two hours.";
    }
    else if(/bad/.test(msg)) {
      return "Your confirmation code doesn't appear to be valid.";
    }
  }

  if(/unique constraint.*email/.test(msg)) {
    return "Looks like that email address is traveling with us already."
  }
  return "Something sure went wrong... We're as puzzled as you are."
}

module.exports = {
  translate: t
}