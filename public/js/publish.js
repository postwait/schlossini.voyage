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
      $scope.current_loc = $scope.next_loc = $scope.last_loc = undefined;
      var vis = TB.footer.waypoints.filter(function(p) { return p.visibility == 1 });
      vis.unshift(undefined);
      vis.unshift(undefined);
      for(var i=2; i<vis.length; i++) {
        if(TB.date < vis[i].whence) {
          $scope.last_loc = vis[i-2];
          $scope.current_loc = vis[i-1];
          $scope.next_loc = vis[i];
          break;
        }
      }
      if(!$scope.last_loc) $scope.last_loc = vis[vis.length-2];
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
