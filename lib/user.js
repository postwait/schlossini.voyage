'use strict';

var db = require('./db'),
    crypto = require('crypto'),
    Config = require('./config'),
    config = (new Config()).config(),
    prot = config.www.insecure ? 'http' : 'https',
    SparkPost = require('sparkpost'),
    sparkpost = new SparkPost(config.sparkpost.key);

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
  db.query_search_path([], sql, binds,
                    function(err, result, client) {
                      cb(err, result ? result.rows[0] : null, client);
  });
}

var sendconfmail = function(userid, email, token, cb) {
  var trans = {
    template: 'email-confirmation',
    recipients: [{ address: { email: email } }],
    substitutionData: {
      data: { userid: userid, token: token }
    },
  };
  sparkpost.transmissions.send(trans, function(err, res) {
    if (err, null) {
      cb(err);
    } else {
      cb(null, res.body);
    }
  });
}

var sendConfirmation = function(userid, email, cb) {
  cb = cb || function(){}
  if(!email) {
    return getUser({ userid: userid }, function(e, user) {
      sendConfirmation(user.userid, user.email, cb);
    });
  }

  var conf_token = crypto.pseudoRandomBytes(10).toString('base64').replace(/[=\+\/]/g, "a");
  db.query_search_path([],
    'UPDATE email_confirmations SET code = $1::text, whence = now() ' +
    ' WHERE userid = $2 and whence < now() - \'2 hours\'::interval',
    [conf_token,userid],
    function(err, result, client) {
      if(err) return cb(err, null);
      if(result.rowCount > 0) return sendconfmail(userid, email, conf_token, cb);
      db.query(client,
               'INSERT INTO email_confirmations (code, userid) VALUES($1,$2)',
               [conf_token, userid],
               function(err, result) {
                 if(err) return cb(err, null);
                 return sendconfmail(userid, email, conf_token, cb);
               });
    });
}

var confirm = function(userid, token, cb) {
  db.query_search_path([],
    'UPDATE users SET email_confirmed=true ' +
    ' WHERE userid in (select userid from email_confirmations where userid = $1 and code = $2) ',
    [userid, token],
    function(err, result, client) {
      if(err) return cb(err);
      if(result.rowCount == 0) return cb("bad confirmation");
      cb(null);
      db.query(client, 'DELETE from email_confirmations where userid = $1',
               [userid], function(){}); // really just best effort
    }
  );
}

var processInvitation = function(acting_userid, action, obj, cb) {
  var sql, binds;
  if(action == 'send') {
    // only insert if we're the owner.
    sql = 'INSERT INTO invites (voyageid, email) ' +
          'VALUES((select voyageid from voyages where voyageid = $1 and owner = $2), ' +
          '       $3)';
    binds = [obj.voyageid, acting_userid, obj.email];
  }
  else if(action == 'discard') {
    sql = 'DELETE FROM invites WHERE voyageid = $1 AND email = $2 AND ' +
          ' (EXISTS(select voyageid from voyages where voyageid = $3 and owner = $4) OR ' +
          '  EXISTS(select userid from users where userid = $5 and email = $6))';
    binds = [obj.voyageid,obj.email,obj.voyageid,acting_userid,acting_userid,obj.email];
  }
  else if(action == 'accept') {
    sql = 'WITH invite AS (DELETE FROM invites ' +
          '                 WHERE voyageid = $1 AND ' +
          '                       email IN (select email from users ' +
          '                                  where userid = $2) ' +
          '             RETURNING voyageid) ' +
          ' INSERT INTO travelers (voyageid, name, role_name, userid) ' +
          ' SELECT voyageid, $3::text, $4::text, $5::int ' +
          '   FROM invite';
    binds = [obj.voyageid,acting_userid,obj.name,'traveler',acting_userid]
    if(!obj.name) return cb("invalid travel nickname")
  }
  else return cb("invalid action")
  db.query_search_path(
    [], sql, binds, function(err, result, client) {
      if(!err && result.rowCount != 1) err = 'nothing changed';
      cb(err, {})
    })
}

var deleteAssociation = function(userid, service, remoteid, cb) {
  db.query_search_path(
    [], // nothing special
    'DELETE from oauth_assoc ' +
    ' WHERE userid = $1 and service = $2::text ' +
    '   and remoteid = $3::text', [userid, service, remoteid],
    function(err, result, client) {
      cb(err, !!(result && result.rowCount), client);
    }
  )
}

var getAssociations = function(userid, cb) {
  db.query('set search_path to public',
    function(err, result, client) {
      if(err) return cb(err, null);
      db.query(client,
               'SELECT * from oauth_assoc where userid = $1 ' +
               ' ORDER BY service, remoteid', [userid],
               function(err, result, client) {
                  cb(err, result ? result.rows : null, client);
               });
  });
}

var associateUser = function(obj, cb) {
  db.query('set search_path to public',
    function(err, result, client) {
      if(err) return cb(err, null);
      var binds =
               [obj.oauth.token, obj.oauth.secret, obj.oauth.display_name,
                obj.oauth.url, obj.oauth.image_url, obj.userid,
                obj.oauth.service, obj.oauth.remoteid];
      db.query(client,
               'UPDATE oauth_assoc ' +
               '   SET token = $1::text, secret = $2::text, ' +
               '       display_name = coalesce($3::text, display_name), ' +
               '       url = $4::text, image_url = $5::text ' +
               ' WHERE userid = $6 AND service = $7 AND remoteid = $8::text',
               binds,
               function(err, result, client) {
                 if(result.rowCount > 0) return cb(null, result, client);
                 db.query(client,
                          'INSERT INTO oauth_assoc (token, secret, display_name, url, image_url, ' +
                          '                         userid, service, remoteid) ' +
                          'VALUES($1::text,$2::text,$3::text,$4::text,$5::text,$6,$7,$8::text)',
                          binds, cb);
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
      if(result && result.rows[0] && result.rows[0].userid)
        sendConfirmation(result.rows[0].userid, obj.email);
      cb(cerr || err, result, client);
    });
  };

  if(obj.password === '') obj.password = crypto.pseudoRandomBytes(16).toString('base64');
  var sql = 'INSERT INTO users (email, password) VALUES($1,crypt($2,gen_salt(\'bf\',8))) RETURNING userid';
  var binds = [ obj.email, obj.password ];

  var done = endtxn;
  if(obj.oauth) {
    done = function(err, result, client) {
       if(err) return endtxn(err, result, client);
       var userid = result.rows[0].userid;
       db.query(client,
                'INSERT INTO oauth_assoc (userid, service, display_name, url, image_url, remoteid, token, secret) ' +
                'VALUES($1,$2,$3::text,$4::text,$5::text,$6::text,$7::text,$8::text)',
                [userid, obj.oauth.service, obj.oauth.display_name,
                 obj.oauth.url, obj.oauth.image_url, obj.oauth.remoteid,
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
  deleteAssociation: deleteAssociation,
  sendConfirmation: sendConfirmation,
  confirm: confirm,
  processInvitation: processInvitation,
}
