'use strict';

var db = require('./db'),
    User = require('./user'),
    Config = require('./config'),
    config = (new Config()).config();

var isGuideOrOwner = function(userid, voyage) {
  return (userid == voyage.owner ||
          voyage.guides.indexOf(userid) >= 0);
}

var voyage_cache = {}
var express_voyage = function(f) {
  return function(req, res, next) {
    if(voyage_cache[req.tresbon.vhost]) {
      req.tresbon.voyage = voyage_cache[req.tresbon.vhost];
      return f(req,res,next)
    }
    voyageByName(req.tresbon.vhost, function(err,voyage){
      if(err) return next();
      voyage_cache[req.tresbon.vhost] = req.tresbon.voyage = voyage;
      return f(req,res,next)
    })
  }
}
function fixfaces(rows) {
  rows.forEach(function(t) { t.author_face = t.author_face || '/images/profiles/woman.png'; });
}
// Publishing, they aren't get/set as there is no set.
// This is how we shall tell them apart from management calls
var voyageByName = function(name, cb) {
  var sql = 'SELECT v.* ' +
  ' FROM voyages v ' +
  ' WHERE (shortname = $1 OR voyageid in (SELECT voyageid FROM voyage_vanity WHERE fqdn = $2))';
  var binds = [name,name];
  db.query_search_path([],
    sql, binds, function(err, result) {
      if(!result || result.rowCount != 1) err = 'No such voyage';
      cb(err, err ? {} : result.rows[0])
    }
  );
}
var trips = function(voyage, cb) {
  db.query_search_path([voyage.schema],
    'SELECT * FROM trips', [],
    function(err, result) {
      cb(err, err ? [] : result.rows)
    });
}
var tripBySlug = function(slug, voyage, cb) {
  db.query_search_path([voyage.schema],
    'SELECT * FROM trips WHERE url_snippet = $1', [slug],
    function(err, result) {
      if(!err && (!result || result.rowCount != 1)) err = 'No such trip'
      cb(err, err ? {} : result.rows[0])
    });
}
var tripPosts = function(voyage, tripid, attr, cb) {
  var nb = (function() { var bv = 1; return function() { return "$" + bv++; } })();
  if(voyage == null) return cb('[BV] Voyage not found');
  attr = attr || {};
  var date = attr.date;
  var include_json = attr.include_json ? ', data' : '';
  var sql = 'SELECT postid, tripid, author, t.name as author_name, url_snippet, ' +
            '       whence, timezone, published, ' +
            '       (SELECT url as author_face FROM profile_pics pp ' +
            '         WHERE pp.voyageid = t.voyageid AND whence <= p.whence ' +
            '           and pp.userid = p.author ' +
            '      ORDER BY whence DESC LIMIT 1), ' +
            '       data->>\'title\' as title ' + include_json +
            '  FROM posts p JOIN travelers t ON(p.author=t.userid) ' +
            ' WHERE tripid = ' + nb() + ' and t.voyageid=voyageid() and ' +
            '   (' + nb() + '::timestamptz IS NULL OR whence <= ' + nb() + ')';
  var binds = [tripid, date, date];

  if(attr.author) {
    sql += ' AND p.author = ' + nb();
    binds.push(attr.author)
  }
  if(attr.url_snippet) {
    sql += ' AND url_snippet = ' + nb();
    binds.push(attr.url_snippet)
  }
  if(attr.hasOwnProperty('published')) {
    sql += ' AND published = ' + nb();
    binds.push(attr.published)
  }
  sql += ' ORDER BY whence ';
  sql += attr.reverse ? '' : 'DESC'
  if(attr.limit) {
    sql += ' LIMIT ' + nb()
    binds.push(attr.limit)
  }
  if(attr.offset) {
    sql += ' OFFSET ' + nb()
    binds.push(attr.offset)
  }

  db.query_search_path([voyage.schema], sql, binds,
    function(err, result) {
      cb(err, result ? result.rows : []);
    })
}
var tripWaypoints = function(voyage, tripid, attr, cb) {
  if(voyage == null) return cb('[BV] Voyage not found')
  attr = attr || {};
  var date = attr.date;
  db.query_search_path([voyage.schema],
    'SELECT * FROM waypoint WHERE tripid = $1 AND ($2::timestamptz is null OR whence <= $3) ORDER BY whence',
    [tripid, date, date],
    function(err, result) {
      cb(err, result ? result.rows : []);
    });
}

var travelers =  function(voyage, attr, cb) {
  if(voyage == null) return ('[BV] Voyage not found');
  attr = attr || {};
  var date = attr.date;
  db.query_search_path([voyage.schema],
    'SELECT t.*, ' +
    '      (SELECT url as author_face FROM profile_pics pp ' +
    '         WHERE pp.voyageid = t.voyageid AND pp.userid=t.userid AND ' +
    '               ($1::timestamptz IS NULL OR whence <= $2) ' +
    '      ORDER BY whence DESC LIMIT 1) ' +
    '  FROM travelers t WHERE voyageid = $3', [date, date, voyage.voyageid],
    function(err, result) {
      fixfaces(result.rows);
      cb(err, result.rows)
    });
}


// Management
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
    '     (SELECT array_to_json(array_agg(row_to_json(x))) ' +
    '        FROM (select u.userid, u.email, t.role_name, t.name as traveler_name ' +
    '                from travelers t join users u using(userid) where t.voyageid = voyageid) x) as travelers, ' +
    '     (SELECT array_to_json(array_agg(row_to_json(x))) ' +
    '        FROM (select * from invites i where i.voyageid = voyageid) x) as invites ' +
    '  FROM voyages v LEFT JOIN travelers t ON(v.voyageid=t.voyageid and t.userid=$1) ' +
    ' WHERE t.userid = $2 OR v.voyageid in (select voyageid from users join invites USING(email) where userid = $3)',
    [userid,userid,userid],
    function(err, result, client) {
      cb(err, result ? result.rows : [])
    })
}

var getTravelers = function(userid, o, cb) {
  voyageDetails(userid, o,
    function(err, voyage) {
      if(voyage == null) err = '[BV] Voyage not found';
      if(err) return cb(err);
      db.query_search_path([voyage.schema],
        'SELECT t.*, ' +
        '      (SELECT url as author_face FROM profile_pics pp ' +
        '         WHERE pp.voyageid = t.voyageid AND whence <= current_timestamp ' +
        '      ORDER BY whence DESC LIMIT 1) ' +
        '  FROM travelers t WHERE voyageid = $1', [voyage.voyageid],
        function(err, result) {
          fixfaces(result.rows);
          cb(err, result.rows)
        });
    });
}

var getProfile = function(userid, ouserid, shortname, cb) {
  User.getUser({userid: ouserid}, function(err, ouser) {
    if(err) return cb(err, null);
    voyageDetails(userid, {shortname:shortname},
      function(err, voyage) {
        if(voyage == null) err = '[BV] Voyage not found';
        if(!isGuideOrOwner(userid, voyage) && userid != ouserid)
          err = "[BV] Regular travelers cannot see other traveler's profiles"
          db.query_search_path([voyage.schema],
                 'SELECT oa.*, os.group_shared ' +
                 '  FROM oauth_assoc oa LEFT JOIN oauth_sharing os ' +
                 ' USING(service,remoteid) WHERE oa.userid = $1 ' +
                 ' ORDER BY service, remoteid', [ouserid],
                 function(err, result, client) {
                   var assoc = (result && result.rowCount) ? result.rows : [];
                   ouser.thirdparty = assoc;
                   cb(err, ouser, client);
                 });
     });
 });
}

var shareAssociation = function(userid, assoc, shortname, cb) {
  voyageDetails(userid, {shortname:shortname},
    function(err, voyage) {
      if(voyage == null) err = '[BV] Voyage not found';
      if(userid != assoc.userid) err = '[BV] You cannot manage other travelers integrations';
      var sql,binds;
      if(!assoc.hasOwnProperty('group_shared')) {
        sql = 'DELETE FROM oauth_sharing WHERE userid=$1 AND service=$2 AND remoteid=$3'
        binds = [assoc.userid, assoc.service, assoc.remoteid];
        db.query_search_path([voyage.schema], sql, binds,
          function(err, result) {
            if(!err && (!result || result.rowCount != 1)) err = 'delete failed';
            cb(err);
          });
      } else {
        var group_shared = !!assoc.group_shared;
        db.query_search_path([voyage.schema],
          'UPDATE oauth_sharing SET group_shared=$1 WHERE userid=$2 AND service=$3 AND remoteid=$4',
          [group_shared,assoc.userid,assoc.service,assoc.remoteid],
          function(err,result,client) {
            if(err) return cb(err);
            if(result.rowCount == 1) return cb(null);
            db.query(client,
              'INSERT INTO oauth_sharing (group_shared,userid,service,remoteid) VALUES($1,$2,$3,$4)',
              [group_shared,assoc.userid,assoc.service,assoc.remoteid],
              function(err, result) {
                if(!err && result.rowCount != 1) err = 'insert failed';
                if(err) return cb(err);
                cb(null);
              });
          });
      }
    })
}
var getTrips = function(userid, o, cb) {
  voyageDetails(userid, o,
    function(err, voyage) {
      if(voyage == null) err = '[BV] Voyage not found';
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
      if(voyage == null) err = '[BV] Voyage not found';
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
      if(voyage == null) err = '[BV] Voyage not found';
      else if(!isGuideOrOwner(userid, voyage)) err = "[BV] Regular travelers cannot modify waypoints"
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
      if(voyage == null) err = '[BV] Voyage not found';
      else if(!isGuideOrOwner(userid, voyage)) err = "[BV] Regular travelers cannot modify waypoints"
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
      if(voyage == null) err = '[BV] Voyage not found';
      else if(!isGuideOrOwner(userid, voyage)) err = "[BV] Regular travelers cannot modify waypoints"
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
      if(voyage == null) err = '[BV] Voyage not found';
      else if(!isGuideOrOwner(userid, voyage)) err = "[BV] Regular travelers cannot modify trips"
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
      if(voyage == null) err = '[BV] Voyage not found';
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
      if(voyage == null) err = '[BV] Voyage not found';
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

var addPost = function(userid, shortname, post, cb) {
  voyageDetails(userid, { shortname: shortname },
    function(err, voyage) {
      var nb = (function() { var bv = 1; return function() { return "$" + bv++; } })();
      var binds = [];

      if(voyage == null) err = '[BV] Voyage not found'
      if(!isGuideOrOwner(userid, voyage) && userid != post.author) {
        err = "[BV] You cannot post as another traveler"
      }
      var sql = 'INSERT INTO posts (url_snippet,tripid,author,whence,timezone,published,data) ' +
                ' VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING postid';
      binds = ['url_snippet','tripid','author','whence','timezone','published','data']
        .map(function(a) { return post[a]; })

      if(err) return cb(err);
      db.query_search_path([voyage.schema], sql, binds,
        function(err, result) {
          if(result && result.rowCount < 1) err = 'Post not added';
          cb(err, (result && result.rowCount == 1) ? result.rows[0] : {});
        })
  })
}

var updatePost = function(userid, shortname, postid, post, cb) {
  voyageDetails(userid, { shortname: shortname },
    function(err, voyage) {
      var nb = (function() { var bv = 1; return function() { return "$" + bv++; } })();
      var binds = [];

      if(voyage == null) err = '[BV] Voyage not found'
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

var deletePost = function(userid, shortname, postid, cb) {
  voyageDetails(userid, { shortname: shortname },
    function(err, voyage) {
      if(voyage == null) err = '[BV] Voyage not found'
      var sql = 'DELETE FROM posts WHERE postid=$1 ';
      var binds = [postid];
      if(!isGuideOrOwner(userid, voyage)) {
        sql += ' AND author=$2';
        binds.push(userid);
      }

      if(err) return cb(err);

      db.query_search_path([voyage.schema], sql, binds,
        function(err, result) {
          if(result && result.rowCount < 1) err = 'Nothing deleted';
          cb(err);
        })
    }
  );
}

var getProfilePics = function(userid, shortname, tgtuserid, cb) {
  voyageDetails(userid, { shortname: shortname },
    function(err, voyage) {
      if(voyage == null) err = '[BV] Voyage not found';
      if(err) return cb(err);
      db.query_search_path([voyage.schema],
        'SELECT * FROM profile_pics ' +
        ' WHERE userid = $1 ORDER BY whence desc', [tgtuserid],
        function(err, result) {
          cb(err, result ? result.rows : []);
        })
    });
}

var addProfilePic = function(userid, shortname, data, cb) {
  voyageDetails(userid, { shortname: shortname },
    function(err, voyage) {
      if(voyage == null) err = 'Voyage not found';
      if(data.userid != userid && !isGuideOrOwner(userid, voyage))
        err = "[BV] Regular travelers can only manage their own profiles"
      if(err) return cb(err);
      db.query_search_path([voyage.schema],
        'INSERT INTO profile_pics (userid,voyageid,url,whence,timezone) ' +
        ' VALUES($1,voyageid(),$2,$3,$4) RETURNING picid',
        [data.userid,data.url,data.whence,data.timezone],
        function(err, result) {
          cb(err, (result && result.rowCount > 0) ? result.rows[0] : {});
        });
    });
}

var deleteProfilePic = function(userid, shortname, ouserid, picid, cb) {
  voyageDetails(userid, { shortname: shortname },
    function(err, voyage) {
      if(voyage == null) err = 'Voyage not found';
      if(ouserid != userid && !isGuideOrOwner(userid, voyage))
        err = "[BV] Regular travelers can only manage their own profiles"
      if(err) return cb(err);
      db.query_search_path([voyage.schema],
        'DELETE FROM profile_pics WHERE userid = $1 AND picid = $2',
        [ouserid,picid],
        function(err, result) {
          if(!err && (!result || result.rowCount != 1)) err = "not found"
          cb(err);
        });
    });
}

module.exports = {
  express_voyage: express_voyage,
  voyageByName: voyageByName,
  trips: trips,
  tripBySlug: tripBySlug,
  tripPosts: tripPosts,
  tripWaypoints: tripWaypoints,
  travelers: travelers,

  voyageDetails: voyageDetails,
  getProfile: getProfile,
  shareAssociation: shareAssociation,
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
  addPost: addPost,
  updatePost: updatePost,
  deletePost: deletePost,
  getProfilePics: getProfilePics,
  addProfilePic: addProfilePic,
  deleteProfilePic: deleteProfilePic,
}
