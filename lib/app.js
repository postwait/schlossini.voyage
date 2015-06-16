'use strict';

var Config = require('./config');
var config = (new Config('etc/config.json')).config();
var db = require('./db');

var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var csrf = require('csurf');
var passport = require('passport')
var session = require('express-session');
var SmugMugStrategy = require('passport-smugmug').Strategy;

require('./date');

var app = express();

app.locals = config.template_locals;

// view engine setup
app.set('views', path.join(__dirname, '../views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '../public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(db.expressSession());
app.use(cookieParser(config.sessions.secret));
app.use(express.static(path.join(__dirname, '../public')));
app.use(csrf({ cookie: true }))

// error handler
app.use(function (err, req, res, next) {
  if (err.code !== 'EBADCSRFTOKEN') return next(err)

  // handle CSRF token errors here
  res.status(403)
  res.send('form tampered with')
})

var host = (app.get('env') === 'development') ? "127.0.0.1:3000" : "schlossini.voyage";
var cburl = "http://" + host + "/auth/smugmug/callback";


app.use('/', require('../routes/index'))
app.use('/profile', require('../routes/profile'))
app.use('/api', require('../routes/api'))
app.use('/voyage', require('../routes/voyage'))

require('./login').express(app);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
      title: "Error",
      message: err.message,
      error: err
  });
});

module.exports = app;
