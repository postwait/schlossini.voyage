'use strict';

var fs = require('fs');

var filename = null;
var _cfg = {};

var config = function(f) {
  if(filename != null && f != null && filename != f)
    throw(new Error("Can't change config file: " + filename + " -> " + f));
  if(filename == null && f == null)
    throw(new Error("Config filename not set"));
  if(f == null) return;
  filename = f;
  this.load();
  fs.watchFile(filename, { persistent: true },
               (function(self) {
                 return function(curr, prev) { self.load(); }
               })(this));
}

config.prototype.load = function() {
  try {
    var newconfig = JSON.parse(fs.readFileSync(filename));
    _cfg = newconfig;
    console.log("reloaded config: " + filename);
  }
  catch(e) { console.log(e); }
}
config.prototype.config = function() { return _cfg; }

module.exports = config;
