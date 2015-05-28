var https = require('https');

var facebook_api_host = 'graph.facebook.com';
var profile_uri = '/v2.3/me';

var getProfile = function(req, res, next, token, cb) {
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
        cb(null, { email: fb_profile.email,
                   display_name: fb_profile.name,
                   remoteid: fb_profile.id });
      }
      catch(e) { cb(e, null); }
    });
    res.on('error', function(err) { cb(err, null); });
  })
}

module.exports = {
  getProfile: getProfile
}
