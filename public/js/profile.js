TB.app.controller('ProfileController', ['$scope','ProfileService',
  function($scope,ProfileService) {
    var scopederror = function(scope) { return function(e) { seterror(scope,e); } }
    var seterror = function(s, e) { $scope.$emit('error', s, e); }
    var refresh = function () {
      ProfileService.refresh(
        function(d) {
          $scope.info = d.data;
        },
        seterror
      );
    }
    refresh();
    $scope.$on('profileChanged', refresh);
    var notify_refresh = function() { $scope.$emit('profileChanged'); }
    $scope.removeLink = function(link) {
      ProfileService.removeLink(link, notify_refresh, seterror);
    }
    $scope.refreshLink = function(link) {
      ProfileService.refreshLink(link, notify_refresh, seterror);
    }
    $scope.sendConfirmation = function(link) {
      ProfileService.sendConfirmation(
        function() {
          $scope.success = 'Check your email, we have sent you a new confirmation link.';
        },
        scopederror('confirm')
      );
    }
}]);

TB.app.service('ProfileService', function($http) {
  var myData = null;

  return {
    refresh: function(dataf,errorf) {
      $http.get('/api/profile')
        .success(function (result) {
          myData = result;
          dataf(result);
          $http.get('/api/profile/voyages')
            .success(function(set){
              result.data.voyages = set.data;
              dataf(result);
            })
         })
        .error(function (e) {
          errorf(e);
        })
    },
    removeLink: function(link, dataf, errf) {
      $http.csrfDelete('/api/profile/link/' + link.service + '/' + link.remoteid)
        .success(function(data) { if(dataf) dataf(data); })
        .error(function(data) { if(errf) errf(data); });
    },
    refreshLink: function(link) {
      document.location = '/auth/' + link.service + '?to=' + encodeURIComponent(document.location);
    },
    sendConfirmation: function(success, cb) {
      $http.csrfPost('/api/profile/confirm')
        .success(function(data) {
          if(data.error) return cb(data.error);
          success(data);
        })
        .error(function(data) { cb(data); });
    }
  };
});
