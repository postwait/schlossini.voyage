'use strict';

var https = require('https');

var facebook_api_host = 'graph.facebook.com';
var profile_uri = '/v2.3/me';
var pic_uri = function(id) { return '/v2.3/' + id + '/picture' }

var getPicture = function(remoteid, token, cb) {
  var path = pic_uri(remoteid) + '?access_token=' + token;
  https.get({
    hostname: facebook_api_host,
    port: 443,
    path: path,
  }, function (res) {
    var fb_pic = { "image_url": res.headers.location };
    cb(null, fb_pic);
  })
}

var getProfile = function(req, res, next, token, callback) {
  var path = profile_uri + '?access_token=' + token;
  https.get({
    hostname: facebook_api_host,
    port: 443,
    path: path,
  }, function (res) {
    var json = '';
    res.on('data', function(chunk) { json = json + chunk; });
    res.on('end', function() {
      var fb_profile = {};
      try {
        fb_profile = JSON.parse(json);
        var prof = { email: fb_profile.email,
                     display_name: fb_profile.name,
                     url: fb_profile.link,
                     remoteid: fb_profile.id };
        getPicture(fb_profile.id, token, function(e,d) {
          if(d) prof.image_url = d.image_url;
          callback(null,prof);
        });
      }
      catch(e) { cb(e, null); }
    });
    res.on('error', function(err) { cb(err, null); });
  })
}

module.exports = {
  getProfile: getProfile
}
