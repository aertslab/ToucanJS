angular.module("ToucanJS")
.factory('MotifDB', function($http, $q) {
    var motifDB = {
        endpoint: "https://toucanjs.aertslab.org/"
    };

    motifDB.getMotifs = function() {
        return $q(function(resolve, reject) {
            $http.get(motifDB.endpoint + "motifs").then(function(response) {
                resolve(response.data.motifs);
            }).then(function(response){
                reject(response);
            });
        });
    };

    motifDB.getTFs = function(assembly, chr, start, end) {
        return $q(function(resolve, reject) {
            $http.get(motifDB.endpoint + "tfs").then(function(response) {
                resolve(response.data.tfs);
            }).then(function(response){
                reject(response);
            });
        });
    };

    motifDB.getMotif = function(motif) {
        return $q(function(resolve, reject) {
            $http.get(motifDB.endpoint + "motif/" + motif).then(function(response) {
                resolve(response.data);
            }).then(function(response){
                reject(response);
            });
        });
    };

    motifDB.getTF = function(tf) {
        return $q(function(resolve, reject) {
            $http.get(motifDB.endpoint + "tf/" + tf).then(function(response) {
                resolve(response.data);
            }).then(function(response){
                reject(response);
            });
        });
    };

    return motifDB;
});