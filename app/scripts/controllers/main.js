(function(angular) {
	'use strict';

	angular.module('websiteApp')
	  .controller('MainCtrl', function ($scope) {
	    $scope.intro = function() {

	    	var brand = $('.register');

	    	//TweenLite.to(brand, 1, {css:{right:"20px"}});
	    	
	    }
  	});
})(angular);
