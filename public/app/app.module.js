var app = angular.module('ToucanJS', []);
// main ToucanJS controller
app.controller('AppController', function($scope, $location, $document, $timeout, $http, UCSC, IDB, MotifDB) {
    // referencing controller
    var ctrl = this;

    //
    // classes
    //

    function Workspace() {
        this.features               = {};
        this.featuresLength         = 0;
        this.files                  = {};
        this.filesLength            = 0;
        this.loading                = true;
        this.sequenceFeaturesLength = 0;
        this.sequences              = {};
        this.sequencesLength        = 0;
        this.sequencesLoaded        = 0;
    };

    function Options() {
        this.ID                     = 1;
        this.axisStrokeArray        = '2;5';
        this.axisStrokeColor        = '#aaa';
        this.contextHeight          = 40;
        this.featureFillOpacity     = 0.5;
        this.featureHeight          = 10;
        this.featureStrokeColor     = 'black';
        this.featureStrokeOpacity   = 1.0;
        this.featureStrokeWidth     = 0.5;
        this.height                 = 800;
        this.longestRegionSize      = 0;
        this.margin                 = 20;
        this.maxScore               = 0;
        this.maxSearchResults       = 5000;
        this.numberOfTicks          = 20;
        this.scaleStep              = 0.25;
        this.sequenceColor              = 'grey';
        this.sequenceDownloadedColor    = 'blue';
        this.sequenceFoundColor         = 'red';
        this.sequenceMargin             = 200;
        this.sequenceNameColor          = 'black';
        this.sequenceWidth              = 2;
    };

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

    function Sequence(seqID, regionGenomicChrom, regionGenomicStart, regionGenomicEnd, fileID) {
        this.seqID  = seqID;
        this.genomicChrom = regionGenomicChrom;
        this.genomicStart = regionGenomicStart;
        this.genomicEnd = regionGenomicEnd;
        this.fileID = fileID;
        this.features = [];
        this.show = true;
        this.bigWigMaxValue = 0;
        this.bigWigData = {};
        this.DNAsequence = '';
        this.reverseComplimentDNAsequence = '';
    }

    // TODO: add File, FeatureType classes

    //
    // scope vars
    //

    // current workspace scope
    $scope.workspace = new Workspace();
    $scope.options = new Options();

    // spinner defaults
    $scope.spinner = {
        lines:      13,
        length:     38,
        width:      17,
        radius:     0,
        scale:      0.25,
        corners:    1,
        color:      '#000',
        opacity:    0.25,
        rotate:     0,
        direction:  1,
        speed:      1,
        trail:      60,
        fps:        20,
        zIndex:     2e9,
        className:  'spinner',
        shadow:     false,
        hwaccel:    false
    };

    // file upload scope
    $scope.upload = {
        assembly:   '',
        bigWigFile: '',
        message:    ''
    };

    // motif search scope
    $scope.search = {
        name:       '',
        regexp:     '',
        color:      randomColor({luminosity: 'dark', count: 1})[0],
        opacity:    0.5,
        score:      1,
        matchCount: 0
    };

    // sequence move scope
    $scope.move = {
        dx:     0,
        moving: false,
        seqID:  null
    };

    // sequence cut scope
    $scope.cut = {
        cutting:    false,
        drag:       false,
        state:      0,
        start:      0,
        startX:     0,
        end:        0,
        endX:       0
    };

    $scope.motifs = {
        searchID: '',
        motifList: [],
        tfList: []
    };

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
                seq = new Sequence(seqFeature.seqID, seqFeature.regionGenomicChrom, seqFeature.regionGenomicStart, seqFeature.regionGenomicEnd, this.ID);
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
                IDB.saveFeature(feature);
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

            // TODO: move it outside
            // save the sequence changes
            IDB.saveSequence(seq);
        }
    }

    function parseBEDLine(bedLine) {
        var bedColumns = bedLine.split('\n', 1)[0].split('\t');
        if (bedColumns.length >= 3 && bedColumns[0].length != 0 && bedColumns[0][0] != '#') {
            // bed format columns
            var chrom = bedColumns[0];
            var chromStart = bedColumns[1];
            var chromEnd = bedColumns[2];
            var name = bedColumns[3];
            var score = bedColumns[4];
            var strand = bedColumns[5];
            var thickStart = bedColumns[6];
            var thickEnd = bedColumns[7];
            var itemRgb = bedColumns[8];
            var blockCount = bedColumns[9];
            var blockSizes = bedColumns[10];
            var blockStarts = bedColumns[11];

            var seqID = chrom+":"+chromStart+"-"+chromEnd;
            if ($scope.workspace.sequences[seqID]) {
                // get sequence for this feature
                seq = $scope.workspace.sequences[seqID];
            } else {
                // make sequence for this feature
                seq = new Sequence(seqID, chrom, chromStart, chromEnd, this.ID);
                // add to workspace scope
                $scope.workspace.sequences[seqID] = seq;
                $scope.workspace.sequencesLength ++;
            }
            // adjust the sequence region size
            var currentRegionSize = seq.genomicEnd - seq.genomicStart;
            $scope.options.longestRegionSize = Math.max($scope.options.longestRegionSize, currentRegionSize);
            if (!seq.regionSize) {
                seq.regionSize = currentRegionSize;
            } else {
                seq.regionSize = Math.max(seq.regionSize, currentRegionSize);
            }
            // save newly created sequence instance it to ToucanDB
            IDB.saveSequence(seq);
        }
    }

    // load complete workspace from ToucanDB
    function loadWorkspace() {
        $scope.workspace = new Workspace();
        $scope.workspace.loading = true;
        $timeout(function() {
            new Spinner($scope.spinner).spin(document.getElementById('spinLoading'));
        });
        // start from loading options
        loadOptions();
    }

    // load options from ToucanDB
    function loadOptions() {
        IDB.getOptions(1).then(function(options) {
            if (!options) {
                // no options yet present in Toucan DB: save the current ones
                IDB.saveOptions($scope.options);
            } else {
                // load the options from ToucanDB to options scope
                $scope.options = options;
            }
            // update max score for search scope
            $scope.search.score = $scope.options.maxScore;
            // go to next step => loading files
            loadFiles();
        });
    }

    // load files from ToucanDB
    function loadFiles() {
        IDB.getAllFiles().then(function(files) {
            for (var i = 0; i < files.length; i++) {
                var file = files[i];
                $scope.workspace.files[file.ID] = file;
                $scope.workspace.filesLength++;
            }
            // go to next step => loading features defs
            loadFeatures();
        });
    }

    // load feature definitions from ToucanDB
    function loadFeatures() {
        IDB.getAllFeatures().then(function(features) {
            for (var i = 0; i < features.length; i++) {
                var feature = features[i];
                $scope.workspace.features[feature.ID] = feature;
            }
            // go to next step => loading sequences
            loadSequences();
        });
    }

    // load sequences from ToucanDB
    function loadSequences() {
        IDB.getAllSequences().then(function(seqs) {
            for (var i = 0; i < seqs.length; i++) {
                var seq = seqs[i];
                $scope.workspace.sequences[seq.seqID] = seq;
                $scope.workspace.sequencesLength ++;
                $scope.workspace.sequenceFeaturesLength += seq.features.length;
                if (seq.DNAsequence.length) $scope.workspace.sequencesLoaded ++;
            }
            // update SVG
            $scope.updateDimensions();
            $scope.updateSequences();
            // done loading
            $scope.workspace.loading = false;
            // recalculate feature height based on amount of sequences
            recalculateFeatureHeight();
        });
    }

    // recalculate feature height based on amount of sequences
    function recalculateFeatureHeight() {
        if ($scope.workspace.sequencesLength) {
            $scope.options.featureHeight = parseInt(($scope.options.height - 3 * $scope.options.margin - $scope.options.contextHeight) / (2 * $scope.workspace.sequencesLength));
            IDB.saveOptions($scope.options);
        }
    }

    function reverseCompliment(sequence) {
        var newSequence = "";
        for (var i = sequence.length - 1; i >= 0; i--) {
            var base = sequence[i];
            if (base == 'a' || base == 'A') base = 'T';
            else if (base == 't' || base == 'T') base = 'A';
            else if (base == 'c' || base == 'C') base = 'G';
            else if (base == 'g' || base == 'G') base = 'C';
            newSequence += base;
        }
        return newSequence;
    }

    function getChrom(chrom) {
        var res = chrom.match(/chr.+$/ig);
        return res && res[0] ? res[0] : '';
    }

    //
    // onload connect to DB
    //

    IDB.connect().then(function() {
        // start loading the workspace
        loadWorkspace();
        // get UCSC assembly list
        UCSC.getAssemblies().then(function(assemblies) {
            $scope.UCSCassemblies = assemblies;
        });
        MotifDB.getMotifs().then(function(motifs){
            $scope.motifs.motifList = motifs;
            console.log($scope.motifs);
        });
        MotifDB.getTFs().then(function(tfs){
            $scope.motifs.tfList = tfs;
            console.log($scope.motifs);
        });
    })

    //
    // upload tab handlers
    //

    ctrl.uploadFile = function() {

        var refreshVisualization = function() {
            $scope.$apply();
            $scope.updateDimensions();
            $scope.updateSequences();
        }

        function parseFileContents(files, type, parser, assembly) {
            // for each GFF file uploaded
            for (var i = 0; i < files.length; i++) {
                let f = files[i];
                var reader = new FileReader();
                // file loaded handler
                reader.onload = function(loadEvt) {
                    // fill in file spec
                    let fileSpec = {
                        name: f.name,
                        type: type,
                        assembly: assembly,
                        show: true
                    };
                    // get the contents of the file and split per line
                    let features = loadEvt.target.result.split("\n");
                    // save the file spec
                    IDB.saveFile(fileSpec).then(function(id) {
                        // update file spec and workspace
                        fileSpec.ID = id;
                        $scope.workspace.files[fileSpec.ID] = fileSpec;
                        $scope.workspace.filesLength++;
                        // parse the GFF file line per line
                        features.forEach(parser, fileSpec);
                        // recalculate feature height based on amount of sequences
                        recalculateFeatureHeight();
                        parseBigWigData();
                        // apply changes to scope
                        $timeout(refreshVisualization);
                    });
                };
                // trigger file upload
                reader.readAsText(f);
            }
        }

        function parseBigWigData() {
            // for each sequence extract the data from the bigWig files
            for (var seqID in $scope.workspace.sequences) {
                let seq = $scope.workspace.sequences[seqID];
                for (var fileID in $scope.workspace.files) {
                    var file = $scope.workspace.files[fileID];
                    // skip other files
                    if (file.type != 'bigWig') continue;
                    // skip if data from this file already parsed for this sequence
                    if (seq.bigWigData[file.fileID]) continue;
                    // insert the bigWig spec
                    let bigWigDataSpec = {
                        fileID: file.ID,
                        seqID: seq.seqID,
                        maxScore: 0,
                        data: []
                    };
                    // use IGV reader
                    var reader = new igv.BWSource({url: file.url});
                    reader.getFeatures(getChrom(seq.genomicChrom), seq.genomicStart, seq.genomicEnd).then(function(data) {
                        // loop through each data block
                        data.forEach(function(d) {
                            // calculate relative coords
                            var relativeStart = Math.max(d.start - seq.genomicStart, 0);
                            var relativeEnd = Math.min(d.end, seq.genomicEnd) - seq.genomicStart;
                            bigWigDataSpec.maxScore = Math.max(bigWigDataSpec.maxScore, d.value);
                            // insert value for each base inside data block
                            for (var i = relativeStart; i <= relativeEnd; i++) {
                                bigWigDataSpec.data[i] = {
                                    position: i,
                                    value: d.value,
                                    seqID: seq.seqID
                                };
                            }
                        });
                        // update sequence details
                        seq.bigWigMaxValue = Math.max(seq.bigWigMaxValue,  bigWigDataSpec.maxScore);
                        seq.bigWigData[bigWigDataSpec.fileID] = bigWigDataSpec;
                        // save sequence and update scope
                        IDB.saveSequence(seq);
                        $scope.workspace.sequences[seq.seqID] = seq;
                        // TODO: do this after all data got loaded
                        $timeout(refreshVisualization);
                    });
                }
            }
        }

        var GFFfiles = $("#GFFfile")[0].files;
        var BEDfiles = $("#BEDfile")[0].files;
        if (!$scope.options.assembly) return $scope.upload.message = "Please select an assembly";
        if (!GFFfiles.length && !BEDfiles.length && !$scope.upload.bigWigFile) return $scope.upload.message = "Please select at least one source";

        // upload and parse the GFF files
        parseFileContents(GFFfiles, 'gff', parseGFFLine, $scope.options.assembly);

        // upload and parse the BED files
        parseFileContents(BEDfiles, 'bed', parseBEDLine, $scope.options.assembly);

        // parse the bigWig URL
        if ($scope.upload.bigWigFile) {
            var url = $scope.upload.bigWigFile;
            let fileSpec = {
                name: url.substring(url.lastIndexOf('/')+1),
                type: 'bigWig',
                url: url,
                assembly: $scope.options.assembly,
                color: randomColor({luminosity: 'dark', count: 1})[0],
                show: true
            };
            IDB.saveFile(fileSpec).then(function(id) {
                // update file spec and workspace
                fileSpec.ID = id;
                $scope.workspace.files[fileSpec.ID] = fileSpec;
                $scope.workspace.filesLength++;
                // get the data
                parseBigWigData();
                $timeout(refreshVisualization);
            });
        }

        IDB.saveOptions($scope.options);
        $("#uploadForm")[0].reset();
        $("#uploadModal").modal('hide');
    }

    //
    // files tab handlers
    //

    ctrl.toggleFile = function(file) {
        file.show = !file.show;
        IDB.saveFile(file);
        $scope.updateVisibility();
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
                    IDB.deleteSequence(seqID).then(function() {
                        delete($scope.workspace.sequences[seqID]);
                        $scope.workspace.sequencesLength--;
                    });
                } else {
                    IDB.saveSequence(seq);
                }
            }
            IDB.deleteFile(id).then(function() {
                // TODO: do not refresh full workspace here
                loadWorkspace();
            });
        }
    }

    //
    // regions tab handlers
    //

    ctrl.getSequence = function(seq) {
        // skip if sequence is already present
        if (seq.DNAsequence.length) return;
        // if assembly not spefified, get the provided assembly during file upload
        seq.assembly = seq.assembly ? seq.assembly : ($scope.workspace.files[seq.fileID] ? $scope.workspace.files[seq.fileID].assembly : null);
        // extract chromosome nr
        var chromosome = seq.genomicChrom ? getChrom(seq.genomicChrom) : null;
        // use USCS to obtain sequence
        UCSC.getSequence(seq.assembly, chromosome, seq.genomicStart, seq.genomicEnd)
            .then(function(sequence) {
                // set sequence properties
                seq.DNAsequence = sequence;
                seq.reverseComplimentDNAsequence = reverseCompliment(sequence);
                // add to workspace scope
                $scope.workspace.sequences[seq.seqID].DNAsequence = seq.DNAsequence;
                $scope.workspace.sequences[seq.seqID].reverseComplimentDNAsequence = seq.reverseComplimentDNAsequence;
                $scope.workspace.sequencesLoaded ++;
                // save to ToucanDB
                IDB.saveSequence(seq);
                // refresh scope
                $timeout(function() {
                    $scope.$apply();
                    $scope.updateNamesStrokeAndFill();
                });
            }, function(message) {
                console.log("Loading DNA sequence from UCSC for " + seq.seqID + " failed: " + message);
            });
    }

    // get DNA sequences for all loaded regions
    ctrl.getSequences = function() {
        for (var id in $scope.workspace.sequences) {
            let seq = $scope.workspace.sequences[id];
            ctrl.getSequence(seq);
        }
    }

    ctrl.toggleSequence = function(seq) {
        seq.show = !seq.show;
        IDB.saveSequence(seq);
        $scope.updateVisibility();
    }

    ctrl.removeSequence = function(seqID) {
        if (confirm("Are you sure to remove this file and all associated features?")) {
            IDB.deleteSequence(seqID).then(function() {
                delete($scope.workspace.sequences[seqID]);
                $scope.workspace.sequencesLoaded --;
            });
        }
    }

    ctrl.reverseSequence = function(seq) {
        seq.reverse = !seq.reverse;
        IDB.saveSequence(seq);
        $scope.updatePositioning();
    }

    ctrl.linkUCSC = function(seq) {
        var link = UCSC.link(seq.assembly, getChrom(seq.genomicChrom), seq.genomicStart, seq.genomicEnd);
        window.open(link);
    }

    ctrl.moveSequence = function(seq) {
        if ($scope.move.moving) {
            if ($scope.move.seq == seq) {
                $scope.move.moving = false;
                $scope.move.seq = null;
                IDB.saveSequence(seq);
            }
        } else {
            $scope.move.seq = seq;
            $scope.move.moving = true;
        }
        $scope.moveSequence();
    }

    ctrl.cutSequencesStart = function() {
        $scope.cut.cutting = !$scope.cut.cutting;
        $scope.cut.drag = false;
        $scope.cutSequence();
    }

    ctrl.cutSequencesDo = function() {
        // update cut state and hide modal
        $scope.cut.state = 3;
        $scope.cut.cutting = false;
        $("#cutModal").modal("hide");
        // recalculate max region size
        $scope.options.longestRegionSize = $scope.cut.end - $scope.cut.start;
        for (var seqID in $scope.workspace.sequences) {
            // modify each sequence size, start and end
            var seq = $scope.workspace.sequences[seqID];
            var s = $scope.cut.start - seq.translate;
            var e = $scope.cut.end - seq.translate;
            seq.translate -= $scope.cut.start;
            if (seq.translate < 0) seq.translate = 0;
            if (s < 0) s = 0;
            // TODO: this does not work ideally
            if (seq.regionSize - s > e ) {
                seq.regionSize = e - s
            }
            //seq.regionSize -= s;
            //seq.regionSize = e - s;
            // TODO: update this wrt translation
            seq.genomicStart += s;
            seq.genomicEnd = seq.genomicStart + seq.regionSize;
            // modify sequence features
            var features = [];
            for (var f = seq.features.length - 1; f >=0 ; f--) {
                var feature = seq.features[f];
                feature.relativeStart -= s;
                feature.relativeEnd -= s;
                // feature has fallen of left to starting point
                if (feature.relativeEnd < 0) {
                    seq.features.splice(f, 1);
                    continue;
                }
                // feature has fallen of right to ending point
                if (feature.relativeStart > e) {
                    seq.features.splice(f, 1);
                    continue;
                }
                // cut from left side if needed
                if (feature.relativeStart < 0) {
                    feature.relativeStart = 0;
                    feature.genomicStart = seq.genomicStart;
                }
                // cut from right side if needed
                if (feature.relativeEnd > e) {
                    feature.relativeEnd = e;
                    feature.genomicEnd = seq.genomicEnd;
                }
                // update region info
                feature.regionGenomicStart = seq.genomicStart;
                feature.regionGenomicEnd = seq.genomicEnd;
                seq.features[f] = feature;
            }
            // TODO: cut bigwig length
            for (var fileID in seq.bigWigData){
                var bigWigDataSpec = seq.bigWigData[fileID];
                var bigWigData = [];
                for (var i = 0; i < bigWigDataSpec.data.length; i++) {
                    /*
                    bigWigDataSpec.data[i] = {
                        position: i,
                        value: d.value,
                        seqID: seq.seqID
                    };
                    */
                }
            }
            //TODO: cut sequence
            IDB.saveSequence(seq);
        }
        IDB.saveOptions($scope.options);
        $scope.cutSequence();
        $scope.updateSequences();
    }

    //
    // features tab handlers
    //

    ctrl.toggleFeature = function(feature) {
        feature.show = !feature.show;
        IDB.saveFeature(feature);
        $scope.updateVisibility();
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
                    IDB.deleteSequence(seqID).then(function() {
                        delete($scope.workspace.sequences[seqID]);
                        $scope.workspace.sequencesLength--;
                    });
                } else {
                    IDB.saveSequence(seq);
                }
            }
            IDB.deleteFeature(featureID).then(function() {
                delete($scope.workspace.features[featureID]);
                $scope.updateSequences();
            });
        }
    }

    ctrl.colorFeature = function(feature) {
        var control = $('#color-'+ctrl.escapeID(feature.ID));
        control.colorpicker('setValue', feature.color);
        control.data('colorpicker').color.setAlpha(feature.opacity);
        control.colorpicker('update');
        control.colorpicker('show');
        control.on('changeColor', function(e) {
            feature.color = e.color.toHex();
            feature.opacity = e.color.value.a;
            IDB.saveFeature(feature);
            $scope.updateStrokeAndFill();
        });
        control.on('hidePicker', function() {
            control.off('changeColor');
        });
    }

    ctrl.colorBigWig = function(file) {
        var control = $('#color-'+ctrl.escapeID(file.ID+file.name));
        control.colorpicker('setValue', file.color);
        control.data('colorpicker').color.setAlpha(file.opacity);
        control.colorpicker('update');
        control.colorpicker('show');
        control.on('changeColor', function(e) {
            file.color = e.color.toHex();
            file.opacity = e.color.value.a;
            IDB.saveFile(file);
            $scope.updateStrokeAndFill();
        });
        control.on('hidePicker', function() {
            control.off('changeColor');
        });
    }

    //
    // search tab handlers
    //

    // search for features in the sequences
    ctrl.searchFeatures = function() {

        function matchSequence(regexp, seq, field, strand) {
            var match;
            do {
                // check for match
                match = regexp.exec(seq[field]);
                // no match
                if (!match) continue;
                // create match array for sequence if not there yet
                if (!$scope.search.matches[seq.seqID]) $scope.search.matches[seq.seqID] = [];
                // add current match
                $scope.search.matches[seq.seqID].push({
                    start: match.index,
                    end: match.index + match[0].length,
                    strand: strand,
                    site: match[0].toUpperCase(),
                    score: $scope.search.score,
                });
                $scope.search.matchCount ++;
                // repeat till last match or limit reached
            } while (match && ($scope.search.matchCount < $scope.options.maxSearchResults));
        }

        // reset result indicators
        $scope.search.matchCount = 0;
        $scope.search.limit = false;
        $scope.search.invalid = false;
        $scope.search.matches = {};
        // change the visualization max score to accomodate higher search score visualizations
        $scope.options.maxScore = Math.max($scope.options.maxScore, $scope.search.score);
        // skip empty regexp
        if (!$scope.search.regexp) return;
        // compile regexp
        var regexp;
        try {
            regexp = new RegExp($scope.search.regexp, 'ig');
        } catch (err) {
            return $scope.search.invalid = true;
        }
        // search in each sequence
        for (var seqID in $scope.workspace.sequences) {
            var seq = $scope.workspace.sequences[seqID];
            // skip ones without DNA sequence
            if (!seq.DNAsequence) continue;
            // break if over the limit
            if ($scope.search.matchCount >= $scope.options.maxSearchResults) {
                $scope.search.limit = true;
                break;
            }
            // match DNA sequence and reverse compliment DNA sequence
            matchSequence(regexp, seq, 'DNAsequence', '+');
            matchSequence(regexp, seq, 'reverseComplimentDNAsequence', '-');
        }
        // highlight search results on visualization
        $scope.updateSearchResults();
    }

    // save searched features in the sequences
    ctrl.saveSearchedFeatures = function() {
        // reset indicator
        $scope.search.exists = 0;
        // prepare feature spec
        var featureSpec = {
            ID: $scope.search.name,
            color: $scope.search.color,
            opacity: $scope.search.opacity,
            show: true
        }
        // check if not already existing
        if ($scope.workspace.features[featureSpec.ID]) return $scope.search.exists = 1;
        // save feature spec
        $scope.workspace.features[featureSpec.ID] = featureSpec;
        IDB.saveFeature(featureSpec);
        // for each sequence convert matches to features
        for (var seqID in $scope.search.matches) {
            var sequence = $scope.workspace.sequences[seqID];
            var matches = $scope.search.matches[seqID];
            for (var i = 0; i < matches.length; i++) {
                // for each match create a new feature
                var match = matches[i];
                var feature = new Feature(seqID, 'search', null, match.start, match.end, $scope.search.score, match.strand, null, "site="+match.site);
                feature.featureID = featureSpec.ID;
                sequence.features.push(feature);
            }
            // save sequence to the DB
            IDB.saveSequence(sequence);
        }
        // reset rest of the indicators
        $scope.search.matchCount = 0;
        $scope.search.matches = {};
        $scope.search.regexp = '';
        $scope.search.name = '';
        $scope.search.color = randomColor({luminosity: 'dark', count: 1})[0];
        $('#searchColor').colorpicker('setValue', $scope.search.color);
        if ($scope.options.maxScore < $scope.search.score) {
            $scope.options.maxScore = $scope.search.score;
            IDB.saveOptions($scope.options);
        }
        $scope.updateSearchResults();
        $scope.updateSequences();
    }

    ctrl.showTFDetails = function (tf) {
        MotifDB.getTF(tf).then(function(data) {
            $scope.motifs.showMotifDetails = false;
            $scope.motifs.showTFDetails = true;
            $scope.motifs.details = data;
        });
    }

    ctrl.showMotifDetails = function (motif) {
        MotifDB.getMotif(motif).then(function(data) {
            $scope.motifs.showMotifDetails = true;
            $scope.motifs.showTFDetails = false;
            $scope.motifs.details = data;
        });
    }

    //
    // options tab handlers
    //

    ctrl.saveOptions = function() {
        IDB.saveOptions($scope.options);
        $scope.updateDimensions();
    }

    //
    // clear tab handlers
    //

    ctrl.clearWorkspace = function() {
        if (confirm("Are you sure to delete ALL data from your workspace?")) {
            IDB.clearAll().then(function() {
                $scope.options = new Options();
                $scope.workspace = new Workspace();
                $scope.workspace.loading = false;
            });
        }
    }

    //
    // misc handlers
    //

    // hashing function for ids
    ctrl.escapeID = function(id) {
        return hex_md5(id);
    }

    $("#uploadModal").on("shown.bs.modal", function() {
        $("#uploadAssembly").val($scope.options.assembly);
    });

    // configure the feature def colorpickers
    $timeout(function() {
        var control = $('#searchColor');
        control.colorpicker();
        control.colorpicker('setValue', $scope.search.color);
        control.on('changeColor', function(e) {
            $scope.search.color = e.color.toHex();
            $scope.search.opacity = e.color.value.a;
            $scope.updateSearchStrokeAndFill();
        });
    }, 100);

    // configure igv
    igv.browser = {
        referenceFrame: {
            bpPerPixel: 1
        }
    };

});