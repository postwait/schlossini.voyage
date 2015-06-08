TB.app.controller('VoyageController',
  ['$scope','$modal','VoyageService',
  function($scope,$modal,VoyageService) {

    $scope.pp = { isactive: { }, info: {}, active: "" + TB.userid };
    $scope.pp.isactive[$scope.pp.active] = true

    var seterror = function(s, e) { $scope.$emit('error', s, e); }
    var refresh = function () {
      VoyageService.refresh(
        function(d) {
          if(d.info) { $scope.info = d.info }
          else if(d.voyage) {
            $scope.voyage = d.voyage;
            $scope.$broadcast('voyage', $scope.voyage);
            TB.voyage = $scope.voyage;
            $scope.isGuideOrOwner = ($scope.voyage.guides.indexOf(TB.userid) >= 0 ||
                                     $scope.voyage.owner == TB.userid);
          }
        },
        seterror
      );
    }
    var updatePics = function (userid) {
      VoyageService.getProfilePics(userid, function(pics) {
          pics.forEach(function(p) {
            p.whencets = (new Date(p.whence)).getTime();
            var d = TZ.undate(p.timezone, new Date(p.whence));
            p.month = (new Date(d.getFullYear(), d.getMonth())).getTime();
          })
          $scope.pp.info["" + userid] = pics;
        },
        $scope.scopedError('voyage'));
    }

    $scope.$watchCollection("pp.isactive", function(newVal,oldVal) {
      for(var k in newVal) {
        var v1 = newVal[k], v2 = oldVal[k]
        if(v1 && !v2) {
          $scope.pp.active = k;
          updatePics(k);
        }
      }
    });
    refresh();
    updatePics(TB.userid);
    $scope.$on('voyageChanged', refresh);
    var notify_refresh = function() { $scope.$emit('voyageChanged'); }

    $scope.getTrip = function() { return $scope.trip; }
    $scope.selectTrip = function(trip) {
      var links = [ { name: 'Home' } ];
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
        $scope.scopedError('voyage')(err);
        notify_refresh();
      });
    }
    guessTimezone = TB.guessTimezone;
    $scope.allProfiles = false;
    $scope.shareAssociation = function(assoc, val) {
      if(val === undefined || val === null) delete assoc['group_shared'];
      else assoc['group_shared'] = !!val;
      VoyageService.shareAssociation(assoc,
        function() { refresh(); },
        function(err) {
          $scope.scopedError('voyage')(err);
          refresh();
        });
    }
    $scope.condUserSelector = function(a,b) {
      if($scope.allProfiles) return true;
      if(a.userid == TB.userid) return true;
      return false;
    }
    $scope.openProfilePic = function (pic, shouldDelete, error) {
      if(!$scope.isGuideOrOwner && pic.userid != TB.userid) return;
      var modalInstance = $modal.open({
        animation: false,
        templateUrl: 'ProfilePicAdd.html',
        controller: 'ProfilePicInstanceCtrl',
        backdrop : 'static',
        size: shouldDelete ? 'sm' : 'lg',
        resolve: {
          pic: function () {
            return pic || {
              userid: $scope.pp.active,
              whence: new Date(),
              timezone: guessTimezone(),
            }
          },
          shouldDelete: function() { return shouldDelete ? true : false; },
          error: function() { return error; },
          zones: function() { return TB.zoneGroups; },
        }
      });

      var reinsertProfilePic = function(arr, newpic) {
        for(var i=0; i<arr.length; i++) {
          if(arr[i].picid == newpic) {
            arr[i] = newpic;
            return;
          }
        }
        arr.unshift(newpic)
      }
      modalInstance.result.then(function (newpic) {
        if(shouldDelete) {
          VoyageService.deleteProfilePic(newpic,
            function() {
              $scope.pp.info[newpic.userid] =
                $scope.pp.info[newpic.userid].filter(function(a) {
                  return (a.picid != newpic.picid)
                });
            },
            $scope.scopedError('profile'));
        }
        else {
          VoyageService.addProfilePic(newpic,
            function(picid) {
              newpic.picid = picid;
              reinsertProfilePic($scope.pp.info[newpic.userid], newpic)
            },
            $scope.scopedError('profile')
          );
        }
      }, function () {
      });
    };
    // kick off
    $scope.selectTrip($scope.trip)
}]);


TB.app.controller('ProfilePicInstanceCtrl',
                  function ($scope, $timeout, $modalInstance,
                            zones, pic, error, shouldDelete) {
  $scope.error = error;
  $scope.shouldDelete = shouldDelete;
  $scope.pic = pic;
  $scope.zones = zones;
  if($scope.pic.whence.constructor != Date)
    $scope.pic.whence = new Date($scope.pic.whence);
  $scope.edit_whence = TB.unsmashTZ($scope.pic.timezone, $scope.pic.whence)

  $scope.whencehours = $scope.edit_whence.getHours();
  $scope.whenceminutes = $scope.edit_whence.getMinutes();
  if($scope.whencehours < 10) $scope.whencehours = "0" + $scope.whencehours;
  if($scope.whenceminutes < 10) $scope.whenceminutes = "0" + $scope.whenceminutes;

  $scope.setImage = function(event) {
    var url = event.dataTransfer.getData('text/uri-list')
    $scope.pic.url = url;
  }
  $scope.ok = function () {
    $scope.edit_whence.setHours($scope.whencehours)
    $scope.edit_whence.setMinutes($scope.whenceminutes)
    $scope.pic.whence = TB.smashTZ($scope.pic.timezone, $scope.edit_whence)
    $modalInstance.close($scope.pic);
  }
  $scope.delete = function() {
    $modalInstance.close($scope.pic)
  }
  $scope.cancel = function () {
    $modalInstance.dismiss('cancel');
  }
  $scope.setWhenceHours = function() {
    $scope.edit_whence.setHours($scope.whencehours)
  }
  $scope.setWhenceMinutes = function() {
    $scope.edit_whence.setMinutes($scope.whenceminutes)
  }
});

TB.app.service('VoyageService', function($http) {
  var myData = null;

  return {
    refresh: function(dataf,errorf) {
      $http.get('/api/profile/voyage/' + TB.voyage.shortname)
        .success(function (result) {
          if(result.status !== 'success') return errorf(result.error);
          dataf({ info: result.data});
         })
        .error(function (e) {
          errorf(e);
        })
      $http.get('/api/voyage/' + TB.voyage.shortname)
        .success(function (result) {
          myData = result;
          dataf({voyage: result.data});
         })
        .error(function (e) {
          errorf(e);
        })
    },
    saveTrip: function(trip, errorf) {
      $http.csrfPost('/api/voyage/' + TB.voyage.shortname + '/trip/' + trip.tripid, trip)
        .success(function(body) {
          if(body.status !== 'error') errorf(body.error);
        })
        .error(errorf)
    },
    getProfilePics: function(userid, dataf, errorf) {
      $http.get('/api/voyage/' + TB.voyage.shortname + '/profilepics/' + userid)
        .success(function(body) {
          if(body.status !== 'success') return error(body.error);
          return dataf(body.data)
        })
        .error(errorf)
    },
    addProfilePic: function(pic, dataf, errorf) {
      $http.csrfPost('/api/voyage/' + TB.voyage.shortname + '/profilepics', pic)
        .success(function(body) {
          if(body.status !== 'success') return errorf(body.error);
          return dataf(body.data.picid)
        })
        .error(errorf)
    },
    deleteProfilePic: function(pic, dataf, errorf) {
      $http.csrfDelete('/api/voyage/' + TB.voyage.shortname + '/profilepics/' +
                       pic.userid + '/' + pic.picid)
        .success(function(body) {
          if(body.status !== 'success') return errorf(body.error);
          return dataf()
        })
        .error(errorf)
    },
    shareAssociation: function(assoc, dataf, errorf) {
      $http.csrfPost('/api/profile/voyage/' + TB.voyage.shortname + '/associate', assoc)
        .success(function(body) {
          if(body.status !== 'success') return errorf(body.error);
          dataf();
        })
        .error(errorf)
    },
  };
});
