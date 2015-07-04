'use strict';

var RSS = require('rss'),
    Config = require('./config'),
    config = (new Config()).config(),
    prot = config.www.insecure ? 'http' : 'https';

var dcomp = function(a,b) {
  a = new Date(a.whence);
  b = new Date(b.whence);
  if(a < b) return 1;
  if(a > b) return -1;
  return 0;
}
var makeFeed = function(voyage, trip, points, posts) {
  posts.sort(dcomp);
  points.sort(dcomp);
  posts.forEach(function(p) {
    while(points.length > 0 && dcomp(p,points[0]) > 0) points.shift();
    p.waypoint = points[0];
  });
  console.log(posts);

  var base = prot + '://' + voyage.shortname + '.' + config.www.baseurl;
  var feedOptions = {
    title: voyage.title,
    description: trip.description,
    image_url: base + '/logo-192.png',
    site_url: base + '/t/' + trip,
    feed_url: base + '/t/' + trip + '/feed.xml',
    ttl: 1440,
  };
  var feed = new RSS(feedOptions);
  posts.forEach(function(p) {
    feed.item({
      title: p.title,
      url: base + '/traveler/' + p.author + '/on/' + trip.url_snippet + '/writes/' + p.url_snippet,
      categories: p.data.tags,
      author: p.author_name,
      date: p.whence,
      lat: (p.waypoint ? p.waypoint.latlong.x : undefined),
      long: (p.waypoint ? p.waypoint.latlong.y : undefined),
    });
  });
  var xml = feed.xml({indent: true});
  return xml;
}

module.exports = {
  make: makeFeed
}
