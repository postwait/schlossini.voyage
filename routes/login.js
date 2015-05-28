var url = require('url');
var express = require('express');
var evalid = require('email-validator');
var login = require('../lib/login');
var user = require('../lib/user');

var router = express.Router();

router.get('/', function(req, res) {
  var info = url.parse(req.url, true);
  var params = { title: 'Login' };
  if(req.session.signup) {
    req.session.signup = false;
    req.session.save();
  }
  params.to = info.query.to ? encodeURIComponent(info.query.to) : null;

  if(req.session.userid) {
    return res.redirect(info.query.to || '/');
  }
  params.error = info.query.error ? info.query.error : null;
  res.render('login', params);
});

router.post('/', function(req, res) {
  var crit = {};
  var error;
  if(req.body.hasOwnProperty('oauth[accesstoken]')) {
    if(req.body['oauth[function]'] === 'signup') {
      login.signup_backchannel(req, res,
                   req.body['oauth[service]'],
                   req.body['oauth[accesstoken]']);
      return;
    }
    else {
      login.login_backchannel(req, res,
                   req.body['oauth[service]'],
                   req.body['oauth[accesstoken]']);
      return;
    }
  }
  if(req.query.method === 'signup') {
    if(req.body.signup_password_random == 1)
      req.body.signup_password = req.body.signup_password2 = '';
    else if(req.body.signup_password == null || req.body.signup_password.length < 8)
      error = "Password is too short";
    else if(req.body.signup_password !== req.body.signup_password2)
      error = "Password does not match";

    if(!evalid.validate(req.body.signup_email))
      error = "Invalid email address";

    if(error) return login.response(req,res,{error:error});
    login.create_user(req, res,
                { email: req.body.signup_email,
                  password: req.body.signup_password });
    return;
  }

  if(req.body.hasOwnProperty('oauth[accesstoken]')) {
    login.getProfile(req, res, null, req.body['oauth[service]'], req.body['oauth[accesstoken]'],
    function(err, profile) {
      login.perform_login(req, res, {
        oauth: { service: req.body['oauth[service]'], remoteid: profile.remoteid } }
      );
    });
    return;
  }

  crit.email = req.body.login_email;
  crit.password = req.body.login_password;
  login.perform_login(req, res, crit);
});

module.exports = router;
