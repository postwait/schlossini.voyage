'use strict';

var db = require('./db'),
    Config = require('./config'),
    config = (new Config()).config();

var isGuideOrOwner = function(userid, voyage) {
  return (userid == voyage.owner ||
          voyage.guides.indexOf(userid) >= 0);
}
var voyageDetails = function(userid, o, cb) {
  var nb = (function() { var bv = 1; return function() { return "$" + bv++; } })();

  var binds = [userid];
  var sql =
  'SELECT v.*, ' +
  'ARRAY(SELECT userid FROM travelers t ' +
  '       WHERE t.voyageid = voyageid AND role_name = \'guide\') as guides, ' +
  'ARRAY(SELECT userid FROM travelers t ' +
  '       WHERE t.voyageid = voyageid AND role_name = \'traveler\') as travelers ' +
  ' FROM voyages v LEFT JOIN travelers t USING(voyageid) ' +
  ' WHERE userid = ' + nb();
  if(o.shortname) {
    sql = sql + ' AND shortname = ' + nb();
    binds.push(o.shortname);
  }
  if(o.voyageid) {
    sql = sql + ' AND voyageid = ' + nb();
    binds.push(o.voyageid);
  }
  if(binds.length < 2) return cb("Insufficient criteria for voyage lookup");
  db.query_search_path([],
    sql, binds, function(err, result) { cb(err, result.rows[0]) }
  );
}

var getVoyagesByUser = function(userid, cb) {
  db.query_search_path([],
    'SELECT v.*, ' +
    't.role_name, t.name as traveler_name, ' +
    'ARRAY(SELECT userid FROM travelers t ' +
    '       WHERE t.voyageid = voyageid AND role_name = \'guide\') as guides, ' +
    'ARRAY(SELECT userid FROM travelers t ' +
    '       WHERE t.voyageid = voyageid AND role_name = \'traveler\') as travlers ' +
    '  FROM travelers t JOIN voyages v USING(voyageid) ' +
    ' WHERE t.userid = $1', [userid],
    function(err, result, client) {
      cb(err, result ? result.rows : [])
    })
}

var getTravelers = function(userid, o, cb) {
  voyageDetails(userid, o,
    function(err, voyage) {
      if(voyage == null) err = 'Voyage not found';
      if(err) return cb(err);
      db.query_search_path([voyage.schema],
        'SELECT t.*, ' +
        '      (SELECT url as author_face FROM profile_pics pp ' +
        '         WHERE pp.voyageid = t.voyageid AND whence <= current_timestamp ' +
        '      ORDER BY whence DESC LIMIT 1) ' +
        '  FROM travelers t WHERE voyageid = $1', [voyage.voyageid],
        function(err, result) {
          cb(err, result.rows)
        });
    });
}

var getTrips = function(userid, o, cb) {
  voyageDetails(userid, o,
    function(err, voyage) {
      if(voyage == null) err = 'Voyage not found';
      if(err) return cb(err);
      db.query_search_path([voyage.schema],
        'SELECT trips.*, start_date, end_date ' +
        '  FROM trips LEFT JOIN ' +
        '  (SELECT tripid, min(whence) as start_date, max(whence) as end_date ' +
        '     FROM waypoint GROUP BY tripid) as dr USING(tripid) ' +
        'ORDER BY start_date desc', [],
        function(err, result) {
          cb(err, result.rows, voyage);
        })
    }
  );
}
var getTripsById = function(userid, voyageid, cb) {
  getTrips(userid, { voyageid: voyageid }, cb);
}

var getTripsByName = function(userid, shortname, cb) {
  getTrips(userid, { shortname: shortname }, cb);
}

var getTripWaypoints = function(userid, shortname, tripid, cb) {
  voyageDetails(userid, { shortname: shortname },
    function(err, voyage) {
      if(voyage == null) err = 'Voyage not found';
      if(err) return cb(err);
      db.query_search_path([voyage.schema],
        'SELECT * FROM waypoint WHERE tripid = $1', [tripid],
        function(err, result) {
          cb(err, result ? result.rows : []);
        });
    });
}

var updateWaypoint = function(userid, shortname, waypointid, data, cb) {
  voyageDetails(userid, { shortname: shortname },
    function(err, voyage) {
      if(voyage == null) err = 'Voyage not found';
      else if(!isGuideOrOwner(userid, voyage)) err = "Not owner or guide"
      else if(waypointid != data.waypointid) err = "Cannot change waypointid"
      if(err) return cb(err);
      db.query_search_path([voyage.schema],
        'UPDATE waypoint SET name = $1, latlong = point($2,$3), ' +
        '  arrival_method = $4, visibility = $5, whence = $6, timezone = $7 ' +
        '  WHERE waypointid = $8',
        [data.name, data.latlong[0], data.latlong[1],
         data.arrival_method, data.visibility,
         data.whence, data.timezone, waypointid],
        function(err, result) {
          if(result.rowCount < 1) err = 'Nothing updated';
          cb(err);
      })
    });
}
var addWaypoint = function(userid, shortname, data, cb) {
  voyageDetails(userid, { shortname: shortname },
    function(err, voyage) {
      if(voyage == null) err = 'Voyage not found';
      else if(!isGuideOrOwner(userid, voyage)) err = "Not owner or guide"
      if(err) return cb(err);
      db.query_search_path([voyage.schema],
        'INSERT INTO waypoint (name, latlong, arrival_method, visibility, ' +
        '                      whence, timezone, tripid) ' +
        'VALUES($1,point($2,$3),$4,$5,$6,$7,$8) RETURNING waypointid',
        [data.name, data.latlong[0], data.latlong[1],
         data.arrival_method, data.visibility,
         data.whence, data.timezone, data.tripid],
        function(err, result) {
          if(err) return cb(err);
          cb(null, result.rows[0].waypointid)
        })
    });
}
var deleteWaypoint = function(userid, shortname, waypointid, cb) {
  voyageDetails(userid, { shortname: shortname },
    function(err, voyage) {
      if(voyage == null) err = 'Voyage not found';
      else if(!isGuideOrOwner(userid, voyage)) err = "Not owner or guide"
      if(err) return cb(err);
      db.query_search_path([voyage.schema],
        'DELETE FROM waypoint WHERE waypointid = $1', [waypointid],
        function(err, result) {
          if(err) return cb(err);
          cb(result.rowCount < 1 ? "nothing delete" : null)
        });
    });
}
var updateTrip = function(userid, shortname, trip, cb) {
  voyageDetails(userid, { shortname: shortname },
    function(err, voyage) {
      if(voyage == null) err = 'Voyage not found';
      else if(!isGuideOrOwner(userid, voyage)) err = "Not owner or guide"
      if(err) return cb(err);
      db.query_search_path([voyage.schema],
        'UPDATE trips SET description = $1, active = $2 ' +
        '  WHERE tripid = $3', [trip.description, trip.active, trip.tripid],
        function(err, result) {
          if(result.rowCount < 1) err = 'Nothing updated';
          cb(err);
        })
    }
  );
}
var getTripPosts = function(userid, shortname, tripid, include_json, cb) {
  voyageDetails(userid, { shortname: shortname },
    function(err, voyage) {
      if(voyage == null) err = 'Voyage not found';
      if(err) return cb(err);
      include_json = include_json ? ', data' : '';
      db.query_search_path([voyage.schema],
        'SELECT postid, tripid, author, t.name as author_name, url_snippet, ' +
        '       whence, timezone, published, ' +
        '       (SELECT url as author_face FROM profile_pics pp ' +
        '         WHERE pp.voyageid = t.voyageid AND whence <= p.whence ' +
        '           and pp.userid = p.author ' +
        '      ORDER BY whence DESC LIMIT 1), ' +
        '       data->>\'title\' as title ' + include_json +
        '  FROM posts p JOIN travelers t ON(p.author=t.userid) ' +
        ' WHERE tripid = $1 and t.voyageid=voyageid()', [tripid],
        function(err, result) {
          cb(err, result ? result.rows : []);
        })
    });
}

var getPost = function(userid, shortname, postid, cb) {
  voyageDetails(userid, { shortname: shortname },
    function(err, voyage) {
      if(voyage == null) err = 'Voyage not found';
      if(err) return cb(err);
      db.query_search_path([voyage.schema],
        'SELECT postid, tripid, author, t.name as author_name, url_snippet, ' +
        '       whence, timezone, published, ' +
        '       (SELECT url as author_face FROM profile_pics pp ' +
        '         WHERE pp.voyageid = t.voyageid AND whence <= p.whence ' +
        '           and pp.userid = p.author ' +
        '      ORDER BY whence DESC LIMIT 1), ' +
        '       data->>\'title\' as title, data ' +
        '  FROM posts p JOIN travelers t ON(p.author=t.userid) ' +
        ' WHERE postid = $1 and t.voyageid=voyageid()', [postid],
        function(err, result) {
          cb(err, result && result.rows.length ? result.rows[0] : null);
        })
    });
}
var updatePost = function(userid, shortname, postid, post, cb) {
  voyageDetails(userid, { shortname: shortname },
    function(err, voyage) {
      var nb = (function() { var bv = 1; return function() { return "$" + bv++; } })();
      var binds = [];

      if(voyage == null) err = 'Voyage not found'
      if(post.postid != postid) err = 'Cannot change post id'
      var sql = 'UPDATE posts SET ' +
        ['url_snippet','tripid','author','whence','timezone','published','data'].
          map(function(a) { binds.push(post[a]); return a + ' = ' + nb(); }).join(', ');

      sql += ' WHERE postid = ' + nb();
      binds.push(post.postid);

      if(!isGuideOrOwner(userid, voyage)) {
        if(post.author != userid) err = 'Cannot assign ownership'
        sql += ' AND author = ' + nb()
        binds.push(userid);
      }

      if(err) return cb(err);

      db.query_search_path([voyage.schema], sql, binds,
        function(err, result) {
          if(result && result.rowCount < 1) err = 'Nothing updated';
          cb(err);
        })
    }
  );
}

var getProfilePics = function(userid, shortname, tgtuserid, cb) {
  voyageDetails(userid, { shortname: shortname },
    function(err, voyage) {
      if(voyage == null) err = 'Voyage not found';
      if(err) return cb(err);
      db.query_search_path([voyage.schema],
        'SELECT * FROM profile_pics ' +
        ' WHERE userid = $1 ORDER BY whence desc', [tgtuserid],
        function(err, result) {
          cb(err, result ? result.rows : []);
        })
    });
}

module.exports = {
  voyageDetails: voyageDetails,
  getTravelers: getTravelers,
  getVoyagesByUser: getVoyagesByUser,
  getTripsById: getTripsById,
  getTripsByName: getTripsByName,
  getTripWaypoints: getTripWaypoints,
  updateTrip: updateTrip,
  addWaypoint: addWaypoint,
  updateWaypoint: updateWaypoint,
  deleteWaypoint: deleteWaypoint,
  getTripPosts: getTripPosts,
  getPost: getPost,
  updatePost: updatePost,
  getProfilePics: getProfilePics,
}
