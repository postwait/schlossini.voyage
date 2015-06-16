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
    $scope.TB = TB;
    $scope.invitee = {}
    $scope.expanded_voyage = {}

    $scope.newtravelname = {}
    $scope.acceptinput = {}
    $scope.selectVoyage = function(voyage) {
      document.location = '/voyage/' + voyage.shortname;
    }
    $scope.toggleVoyage = function(voyage) {
      for(var sn in $scope.expanded_voyage) {
        if(sn !== voyage.shortname && $scope.expanded_voyage.hasOwnProperty(sn))
          $scope.expanded_voyage[sn] = false;
      }
      $scope.expanded_voyage[voyage.shortname] =
        !$scope.expanded_voyage[voyage.shortname];
      console.log($scope.expanded_voyage);
    }
    $scope.inviteUser = function(voyageid) {
      ProfileService.sendInvite(voyageid, $scope.invitee[voyageid],
        function() { refresh(); }, seterror
      )
    }
    $scope.discardInvite = function(voyageid,email) {
      ProfileService.discardInvite(voyageid, email,
        function() { refresh(); }, seterror
      )
    }
    $scope.acceptInvite = function(voyageid,email) {
      ProfileService.acceptInvite(voyageid,$scope.newtravelname[voyageid],
        function() { refresh(); }, seterror
      )
    }
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
    },
    sendInvite: function(voyageid, email, dataf, errorf) {
      $http.csrfPost('/api/profile/invite/send', { voyageid:voyageid, email:email })
        .success(function(data) {
          if(data.error) return errorf(data.error);
          dataf(data);
        })
        .error(function(data) { errorf(data); });
    },
    discardInvite: function(voyageid, email, dataf, errorf) {
      $http.csrfPost('/api/profile/invite/discard', { voyageid:voyageid, email:email })
        .success(function(data) {
          if(data.error) return errorf(data.error);
          dataf(data);
        })
        .error(function(data) { errorf(data); });
    },
    acceptInvite: function(voyageid, name, dataf, errorf) {
      $http.csrfPost('/api/profile/invite/accept', { voyageid:voyageid, name:name })
        .success(function(data) {
          if(data.error) return errorf(data.error);
          dataf(data);
        })
        .error(function(data) { errorf(data); });
    },
  };
});
