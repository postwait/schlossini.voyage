'use strict';

var passport = require('passport');
var User = require('./user');
var url = require('url');
var Config = require('./config');
var config = (new Config()).config();
var SmugMugStrategy = require('passport-smugmug').Strategy;
var GoogleStrategy = require('passport-google-oauth2').Strategy;
var InstagramStrategy = require('passport-instagram').Strategy;
var prot = config.www.insecure ? 'http' : 'https';
var errors = require('./errors');

var reverse_use = function(app) {
  passport.serializeUser(function(user, done) { done(null, user); });
  passport.deserializeUser(function(obj, done) { done(null, obj); });
  passport.use(new SmugMugStrategy({
      consumerKey: config.smugmug.api.key,
      consumerSecret: config.smugmug.api.secret,
      requestTokenURL: 'http://api.smugmug.com/services/oauth/1.0a/getRequestToken',
      accessTokenURL: 'http://api.smugmug.com/services/oauth/1.0a/getAccessToken',
      userAuthorizationURL: 'http://api.smugmug.com/services/oauth/1.0a/authorize',
      callbackURL: '/auth/smugmug/callback/login'
    },
    function(token, tokenSecret, profile, done) {
      process.nextTick(function () {
        return done(null, profile);
      });
    }
  ));
  passport.use(new GoogleStrategy({
      clientID:     config.google.api.id,
      clientSecret: config.google.api.secret,
      callbackURL:  prot + '://' + config.www.baseurl + '/auth/google/callback',
      passReqToCallback: true
    },
    function(request, accessToken, refreshToken, profile, done) {
      return done({ id: profile.id, email: profile.email, displayName: profile.displayName,
                    access_token: accessToken, refresh_token: refreshToken, url: profile._json.url,
                    image_url: profile._json.image ? profile._json.image.url : null });
    }
  ));
  passport.use(new InstagramStrategy({
      clientID: config.instagram.api.id,
      clientSecret: config.instagram.api.secret,
      callbackURL: prot + '://' + config.www.baseurl + '/auth/instagram/callback'
    },
    function(accessToken, refreshToken, profile, done) {
      return done({ id: profile.id, displayName: profile.displayName,
                    access_token: accessToken, refresh_token: refreshToken,
                    url: 'https://instagram.com/' + profile.url,
                    image_url: profile._json.data.profile_picture});
    }
));

  app.use(passport.initialize());
  app.use(passport.session());

  app.use('/login', require('../routes/login'));

  app.get('/auth/smugmug', function(req, res) {
    var method = 'login';
    if(!req.session.userid && req.query.method === 'signup')
      method = 'signup';
    if(req.session.userid)
      method = 'associate';
    (passport.authenticate('smugmug',
       { callbackURL: '/auth/smugmug/callback/' + method }))(req,res);
  });

  app.get('/auth/smugmug/callback/:method', function(req, res, next) {
    passport.authenticate('smugmug', function(err, user_info, info) {
      var method = req.params.method;
      if(method === 'signup') err = "Can't signup via SmugMug";
      if (err) { return next(err); }
      if (!user_info) { return res.redirect('/login'); }
      var oobj = { service: 'smugmug',
                   display_name: user_info.displayName,
                   url: user_info._json.Auth.User.URL,
                   token: user_info._json.Auth.Token.id,
                   secret: user_info._json.Auth.Token.Secret,
                   remoteid: user_info.id };
      if(method === 'login') {
        perform_login(req, res, { oauth: oobj });
      }
      else if(method === 'associate') {
        return associate_user(req, res, { userid: req.session.userid,
                                          oauth: oobj });
      }
      else return res.redirect('/profile');
    })(req, res, next);
  });

  app.get('/auth/google', function(req, res) {
    var method = 'login';
    if(!req.session.userid && req.query.method === 'signup') {
      req.session.signup = true;
      req.session.save();
    }
    (passport.authenticate('google',
       { scope: [ 'https://www.googleapis.com/auth/plus.login',
                  'https://www.googleapis.com/auth/plus.profile.emails.read' ] }))(req,res);
  });

  app.get('/auth/google/callback', function(req, res, next) {
    passport.authenticate('google', function(info) {
      var method = req.session.userid ? 'associate' : 'login';
      if(req.session.signup && !req.session.userid) method = 'signup';
      if (!info) { return res.redirect('/login'); }
      var oobj = { service: 'google',
                   display_name: info.displayName,
                   url: info.url,
                   image_url: info.image_url,
                   token: info.access_token,
                   secret: info.refresh_token,
                   remoteid: info.id };
      if(method === 'signup') {
        create_user(req, res, { email: info.email, password: '',
                                oauth: oobj });
      }
      else if(method === 'login') {
        perform_login(req, res, { oauth: oobj });
      }
      else if(method === 'associate') {
        return associate_user(req, res, { userid: req.session.userid,
                                          oauth: oobj });
      }
      else return res.redirect('/profile');
    })(req, res, next);
  });

  app.get('/auth/instagram', function(req, res) {
    var method = 'login';
    if(!req.session.userid && req.query.method === 'signup') {
      req.session.signup = true;
      req.session.save();
    }
    (passport.authenticate('instagram',
       { scope: [ 'basic' ], session: false }))(req,res);
  });

  app.get('/auth/instagram/callback', function(req, res, next) {
    passport.authenticate('instagram', function(info) {
      var method = req.session.userid ? 'associate' : 'login';
      if(req.session.signup && !req.session.userid) method = 'signup';
      if (!info) { return res.redirect('/login'); }
      var oobj = { service: 'instagram',
                   display_name: info.displayName,
                   url: info.url,
                   image_url: info.image_url,
                   token: info.access_token,
                   secret: info.refresh_token,
                   remoteid: info.id };
      if(method === 'signup') { throw new Error("Cannot signup with Instagram") }
      else if(method === 'login') {
        perform_login(req, res, { oauth: oobj });
      }
      else if(method === 'associate') {
        return associate_user(req, res, { userid: req.session.userid,
                                          oauth: oobj });
      }
      else return res.redirect('/profile');
    })(req, res, next);
  });

  app.get('/logout', function(req, res){
    req.logout();
    req.session.userid = null;
    req.session.email = null;
    req.session.save();
    res.redirect('/login');
  });
}
/* These are for back channel integrations */
var integrations = {
  facebook: require('./integration/facebook'),
};
var getProfile = function(req, res, next, service, token, cb) {
  try {
    integrations[service].getProfile(req, res, next, token, cb);
  }
  catch(e) { cb(e, null); }
}

var login_response = function(req, res, data) {
  if(data.error) {
    data._error = data.error.toString();
    data.error = errors.translate('login', data._error);
    console.log(data);
  }
  if(req.accepts('text/html') && req.query['type'] !== 'ajax' &&
      req.body['oauth[service]'] !== 'facebook') {
    if(data.error) return res.redirect('/login?error=' + encodeURIComponent(data.error));
    return res.redirect('/login?to=' + encodeURIComponent(req.location || '/profile'));
  }

  var hdr = { 'Content-Type': 'application/json' };
  if(data.location) hdr['Location'] = data.location;
  res.writeHead((!req.body.noredirect && data.location) ? 302 : 200, hdr);
  data.status = data.error ? 'error' : 'success';
  res.end(JSON.stringify(data));
  return;
}
var require_login = function(f) {
  return function(req, res, next) {
    if(!req.session.userid)
      return res.redirect('/login?to=' + encodeURIComponent(req.url));
    return f(req, res, next);
  }
}

function perform_login(req, res, crit) {
  var pass = crit.hasOwnProperty('password') ? crit.password : null;
  User.getUser(crit, pass, function(err, user) {
    if(err) err = 'There was a database error, please try again soon!';
    else if(user == null) err = 'No such user';
    if(err) return login_response(req,res,{error: err});
    req.session.userid = user.userid;
    req.session.email = user.email;
    req.session.signup = false;
    req.session.save();

    /* update oauth? */
    crit.userid = user.userid;
    if(crit.oauth && crit.oauth.token) associate_user(req, res, crit);
    else if(crit.oauth && crit.oauth.service === 'facebook')
      login_response(req,req,{error:err})
    else login_response(req,res,{location: req.body.to || '/profile'});
  });
}

function associate_user(req, res, obj) {
  if(!req.session.userid) {
    return login_response(req, res, {error: 'Cannot associate unless logged in'});
  }
  User.associateUser(obj, function(err, users) {
    if(err) {
      console.log(err);
      return login_response(req, res, {error: err});
    }
    login_response(req, res, {location: req.body.to || '/profile'});
  });
}

function create_user(req, res, obj) {
  User.createUser(obj, function(err, user) {
    if(err) return login_response(req,res,{error:err});
    req.session.userid = user.userid;
    req.session.save();
    login_response(req,res,{location:req.body.to || '/profile'});
  });
}

function associate_backchannel(req, res, service, token) {
  getProfile(req, res, null, service, token,
      function(err, profile) {
        if(err) return login_response(req, res, {error:err});
        associate_user(req, res, { userid: req.session.userid,
          oauth: { service: service,
                   display_name: profile.display_name,
                   url: profile.url,
                   image_url: profile.image_url,
                   token: token,
                   remoteid: profile.remoteid }
        });
      });
}
function login_backchannel(req, res, service, token) {
  getProfile(req, res, null, service, token,
      function(err, profile) {
        if(err) return login_response(req, res, {error:err});
        perform_login(req, res, {
          oauth: { service: service,
                   display_name: profile.display_name,
                   url: profile.url,
                   image_url: profile.image_url,
                   token: token,
                   remoteid: profile.remoteid }
        });
      });
}
function signup_backchannel(req, res, service, token) {
  getProfile(req, res, null, service, token,
      function(err, profile) {
        if(err) return login_response(req, res, {error:err});
        create_user(req, res, {
          email: profile.email, password: '',
          oauth: { service: service,
                   display_name: profile.display_name,
                   url: profile.url,
                   image_url: profile.image_url,
                   token: token,
                   remoteid: profile.remoteid }
        });
      });
}

module.exports = {
  express: reverse_use,
  getProfile: getProfile,
  require_login: require_login,
  perform_login: perform_login,
  create_user: create_user,
  associate_backchannel: associate_backchannel,
  login_backchannel: login_backchannel,
  signup_backchannel: signup_backchannel,
  response: login_response,
}
