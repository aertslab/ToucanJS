angular.module("TriForC")
.controller('LoginController', function($route, $routeParams, $location, $scope, Login) {
    var ctrl = this;
    ctrl.password = "";

    if ($routeParams.logout) {
        Login.delete(function(data) {
            if (data[0] && (data[0] == '1')) {
                $scope.$parent.adminUser = false;
                $location.path("/home");
            } else {
                alert("Unknown error!");
            }
        }, function() {
            alert("Could not contact the server!");
        });
    }

    ctrl.authenticate = function() {
        Login.put({pass: ctrl.password}, function(data) {
            if (data[0] && (data[0] == '1')) {
                $scope.$parent.adminUser = true;
                $location.path("/import");
            } else {
                alert("Incorrect password!");
            }
        }, function() {
            alert("Could not contact the server!");
        });
    }
});