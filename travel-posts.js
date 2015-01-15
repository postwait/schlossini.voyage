var path = require('path'),
    fs = require('fs'),
    yaml = require('js-yaml'),
    markdown = require( "markdown" ).markdown;

var imgfixup = function(arr) {
  var i;
  if (arr[0] == 'img') return true;
  for(i=0;i<arr.length;i++) {
    if(Array.isArray(arr[i])) {
      if(imgfixup(arr[i])) {
        if(arr.length > i+1) {
          var m = /^\{([^\}]+)\}/.exec(arr[i+1]);
          if(m) {
            var parts = m[1].split(/\s+/)
            arr[i][1].style = parts
              .filter(function(a) { /^[^\.]/.test(a) })
              .join(' ');
            arr[i][1].class = parts
              .filter(function(a) { return /^\./.test(a) })
              .map(function(a) { return a.substr(1); })
              .join(' ');
            arr[i+1] = arr[i+1].replace(/^\{[^\}]+\}\s*/, '');
            if(/^\s*$/.test(arr[i+1])) {
              arr.splice(i+1,1);
              i--;
            }
          }
        }
      }
    }
  }
  return false;
}
var paretree = function(arr, l, cnt) {
 if(!cnt) cnt = 0;
 for(var i=1;i<arr.length;i++) {
   if(Array.isArray(arr[i])) cnt = paretree(arr[i], l, cnt);
   if(cnt >= l) {
     arr.splice(i+1);
     break;
   }
   if(typeof(arr[i]) === 'string') {
     var want = l - cnt;
     var w = arr[i].split(/\s+/);
     if(want < w.length) {
       arr[i] = w.slice(0,want).join(' ');
     }
     cnt += w.length;
   }
 }
 return cnt;
}
markdown.toExtraHTML = function(contents, wordlimit) {
  var tree;
  tree = markdown.parse(contents);
  imgfixup(tree);
  if(wordlimit) paretree(tree, wordlimit);
  html = markdown.renderJsonML( markdown.toHTMLTree(tree) );
  return html;
};

var profiledir = 'public/images/profiles';

var agenda = [];
agenda = JSON.parse(fs.readFileSync('public/travel.json', { encoding: 'utf8' }));
function get_location(date, off) {
  if(!off) off = 0;
  for(b = agenda.length; b > 0; b--) {
    if(agenda[b-1].date >= date) break;
  }
  b += off;
  if(b >= agenda.length) b = agenda.length - 1;
  if(b < 0) b = 0;
  return agenda[b];
}

var tp = function(pathname) {
  this.pathname = path.dirname(pathname);
  this.load();
}

var load_profiles = function(tgt, dir) {
  fs.readdir(dir, function(err, list) {
    tgt.profiles = [];
    if(!list) return;
    list.forEach(function(pic) {
      var m = /(\d{4}-\d{2}-\d{2})\.(png|jpg|jpeg|gif)/.exec(pic);
      if(m) { tgt.profiles.push(pic); }
    });
    tgt.profiles = tgt.profiles.sort(function(a,b) {
      var adate = /(\d{4}-\d{2}-\d{2})\.(png|jpg|jpeg|gif)/.exec(a);
      var bdate = /(\d{4}-\d{2}-\d{2})\.(png|jpg|jpeg|gif)/.exec(b);
      adate = new Date(adate[1]);
      bdate = new Date(bdate[1]);
      if(adate < bdate) return -1;
      if(adate > bdate) return 1;
      return 0;
    });
    tgt.profiles_dates = tgt.profiles.map(function(a) {
      var adate = /(\d{4}-\d{2}-\d{2})\.(png|jpg|jpeg|gif)/.exec(a);
      return new Date(adate[1]);
    });
  });
};
var md_load = function(tgt, key, file) {
  fs.readFile(file, {encoding:'utf8'}, function(err, contents) {
    if(!contents) contents = '# Update about';
    tgt[key] = markdown.toExtraHTML(contents);
  });
}
var load_people = function(tgt, dir) {
  fs.readdir(dir, function(err, list) {
    if(err) { console.log(err); return; }
    list.forEach(function(person) {
      var file = dir + '/' + person;
      fs.stat(file, function(err, stat) {
        if (stat && stat.isDirectory()) {
          tgt[person] = { posts: {} };
          load_profiles(tgt[person], profiledir + '/' + person);
          load_posts(tgt[person].posts, person, file);
          md_load(tgt[person], 'meta', 'posts/' + person + '.md');
        }
      });
    });
  });
};

var load_posts = function(tgt, person, dir) {
  fs.readdir(dir, function(err, list) {
    list.forEach(function(post) {
      if(! /\.md$/.test(post)) return;
      var file = dir + '/' + post;
      fs.stat(file, function(err, stat) {
        if (stat && stat.isFile()) {
          post = post.replace(/\.md$/, '');
          tgt[post] = new Post(person, post, file);
        }
      });
    });
  });
};

tp.prototype.load = function() {
  this.people = {};
  load_people(this.people, this.pathname);
}

tp.prototype.newest = function(date, person) {
  var p = [];
  for (var people in this.people) {
    if(person && people != person) continue;
    for (var post in this.people[people].posts) {
      if(this.people[people].posts[post].date < date)
        p.push(this.people[people].posts[post]);
    }
  }
  return p.sort(function (a,b) { if(a.date<b.date) return 1; return (a.date==b.date) ? 0 : -1; });
}

tp.prototype.profile_pic = function(date, person) {
  var p = this.people[person];
  if(!p || !p.profiles_dates) return 'woman.png';
  if(p.profiles_dates.length < 2) return person + '/' + p.profiles[0];
  var b = p.profiles_dates.length - 1;
  while(b >= 0) {
    if(p.profiles_dates[b] > date) return person + '/' + p.profiles[b+1];
  }
  return person + '/' + p.profiles[0];
}

tp.prototype.person = function(person) {
  return this.people[person];
}

tp.prototype.frontage = function(date, cnt) {
  var self = this;
  var front_posts = [];
  if(!date) date = new Date();
  if(front_posts.length < cnt) {
    self.newest(date).forEach(function (post) {
      var aidx;
      if(front_posts.length >= cnt) return;
      for(aidx=0; aidx<front_posts.length; aidx++) {
        var already = front_posts[aidx];
        if(already.person == post.person && already.title == post.title) break;
      }
      if(aidx == front_posts.length) front_posts.push(post);
    });
  }
  if(front_posts.length > cnt)
    return front_posts.splice(0,cnt)
  return front_posts;
}

tp.prototype.get_location = get_location;

tp.prototype.post = function(person, title) {
  return this.people[person].posts[title];
}

tp.prototype.getDate = function(req,res) {
  var date = new Date();
  if(req.cookies.date) {
    try { date = new Date(req.cookies.date); }
    catch(e) { date = null }
    if(date == null || isNaN(date.getTime())) {
      res.cookie('date', 'now', {
        expires: new Date(Date.now() + 14*1000*86400),
        maxAge: 900000,
        httpOnly: false
      });
      date = new Date();
    }
  }
  return date;
}

module.exports = tp;

/* Actual post object */

var Post = function(person, post, filename) {
  var self = this;
  fs.readFile(filename, { encoding: 'utf8' }, function(err, contents) {
    var m, meta = '{}';
    self.name = self.title = post;
    if(m = /^(====*)$/m.exec(contents)) {
      meta = contents.slice(0,m.index);
      contents = contents.slice(m.index + m[1].length + 1);
    }
    if(m = /^\s*^(#\s*)(.+)$/m.exec(contents)) {
      self.title = m[2];
      contents = contents.slice(m.index + m[1].length + m[2].length + 1);
    }
    var obj = {};
    self.person = person;
    try { obj = yaml.safeLoad(meta); } catch(e) {}
    for(var key in obj) if(obj.hasOwnProperty(key)) self[key] = obj[key];
    if (typeof(self.tags) == 'string') self.tags = [self.tags];
    if (self.date) self.date = new Date(self.date);
    if (!self.date) try { self.date = new Date(self.name); } catch(e) {}
    if(!self.where && self.date) {
      self.location = get_location(self.date);
      if(self.location) self.where = self.location.where;
    }
    self.content = markdown.toExtraHTML(contents);
    self.content_brief = markdown.toExtraHTML(contents, 150);
  });
}

