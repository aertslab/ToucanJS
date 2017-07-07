angular.module("ToucanJS")
.directive('offcanvas', function($location) {
    return {
        restrict: 'E',
        templateUrl: 'app/components/offcanvas/offcanvas.html',
        transclude: true,
        scope: false,
        link: function(scope, elem, attr) {
            // init offcanvas
            elem.addClass('offcanvas');
            elem.hide();

            // define close handler
            scope.close = function() {
                $('.offcanvas-wrapper').removeClass('offcanvas-show');
                setTimeout(function() {
                    elem.removeClass('offcanvas-show');
                    elem.hide();
                }, 300);
            }

            // attach click handler
            var target = '#' + elem.attr('id');
            $('[data-target="'+target+'"]').click(function() {
                if ($('.offcanvas-wrapper').hasClass('offcanvas-show')) {
                    // if any offcanvas is shown
                    if ($(target).hasClass('offcanvas-show')) {
                        // if current offcanvas is shown - hide current one
                        scope.close();
                    } else {
                        // if current offcanvas is not shown - hide others and show current one
                        // optional: transition animation
                        // $('.offcanvas-wrapper').removeClass('offcanvas-show');
                        // setTimeout(function() {
                            $('.offcanvas').removeClass('offcanvas-show');
                            $('.offcanvas').hide();
                            elem.addClass('offcanvas-show');
                            elem.show();
                        //    $('.offcanvas-wrapper').addClass('offcanvas-show');
                        // }, 300);
                    }
                } else {
                    // if no offcanvas is shown - show current one
                    elem.show();
                    elem.addClass('offcanvas-show');
                    $('.offcanvas-wrapper').addClass('offcanvas-show');
                }
            });
            $.material.init();
        }
    };
});