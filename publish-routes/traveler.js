var express = require('express');
var router = express.Router();

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

router.param('person', /^([a-z]+)$/);
router.param('title', /^([^\/]+)$/);
/* GET home page. */
router.get('/:person', function(req, res) {
  var date = travel_posts.getDate(req,res);
  var person = req.params.person[1];
  var nelem = parseInt(req.query.perpage || default_perpage);
  var pageno = parseInt(req.query.page || 1);
  res.render('person', { title: 'Schlossini Voyage',
                        person: person,
                        pageno: pageno,
                        nelem: nelem,
                        date: date,
                        dateparam: undefined,
                        TP: travel_posts,
                        posts: travel_posts.newest(date, person) });
});

router.get('/:person/writes/:title', function(req, res) {
  var person = req.params.person[1];
  var title = req.params.title[1];
  var post = travel_posts.post(person, title);
  res.render('single', { title: post.title || 'Schlossini Voyage',
                        person: person,
                        date: post.date,
                        dateparam: undefined,
                        TP: travel_posts,
                        post: post });
});

module.exports = router;
