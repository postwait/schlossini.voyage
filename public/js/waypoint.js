
TB.app.controller('WaypointController', ['$scope','$modal','WaypointService',
  function($scope,$modal,WaypointService) {
    $scope.waypoints = [];
    var seterror = function(s, e) { $scope.$emit('error', s, e); }
    var refresh = function () {
      WaypointService.refresh($scope.tripid,
        function(d) {
          $scope.waypoints = d.data;
          $scope.$broadcast('waypoints', $scope.waypoints)
        },
        seterror
      );
    }
    refresh();

    $scope.$on("trip", function (event, trip) {
      if(trip) {
        $scope.tripid = trip.tripid;
        refresh();
      }
    });
    $scope.$on('waypointsChanged', refresh);
    var notify_refresh = function() { $scope.$emit('waypointsChanged'); }

    $scope.removeWaypoint = function(waypoint) {
      var modalInstance = $modal.open({
        animation: false,
        templateUrl: 'WaypointDelete.html',
        controller: 'WaypointInstanceCtrl',
        backdrop : 'static',
        size: 'sm',
        resolve: {
          waypoint: function () { return waypoint },
          trip: function() { return $scope.trip; },
          zones: function() { return TB.zoneGroups; },
        }
      });

      modalInstance.result.then(function (waypoint) {
        WaypointService.removeWaypoint(waypoint.waypointid,
          notify_refresh,
          $scope.scopedError('waypoint')
        ),
        function() {}
      });
    }
    $scope.openWaypoint = function (mode, waypoint) {
      var modalInstance = $modal.open({
        animation: false,
        templateUrl: 'WaypointEdit.html',
        controller: 'WaypointInstanceCtrl',
        backdrop : 'static',
        size: 'lg',
        resolve: {
          waypoint: function () {
            return waypoint || {
              visibility: 1,
              arrival_method: 'air',
              whence: new Date(),
              timezone: 'UTC',
              tripid: $scope.trip.tripid,
            }
          },
          trip: function() { return $scope.trip; },
          zones: function() { return TB.zoneGroups; },
        }
      });

      modalInstance.result.then(function (waypoint) {
        $scope.waypoint = waypoint;
        if(mode == 'add') {
          WaypointService.addWaypoint($scope.waypoint,
            notify_refresh,
            $scope.scopedError('waypoint')
          );
        }
        if(mode == 'edit') {
          WaypointService.updateWaypoint($scope.waypoint,
            notify_refresh,
            $scope.scopedError('waypoint')
          );
        }
      }, function () {
      });
    };
}]);

TB.app.controller('WaypointInstanceCtrl',
                  function ($scope, $timeout, $modalInstance,
                            uiGmapIsReady, zones, trip, waypoint) {
  uiGmapIsReady.promise(1).then(function(instances) {
        instances.forEach(function(inst) {
          google.maps.event.trigger(inst.map, 'resize');
          $scope.mapInstance = inst.map;
        });
    });
  TB.debug = function() {return $scope.mapInstance;}
  $scope.zones = zones;
  $scope.waypoint = waypoint || {};
  if($scope.waypoint.whence.constructor != Date)
    $scope.waypoint.whence = new Date($scope.waypoint.whence);
  $scope.edit_whence = TB.unsmashTZ($scope.waypoint.timezone, $scope.waypoint.whence)

  $scope.whencehours = $scope.edit_whence.getHours();
  $scope.whenceminutes = $scope.edit_whence.getMinutes();
  if($scope.whencehours < 10) $scope.whencehours = "0" + $scope.whencehours;
  if($scope.whenceminutes < 10) $scope.whenceminutes = "0" + $scope.whenceminutes;

  $scope.waypoint.latlong = $scope.waypoint.latlong ||
    [TB.recent.latitude, TB.recent.longitude];

  $scope.arrival_methods = ['air','boat','bus','train','car','van','bicycle','foot'];
  $scope.map = {
    center: {
      latitude: $scope.waypoint.latlong[0],
      longitude: $scope.waypoint.latlong[1]
    },
    options: { scrollwheel: false },
    zoom: 12
  };

  $scope.marker = {
    id: 0,
    coords: {
      latitude: $scope.waypoint.latlong[0],
      longitude: $scope.waypoint.latlong[1]
    },
    options: { draggable: true },
    events: {
      dragend: function (marker, eventName, args) {
        var lat = marker.getPosition().lat();
        var lng = marker.getPosition().lng();
        $scope.waypoint.latlong = [lat,lng];
        $scope.marker.options = {
          draggable: true,
          labelContent: $scope.waypoint.name,
          labelAnchor: "100 0",
          labelClass: "marker-labels"
        };
      }
    }
  };
  var recenter;
  $scope.$watchCollection("marker.coords", function (newVal, oldVal) {
    if (_.isEqual(newVal, oldVal)) return;
    if(recenter) $timeout.cancel(recenter);
    recenter = $timeout(function() {
      $scope.map.center.latitude = $scope.marker.coords.latitude;
      $scope.map.center.longitude = $scope.marker.coords.longitude;
    },1000);
  });

  $scope.lookupName = function() {
    TB.geocoder = TB.geocoder || new google.maps.Geocoder();
    TB.geocoder.geocode({address: $scope.waypoint.name},
      function(results, status) {
        if(status != "OK") return;
        if(results.length) {
          loc = results[0].geometry.location;
          $scope.marker.coords.latitude = $scope.map.center.latitude = loc.lat()
          $scope.marker.coords.longitude = $scope.map.center.longitude = loc.lng()
          $scope.waypoint.latlong = [loc.lat(),loc.lng()];
          $scope.$digest();
        }
      });
  }
  $scope.ok = function () {
    $scope.edit_whence.setHours($scope.whencehours)
    $scope.edit_whence.setMinutes($scope.whenceminutes)
    $scope.waypoint.whence = TB.smashTZ($scope.waypoint.timezone, $scope.edit_whence)
    $modalInstance.close($scope.waypoint);
  };
  $scope.cancel = function () {
    $modalInstance.dismiss('cancel');
  };
  $scope.setWhenceHours = function() {
    $scope.edit_whence.setHours($scope.whencehours)
  }
  $scope.setWhenceMinutes = function() {
    $scope.edit_whence.setMinutes($scope.whenceminutes)
  }
  $scope.openDate = function($event) {
    $event.preventDefault();
    $event.stopPropagation();

    $scope.opened = true;
  };
});

TB.app.service('WaypointService', function($http) {
  var myData = null;

  return {
    guessTimezone: function(d) {
      if(myData && myData.data) {
        var wp, wpt = 0;
        var dt = d.getTime();
        myData.data.forEach(function(p) {
          var pt = (new Date(p.whence)).getTime()
          if(pt < dt && (!wp || pt > wpt)) {
            wp = p;
            wpt = pt;
          }
        })
        if(wp) return wp.timezone;
        return 'UTC';
      }
    },
    refresh: function(tripid, dataf,errorf) {
      if(!tripid) return dataf({data:[]});
      $http.get('/api/voyage/' + TB.voyage.shortname + '/trip/' + tripid + '/waypoints')
        .success(function (result) {
          myData = result;
          myData.data.forEach(function(wp) { wp.whence = new Date(wp.whence); })
          dataf(result);
         })
        .error(function (e) {
          errorf(e);
        })
    },
    addWaypoint: function(o, successf, errorf) {
      $http.csrfPost('/api/voyage/' + TB.voyage.shortname + '/waypoint', o)
        .success(function(d) { if(d.status == 'error') return errorf(d.error); successf(d); })
        .error(errorf)
    },
    updateWaypoint: function(o, successf, errorf) {
      $http.csrfPost('/api/voyage/' + TB.voyage.shortname + '/waypoint/' + o.waypointid, o)
        .success(function(d) { if(d.status == 'error') return errorf(d.error); successf(d); })
        .error(errorf)
    },
    removeWaypoint: function(id, successf, errorf) {
      $http.csrfDelete('/api/voyage/' + TB.voyage.shortname + '/waypoint/' + id)
        .success(function(d) { if(d.status == 'error') return errorf(d.error); successf(d); })
        .error(errorf)
    }
  };
});
