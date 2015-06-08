'use strict';

var t = function(scope, msg) {
  if(msg === undefined) {
    msg = scope;
    scope = global;
  }
  if(msg == null) return null;

  if(/not .*(?:owner|guide)/i.test(msg))
    return "This action is restricted to guides."

  if(scope === 'confirm') {
    if(/unique constraint.*email/.test(msg)) {
      return "We won't send more than one email every two hours.";
    }
    else if(/bad/.test(msg)) {
      return "Your confirmation code doesn't appear to be valid.";
    }
  }

  if(/unique constraint.*email/.test(msg)) {
    return "Looks like that email address is traveling with us already.";
  }
  if(/[Nn]o such user/.test(msg)) {
    return "We can't find that traveler... you should invite them!";
  }
  if(/^\[BV\]\s+/.test(msg)) return msg.substring(4);
  return "Something sure went wrong... We're as puzzled as you are.";
}

module.exports = {
  translate: t
}
