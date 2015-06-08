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

    $scope.openPost = function (mode, post, error) {
      var modalInstance = $modal.open({
        animation: false,
        templateUrl: 'PostEdit.html',
        controller: 'PostInstanceCtrl',
        backdrop : 'static',
        size: 'lg',
        resolve: {
          post: function () {
            if(post) return PostService.getPost(post.postid);
            return {
              data: {},
              author: TB.userid,
              whence: new Date(),
              timezone: WaypointService.guessTimezone(new Date()),
              tripid: $scope.tripid,
              published: false
            }
          },
          voyage: function() { return $scope.voyage },
          zones: function() { return TB.zoneGroups },
          error: function() { return error },
        }
      });

      var reopen_error = function(err) {
        console.log(err, "reopening")
        $scope.openPost(mode,$scope.post,err);
      }

      modalInstance.result.then(function (post) {
        $scope.post = post;
        if(mode == 'add') {
          PostService.addPost($scope.post,
            notify_refresh,
            reopen_error
          );
        }
        if(mode == 'edit') {
          PostService.updatePost($scope.post,
            notify_refresh,
            reopen_error
          );
        }
      }, function () {
      });
    };
  }]);

TB.app.controller('PostInstanceCtrl',
                  function ($scope, $timeout, $modalInstance,
                            zones, post, voyage, error) {
  $scope.error = error;
  if(post.data && post.data.data && post.data.data.author) post = post.data.data;
  $scope.post = post;
  $scope.post.data = $scope.post.data || {};
  $scope.post.data.tags = $scope.post.data.tags || [];
  $scope.voyage = voyage;
  $scope.zones = zones;
  if($scope.post.whence.constructor != Date)
    $scope.post.whence = new Date($scope.post.whence);
  $scope.post.whence = TB.unsmashTZ($scope.post.timezone, $scope.post.whence)

  $scope.whencehours = $scope.post.whence.getHours();
  $scope.whenceminutes = $scope.post.whence.getMinutes();
  if($scope.whencehours < 10) $scope.whencehours = "0" + $scope.whencehours;
  if($scope.whenceminutes < 10) $scope.whenceminutes = "0" + $scope.whenceminutes;

  $scope.$watch('post.data.title', function(newVal, oldVal) {
    if($scope.post.postid) return;
    if(!newVal) return;
    $scope.post.url_snippet = newVal
      .replace(/[^-a-zA-Z0-9]/g, " ")
      .replace(/^\s+/g,"")
      .replace(/\s+$/g, "")
      .replace(/\s+/g,"-")
      .toLowerCase();
  });
  $scope.ok = function () {
    $scope.post.whence = TB.smashTZ($scope.post.timezone, $scope.post.whence)
    $modalInstance.close($scope.post);
  }
  $scope.removeTag = function(tag) {
    var idx = $scope.post.data.tags.indexOf(tag);
    if(idx >= 0) $scope.post.data.tags.splice(idx,1)
  }
  $scope.addTag = function() {
    if (event.which === 13) {
      if($scope.post.data.tags.indexOf($scope.addtag) == -1) {
        $scope.post.data.tags.push($scope.addtag);
      }
      $scope.addtag = null;
      event.preventDefault();
    }
  }
  $scope.cancel = function () {
    $modalInstance.dismiss('cancel');
  }
  $scope.setWhenceHours = function() {
    $scope.post.whence.setHours($scope.whencehours)
  }
  $scope.setWhenceMinutes = function() {
    $scope.post.whence.setMinutes($scope.whenceminutes)
  }
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
