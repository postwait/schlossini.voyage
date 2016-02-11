'use strict';

var Voyage = require('../lib/voyage');
var express = require('express');
var showdown = require('../public/js/showdown')
var converter = new showdown.Converter();
var router = express.Router();
var require_voyage = Voyage.express_voyage;
var rssFeed = require('../lib/feed');

var default_perpage = 3;

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

var tp = require('../travel-posts');
var travel_posts = new tp('./posts/.');

router.param('person', /^([0-9]+)$/);
/* GET home page. */
router.get('/:person/on/:trip', require_voyage(function(req, res, next) {
  var date = travel_posts.getDate(req,res);
  var nelem = parseInt(req.query.perpage || default_perpage);
  var pageno = parseInt(req.query.page || 1);
  Voyage.travelers(req.tresbon.voyage, {date: req.tresbon.date}, function(err, travelers) {
    Voyage.tripBySlug(req.params.trip, req.tresbon.voyage, function(err, trip) {
      Voyage.tripPosts(req.tresbon.voyage, trip.tripid,
                       { date: req.tresbon.date,
                         include_json: true,
                         published: true,
                         limit: nelem + 1,
                         author: req.params.person[1],
                         offset: (pageno - 1) * nelem },
        function(err, posts) {
          var me = travelers.filter(function(t) { return t.userid === parseInt(req.params.person[1]); })
          if(me.length != 1) return next();
          var more_posts = posts.length > nelem;
          if(posts.length > nelem) posts.pop();
          posts.forEach(function(post) {post.data.html = converter.makeHtml(post.data.body);});

          var info = { voyage: req.tresbon.voyage,
                       person: me[0],
                       trip: trip,
                       subtitle: me[0].name,
                       dateparam: undefined,
                       date: req.tresbon.date,
                       travelers: null,
                       waypoints: null,
                       pageno: pageno,
                       nelem: nelem,
                       more_posts: more_posts,
                       posts: posts };
          var backs = posts.map(function(a) { return a.data.background })
                           .filter(function(a) { return !!a; });
          if(backs.length) {
            if(!info.page) info.page = {};
            info.page.background = backs[0];
          }
          res.render('person', info);
        });
    });
  });
}));

router.get('/:person/on/:trip/feed.xml', require_voyage(function(req, res) {
  Voyage.tripBySlug(req.params.trip, req.tresbon.voyage, function(err, trip) {
    Voyage.tripWaypoints(req.tresbon.voyage, trip.tripid, {date: null}, function(err, points) {
      Voyage.tripPosts(req.tresbon.voyage, trip.tripid,
                       {published: true, include_json: true, author: req.params.person[1], reverse: true, limit: 20},
                       function(err, posts) {
        var xml = rssFeed.make(req.tresbon.voyage, trip, points, posts);
        res.writeHead(200, { 'Content-Type': 'application/rss+xml' });
        res.end(xml);
      });
    });
  });
}));

router.get('/:person/on/:trip/writes/:title', require_voyage(function(req, res, next) {
  Voyage.tripBySlug(req.params.trip, req.tresbon.voyage, function(err, trip) {
    Voyage.tripPosts(req.tresbon.voyage, trip.tripid,
                     { date: req.tresbon.date,
                       include_json: true,
                       url_snippet: req.params.title },
      function(err, posts) {
        if(!posts || posts.length != 1) return next();
        var post = posts[0]
        post.data.html = converter.makeHtml(post.data.body);
        var person = req.params.person[1];
        var info = { title: post.title || req.tresbon.voyage.title,
                     voyage: req.tresbon.voyage,
                     trip: trip,
                     person: person,
                     subtitle: post.title,
                     date: post.whece,
                     dateparam: undefined,
                     waypoints: null,
                     travelers: null,
                     post: post };
        if(!!post.data.background) {
          if(!info.page) info.page = {};
          info.page.background = post.data.background;
        }
        res.render('single', info);
      });
    });
}));

module.exports = router;
