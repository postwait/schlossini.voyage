var Config = require('./config');
var config = (new Config('etc/config.json')).config();
var db = require('./db');

var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var passport = require('passport')
var session = require('express-session');
var SmugMugStrategy = require('passport-smugmug').Strategy;

require('./date');

var index = require('../routes/index');
var traveler = require('../routes/traveler');
var profile = require('../routes/profile');
var api = require('../routes/api');

var app = express();


// view engine setup
app.set('views', path.join(__dirname, '../views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '../public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(db.expressSession());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../public')));

var host = (app.get('env') === 'development') ? "127.0.0.1:3000" : "schlossini.voyage";
var cburl = "http://" + host + "/auth/smugmug/callback";

app.use('/', index);
app.use('/traveler', traveler);
app.use('/profile', profile);
app.use('/api', api);

require('./login').express(app);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

module.exports = app;
