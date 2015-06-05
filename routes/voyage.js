'use strict';

var express = require('express');
var user = require('../lib/user');
var loggedin = require('../lib/login').require_login;
var Voyage = require('../lib/voyage');
var router = express.Router();

router.get('/:shortname', loggedin(function(req, res, next) {
  Voyage.voyageDetails(req.session.userid, { shortname: req.params.shortname },
    function(err, voyage) {
      if(err || !voyage || !voyage.voyageid) return next();
      res.render('voyage',
             { title: 'Voyage: ' + (voyage.title || voyage.shortname),
               userid: req.session.userid,
               csrfToken: req.csrfToken(),
               voyageid_as_json: JSON.stringify(voyage.voyageid),
               shortname_as_json: JSON.stringify(voyage.shortname),
             });
    })
}));

module.exports = router;
