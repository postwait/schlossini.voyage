'use strict';

var Voyage = require('../lib/voyage');
var express = require('express');
var showdown = require('../public/js/showdown')
var converter = new showdown.Converter();
var router = express.Router();
var require_voyage = Voyage.express_voyage;

function api_response(res, err, data) {
  var obj = {};
  if(err) obj.error = err.toString();
  obj.status = obj.error ? "error" : "success";
  if(data) obj.data = data;
  res.writeHead('200', { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(obj));
}

/* GET home page. */
router.get('/trip/:trip/footer', require_voyage(function(req, res, next) {
  Voyage.travelers(req.tresbon.voyage, {date: req.tresbon.date}, function(err1, travelers) {
    Voyage.tripBySlug(req.params.trip, req.tresbon.voyage, function(err2, trip) {
      Voyage.tripPosts(req.tresbon.voyage, trip.tripid,
                       { date: req.tresbon.date,
                         published: true,
                         limit: 10 }, function(err3, posts) {
        Voyage.tripWaypoints(req.tresbon.voyage, trip.tripid, null,
          function(err4, points) {
            api_response(res,err1||err2||err3||err4, {
              travelers:travelers,
              trip:trip,
              waypoints:points,
              posts:posts,
            })
        });
      });
    });
  });
}));

module.exports = router;
