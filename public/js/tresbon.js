window.TB = window.TB || {};
TB.error = function(ctx,msg) {
  var body = document.getElementsByTagName("body")[0]
  var scope = angular.element(body).scope();
  scope.$apply(function() { scope.$emit('error', ctx, msg); });
}
TB.errors = require('/lib/errors');
TB.smashTZ = function(src, d) {
  // take a force-casted date (wrong) and make it a real date again
  var time = TZ.date(src, d.getFullYear(), d.getMonth(), d.getDate(),
    d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds());
  return new Date(time.getTime())
}
TB.unsmashTZ = function(tgt, d) {
  // take an actual date and force-cast it into a new timezone
  d = TZ.undate(tgt, d)
  d = new Date(d.getFullYear(), d.getMonth(), d.getDate(),
                 d.getHours(), d.getMinutes(), d.getSeconds(),
                 d.getMilliseconds());
  return d;
}
TB.guessTimezone = function() {
  return 'UTC';
}
TB.recent = {
  latitude: '0',
  longitude: '0',
}
if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(function(position) {
    TB.recent.latitude = position.coords.latitude;
    TB.recent.longitude = position.coords.longitude;
  });
}

TB.app = angular.module('tresbon', ['ngRoute','ngSanitize',
  'ngDrop','markdown','ui.bootstrap','uiGmapgoogle-maps',
  'angular.filter'])
TB.app.filter('tzdate', function($filter) {
  return function(input,arg1,arg2) {
    arg2 = arg2 || 'UTC';
    var indate = new Date(input);
    var d = TZ.undate(arg2,indate);
    arg1 = arg1.replace(/Z/, '\u017D')
    var harvest = d.toString().replace(/^.* GMT/, '');
    var f = $filter('date')(d._getUTC(),arg1,arg2)
    f = f.replace(/\u017D/g, harvest);
    return f;
  };
});
TB.app.directive('dragAndDrop', function() {
    return {
      restrict: 'A',
      link: function($scope, elem, attr) {
        elem.bind('dragover', function (e) {
          e.stopPropagation();
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
        });
        elem.bind('dragenter', function(e) {
          e.stopPropagation();
          e.preventDefault();
          $scope.$apply(function() {
            $scope.divClass = 'on-drag-enter';
          });
        });
        elem.bind('dragleave', function(e) {
          e.stopPropagation();
          e.preventDefault();
          $scope.$apply(function() {
            $scope.divClass = '';
          });
        });
        elem.bind('dragstart', function(event) {
          if(event.srcElement.localName === "img")
            event.dataTransfer.setData('text/uri-list', event.srcElement.currentSrc)
          if(attr.dragStartAction) {
            $scope.event = event;
            $scope.$apply(attr.dragStartAction)
          }
        });
        elem.bind('drop', function(event) {
          if(attr.dropAction) {
            $scope.event = event;
            $scope.$apply(attr.dropAction)
          }
          event.stopPropagation();
          event.preventDefault();
        });
      }
    };
});
TB.app.run(
  ['$http',
  function($http) {
    $http.get('/js/zones.json')
      .success(function(d) {
        TB.zones = d.sort();
        TB.zoneGroups = {};
        TB.zones.forEach(function(z) {
          var group = 'Generic', zone;
          var m = /^([^\/]+)\/(.+)$/.exec(z)
          if(m) { group = m[1]; zone = m[2] }
          else zone = z;
          if(!TB.zoneGroups.hasOwnProperty(group))
            TB.zoneGroups[group] = [];
          zone = zone.replace(/_/, " ")
          TB.zoneGroups[group].push({name: zone, value: z})
        });
      })
      .error(function(e) { console.log(e); })
  }]
)

TB.app.config(
  function monkeyPatchCSRF( $provide ) {
    $provide.decorator( "$http", decorateHTTP );
    function decorateHTTP( $delegate, $exceptionHandler ) {
      var $http = $delegate;
      $http.csrfPost = csrfPost;
      $http.csrfDelete = csrfDelete;
      return $http;

      function fixConfig(config) {
        config = config || {};
        config.headers = config.header || {};
        if(!TB._csrf)
          throw new Error("CSRF protected post attempted without initialization");
        config.headers['X-CSRF-Token'] = TB._csrf;
        return config;
      }
      function csrfPost(url, data, config) {
        return $http.post(url, data, fixConfig(config));
      }
      function csrfDelete(url, config) {
        return $http.delete(url, fixConfig(config));
      }
    }
  }
);

TB.app.controller('TBC',
  function($scope) {
    $scope.scopedError = function(scope) { return function(e) { $scope.setError(scope,e); } }
    $scope.setError = function(s, e) {
      $scope.error = TB.errors.translate(s, e);
      TB.error = e;
    }
    $scope.$on('error', function(s,e) { $scope.setError(s,e); });
    $scope.clearError = function() { $scope.error = null; }
    $scope.setNav = function(replace) { $scope.nav = replace; }
});
