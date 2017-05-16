var app = angular.module('ToucanJS', []);

// small filter to support ordering objects according to their attributes
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

// main ToucanJS controller
app.controller('AppController', function($scope, $location, $document, $timeout, $http, UCSC) {
    // referencing controller
    var ctrl = this;

    // setting up Toucan DB (IndexedDB)
    var DBOpenRequest = window.indexedDB.open("ToucanDB", 4);
    var toucanDB;
    $scope.DBRequests = 0;

    // error handler for opening Toucan DB
    DBOpenRequest.onerror = function(event) {
        console.log("ToucanDB error", event);
        alert('Error loading a ToucanDB');
    };

    // success handler for opening Toucan DB
    DBOpenRequest.onsuccess = function(event) {
        // DB handle
        toucanDB = DBOpenRequest.result;

        // error handler for transactions on Toucan DB
        toucanDB.onerror = function(event) {
            console.log("ToucanDB error", event);
            alert("ToucanDB error: " + event.target.error);
        };

        // start loading the workspace
        ctrl.loadWorkspace();
        // get UCSC assembly list
        UCSC.getAssemblies().then(function(assemblies) {
            $scope.UCSCassemblies = assemblies;
        });
    };

    // update handler for Toucan DB
    DBOpenRequest.onupgradeneeded = function(event) {
        console.log("Updating ToucanDB");

        // updated DB handler
        var db = this.result;

        // update error handler
        db.onerror = function(event) {
            console.log("ToucanDB error", event);
            alert("ToucanDB error: " + event.target.error);
        };

        // recreate files store
        try {
            db.deleteObjectStore("files");
        } catch (err) {}
        db.createObjectStore("files", { keyPath: "ID", autoIncrement: true })
            .createIndex("name", "name", { unique: false });

        // recreate sequences store
        try {
            db.deleteObjectStore("sequences");
        } catch (err) {}
        db.createObjectStore("sequences", { keyPath: "seqID", autoIncrement: false });

        // recreate features store
        try {
            db.deleteObjectStore("features");
        } catch (err) {}
        db.createObjectStore("features", { keyPath: "ID", autoIncrement: false });

        // recreate options store
        try {
            db.deleteObjectStore("options");
        } catch (err) {}
        db.createObjectStore("options", { keyPath: "ID", autoIncrement: true });
    };

    // spinner defaults
    var spinnerDef = {
        lines: 13,
        length: 38,
        width: 17,
        radius: 0,
        scale: 0.25,
        corners: 1,
        color: '#000',
        opacity: 0.25,
        rotate: 0,
        direction: 1,
        speed: 1,
        trail: 60,
        fps: 20,
        zIndex: 2e9,
        className: 'spinner',
        shadow: false,
        hwaccel: false
    };

    // workspace defaults
    var workspaceDef = {
        features: {},
        sequences: {},
        files: {},
        loading: true,
        featuresLength: 0,
        filesLength: 0,
        sequencesLength: 0,
        sequenceFeaturesLength: 0,
        sequencesLoaded: 0,
    };

    // options defaults
    var optionsDef = {
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
        sequenceMargin: 200,
        maxScore: 0,
        longestRegionSize: 0,
        maxSearchResults: 5000,
        sequenceNameColor: 'black',
        sequenceDownloadedColor: 'blue',
        sequenceFoundColor: 'red'
    };

    // current workspace scope
    $scope.workspace = angular.copy(workspaceDef);

    // visualization options scope
    $scope.options = angular.copy(optionsDef);

    // file upload scope
    $scope.upload = {
        assemblyDefined: true,
        filesWithMissingAssemblies: []
    };

    // motif search scope
    $scope.search = {
        name: '',
        regexp: '',
        color: 'yellow',
        opacity: 0.5,
        score: 1,
        matchCount: 0,
    };

    $scope.move = {
        dx: 0,
        moving: false,
        seqID: null
    };

    $scope.cut = {
        cutting: false,
        drag: false,
        state: 0,
        start: 0,
        startX: 0,
        end: 0,
        endX: 0
    };

    // check for IDB support
    if (!window.indexedDB) {
        window.alert("Your browser doesn't support a stable version of IndexedDB. Please upgrade your browser.");
    }

    // check for FileAPI support
    if (!(window.File && window.FileReader && window.FileList && window.Blob)) {
        window.alert("Your browser doesn't support a stable version of File API. Please upgrade your browser.");
    }

    $(window).on("beforeunload", function() {
        if ($scope.DBRequests > 0)
            return "ToucanJS is still writing changes to the database. If you leave now you will loose some of the data.";
        else
            return undefined;
    });

    function DBSave(store, obj, callback) {
        $scope.DBRequests++;
        var t = toucanDB.transaction(store, "readwrite")
            .objectStore(store)
            .put(obj);
        t.onsuccess = function(evt) {
                if (callback) callback(evt);
                $scope.DBRequests--;
                $timeout(function() {
                    $scope.$apply();
                });
            };
        t.onerror = function(evt) {
            $scope.DBRequests--;
            console.log(evt);
        }
    }

    function DBDelete(store, id, callback) {
        $scope.DBRequests++;
        request = toucanDB.transaction(store, "readwrite")
            .objectStore(store)
            .delete(id)
            .onsuccess = function(evt) {
                if (callback) callback(evt);
                $scope.DBRequests--;
                $timeout(function() {
                    $scope.$apply();
                });
            };
    }

    // feature generator for GFF parser
    function Feature(seqID, source, featureType, startStr, endStr, score, strand, phase, attributesStr) {
        // define feature attributes from 1st till 8th column
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

        // parse feature attributes from 9th column
        /* The following regex should handle the following GFF attributes formats:
         *   - key1 value1; key2 value2
         *   - key1 "value1"; key2 "value2"
         *   - key1=value1;key2=value2
         *   - key1="value1"; key2="value2"
         *   - key1="value1"; key2="value2"
         */
        var attributes = {};
        var featureIdIsSet = false;
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

        // parse chromosome position from 1st column
        /* The following regex should handle the following formats:
        */
        var re_chrom_pos_from_seqID = /^(.+):([0-9]+)-([0-9]+)(?:@(.+))?$/;
        var re_chrom_pos_from_seqID_match = re_chrom_pos_from_seqID.exec(this.seqID);
        if (re_chrom_pos_from_seqID_match !== null) {
            // region position
            this.regionGenomicChrom = re_chrom_pos_from_seqID_match[1];
            this.regionGenomicStart = parseInt(re_chrom_pos_from_seqID_match[2]);
            this.regionGenomicEnd = parseInt(re_chrom_pos_from_seqID_match[3]);
            // feature position
            this.genomicChrom = this.regionGenomicChrom;
            this.genomicStart = this.regionGenomicStart + this.relativeStart - 1;
            this.genomicEnd = this.regionGenomicStart + this.relativeEnd - 1;
            // gene info
            if (re_chrom_pos_from_seqID_match.length === 5) {
                this.gene = re_chrom_pos_from_seqID_match[4];
            }
        }
    }

    // line parser for GFF files
    function parseGFFLine(gffLine) {
        var gffColumns = gffLine.split('\n', 1)[0].split('\t');
        if (gffColumns.length == 9 && gffColumns[0].length != 0 && gffColumns[0][0] != '#') {
            // make new sequence feature
            var seqFeature = new Feature(gffColumns[0], gffColumns[1], gffColumns[2], gffColumns[3], gffColumns[4], gffColumns[5], gffColumns[6], gffColumns[7], gffColumns[8]);
            seqFeature.fileID = this.ID;
            $scope.workspace.sequenceFeaturesLength++;
            var seq;
            if ($scope.workspace.sequences[seqFeature.seqID]) {
                // get sequence for this feature
                seq = $scope.workspace.sequences[seqFeature.seqID];
            } else {
                // make sequence for this feature
                seq = {
                    seqID : seqFeature.seqID,
                    genomicChrom: seqFeature.regionGenomicChrom,
                    genomicStart: seqFeature.regionGenomicStart,
                    genomicEnd: seqFeature.regionGenomicEnd,
                    fileID : this.ID,
                    features: [],
                    show: true,
                    DNAsequence: ""
                };
                // add to workspace scope
                $scope.workspace.sequences[seqFeature.seqID] = seq;
                $scope.workspace.sequencesLength ++;
                // save newly created sequence instance it to ToucanDB
            }
            // add feature to sequence
            seq.features.push(seqFeature);

            // correct maxScore if needed (for visualization and for search)
            if (seqFeature.score > $scope.options.maxScore) {
                $scope.options.maxScore = seqFeature.score;
                $scope.search.score = $scope.options.maxScore;
            }

            // check if feature definition already present in workspace scope
            if (!$scope.workspace.features[seqFeature.featureID]) {
                var feature = {
                    ID: seqFeature.featureID,
                    color: randomColor({luminosity: 'dark', count: 1})[0],
                    opacity: $scope.options.featureFillOpacity,
                    show: true
                }
                $scope.workspace.features[seqFeature.featureID] = feature;
                saveFeature(feature);
            }

            // adjust the sequence region size
            var currentRegionSize = 0;
            if ('regionGenomicStart' in seqFeature && 'regionGenomicEnd' in seqFeature) {
                currentRegionSize = seqFeature.regionGenomicEnd - seqFeature.regionGenomicStart;
            } else {
                currentRegionSize = seqFeature.relativeEnd;
            }
            $scope.options.longestRegionSize = Math.max($scope.options.longestRegionSize, currentRegionSize);
            if (!seq.regionSize) {
                seq.regionSize = currentRegionSize;
            } else {
                seq.regionSize = Math.max(seq.regionSize, currentRegionSize);
            }

            // define the sequence assembly if present
            if (!seq.assembly) {
                seq.assembly = seqFeature.attributes['assembly'];
            } else if (seqFeature.attributes['assembly'] && seqFeature.attributes['assembly'] != undefined){
                if (seq.assembly != seqFeature.attributes['assembly']) {
                    alert("Assembly mismatch: "+ seq.assembly + " vs. "+seqFeature.attributes['assembly']);
                }
            }

            // save the sequence changes
            saveSequence(seq);
        }
    }

    // load sequences from ToucanDB
    function loadSequences() {
        $scope.DBRequests++;
        toucanDB.transaction("sequences")
            .objectStore("sequences")
            .openCursor()
            .onsuccess = function(event) {
                var sequencesCursor = event.target.result;
                if (sequencesCursor) {
                    // add each sequence region to workspace scope
                    var seq = sequencesCursor.value;
                    $scope.workspace.sequences[seq.seqID] = seq;
                    $scope.workspace.sequencesLength ++;
                    $scope.workspace.sequenceFeaturesLength += seq.features.length;
                    sequencesCursor.continue();
                } else {
                    $scope.DBRequests--;
                    // no more sequences: done loading => get sequences & refresh scope
                    $scope.workspace.loading = false;
                    if ($scope.workspace.sequencesLength) {
                        $scope.options.featureHeight = parseInt(($scope.options.height-3*$scope.options.margin-$scope.options.contextHeight)/(2*$scope.workspace.sequencesLength));
                    }
                    $timeout(function() {
                        ctrl.getSequences();
                        $scope.$apply();
                    });
                }
            }
    }

    function saveSequence(seq, callback) {
        DBSave("sequences", seq, callback);
    }

    function deleteSequence(seqID, callback) {
        DBDelete("sequences", seqID, callback);
    }

    // load feature definitions from ToucanDB
    function loadFeatures() {
        $scope.DBRequests++;
        toucanDB.transaction("features")
            .objectStore("features")
            .openCursor()
            .onsuccess = function(event) {
                var featureCursor = event.target.result;
                if (featureCursor) {
                    // add each feature definition to workspace scope
                    var featureDef = featureCursor.value;
                    $scope.workspace.features[featureDef.ID] = featureDef;
                    featureCursor.continue();
                } else {
                    $scope.DBRequests--;
                    // no more features : go to next step => loading sequences
                    loadSequences();
                }
            }
    }

    function saveFeature(feature, callback) {
        DBSave("features", feature, callback);
    }

    function deleteFeature(featureID, callback) {
        DBDelete("features", featureID, callback);
    }

    // load files from ToucanDB
    function loadFiles() {
        $scope.DBRequests++;
        toucanDB.transaction("files")
            .objectStore("files")
            .openCursor()
            .onsuccess = function(event) {
                var filesCursor = event.target.result;
                if (filesCursor) {
                    // add each file to workspace scope
                    var file = filesCursor.value;
                    $scope.workspace.files[file.ID] = file;
                    $scope.workspace.filesLength++;
                    filesCursor.continue();
                } else {
                    $scope.DBRequests--;
                    // no more files: go to next step => loading features
                    loadFeatures();
                }
            }
    }

    function saveFile(file, callback) {
        DBSave("files", file, callback);
    }

    function deleteFile(fileID, callback) {
        DBDelete("files", fileID, callback);
    }

    // load options from ToucanDB
    function loadOptions() {
        let opts = null;
        $scope.DBRequests++;
        toucanDB.transaction("options")
            .objectStore("options")
            .openCursor()
            .onsuccess = function(event) {
                var optionsCursor = event.target.result;
                if (optionsCursor) {
                    opts = optionsCursor.value;
                    optionsCursor.continue();
                } else {
                    $scope.DBRequests--;
                    if (opts === null) {
                        // no options yet present in Toucan DB: save the current ones
                        saveOptions($scope.options, function(addEvt) {
                            $scope.options.ID = addEvt.target.result;
                        });
                    } else {
                        // load the options from ToucanDB to options scope
                        $scope.options = opts;
                    }
                    // update max score for search scope
                    $scope.search.score = $scope.options.maxScore;
                    // go to next step => loading files
                    loadFiles();
                }
            }
    }

    function saveOptions(opts, callback) {
        DBSave("options", opts, callback);
    }

    function compliment(base) {
        if (base == 'a' || base == 'A') return 'T';
        if (base == 't' || base == 'T') return 'A';
        if (base == 'c' || base == 'C') return 'G';
        if (base == 'g' || base == 'G') return 'C';
        return base;
    }

    function reverseCompliment(sequence) {
        var newSequence = "";
        for (var i = sequence.length - 1; i >= 0; i--) {
            newSequence += compliment(sequence[i]);
        }
        return newSequence;
    }

    function getChrom(chrom) {
        var res = chrom.match(/chr.+$/ig);
        return res && res[0] ? res[0] : '';
    }

    // load complete workspace from ToucanDB
    ctrl.loadWorkspace = function() {
        $scope.workspace = angular.copy(workspaceDef);
        $scope.workspace.loading = true;
        $timeout(function() {
            new Spinner(spinnerDef).spin(document.getElementById('spinLoading'));
        });
        // start from loading options
        loadOptions();
    }

    // get DNA sequences for all loaded regions
    ctrl.getSequences = function() {
        for (var id in $scope.workspace.sequences) {
            let seq = $scope.workspace.sequences[id];
            if (seq.DNAsequence.length) {
                // sequence is already present
                $scope.workspace.sequencesLoaded ++;
                continue;
            }
            // if assembly not spefified, get the provided assembly during file upload
            seq.assembly = seq.assembly ? seq.assembly : ($scope.workspace.files[seq.fileID] ? $scope.workspace.files[seq.fileID].assembly : null);
            // extract chromosome nr
            var chromosome = seq.genomicChrom ? getChrom(seq.genomicChrom) : null;
            // use USCS to obtain sequence
            UCSC.getSequence(seq.assembly, chromosome, seq.genomicStart, seq.genomicEnd)
                .then(function(sequence) {
                    seq.DNAsequence = sequence;
                    // add to workspace scope
                    $scope.workspace.sequences[seq.seqID].DNAsequence = sequence;
                    $scope.workspace.sequences[seq.seqID].reverseComplimentDNAsequence = reverseCompliment(sequence);
                    $scope.workspace.sequencesLoaded ++;
                    // save to ToucanDB
                    saveSequence(seq);
                    // refresh scope
                    $timeout(function() {
                        $scope.$apply();
                    });
                }, function(message) {
                    console.log("Loading DNA sequence from UCSC for " + seq.seqID + " failed: " + message);
                });
        }
    }

    ctrl.toggleSequence = function(seq) {
        seq.show = !seq.show;
        saveSequence(seq);
    }

    ctrl.removeSequence = function(seqID) {
        if (confirm("Are you sure to remove this file and all associated features?")) {
            delete($scope.workspace.sequences[seqID]);
            deleteSequence(seqID);
        }
    }

    ctrl.uploadFile = function() {
        var files = $("#GFFfile")[0].files;
        for (var i = 0; i < files.length; i++) {
            let f = files[i];
            var reader = new FileReader();
            reader.onload = function(loadEvt) {
                let features = loadEvt.target.result.split("\n");
                let fileSpec = {
                    name: f.name,
                    show: true
                };
                saveFile(fileSpec, function(successEvt) {
                    fileSpec.ID = successEvt.target.result;
                    $scope.workspace.files[fileSpec.ID] = fileSpec;
                    features.forEach(parseGFFLine, fileSpec);
                    // save the options changes
                    saveOptions($scope.options);
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
                        ctrl.getSequences();
                    } else {
                        $scope.upload.filesWithMissingAssemblies.push(fileSpec);
                        $scope.upload.assemblyDefined = false;
                    }
                    $scope.workspace.filesLength++;
                    $scope.options.featureHeight = parseInt(($scope.options.height-3*$scope.options.margin-$scope.options.contextHeight)/(2*$scope.workspace.sequencesLength));
                    $timeout(function() {
                        saveOptions($scope.options);
                        $scope.$apply();
                    });
                });
            };
            reader.readAsText(f);
        }
    }

    ctrl.updateAssembly = function() {
        for (var i = 0; i < $scope.upload.filesWithMissingAssemblies.length; i++){
            var fileSpec = $scope.upload.filesWithMissingAssemblies[i];
            fileSpec.assembly = $scope.upload.assembly;
            saveFile(fileSpec);
        }
        $("#uploadModal").modal('hide');
        $("#uploadForm")[0].reset();
        $scope.upload.assemblyDefined = true;
        ctrl.getSequences();
    }

    ctrl.toggleFeature = function(feature) {
        feature.show = !feature.show;
        saveFeature(feature);
    }

    ctrl.removeFeature = function(featureID) {
        if (confirm("Are you sure to remove all associated features with this group?")) {
            for (var seqID in $scope.workspace.sequences) {
                var seq = $scope.workspace.sequences[seqID];
                for (var f = seq.features.length - 1; f >= 0; f--) {
                    if (seq.features[f].featureID == featureID) {
                        seq.features.splice(f, 1);
                        $scope.workspace.sequenceFeaturesLength--;
                    }
                }
                if (seq.features.length == 0) {
                    delete($scope.workspace.sequences[seqID]);
                    deleteSequence(seqID);
                    $scope.workspace.sequencesLength--;
                } else {
                    saveSequence(seq);
                }
            }
            delete($scope.workspace.features[featureID]);
            deleteFeature(featureID);
        }
    }

    $scope.escapeID = function(id) {
        return hex_md5(id);
    }

    ctrl.colorFeature = function(feature) {
        var control = $('#color-'+$scope.escapeID(feature.ID));
        control.colorpicker('setValue', feature.color);
        control.data('colorpicker').color.setAlpha(feature.opacity);
        control.colorpicker('update');
        control.colorpicker('show');
        control.on('changeColor', function(e) {
            feature.color = e.color.toHex();
            feature.opacity = e.color.value.a;
            saveFeature(feature);
            $timeout(function() {
                $scope.$apply();
            });
        });
        control.on('hidePicker', function() {
            control.off('changeColor');
        });
    }

    ctrl.toggleFile = function(file) {
        file.show = !file.show;
        saveFile(file);
    }


    ctrl.removeFile = function(id) {
        if (confirm("Are you sure to remove this file and all associated features?")) {
            for (var seqID in $scope.workspace.sequences) {
                var seq = $scope.workspace.sequences[seqID];
                for (var f = seq.features.length - 1; f >= 0; f--) {
                    if (seq.features[f].fileID == id) {
                        seq.features.splice(f, 1);
                        $scope.workspace.sequenceFeaturesLength--;
                    }
                }
                if (seq.features.length == 0) {
                    delete($scope.workspace.sequences[seqID]);
                    deleteSequence(seqID);
                    $scope.workspace.sequencesLength--;
                } else {
                    saveSequence(seq);
                }
            }
            deleteFile(id, ctrl.loadWorkspace);
        }
    }

    ctrl.saveSearchAsFeature = function() {
        var feature = {
            ID: $scope.search.name,
            color: $scope.search.color,
            opacity: $scope.search.opacity,
            show: true
        }
        $scope.workspace.features[feature.ID] = feature;
        saveFeature(feature);
        for (var seqID in $scope.search.matches) {
            var sequence = $scope.workspace.sequences[seqID];
            var matches = $scope.search.matches[seqID];
            for (var i = 0; i < matches.length; i++) {
                var match = matches[i];
                sequence.features.push({
                    attributes: {
                        Name: null,
                        site: match.site
                    },
                    featureID: $scope.search.name,
                    featureType: null,
                    gene: null,
                    genomicChrom: sequence.genomicChrom,
                    genomicEnd: sequence.genomicStart + match.start,
                    genomicStart: sequence.genomicStart + match.end,
                    phase: null,
                    regionGenomicChrom: sequence.genomicChrom,
                    regionGenomicEnd: sequence.genomicEnd,
                    regionGenomicStart: sequence.genomicStart,
                    relativeEnd: match.end,
                    relativeStart: match.start,
                    score: $scope.search.score,
                    seqID: seqID,
                    source: 'search',
                    strand: match.strand
                });
            }
            saveSequence(sequence);
        }
        $scope.search.matchCount = 0;
        $scope.search.matches = {};
        $scope.search.regexp = '';
        $scope.search.name = '';
        $timeout(function(){
            $scope.$apply();
        })
    }

    ctrl.saveOptions = function() {
        saveOptions($scope.options);
    }


    ctrl.clearWorkspace = function() {
        if (confirm("Are you sure to delete ALL data from your workspace?")) {
            $scope.DBRequests++;
            toucanDB.transaction("files", "readwrite")
                .objectStore("files")
                .clear()
                .onsuccess = function(event) {
                    toucanDB.transaction("sequences", "readwrite")
                        .objectStore("sequences")
                        .clear()
                        .onsuccess = function(event) {
                            toucanDB.transaction("features", "readwrite")
                                .objectStore("features")
                                .clear()
                                .onsuccess = function(event) {
                                    toucanDB.transaction("options", "readwrite")
                                        .objectStore("options")
                                        .clear()
                                        .onsuccess = function(event) {
                                            $scope.DBRequests--;
                                            $scope.options = angular.copy(optionsDef);
                                            $scope.workspace = angular.copy(workspaceDef);
                                            $scope.workspace.loading = false;
                                            $timeout(function() {
                                                $scope.$apply();
                                            })
                                        }
                                };
                        };
                };
        }
    }

    ctrl.searchFeatures = function() {
        $scope.search.matchCount = 0;
        $scope.search.limit = false;
        $scope.search.invalid = false;
        $scope.search.matches = {};
        for (var id in $scope.workspace.sequences) {
            $scope.search.matches[id] = [];
        }
        if ($scope.search.regexp && $scope.search.regexp.length){
            try {
                var regexp = new RegExp($scope.search.regexp, 'ig');
                for (var id in $scope.workspace.sequences) {
                    var seq = $scope.workspace.sequences[id];
                    if (!seq.DNAsequence.length) continue;
                    if ($scope.search.matchCount >= $scope.options.maxSearchResults) {
                        $scope.search.limit = true;
                        break;
                    }
                    var res;
                    do {
                        res = regexp.exec(seq.DNAsequence);
                        if (res) {
                            $scope.search.matches[id].push({
                                start: res.index,
                                end: res.index + res[0].length,
                                strand: '+',
                                site: res[0].toUpperCase(),
                                score: 10,
                            });
                            $scope.search.matchCount ++;
                        }
                    } while (res && $scope.search.matchCount < $scope.options.maxSearchResults);
                    do {
                        res = regexp.exec(seq.reverseComplimentDNAsequence);
                        if (res) {
                            $scope.search.matches[id].push({
                                start: res.index,
                                end: res.index + res[0].length,
                                strand: '-',
                                site: res[0].toUpperCase(),
                                score: 10,
                            });
                            $scope.search.matchCount ++;
                        }
                    } while (res && $scope.search.matchCount < $scope.options.maxSearchResults);
                }
            } catch (err) {
                $scope.search.invalid = true;
                return;
            }
        }
        $timeout(function() {
            $scope.$apply();
        });
    }

    ctrl.reverseSequence = function(seq) {
        seq.reverse = !seq.reverse;
        saveSequence(seq);
    }

    ctrl.linkUCSC = function (seq) {
        var link = UCSC.link(seq.assembly, getChrom(seq.genomicChrom), seq.genomicStart, seq.genomicEnd);
        window.open(link);
    }

    ctrl.moveSequence = function(seq) {
        if ($scope.move.moving) {
            if ($scope.move.seq == seq) {
                $scope.move.moving = false;
                $scope.move.seq = null;
                saveSequence(seq);
            }
        } else {
            $scope.move.seq = seq;
            $scope.move.moving = true;
        }
    }

    ctrl.cutSequencesStart = function() {
        $scope.cut.cutting = !$scope.cut.cutting;
        $scope.cut.drag = false;
    }

    ctrl.cutSequencesDo = function() {
        $scope.cut.cutting = false;
        $("#cutModal").modal("hide");
        $scope.options.longestRegionSize = $scope.cut.end - $scope.cut.start;
        for (var seqID in $scope.workspace.sequences) {
            var seq = $scope.workspace.sequences[seqID];
            seq.regionSize -= $scope.cut.start;
            if (seq.regionSize > $scope.options.longestRegionSize) seq.regionSize = $scope.options.longestRegionSize;
            seq.genomicStart += $scope.cut.start;
            seq.genomicEnd = seq.genomicStart + seq.regionSize;
            var features = [];
            for (var f = seq.features.length - 1; f >=0 ; f--) {
                var feature = seq.features[f];
                feature.relativeStart -= $scope.cut.start;
                feature.relativeEnd -= $scope.cut.start;
                // feature has fallen of left to starting point
                if (feature.relativeEnd < 0) {
                    seq.features.splice(f, 1);
                    continue;
                }
                // feature has fallen of right to ending point
                if (feature.genomicStart > seq.genomicEnd) {
                    seq.features.splice(f, 1);
                    continue;
                }
                // cut from left side if needed
                if (feature.relativeStart < 0) {
                    feature.relativeStart = 0;
                    feature.genomicStart = seq.genomicStart;
                }
                // cut from right side if needed
                if (feature.genomicEnd > seq.genomicEnd) {
                    feature.genomicEnd = seq.genomicEnd;
                    feature.relativeEnd = feature.genomicEnd - seq.genomicStart;
                }
                // update region info
                feature.regionGenomicStart = seq.genomicStart;
                feature.regionGenomicEnd = seq.genomicEnd;
                seq.features[f] = feature;
            }
            saveSequence(seq);
        }
        saveOptions($scope.options);
        $scope.cut.state = 3;
    }

    $("#uploadModal").on("show.bs.modal", function() {
        $scope.upload.assemblyDefined = true;
        $scope.upload.filesWithMissingAssemblies = [];
    });

    $timeout(function() {
        var control = $('#cp2');
        control.colorpicker();
        control.colorpicker('setValue', $scope.search.color);
        control.on('changeColor', function(e) {
            $scope.search.color = e.color.toHex();
            $scope.search.opacity = e.color.value.a;
            $timeout(function() {
                $scope.$apply();
            });
        });
    }, 100);

/*
    igv.browser = {
        referenceFrame: {
            bpPerPixel: 1000
        }
    }

    let bwSource = new igv.BWSource({url: 'https://data.broadinstitute.org/igvdata/test/data/bigwig/bigWigExample.bw'});
    bwSource.getFeatures('chr21', 33031597, 33041570).then(function(f) {
        console.log('finished', f);
    });

*/
});