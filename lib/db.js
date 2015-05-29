'use strict';

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
var query_search_path = function(schemas, sql, binds, cb) {
  if(typeof(binds) === 'function') {
    cb = binds;
    binds = [];
  }

  schemas = schemas = [];
  schemas.forEach(function(a) {
    if(!/^[a-zA-Z0-9_]+$/.test(a))
      throw new Error("Illegal schema in serach path");
  });
  schemas.push("public");
  var path = schemas.join(',');

  query('set search_path to ' + path,
    function(err, result, client) {
      if(err) return cb(err, null);
      query(client, sql, binds, cb);
  });
}
// ([client, ], query, [binds,] cb)
var query = function(client, sql, binds, cb) {
  if(typeof(client) === 'string') {
    cb = binds;
    binds = sql;
    sql = client;
    client = null;
  }
  if(typeof(binds) === 'function') {
    cb = binds;
    binds = [];
  }
  if(!client) {
    pg.connect(config.pg.constring, function(err, client, done) {
      client.query(sql, binds, function(err, result) {
        console.log('db',sql,binds,err);
        if(err) cb(err,null,client);
        else cb(null,result,client);
        done();
      });
    });
  }
  else {
    client.query(sql, binds, function(err, result) {
      console.log('db[sub]',sql,binds,err,result);
      if(err) cb(err,null,client);
      else cb(null,result,client);
    });
  }
};

module.exports = {
  expressSession: expressSession,
  query: query,
  query_search_path: query_search_path,
}
