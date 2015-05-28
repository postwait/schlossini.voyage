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

var errorit;
angular.module('tresbon', [])
  .controller('LoginController', function($http) {
    var login = this;
    login.error = null;

 errorit = function(str)  { login.error = str; console.log(login); }
    var statusChangeCallback = function(response, method) {
      if(!method) return;
      if (response.status === 'connected') {
        var data = { "oauth[function]": method,
                     "oauth[service]": 'facebook',
                     "oauth[accesstoken]": response.authResponse.accessToken };
        $http.post("/login", data)
          .success(function (data, status, headers, config) {
console.log(data);
            if(data.error) login.error = data.error;
            if(data.location) document.location = data.location;
          })
          .error(function (data, status, headers, config) {
            login.error = 'An unknown asynchronous error has occurred.';
          });
      } else if (response.status === 'not_authorized') {
        login.error = 'Facebook requires you log into this application';
      } else {
        login.error = 'Please log into Facebook';
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

    login.fuck = function() { console.log(login); }
    login.fb_login = fblogin('login');
    login.fb_signup = fblogin('signup');
    login.fb_associate = fblogin('associate');
  });
