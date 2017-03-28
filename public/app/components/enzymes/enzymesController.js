angular.module("TriForC")
.controller('EnzymesController', function($location, $routeParams, $route, Enzyme, Plant, EnzymeType) {
	var ctrl = this;

	ctrl.loaded = false;
	ctrl.filter = angular.copy($routeParams);
	ctrl.enzymes = Enzyme.query(ctrl.filter, function() {
		ctrl.loaded = true;
	});
	ctrl.types = EnzymeType.query();
	ctrl.plants = Plant.query();

	ctrl.query = function() {
		ctrl.loaded = false;
		$route.updateParams(ctrl.filter);
	};

});