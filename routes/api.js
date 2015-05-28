var express = require('express');
var user = require('../lib/user');
var loggedin = require('../lib/login').require_login;
var router = express.Router();

router.get('/profile', loggedin(function(req, res) {
  user.getUser({ userid: req.session.userid },
    function(err, users) {
      user.getAssociations(req.session.userid, function(err, assocs) {
        res.writeHead('200', { 'Content-Type': 'application/json' })
        delete users[0]['password'];
        assocs.forEach(function(a) {
          ['userid','token','secret'].forEach(function(key) { delete a[key]; })
        });
        users[0].thirdparty = assocs;
        res.end(JSON.stringify(users[0]));
      });
  });
}));

module.exports = router;
