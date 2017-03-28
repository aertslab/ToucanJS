var app = angular.module('ToucanJS', ['ngRoute', 'ngResource', 'vcRecaptcha', 'duScroll', 'angular.filter']);
app.value('duScrollDuration', 1000);
app.value('duScrollOffset', 30);
app.value('vcRecaptchaKey', '6LeoRxEUAAAAAKvFIF7XHx3Vhw3sHsVy3t7iRm_B');
app.value('vcRecaptchaTheme', 'light');
app.filter('stripSpecies', function() {
    return function(input) {
        input = input || '';
        return input.replace(/\[.*\]/g,"");
    }
});
app.controller('AppController', function($scope, $location, $route, $document, $timeout, Workspace) {
    /*
    $scope.searchTerm = '';
    $scope.adminUser = false;
    */
    /*
    Login.get(function(data) {
        if (data[0] && data[0] == '1') {
            $scope.adminUser = true;
        }
    });
    */

    $scope.spinnerOpts = {
          lines: 13 // The number of lines to draw
        , length: 38 // The length of each line
        , width: 17 // The line thickness
        , radius: 0 // The radius of the inner circle
        , scale: 0.25 // Scales overall size of the spinner
        , corners: 1 // Corner roundness (0..1)
        , color: '#000' // #rgb or #rrggbb or array of colors
        , opacity: 0.25 // Opacity of the lines
        , rotate: 0 // The rotation offset
        , direction: 1 // 1: clockwise, -1: counterclockwise
        , speed: 1 // Rounds per second
        , trail: 60 // Afterglow percentage
        , fps: 20 // Frames per second when using setTimeout() as a fallback for CSS
        , zIndex: 2e9 // The z-index (defaults to 2000000000)
        , className: 'spinner' // The CSS class to assign to the spinner
        , shadow: false // Whether to render a shadow
        , hwaccel: false // Whether to use hardware acceleration
    };
/*
    $scope.navigateTo = function(path, savePath) {
        if (savePath) {
            $location.search("returnUrl", $location.path());
        }
        $route.reload();
        $location.path("/"+path);
        if ($(".navbar-header").css("float") == 'none') {
            $("#contra-navbar-collapse").collapse('toggle');
        }
    }

    $scope.isCurrent = function(path) {
        var loc = $location.path().split("/");
        return loc[1] == path;
    }

    $scope.scrollToTop = function() {
        $document.scrollTopAnimated(0);
    }
*/
    $scope.notSupported = function() {
        return !Modernizr.svg || !Modernizr.fontface || !Modernizr.opacity || !Modernizr.mediaqueries;
    }
/*
    $scope.search = function() {
        $location.path("/search/"+$scope.searchTerm);
    }
*/
});
