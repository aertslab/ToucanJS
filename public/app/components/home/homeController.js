angular.module("ToucanJS")
.controller('HomeController', function($location, $scope, $timeout, $routeParams, $window, Workspace, File) {
    var ctrl = this;

    $scope.workspace = {
        features: [],
        uniqueFeatures: [],
        featureColors: {},
        sequences: {},
        longestRegionSize: 0,
        options: {
            sequencesLength: 0,
            maxScore: 0,
            numberOfTicks: 20,
            sequenceColor: 'grey',
            sequenceWidth: 2,
            featureFillOpacity: 0.5,
            featureStrokeColor: 'black',
            featureStrokeWidth: 0.5,
            featureStrokeOpacity: 1.0,
            axisStrokeArray: '2,5',
            axisStrokeColor: '#aaa',
            featureHeight: 10,
            height: 800,
            contextHeight: 40,
            margin: 20,
            sequenceMargin: 200
        }
    };

    function feature(seqID, source, featureType, startStr, endStr, score, strand, phase, attributesStr) {
        this.seqID = seqID;
        this.source = source;
        this.featureType = featureType;
        var start = parseInt(startStr);
        var end = parseInt(endStr);
        this.relativeStart = start > 0 ? start : end * -1;
        this.relativeEnd = end > 0 ? end : start * -1;
        this.score = parseFloat(score);
        this.strand = strand;
        this.phase = phase;

        var attributes = {};
        var featureIdIsSet = false;

        /* The following regex should handle the following GFF attributes formats:
         *   - key1 value1; key2 value2
         *   - key1 "value1"; key2 "value2"
         *   - key1=value1;key2=value2
         *   - key1="value1"; key2="value2"
         *   - key1="value1"; key2="value2"
         */
        var attributesRegEx = /(\w+)[ =]+["]?([^";]+)["]?[;]?/g;

        while (attributeMatches = attributesRegEx.exec(attributesStr)) {
            /* Add each GFF attribute key and value to the attributes dictionary. */
            attributes[attributeMatches[1]] = attributeMatches[2];

            if (! featureIdIsSet) {
                /* Set feature ID to the value of the first GFF attribute. */
                this.featureID = attributeMatches[2];
                featureIdIsSet = true;
            }
        }

        this.attributes = attributes;

        var re_chrom_pos_from_seqID = /^(.+):([0-9]+)-([0-9]+)(?:@(.+))?$/;
        var re_chrom_pos_from_seqID_match = re_chrom_pos_from_seqID.exec(this.seqID);

        if (re_chrom_pos_from_seqID_match !== null) {
            this.regionGenomicChrom = re_chrom_pos_from_seqID_match[1];
            this.regionGenomicStart = parseInt(re_chrom_pos_from_seqID_match[2]);
            this.regionGenomicEnd = parseInt(re_chrom_pos_from_seqID_match[3]);

            this.genomicChrom = this.regionGenomicChrom;
            this.genomicStart = this.regionGenomicStart + this.relativeStart - 1;
            this.genomicEnd = this.regionGenomicStart + this.relativeEnd - 1;

            if (re_chrom_pos_from_seqID_match.length === 5) {
                this.gene = re_chrom_pos_from_seqID_match[4];
            }
        }
    }

    function ParseGFFLine(element, index, array) {
        var gffLine = element;
        var gffColumns = gffLine.split('\n', 1)[0].split('\t');
        if (gffColumns.length === 9 && gffColumns[0].length !== 0 && gffColumns[0][0] !== '#') {
            var featureFromLine = new feature(gffColumns[0], gffColumns[1], gffColumns[2], gffColumns[3], gffColumns[4], gffColumns[5], gffColumns[6], gffColumns[7], gffColumns[8]);
            if (featureFromLine instanceof feature) {
                $scope.workspace.features.push(featureFromLine);

                if (!$scope.workspace.sequences[featureFromLine.seqID]) {
                    $scope.workspace.options.sequencesLength ++;
                    $scope.workspace.sequences[featureFromLine.seqID] = {
                        seqID : featureFromLine.seqID,
                        features: []
                    }
                }
                $scope.workspace.sequences[featureFromLine.seqID].features.push(featureFromLine);

                if (featureFromLine.score > $scope.workspace.options.maxScore) {
                    $scope.workspace.options.maxScore = featureFromLine.score;
                }

                if ($scope.workspace.uniqueFeatures.indexOf(featureFromLine.featureID) == -1) {
                    $scope.workspace.uniqueFeatures.push(featureFromLine.featureID);
                }
                if (!$scope.workspace.featureColors[featureFromLine.featureID]) {
                    $scope.workspace.featureColors[featureFromLine.featureID] =  randomColor({luminosity: 'dark', count: 1})[0];
                }

                var currentRegionSize = 0;
                if ('regionGenomicStart' in featureFromLine && 'regionGenomicEnd' in featureFromLine) {
                    currentRegionSize = featureFromLine.regionGenomicEnd - featureFromLine.regionGenomicStart;
                } else {
                    currentRegionSize = featureFromLine.relativeEnd;
                }

                $scope.workspace.longestRegionSize = Math.max($scope.workspace.longestRegionSize, currentRegionSize);
                if (!$scope.workspace.sequences[featureFromLine.seqID].regionSize) {
                    $scope.workspace.sequences[featureFromLine.seqID].regionSize = currentRegionSize;
                } else {
                    $scope.workspace.sequences[featureFromLine.seqID].regionSize = Math.max($scope.workspace.sequences[featureFromLine.seqID].regionSize, currentRegionSize);
                }
            }
        }
    }

    ctrl.loadWorkspace = function() {
        $scope.workspace.features = [];
        $scope.workspace.uniqueFeatures = [];
        $scope.workspace.files = [];
        $scope.workspace.sequences = {};
        $scope.workspace.options.sequencesLength = 0;
        $scope.workspace.loading = true;
        $timeout(function() {
            new Spinner($scope.spinnerOpts).spin(document.getElementById('spinLoading'));
        });
        Workspace.get({}, function(data) {
            if (!data.files) {
                $scope.workspace.loading = false;
                return;
            }
            $scope.workspace.files = Object.values(data.files);
            if ($scope.workspace.files.length == 0) {
                $scope.workspace.loading = false;
                return;
            }
            for (var i = 0; i < $scope.workspace.files.length; i++) {
                File.get({id: $scope.workspace.files[i]['id']}, function(data) {
                    data.features.forEach(ParseGFFLine);
                    $timeout(function() {
                        $scope.$apply();
                    })
                    $scope.workspace.loading = false;
                }, function() {
                    alert("unable to get file");
                })
            }
        }, function() {
            alert("unable to get workspace");
        });
    }

    ctrl.uploadFile = function() {
        var data = new FormData(document.getElementById("uploadForm"));
        $scope.message = "Uploading... Please be patient";
        var request = new XMLHttpRequest();
        request.open("POST", "api/file");
        request.onreadystatechange = function() {
            if (request.readyState == XMLHttpRequest.DONE) {
                try {
                    var res = JSON.parse(request.responseText);
                    var id = res.id;
                    $scope.message = "";
                    $("#uploadModal").modal('hide');
                    $("#uploadForm")[0].reset();
                    ctrl.loadWorkspace();
                } catch (err) {
                    $scope.message = request.responseText;
                }
                $timeout(function() {
                    $scope.$apply();
                });
            }
        }
        request.send(data);
    }

    ctrl.removeFile = function(id) {
        if (confirm("Are you sure to remove this file?")) {
            File.delete({id: id}, function(data) {
                ctrl.loadWorkspace();
            }, function() {
                alert("unable to remove file");
            })
        }
    }

    ctrl.clearWorkspace = function() {
        if (confirm("Are you sure to delete ALL data from your workspace?")) {
            Workspace.delete({}, function(data) {
                ctrl.loadWorkspace();
            }, function() {
                alert("unable to delete workspace");
            });
        }
    }

    ctrl.colorFeature = function(feature) {
        $('#color-'+feature).colorpicker('setValue', $scope.workspace.featureColors[feature]);
        $('#color-'+feature).colorpicker('show');
        $('#color-'+feature).on('changeColor', function(e) {
            $scope.workspace.featureColors[feature] = e.color.toHex();
            $timeout(function() {
                $scope.$apply();
            });
        });
        $('#color-'+feature).on('hidePicker', function() {
            $('#color-'+feature).off('changeColor');
        })
    }

    ctrl.loadWorkspace();

});