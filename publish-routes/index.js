'use strict';

var Voyage = require('../lib/voyage');
var express = require('express');
var showdown = require('../public/js/showdown')
var converter = new showdown.Converter();
var router = express.Router();
var require_voyage = Voyage.express_voyage;
var rssFeed = require('../lib/feed');
var RSS = require('rss');

router.param(function(name, fn){
  if (fn instanceof RegExp) {
    return function(req, res, next, val){
      var captures;
      if (captures = fn.exec(String(val))) {
        req.params[name] = captures;
        next();
      } else {
        next('route');
      }
    }
  }
});

router.param('date', /^(\d{4}-\d{2}-\d{2})?$/);
router.param('person', /^([0-9]+)$/);
/* GET home page. */
router.get('/', require_voyage(function(req, res) {
  Voyage.trips(req.tresbon.voyage, function(err, trips) {
    trips = trips.filter(function(t) { return t.active });
    if(trips.length == 1) {
      return res.redirect('/t/' + trips[0].url_snippet)
    }
    res.render('index', { voyage: req.tresbon.voyage,
                        dataparam: undefined,
                        date: req.tresbon.date,
                        subtitle: null,
                        trips: trips,
                        travelers: null,
                        waypoints: null,
                        })
  });
}))
router.get('/t/:trip', require_voyage(function(req, res) {
  Voyage.tripBySlug(req.params.trip, req.tresbon.voyage, function(err, trip) {
    Voyage.tripPosts(req.tresbon.voyage, trip.tripid,
                     { published: true,
                       date: req.tresbon.date,
                       include_json: true,
                       limit: 6 },
      function(err, posts) {
        posts.forEach(function(p) { p.data.html = converter.makeHtml(p.data.body) })
        var info = { voyage: req.tresbon.voyage,
                     trip: trip,
                     subtitle: null,
                     dateparam: undefined,
                     date: req.tresbon.date,
                     travelers: null,
                     waypoints: null,
                     posts: posts };
        var backs = posts.map(function(a) { return a.data.background })
                         .filter(function(a) { return !!a; });
        if(backs.length) {
          if(!info.page) info.page = {};
          info.page.background = backs[0];
        }
        res.render('trip', info);
      });
  });
}));

router.get('/t/:trip/feed.xml', require_voyage(function(req, res) {
  Voyage.tripBySlug(req.params.trip, req.tresbon.voyage, function(err, trip) {
    Voyage.tripWaypoints(req.tresbon.voyage, trip.tripid, {date: null}, function(err, points) {
      Voyage.tripPosts(req.tresbon.voyage, trip.tripid,
                       {published: true, include_json: true, reverse: true, limit: 20},
                       function(err, posts) {
        var xml = rssFeed.make(req.tresbon.voyage, trip, points, posts);
        res.writeHead(200, { 'Content-Type': 'application/rss+xml' });
        res.end(xml);
      });
    });
  });
}));

router.get('/t/:trip/itinerary', require_voyage(function(req, res) {
  // Itinerary is a monster, all waypoints, all posts, all travelers
  Voyage.travelers(req.tresbon.voyage, {date: req.tresbon.date}, function(err, travelers) {
    Voyage.tripBySlug(req.params.trip, req.tresbon.voyage, function(err, trip) {
      Voyage.tripPosts(req.tresbon.voyage, trip.tripid,
                       {published: true, reverse: true, date: req.tresbon.date}, function(err, posts) {
        Voyage.tripWaypoints(req.tresbon.voyage, trip.tripid, {date: null}, function(err, points) {
          posts = posts.filter(function(p) { return p.published });
          points = points.filter(function(p) { return p.visibility > 0; })
          res.render('itinerary', { voyage: req.tresbon.voyage,
                                    trip: trip,
                                    subtitle: 'Itinerary',
                                    dateparam: undefined,
                                    date: req.tresbon.date,
                                    travelers: travelers,
                                    posts: posts,
                                    waypoints: points, console: console });
        });
      })
    })
  })
}));
router.get('/:date', function(req, res) {
  var dateparam = req.params.date[1];
  var date = new Date(dateparam);
  if((Object.prototype.toString.call(date) != '[object Date]') ||
     isNaN(date.getTime())) {
    dateparam = 'now';
    date = new Date();
  }
  res.cookie('date', req.params.date[1], {
    expires: new Date(Date.now() + 14*1000*86400),
    httpOnly: false
  });
  return res.redirect('/');
});

module.exports = router;
