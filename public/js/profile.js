angular.module('tresbon', [])
  .controller('ProfileController', function() {
    var profile = this;
    profile.info = [
      {text:'learn angular', done:true},
      {text:'build an angular app', done:false}];
 
  });
