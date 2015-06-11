'use strict';

var Voyage = require('../lib/voyage');
var express = require('express');
var showdown = require('../public/js/showdown')
var converter = new showdown.Converter();
var router = express.Router();
var require_voyage = Voyage.express_voyage;

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
                         limit: nelem,
                         offset: (pageno - 1) * nelem },
        function(err, posts) {
          var me = travelers.filter(function(t) { return t.userid == req.params.person[1]; })
          if(me.length != 1) return next();
          posts.forEach(function(post) {post.data.html = converter.makeHtml(post.data.body);});
          res.render('person', { voyage: req.tresbon.voyage,
                                 person: me[0],
                                 trip: trip,
                                 dateparam: undefined,
                                 date: req.tresbon.date,
                                 travelers: null,
                                 waypoints: null,
                                 pageno: pageno,
                                 nelem: nelem,
                                 posts: posts });
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
        res.render('single', { title: post.title || req.tresbon.voyage.title,
                        person: person,
                        date: post.whece,
                        dateparam: undefined,
                        waypoints: null,
                        travelers: null,
                        TP: travel_posts,
                        post: post });
      });
    });
}));

module.exports = router;
