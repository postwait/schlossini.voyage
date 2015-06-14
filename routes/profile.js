'use strict';

var express = require('express');
var user = require('../lib/user');
var loggedin = require('../lib/login').require_login;
var router = express.Router();

router.get('/', loggedin(function(req, res) {
  res.render('profile',
             { title: 'Profile',
               csrfToken: req.csrfToken(),
               userid: req.session.userid,
               email_as_json: JSON.stringify(req.session.email || ""),
             });
}));

module.exports = router;
