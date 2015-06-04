TB.app.controller('VoyageController', ['$scope','VoyageService',
  function($scope,VoyageService) {
    var seterror = function(s, e) { $scope.$emit('error', s, e); }
    var refresh = function () {
      VoyageService.refresh(
        function(d) {
          $scope.voyage = d.data;
          $scope.$broadcast('voyage', $scope.voyage);
        },
        seterror
      );
    }
    refresh();
    $scope.$on('voyageChanged', refresh);
    var notify_refresh = function() { $scope.$emit('voyageChanged'); }

    $scope.getTrip = function() { return $scope.trip; }
    $scope.selectTrip = function(trip) {
      var links = [ { name: 'Trips' } ];
      if(trip) {
        links[0].click = function() { $scope.selectTrip(); }
        links.push({name: trip.description})
      }
      $scope.trip = trip;
      $scope.setNav(links);
      $scope.$broadcast('trip', trip);
    }
    $scope.saveTrip = function(t) {
      VoyageService.saveTrip(t, function(err) {
        $scope.scopedError('voyage');
        notify_refresh();
      });
    }
    // kick off
    $scope.selectTrip($scope.trip)
}]);

TB.app.service('VoyageService', function($http) {
  var myData = null;
  
  return {
    refresh: function(dataf,errorf) {
      $http.get('/api/voyage/' + TB.voyage.shortname)
        .success(function (result) {
          myData = result;
          dataf(result);
         })
        .error(function (e) {
          errorf(e);
        })
    },
    saveTrip: function(trip, errorf) {
      $http.csrfPost('/api/voyage/' + TB.voyage.shortname + '/trip/' + trip.tripid, trip)
        .success(function(body) {
          if(body.status == 'error') errorf(body.error);
        })
        .error(errorf)
    }
  };
});
