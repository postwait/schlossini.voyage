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
  var date = new Date();
  res.render('index', { title: 'Schlossini Voyage',
                        dateparam: undefined,
                        date: date,
                        TP: travel_posts,
                        posts: travel_posts.frontage(date) });
});
router.get('/:date', function(req, res) {
  var date = new Date(req.params.date[1]);
  res.render('index', { title: 'Schlossini Voyage',
                        dateparam: req.params.date[1],
                        date: date,
                        TP: travel_posts,
                        posts: travel_posts.frontage(date) });
});

module.exports = router;
