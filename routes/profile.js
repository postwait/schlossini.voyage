var express = require('express');
var user = require('../lib/user');
var loggedin = require('../lib/login').require_login;
var router = express.Router();

router.get('/', loggedin(function(req, res) {
  user.getUser({ userid: req.session.userid },
    function(err, users) {
      res.render('profile',
                 { title: 'Profile',
                   error: err,
                   user: users[0]
                 });
  });
}));

module.exports = router;
