'use strict';

var express = require('express');
var User = require('../lib/user');
var Voyage = require('../lib/voyage')
var loggedin = require('../lib/login').require_login;
var router = express.Router();

function safe_user(user) {
  delete user['password'];
  user.thirdparty.forEach(function(a) {
    ['userid','token','secret'].forEach(function(key) { delete a[key]; })
    a.image_url = a.image_url || '/images/profiles/' + a.service + '.png';
  });
  user.notices = user.notices || [];
  return user;
}
function api_response(res, err, data) {
  var obj = {};
  if(err) obj.error = err.toString();
  obj.status = obj.error ? "error" : "success";
  if(data) obj.data = data;
  res.writeHead('200', { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(obj));
}

router.get('/profile', loggedin(function(req, res) {
  User.getUser({ userid: req.session.userid },
    function(err, user) {
      if(err) return api_response(res,err);
      User.getAssociations(req.session.userid, function(err2, assocs) {
        user.thirdparty = assocs;
        return api_response(res, err2, safe_user(user));
      });
  });
}));
router.get('/profile/voyage/:shortname', loggedin(function(req, res) {
  Voyage.getProfile(req.session.userid, req.session.userid, req.params.shortname,
    function(err, user) {
      return api_response(res,err,safe_user(user));
    });
}));
router.get('/profile/voyage/:shortname/:ouserid', loggedin(function(req, res) {
  Voyage.getProfile(req.session.userid, req.params.ouserid, req.params.shortname,
    function(err, user) {
      return api_response(res,err,safe_user(user));
    });
}));
router.post('/profile/voyage/:shortname/associate', loggedin(function(req, res) {
  if(!req.body.userid) req.body.userid = req.session.userid;
  Voyage.shareAssociation(req.session.userid, req.body, req.params.shortname,
    function(err, user) {
      return api_response(res,err);
    });
}))
router.post('/profile/confirm', loggedin(function(req,res) {
  User.sendConfirmation(req.session.userid, null, function(err,body) {
    api_response(res,err,body)
  });
}));
router.delete('/profile/link/:service/:remoteid', loggedin(function(req,res) {
  User.deleteAssociation(
    req.session.userid, req.params.service, req.params.remoteid,
    function(err, success) {
      if(!err && !success) err = "No such link";
      api_response(res,err)
    }
)}));
router.get('/profile/voyages', loggedin(function(req,res) {
  Voyage.getVoyagesByUser(req.session.userid,
    function(err, voyages) {
      voyages = voyages || []
      voyages.forEach(function(a) {
        ['schema','active'].forEach(function(key){delete a[key]})
      })
      api_response(res, err, voyages);
    }
  )}));
router.get('/voyage/:shortname', loggedin(function(req,res) {
  Voyage.getTripsByName(req.session.userid, req.params.shortname,
    function(err, trips, voyage) {
      voyage.trips = trips;
      ['schema','active'].forEach(function(key){delete voyage[key]})
      Voyage.getTravelers(req.session.userid, { shortname: req.params.shortname},
        function(err, people) {
          console.log(err);
          voyage.travelers = people;
          api_response(res, err, voyage);
        });
    }
  );
}));
router.get('/voyage/:shortname/profilepics/me', loggedin(function(req,res) {
  Voyage.getProfilePics(req.session.userid, req.params.shortname, req.session.userid,
    function(err, pics) {
      api_response(res, err, pics);
    });
}));
router.get('/voyage/:shortname/profilepics/:ouserid', loggedin(function(req,res) {
  Voyage.getProfilePics(req.session.userid, req.params.shortname, req.params.ouserid,
    function(err, pics) {
      api_response(res, err, pics);
    });
}));
router.post('/voyage/:shortname/profilepics', loggedin(function(req,res) {
  Voyage.addProfilePic(req.session.userid, req.params.shortname, req.body,
    function(err,pic) {
      api_response(res, err, pic)
    })
}))
router.delete('/voyage/:shortname/profilepics/:ouserid/:picid', loggedin(function(req,res) {
  Voyage.deleteProfilePic(req.session.userid, req.params.shortname,
                          req.params.ouserid, req.params.picid,
    function(err) {
      api_response(res, err)
    })
}))
router.get('/voyage/:shortname/trip/:tripid/waypoints',
  loggedin(function(req,res) {
    Voyage.getTripWaypoints(req.session.userid, req.params.shortname,
                            req.params.tripid,
      function(err, points) {
        points.forEach(function(p) {
          p.latlong = [p.latlong.x,p.latlong.y];
        });
        api_response(res, err, points);
      });
}));
router.post('/voyage/:shortname/trip/:tripid', loggedin(function(req,res) {
  Voyage.updateTrip(req.session.userid, req.params.shortname, req.body,
    function(err) {
      api_response(res, err);
    }
  );
}));
router.post('/voyage/:shortname/waypoint',
  loggedin(function(req,res) {
    Voyage.addWaypoint(req.session.userid, req.params.shortname, req.body,
      function(err) {
        api_response(res, err);
      }
    )}
));
router.post('/voyage/:shortname/waypoint/:waypointid',
  loggedin(function(req,res) {
    Voyage.updateWaypoint(req.session.userid, req.params.shortname,
                          req.params.waypointid, req.body,
      function(err) {
        api_response(res, err);
      }
    )}
));
router.delete('/voyage/:shortname/waypoint/:waypointid',
  loggedin(function(req,res) {
    Voyage.deleteWaypoint(req.session.userid, req.params.shortname,
                          req.params.waypointid,
      function(err) {
        api_response(res, err);
      }
    )}
));
router.get('/voyage/:shortname/trip/:tripid/posts',
  loggedin(function(req,res) {
    Voyage.getTripPosts(req.session.userid, req.params.shortname,
                        req.params.tripid, req.query.include_json,
      function(err, posts) {
        api_response(res, err, posts);
      });
  }));
router.get('/voyage/:shortname/post/:postid',
  loggedin(function(req,res) {
    Voyage.getPost(req.session.userid, req.params.shortname,
                   req.params.postid,
      function(err, post) {
        api_response(res, err, post);
      });
}));
router.post('/voyage/:shortname/post',
  loggedin(function(req,res) {
    Voyage.addPost(req.session.userid, req.params.shortname,
                      req.body,
      function(err, post) {
        api_response(res, err, post);
      });
}));
router.post('/voyage/:shortname/post/:postid',
  loggedin(function(req,res) {
    Voyage.updatePost(req.session.userid, req.params.shortname,
                      req.params.postid, req.body,
      function(err, post) {
        api_response(res, err, post);
      });
}));
router.delete('/voyage/:shortname/post/:postid',
  loggedin(function(req,res) {
    Voyage.deletePost(req.session.userid, req.params.shortname,
                      req.params.postid,
      function(err) {
        api_response(res, err);
      }
    )}
));

module.exports = router;
