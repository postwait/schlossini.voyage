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
router.get('/:person', function(req, res) {
  var date = new Date();
  var person = req.params.person[1];
  res.render('person', { title: 'Schlossini Voyage',
                        person: person,
                        date: date,
                        dateparam: undefined,
                        TP: travel_posts,
                        posts: travel_posts.newest(date, person) });
});
router.get('/:person/:date', function(req, res) {
  var date = new Date(req.params.date[1]);
  var person = req.params.person[1];
  res.render('person', { title: 'Schlossini Voyage',
                        person: person,
                        dateparam: req.params.date[1],
                        date: date,
                        TP: travel_posts,
                        posts: travel_posts.newest(date, person) });
});

module.exports = router;
