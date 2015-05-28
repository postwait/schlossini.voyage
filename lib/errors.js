
var t = function(scope, msg) {
  if(msg === undefined) {
    msg = scope;
    scope = global;
  }

  if(/unique constraint.*email/.test(msg)) {
    return "Looks like that email address is traveling with us already."
  }
  return "Something sure went wrong... We're as puzzled as you are."
}

module.exports = {
  translate: t
}
