var Config = require('./config');
var config = (new Config()).config();

var pg = require('pg')
  , Client = pg.Client
  , session = require('express-session')
  , pgSession = require('connect-pg-simple')(session);

 
var expressSession = function() {
  return session({
    store: new pgSession({
      pg : pg,
      conString : config.pg.constring,
      tableName : 'session'
    }),
    secret: config.sessions.secret,
    cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 /* 30d */ },
    resave: false,
    saveUninitialized: true,
  });
}
// ([client, ], query, [binds,] cb)
var query = function(client, query, binds, cb) {
  if(typeof(client) === 'string') {
    cb = binds;
    binds = query;
    query = client;
    client = null;
  }
  if(typeof(binds) === 'function') {
    cb = binds;
    binds = [];
  }
  if(!client) {
    pg.connect(config.pg.constring, function(err, client, done) {
      client.query(query, binds, function(err, result) {
        console.log('db',query,binds,err);
        if(err) cb(err,null,client);
        else cb(null,result,client);
        done();
      });
    });
  }
  else {
    client.query(query, binds, function(err, result) {
      console.log('db[sub]',query,binds,err,result);
      if(err) cb(err,null,client);
      else cb(null,result,client);
    });
  }
};

module.exports = {
  expressSession: expressSession,
  query: query
}
