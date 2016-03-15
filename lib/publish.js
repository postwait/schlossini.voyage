var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var Config = require('./config');
var config = (new Config()).config();
var Voyage = require('./voyage');

require('./date');

var index = require('../publish-routes/index');
var traveler = require('../publish-routes/traveler');
var api = require('../publish-routes/api')

var app = express();
if(config.circonus.uuid && config.circonus.secret) {
  app.use(require('circonus-cip').express(config.circonus.uuid, config.circonus.secret));
}
app.locals = config.template_locals || {};
if(!app.locals.theme) app.locals.theme = { css: "default" };
if(!app.locals.page) app.locals.page = { background: "https://schlossini.smugmug.com/Watt-Konstanz/i-NHCWFrm/0/X2/DSC01203-X2.jpg" };
if(!app.locals.analytics) app.locals.analytics = {};
if(!app.locals.comments) app.locals.comments = {};
app.locals.JSON = JSON;

// view engine setup
app.set('views', path.join(__dirname, '../publish-views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(function (req, res, next) {
  req.tresbon = req.tresbon || {};
  var date = new Date();
  if(req.cookies.date) {
    try { date = new Date(req.cookies.date); }
    catch(e) { date = null }
    if(date == null || isNaN(date.getTime())) {
      res.cookie('date', 'now', {
        expires: new Date(Date.now() + 14*1000*86400),
        maxAge: 900000,
        httpOnly: false
      });
      date = new Date();
    }
  }
  if(!config.www.insecure) {
    if(!req.headers['x-ssl'] && !req.headers['sslclientcipher']) {
      res.redirect('https://' + req.hostname + req.url);
    }
  }
  req.tresbon.date = date;
  var b = '.' + config.www.baseurl;
  var eidx = req.hostname.lastIndexOf(b);
  if(req.hostname.length == eidx + b.length)
    req.tresbon.vhost = req.hostname.substring(0,eidx)
  else
    req.tresbon.vhost = req.hostname
  next();
});
app.use(express.static(path.join(__dirname, '../public')));

app.use('/', index);
app.use('/traveler', traveler);
app.use('/api', api);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    voyage = req.tresbon.voyage || {}
    voyage.title = voyage.title || 'Error';
    res.status(err.status || 500);
    res.render('error', {
        error: err,
        voyage: voyage, waypoints: [], travelers: [], trip: {}, date: req.tresbon.date,
    });
});


module.exports = app;
