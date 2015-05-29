'use strict';

var express = require('express');
var User = require('../lib/user');
var loggedin = require('../lib/login').require_login;
var router = express.Router();

router.get('/profile', loggedin(function(req, res) {
  User.getUser({ userid: req.session.userid },
    function(err, user) {
      User.getAssociations(req.session.userid, function(err, assocs) {
        res.writeHead('200', { 'Content-Type': 'application/json' })
        delete user['password'];
        assocs.forEach(function(a) {
          ['userid','token','secret'].forEach(function(key) { delete a[key]; })
          a.image_url = a.image_url || '/images/profiles/' + a.service + '.png';
        });
        user.thirdparty = assocs;
        user.notices = user.notices || [];

        res.end(JSON.stringify(user));
      });
  });
}));

router.post('/profile/confirm', loggedin(function(req,res) {
  User.sendConfirmation(req.session.userid, null, function(err,body) {
    var obj = {};
    if(err) obj.error = err.toString();
    obj.status = obj.error ? "error" : "success";
    obj.data = body;
    res.end(JSON.stringify(obj));
  });
}));

router.delete('/profile/link/:service/:remoteid', loggedin(function(req,res) {
   User.deleteAssociation(
      req.session.userid, req.params.service, req.params.remoteid,
      function(e, success) {
        var obj = {}
        if(!success) obj.error = "No such link";
        if(e) obj.error = e;
        obj.status = obj.error ? "error" : "success";
        res.end(JSON.stringify(obj));
      }
    )
}));

module.exports = router;
