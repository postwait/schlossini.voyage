  window.fbAsyncInit = function() {
    FB.init({
      appId: '828705060545857',
      xfbml: true,
      status: true,
      cookie: true,
      oauth: true,
      version: 'v2.3'
    });
  };
  (function(d, s, id){
     var js, fjs = d.getElementsByTagName(s)[0];
     if (d.getElementById(id)) {return;}
     js = d.createElement(s); js.id = id;
     js.src = "//connect.facebook.net/en_US/sdk.js";
     fjs.parentNode.insertBefore(js, fjs);
   }(document, 'script', 'facebook-jssdk'));

  function checkLoginState(method) {
    FB.getLoginStatus(function(response) {
      statusChangeCallback(response, method);
    });
  }

TB.app.controller('LoginController', function($scope, $http) {
    $scope.error = null;

    function getQueryVariable(variable) {
      var query = window.location.search.substring(1);
      var vars = query.split('&');
      for (var i = 0; i < vars.length; i++) {
        var pair = vars[i].split('=');
        if (decodeURIComponent(pair[0]) == variable) {
          return decodeURIComponent(pair[1]);
        }
      }
      return null;
    }

    var qs_error = getQueryVariable("error");
    if(qs_error) $scope.error = qs_error;

    var statusChangeCallback = function(response, method) {
      if(!method) return;
      if (response.status === 'connected') {
        var data = { "oauth[function]": method,
                     "oauth[service]": 'facebook',
                     "oauth[accesstoken]": response.authResponse.accessToken };
        if(method === 'associate') data.noredirect = 1;
        $http.post("/login", data, { headers: { 'X-CSRF-Token': TB._csrf } })
          .success(function (data, status, headers, config) {
            if(data.error) $scope.error = data.error;
            if(method !== 'associate' && data.location) document.location = data.location;
            $scope.$emit('profileChanged');
          })
          .error(function (data, status, headers, config) {
            $scope.error = 'An unknown asynchronous error has occurred.';
          });
      } else if (response.status === 'not_authorized') {
        $scope.error = 'Facebook requires you log into this application';
      } else {
        $scope.error = 'Please log into Facebook';
      }
    }
    var fblogin = function(method) {
      return function() {
        entry_method = method;
        FB.login(function(response) {
          if (response.authResponse) {
            statusChangeCallback(response, method)
          }
        }, {scope:'public_profile,email'});
      }
    }

    $scope.fb_login = fblogin('login');
    $scope.fb_signup = fblogin('signup');
    $scope.fb_associate = fblogin('associate');
  });
