angular.module("TriForC")
.controller('SearchController', function($scope, $routeParams, Enzyme, Compound) {
    var ctrl = this;
    var e = [],
        c = [],
        cids = [],
        eids = [];
    new Spinner($scope.spinnerOpts).spin(document.getElementById('spinEnzymes'));
    new Spinner($scope.spinnerOpts).spin(document.getElementById('spinCompounds'));

    ctrl.searchTerm = $routeParams.searchTerm;
    ctrl.enzymes = [];
    ctrl.compounds = [];
    ctrl.enzymesSearching = true;
    ctrl.compoundsSearching = true;
    Enzyme.query({Name: ctrl.searchTerm}, function(nameResults) {
        e = e.concat(nameResults);
        Enzyme.query({Description: ctrl.searchTerm}, function(descriptionResults) {
            e = e.concat(descriptionResults);
            Enzyme.query({Genbank: ctrl.searchTerm}, function(genbankResults) {
                e = e.concat(genbankResults);
                for (var i=0; i<e.length; i++) {
                    var enzyme = e[i];
                    if (!eids[enzyme.ID]) {
                        eids[enzyme.ID] = enzyme.ID;
                        ctrl.enzymes.push(enzyme);
                    }
                }
                ctrl.enzymesSearching = false;
            });
        });
    });
    Compound.query({Name: ctrl.searchTerm}, function(nameResults) {
        c = c.concat(nameResults);
        Compound.query({Alias: ctrl.searchTerm}, function(descriptionResults) {
            c = c.concat(descriptionResults);
            Compound.query({CAS: ctrl.searchTerm}, function(genbankResults) {
                c = c.concat(genbankResults);
                for (var i=0; i<c.length; i++) {
                    var compound = c[i];
                    if (!cids[compound.ID]) {
                        cids[compound.ID] = compound.ID;
                        ctrl.compounds.push(compound);
                    }
                }
                ctrl.compoundsSearching = false;
            });
        });
    });
    $scope.$parent.searchTerm = '';
});