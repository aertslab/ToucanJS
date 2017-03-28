angular.module('ToucanJS')
.config(['$routeProvider', function($routeProvider) {
	$routeProvider
	.when('/home/:id?', {
		templateUrl:  'app/components/home/homeTemplate.html',
		controller: 'HomeController',
		controllerAs: 'home'
	})
	.otherwise({
		redirectTo: '/home'
	});
}]);
