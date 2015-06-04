TB.app.controller('PostController',
  ['$scope','$modal','PostService','WaypointService',
  function($scope,$modal,PostService,WaypointService) {
    var refresh = function () {
      PostService.refresh($scope.tripid,
        function(d) { $scope.posts = d.data; },
        $scope.setError
      );
    }
    refresh();
    $scope.$on("voyage", function (event, voyage) {
      $scope.voyage = voyage;
    });
    $scope.$on("trip", function (event, trip) {
      if(trip) {
        $scope.tripid = trip.tripid;
        refresh();
      }
    });
    var guessTimezone = function() {
      console.log($scope.waypoints);
    }
    $scope.$on('postsChanged', refresh);
    var notify_refresh = function() { $scope.$emit('postsChanged'); }

    $scope.openPost = function (mode, post) {
      var modalInstance = $modal.open({
        animation: false,
        templateUrl: 'PostEdit.html',
        controller: 'PostInstanceCtrl',
        backdrop : 'static',
        size: 'lg',
        resolve: {
          post: function () {
            if(post) return PostService.getPost(post.postid);
            return { data: { data: {
              data: {},
              whence: new Date(),
              timezone: WaypointService.guessTimezone(new Date()),
              tripid: $scope.tripid,
              published: false
            }}}
          },
          voyage: function() { return $scope.voyage },
          zones: function() { return TB.zones },
        }
      });

      modalInstance.result.then(function (post) {
        $scope.post = post;
        if(mode == 'add') {
          PostService.addPost($scope.post,
            notify_refresh,
            $scope.scopedError('post')
          );
        }
        if(mode == 'edit') {
          PostService.updatePost($scope.post,
            notify_refresh,
            $scope.scopedError('post')
          );
        }
      }, function () {
      });
    };
  }]);

TB.app.controller('PostInstanceCtrl',
                  function ($scope, $timeout, $modalInstance,
                            zones, post, voyage) {
  $scope.post = post.data.data;
  $scope.voyage = voyage;
  $scope.zones = zones;
  if($scope.post.whence.constructor != Date)
    $scope.post.whence = new Date($scope.post.whence);
  $scope.post.whence = TB.unsmashTZ($scope.post.timezone, $scope.post.whence)

  $scope.whencehours = $scope.post.whence.getHours();
  $scope.whenceminutes = $scope.post.whence.getMinutes();
  if($scope.whencehours < 10) $scope.whencehours = "0" + $scope.whencehours;
  if($scope.whenceminutes < 10) $scope.whenceminutes = "0" + $scope.whenceminutes;

  $scope.ok = function () {
    $scope.post.whence = TB.smashTZ($scope.post.timezone, $scope.post.whence)
    $modalInstance.close($scope.post);
  };
  $scope.cancel = function () {
    $modalInstance.dismiss('cancel');
  };
  $scope.setWhenceHours = function() {
    $scope.post.whence.setHours($scope.whencehours)
  }
  $scope.setWhenceMinutes = function() {
    $scope.post.whence.setMinutes($scope.whenceminutes)
  }
  $scope.openDate = function($event) {
    $event.preventDefault();
    $event.stopPropagation();
    $scope.opened = true;
  };
});

TB.app.service('PostService', function($http) {
  return {
    refresh: function(tripid, dataf,errorf) {
      if(!tripid) return dataf({data:[]});
      $http.get('/api/voyage/' + TB.voyage.shortname + '/trip/' + tripid + '/posts')
        .success(function (result) {
          myData = result;
          dataf(result);
         })
        .error(function (e) {
          errorf(e);
        })
    },
    addPost: function(post,dataf,errorf) {
      $http.csrfPost('/api/voyage/' + TB.voyage.shortname + '/post', post)
        .success(function(f) {
          if(f.status !== "success") return errorf(f.error);
          dataf(f);
        })
        .error(function(e) { errorf(e) })
    },
    updatePost: function(post,dataf,errorf) {
      $http.csrfPost('/api/voyage/' + TB.voyage.shortname + '/post/' + post.postid, post)
        .success(function(f) {
          if(f.status !== "success") return errorf(f.error);
          dataf(f);
        })
        .error(function(e) { errorf(e) })
    },
    getPost: function(postid) {
      return $http.get('/api/voyage/' + TB.voyage.shortname + '/post/' + postid);
    }
  };
});