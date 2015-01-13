var express = require('express');
var router = express.Router();

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

router.param('date', /^(\d{4}-\d{2}-\d{2})?$/);
router.param('person', /^([a-z]+)$/);
/* GET home page. */
router.get('/', function(req, res) {
  var date = travel_posts.getDate(req,res);
  res.render('index', { title: 'Schlossini Voyage',
                        dateparam: undefined,
                        date: date,
                        TP: travel_posts,
                        posts: travel_posts.frontage(date,6) });
});
router.get('/:date', function(req, res) {
  var date = new Date(req.params.date[1]);
  res.cookie('date', req.params.date[1], { maxAge: 900000, httpOnly: false});
  res.render('index', { title: 'Schlossini Voyage',
                        dateparam: req.params.date[1],
                        date: date,
                        TP: travel_posts,
                        posts: travel_posts.frontage(date,6) });
});

module.exports = router;
