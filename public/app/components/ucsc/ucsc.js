angular.module("ToucanJS")
.factory('UCSC', function($http, $q) {
    var ucsc = {
        das: "http://genome-euro.ucsc.edu/cgi-bin/das/",
        tracks: "http://genome-euro.ucsc.edu/cgi-bin/hgTracks"
    };

    ucsc.getAssemblies = function() {
        return $q(function(resolve, reject) {
            $http.get(ucsc.das + "dsn").then(function(response) {
                var assemblies = [];
                var parser = new DOMParser();
                var xmlDoc = parser.parseFromString(response.data, "text/xml");
                var dsns = xmlDoc.getElementsByTagName("DSN");
                for (var i = 0; i < dsns.length; i++) {
                    var dsn = dsns[i];
                    var dsnSource = dsn.getElementsByTagName("SOURCE");
                    assemblies.push(dsnSource[0].getAttribute('id'));
                }
                resolve(assemblies);
            }).then(function(response){
                reject(response);
            });
        });
    };

    ucsc.getSequence = function(assembly, chr, start, end) {
        return $q(function(resolve, reject) {
            start = parseInt(start);
            end = parseInt(end);
            if (!assembly || !chr || !start || !end) {
                reject("Invalid arguments (assembly: " + assembly + ", chr: " + chr + ", start: " + start + ", end: "+end+")");
            } else {
                $http.get(ucsc.das + assembly + "/dna?segment="+chr+":"+start+","+end).then(function(response) {
                    var sequence = "";
                    var parser = new DOMParser();
                    var xmlDoc = parser.parseFromString(response.data, "text/xml");
                    var dna = xmlDoc.getElementsByTagName("DNA")[0];
                    if (!dna || !dna.childNodes[0]) {
                        reject("Empty DNA sequence");
                    } else {
                        resolve(dna.childNodes[0].nodeValue.replace(/\s+/ig,""));
                    }
                }).then(function(response){
                    reject(response);
                });
            }
        });
    };

    ucsc.link = function(assembly, chrom, start, end) {
        return ucsc.tracks + '?db=' + assembly + '&position=' + chrom + ':' + start + '-' + end;
    };

    return ucsc;
});