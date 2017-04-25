var app = angular.module('ToucanJS', []);

app.filter('orderObjectBy', function($filter){
 return function(input, attribute) {
    if (!angular.isObject(input)) return input;

    var array = [];
    for(var objectKey in input) {
        array.push(input[objectKey]);
    }

    return $filter('orderBy')(array, attribute);
 }
});

app.controller('AppController', function($scope, $location, $document, $timeout, UCSC) {
    // referencing controller
    var ctrl = this;

    // setting up Toucan DB (IndexedDB)
    var DBOpenRequest = window.indexedDB.open("ToucanDB", 3);
    var toucanDB;

    DBOpenRequest.onerror = function(event) {
        alert('Error loading a ToucanDB');
    };

    DBOpenRequest.onsuccess = function(event) {
        toucanDB = DBOpenRequest.result;

        toucanDB.onerror = function(event) {
            alert("ToucanDB error: " + event.target.errorCode);
        };

        // TODO: run loadWorkspace
        ctrl.loadWorkspace();
    };

    DBOpenRequest.onupgradeneeded = function(event) {
        console.log("Updating ToucanDB");

        var db = this.result;
        db.onerror = function(event) {
            alert("Could not create ToucanDB");
        };

        try {
            var fileStore = db.createObjectStore("files", { keyPath: "ID", autoIncrement: true });
            fileStore.createIndex("name", "name", { unique: false });
        } catch (err) {
        }

        try {
            var optionsStore = db.createObjectStore("options", { keyPath: "ID", autoIncrement: true });
        } catch(err) {
        }
    };

    UCSC.getAssemblies().then(function(assemblies) {
        $scope.UCSCassemblies = assemblies;
    });

    var spinnerOpts = {
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

    $scope.workspace = {
        features: [],
        featureTypes: {},
        sequences: {},
        files: [],
        longestRegionSize: 0,
        loading: true,
        sequencesLength: 0,
        maxScore: 0,
    };

    $scope.options = {
        scaleStep: 0.25,
        numberOfTicks: 20,
        sequenceColor: 'grey',
        sequenceWidth: 2,
        featureStrokeColor: 'black',
        featureStrokeWidth: 0.5,
        featureStrokeOpacity: 1.0,
        featureFillOpacity: 0.5,
        axisStrokeArray: '2,5',
        axisStrokeColor: '#aaa',
        featureHeight: 10,
        height: 800,
        contextHeight: 40,
        margin: 20,
        sequenceMargin: 200
    };

    $scope.upload = {
        assemblyDefined: true,
        filesWithMissingAssemblies: []
    };

    if (!window.indexedDB) {
        window.alert("Your browser doesn't support a stable version of IndexedDB. Please upgrade your browser.");
    }

    if (!(window.File && window.FileReader && window.FileList && window.Blob)) {
        window.alert("Your browser doesn't support a stable version of File API. Please upgrade your browser.");
    }

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
                    $scope.workspace.sequencesLength ++;
                    $scope.workspace.sequences[featureFromLine.seqID] = {
                        seqID : featureFromLine.seqID,
                        features: [],
                    }
                }
                $scope.workspace.sequences[featureFromLine.seqID].features.push(featureFromLine);

                if (featureFromLine.score > $scope.workspace.maxScore) {
                    $scope.workspace.maxScore = featureFromLine.score;
                }

                if (!$scope.workspace.featureTypes[featureFromLine.featureID]) {
                    $scope.workspace.featureTypes[featureFromLine.featureID] = {
                        ID: featureFromLine.featureID,
                        color: randomColor({luminosity: 'dark', count: 1})[0],
                        opacity: $scope.options.featureFillOpacity,
                        show: true
                    }
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

                if (!$scope.workspace.sequences[featureFromLine.seqID].assembly ) {
                    $scope.workspace.sequences[featureFromLine.seqID].assembly = featureFromLine.attributes['assembly'];
                } else {
                    if ($scope.workspace.sequences[featureFromLine.seqID].assembly != featureFromLine.attributes['assembly']) {
                        alert("Assembly mismatch");
                    }
                }
            }
        }
    }

    ctrl.loadWorkspace = function() {
        $scope.workspace.features = [];
        $scope.workspace.featureTypes = {};
        $scope.workspace.files = [];
        $scope.workspace.sequences = {};
        $scope.workspace.sequencesLength = 0;
        $scope.workspace.loading = true;
        $timeout(function() {
            new Spinner(spinnerOpts).spin(document.getElementById('spinLoading'));
        });
        toucanDB.transaction("options")
            .objectStore("options")
            .getAll()
            .onsuccess = function(listEvt) {
                var opts = listEvt.target.result;
                if (opts.length == 0) {
                    toucanDB.transaction("options", "readwrite")
                        .objectStore("options")
                        .add($scope.options)
                        .onsuccess = function(addEvt) {
                            $scope.options.ID = addEvt.target.result;
                        }
                } else {
                    $scope.options = opts[0];
                }
            };
        toucanDB.transaction("files")
            .objectStore("files")
            .openCursor()
            .onsuccess = function(event) {
                var cursor = event.target.result;
                if (cursor) {
                    var file = cursor.value;
                    console.log(file.assembly);
                    $scope.workspace.files.push(file);
                    file.features.forEach(ParseGFFLine);
                    cursor.continue();
                } else {
                    $scope.workspace.loading = false;
                    //console.log($scope.workspace);
                    $timeout(function() {
                        $scope.$apply();
                    })
                }
            };
    }

    ctrl.uploadFile = function() {
            var files = $("#file")[0].files;
            for (var i = 0; i < files.length; i++) {
                let f = files[i];
                var reader = new FileReader();
                reader.onload = function(loadEvt) {
                    let features = loadEvt.target.result.split("\n");
                    let fileSpec = {
                        name: f.name,
                        features: features
                    };
                    var request = toucanDB.transaction("files", "readwrite")
                        .objectStore("files")
                        .add(fileSpec)
                        .onsuccess = function(successEvt) {
                            fileSpec.ID = successEvt.target.result;
                            $scope.workspace.files.push(fileSpec);
                            features.forEach(ParseGFFLine);
                            var assemblyDefined = true;
                            for (var seq in $scope.workspace.sequences) {
                                if (!$scope.workspace.sequences[seq].assembly) {
                                    assemblyDefined = false;
                                    break;
                                }
                            }
                            if (assemblyDefined) {
                                $("#uploadModal").modal('hide');
                                $("#uploadForm")[0].reset();
                            } else {
                                $scope.upload.filesWithMissingAssemblies.push({
                                    ID: fileSpec.ID,
                                    name: fileSpec.name
                                });
                                $scope.upload.assemblyDefined = false;
                            }
                            $timeout(function() {
                                $scope.$apply();
                            });
                        };
                };
                reader.readAsText(f);
            }
    }

    ctrl.updateAssembly = function() {
        for (var i = 0; i < $scope.upload.filesWithMissingAssemblies.length; i++){
            var fileSpec = $scope.upload.filesWithMissingAssemblies[i];
            var objectStore = toucanDB.transaction("files", "readwrite").objectStore("files");
            objectStore.get(fileSpec.ID)
                .onsuccess = function(successEvt) {
                    var data = successEvt.target.result;
                    data.assembly = $scope.upload.assembly;
                    objectStore.put(data);
                }
        }
        $("#uploadModal").modal('hide');
        $("#uploadForm")[0].reset();
    }

    ctrl.toggleFeature = function(feature) {
        $scope.workspace.featureTypes[feature].show = !$scope.workspace.featureTypes[feature].show;
    }

    ctrl.colorFeature = function(feature) {
        var c = $('#color-'+feature).colorpicker('setValue', $scope.workspace.featureTypes[feature].color);
        $('#color-'+feature).data('colorpicker').color.setAlpha($scope.workspace.featureTypes[feature].opacity);
        $('#color-'+feature).colorpicker('update');
        $('#color-'+feature).colorpicker('show');
        $('#color-'+feature).on('changeColor', function(e) {
            $scope.workspace.featureTypes[feature].color = e.color.toHex();
            $scope.workspace.featureTypes[feature].opacity = e.color.value.a;
            $timeout(function() {
                $scope.$apply();
            });
        });
        $('#color-'+feature).on('hidePicker', function() {
            $('#color-'+feature).off('changeColor');
        });
    }

    ctrl.removeFile = function(id) {
        if (confirm("Are you sure to remove this file?")) {
            request = toucanDB.transaction("files", "readwrite")
                .objectStore("files")
                .delete(id)
                .onsuccess = function(event) {
                    ctrl.loadWorkspace();
                };
        }
    }

    ctrl.saveOptions = function() {
        toucanDB.transaction("options", "readwrite")
            .objectStore("options")
            .put($scope.options)
            .onsuccess = function(addEvt) {
                console.log("opts saved");
            }
    }

    ctrl.clearWorkspace = function() {
        if (confirm("Are you sure to delete ALL data from your workspace?")) {
            request = toucanDB.transaction("files", "readwrite")
                .objectStore("files")
                .clear()
                .onsuccess = function(event) {
                    ctrl.loadWorkspace();
                };
        }
    }

    $("#uploadModal").on("show.bs.modal", function() {
        $scope.upload.assemblyDefined = true;
        $scope.upload.filesWithMissingAssemblies = [];
    });

});