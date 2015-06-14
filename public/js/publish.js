TB.app.controller('TripFooterCtrl',
  ['$scope','$element','TripService',
  function($scope,$element,TripService) {
    var needs_refresh = false
    TB.footer = TB.footer || {};
    ['waypoints', 'travelers', 'posts'].forEach(function(p) {
      TB.footer[p] = TB.footer[p] || [];
    })
    $scope.tripslug = $element.attr('tb-trip-slug');
    $scope.data = TB.footer;
    if(!TB.footer.travelers || TB.footer.travelers.length < 1) needs_refresh=true;
    if(!TB.footer.waypoints || TB.footer.waypoints.length < 1) needs_refresh=true;

    var compile = function() {
      TB.footer.waypoints.forEach(function(p) { p.whence = new Date(p.whence); })
      TB.footer.posts.forEach(function(p) { p.whence = new Date(p.whence); })
      for(var i=0; i<TB.footer.waypoints.length;i++) {
        var p = TB.footer.waypoints[i];
        if(p.visibility == 0) continue;
        if(p.visibility == 1 && !$scope.current_loc) $scope.last_loc = p;
        if($scope.current_loc) {
          $scope.next_loc = p;
          break;
        }
        if(TB.date > p.whence) $scope.current_loc = p;
      }
      $scope.last_loc = $scope.last_loc;
    }

    var refresh = function () {
      TripService.refresh($scope.tripslug,
        function(d) {
          TB.footer = $scope.data = d.data;
          compile();
        },
        $scope.setError
      );
    }
    if(needs_refresh) refresh();
    compile();
}])

TB.app.service('TripService', function($http) {
  return {
    refresh: function(tripslug, dataf,errorf) {
      if(!tripslug) return dataf({data:[]});
      $http.get('/api/trip/' + tripslug + '/footer')
        .success(function (result) {
          myData = result;
          dataf(result);
         })
        .error(function (e) {
          errorf(e);
        })
    },
  }
});
