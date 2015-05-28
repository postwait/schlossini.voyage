var db = require('./db'),
    crypto = require('crypto');

var getUser = function(obj, pass, cb) {
  var nb = (function() { var bv = 1; return function() { return "$" + bv++; } })();

  if(typeof(pass) === 'function') {
    cb = pass;
    pass = null;
  }
  var sql = 'SELECT u.* FROM users u LEFT JOIN oauth_assoc o USING(userid) WHERE 1=1';
  var binds = [];
  if(obj.userid) {
    sql = sql + " and u.userid = " + nb();
    binds.push(obj.userid);
  }
  else if(obj.email) {
    sql = sql + " and u.email = " + nb();
    binds.push(obj.email);
  }
  else if(obj.oauth) {
    sql = sql + " and o.service = " + nb();
    binds.push(obj.oauth.service);
    sql = sql + " and o.remoteid = " + nb();
    binds.push(obj.oauth.remoteid);
  }
  else { return cb("bad specifier", null) };
  if(pass) {
    sql = sql + " and u.password = crypt(" + nb() + ", u.password)";
    binds.push(pass);
  }
  sql = sql + " limit 1";
  db.query('set search_path to public',
    function(err, result, client) {
      if(err) {
        cb(err, null);
      }
      else db.query(client, sql, binds,
                    function(err, result, client) {
                      cb(err, result ? result.rows : null, client);
                    });
    });
}

var getAssociations = function(userid, cb) {
  db.query('set search_path to public',
    function(err, result, client) {
      if(err) return cb(err, null);
      db.query(client, 'SELECT * from oauth_assoc where userid = $1', [userid],
               function(err, result, client) {
                  cb(err, result ? result.rows : null, client);
               });
  });
}

var associateUser = function(obj, cb) {
  db.query('set search_path to public',
    function(err, result, client) {
      if(err) return cb(err, null);
      db.query(client,
               'UPDATE oauth_assoc SET token = $1::text, secret = $2::text, ' +
               'display_name = coalesce($3::text, display_name) ' +
               'WHERE userid = $4 AND service = $5 AND remoteid = $6::text',
               [obj.oauth.token, obj.oauth.secret, obj.oauth.display_name, obj.userid,
                obj.oauth.service, obj.oauth.remoteid],
               function(err, result, client) {
                 if(result.rowCount > 0) return cb(null, result, client);
                 db.query(client,
                          'INSERT INTO oauth_assoc (userid, service, display_name, remoteid, token, secret) ' +
                          'VALUES($1,$2,$3::text,$4::text,$5::text,$6::text)',
                          [obj.userid, obj.oauth.service, obj.oauth.display_name, obj.oauth.remoteid,
                           obj.oauth.token, obj.oauth.secret], cb);
               });
    }
  );
}

var createUser = function(obj, cb) {
  // obj should have an email address, password
  // optionally an oauth assocations.
  // { email: <addr>, password: <pwd>, oauth: { service: , token: , secret: ,  remoteid: }

  var endtxn = function(err, result, client) {

    if(err) db.query(client, 'ROLLBACK', function() { cb(err, null, client); });
    else db.query(client, 'COMMIT', function(cerr) {
      cb(cerr || err, result, client);
    });
  };

  if(obj.password === '') obj.password = crypto.pseudoRandomBytes(16).toString('base64');
  var sql = 'INSERT INTO users (email, password) VALUES($1,crypt($2,gen_salt(\'bf\',8))) RETURNING userid';
  var binds = [ obj.email, obj.password ];

  done = cb;
  if(obj.oauth) {
    done = function(err, result, client) {
       if(err) return endtxn(err, result, client);
       var userid = result.rows[0].userid;
       db.query(client,
                'INSERT INTO oauth_assoc (userid, service, display_name, remoteid, token, secret) ' +
                'VALUES($1,$2,$3::text,$4::text,$5::text,$6::text)',
                [userid, obj.oauth.service, obj.oauth.display_name, obj.oauth.remoteid,
                 obj.oauth.token, obj.oauth.secret],
                function(err, unused, client) { endtxn(err, result, client); });
    }
  }

  db.query('set search_path to public',
    function(err, result, client) {
      if(err) return cb(err, null);
      db.query(client, 'BEGIN WORK', [],
        function(err, result, client) {
          if(err) return cb(err, null);
          db.query(client, sql, binds, done);
        })
    });
}

module.exports = {
  getUser: getUser,
  createUser: createUser,
  associateUser: associateUser,
  getAssociations: getAssociations,
}
