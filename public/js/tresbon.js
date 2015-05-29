window.TB = window.TB || {};
TB.errors = require('/lib/errors');
TB.app = angular.module('tresbon', ['ngRoute'])
TB.app.config(
  function monkeyPatchCSRF( $provide ) {
    $provide.decorator( "$http", decorateHTTP );
    function decorateHTTP( $delegate, $exceptionHandler ) {
      var $http = $delegate;
      $http.csrfPost = csrfPost;
      $http.csrfDelete = csrfDelete;
      return $http;

      function fixConfig(config) {
        config = config || {};
        config.headers = config.header || {};
        if(!TB._csrf)
          throw new Error("CSRF protected post attempted without initialization");
        config.headers['X-CSRF-Token'] = TB._csrf;
        return config;
      }
      function csrfPost(url, data, config) {
        return $http.post(url, data, fixConfig(config));
      }
      function csrfDelete(url, config) {
        return $http.delete(url, fixConfig(config));
      }
    }
  }
);
