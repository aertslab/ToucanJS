angular.module("ToucanJS")
.factory('UCSC', function($http, $q) {
    var ucsc = {
        das: "http://genome-euro.ucsc.edu/cgi-bin/das/"
    };
    ucsc.getAssemblies = function() {
        parser = new DOMParser();
        return $q(function(resolve, reject) {
            $http.get(ucsc.das + "dsn").then(function(response) {
                var assemblies = [];
                xmlDoc = parser.parseFromString(response.data, "text/xml");
                var dsns = xmlDoc.getElementsByTagName("DSN");
                for (var i = 0; i < dsns.length; i++) {
                    var dsn = dsns[i];
                    assemblies.push(dsn.getElementsByTagName("SOURCE")[0].id);
                }
                resolve(assemblies);
            }).then(function(response){
                reject(response);
            });
        });
    };
    return ucsc;
});