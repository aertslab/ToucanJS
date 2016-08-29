/**
 * Created by ghuls on 8/24/16.
 */


gffFeatures = [];


function ForEachGFFLine(element, index, array) {
    var gffLine = element;

    var GffFeatureFromLine = ParseGFFLine(gffLine);
    if (GffFeatureFromLine instanceof GFFFeature) {
        gffFeatures.push(GffFeatureFromLine);
    }
}


function ParseGFFLine(gffLine) {
    var gffColumns = gffLine.split('\n', 1)[0].split('\t');

    if (gffColumns.length == 9 && gffColumns[0].length != 0 && gffColumns[0][0] != '#') {
        return new GFFFeature(...gffColumns);
    }
}


function GFFAttribute(id, value) {
    this.id = id;
    this.value = value;
}


function GFFFeature(seqID, source, featureType, startStr, endStr, score, strand, phase, attributesStr) {
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

    attributesStr.split(';').forEach(function (attributeStr) {
        var [attributeID, attributeValue] = attributeStr.split('=');
        attributes[attributeID] = attributeValue;
    });

    this.attributes = attributes;

    var re_chrom_pos_from_seqID = /^(.+):([0-9]+)-([0-9]+)(?:@(.+))?$/;
    var re_chrom_pos_from_seqID_match = re_chrom_pos_from_seqID.exec(this.seqID);

    if (re_chrom_pos_from_seqID_match !== null) {
        this.regionGenomicChrom = re_chrom_pos_from_seqID_match[1];
        this.regionGenomicStart = re_chrom_pos_from_seqID_match[2];
        this.regionGenomicEnd = re_chrom_pos_from_seqID_match[3];

        this.genomicChrom = this.regionGenomicChrom;
        this.genomicStart = this.regionGenomicStart + this.relativeStart - 1;
        this.genomicEnd = this.regionGenomicStart + this.relativeEnd - 1;

        if (re_chrom_pos_from_seqID_match.length == 5) {
            this.gene = re_chrom_pos_from_seqID_match[4];
        }
    }
}


function getFileExtension(filename) {
    /* Get file extension. */
    return filename.slice((filename.lastIndexOf(".") - 1 >>> 0) + 2).toLowerCase();
}

function readGFFFile(evt) {
    // Retrieve the first (and only!) File from the FileList object.
    var gffFile = evt.target.files[0];

    if (! gffFile) {
        alert("Failed to read file \"" + gffFile.name + "\"");
    } else if (! getFileExtension(gffFile.name).match(/gff(3)*/)) {
        alert("\"" + gffFile.name + "\" is not a GFF file.");
    } else {
        var reader = new FileReader();
        //proceed with read…
        reader.onload = function(e) {
            var contents = e.target.result;

            // alert("Got the file.\n"
            //     + "name: " + gffFile.name + "\n"
            //     + "type: " + gffFile.type + "\n"
            //     + "size: " + gffFile.size + " bytes\n"
            //     + "starts with: " + contents.substr(1, contents.indexOf("\n"))
            // );

            //console.log(contents.split('\n'));

            gffFeatures = [];

            // Parse each GFF line and add each GFF feature to gffFeatures.
            contents.split('\n').forEach(ForEachGFFLine);

            console.log('nbr of GFF features: ' + gffFeatures.length);

            // Create feature map SVG for GFF features.
            createTOUCANSVG();
        };

        reader.readAsText(gffFile);
    }
}



function createTOUCANSVG() {
    var svgNS = 'http://www.w3.org/2000/svg';
    var toucanjsSVG = document.getElementById('toucanjs_svg');
    var featureIDsdiv = document.getElementById('feature_ids');
    var featureNamesAndColors = {};
    var attributeNameID = 'Name';
    var regionLineXScaling = 1.0;
    var regionLineYScaling = 1.0;
    var featureScoreScaling = 1.0;
    var regionCount = 0;
    var regionHeight = 50;
    var longestRegionSize = 0;

    var background = document.createElementNS(svgNS, 'rect');
    background.setAttributeNS(null, 'height', '100%');
    background.setAttributeNS(null, 'width', '100%');
    background.setAttributeNS(null, 'fill', 'white');
    toucanjsSVG.appendChild(background);

    var title = document.createElementNS(svgNS, 'text');
    title.setAttributeNS(null, 'x', '700');
    title.setAttributeNS(null, 'y', '80');
    title.setAttributeNS(null, 'font-size', 60);
    title.setAttributeNS(null, 'text-anchor', 'middle');
    title.setAttributeNS(null, 'fill', 'black');
    var titleData = document.createTextNode('TOUCANJS');
    title.appendChild(titleData);
    toucanjsSVG.appendChild(title);

    var numberOfUniqueFeatures = 0;

    gffFeatures.forEach(function(gffFeature) {
        longestRegionSize = Math.max(longestRegionSize, (gffFeature.regionGenomicEnd - gffFeature.regionGenomicStart));

        if (! (gffFeature.attributes[attributeNameID] in featureNamesAndColors)) {
            featureNamesAndColors[gffFeature.attributes[attributeNameID]] = 'gray';
            numberOfUniqueFeatures += 1;
        }
    });

    var randomColorsForFeatures = randomColor({luminosity: 'dark', count: numberOfUniqueFeatures});
    var colorIdx = 0;

    var featureIDsul = document.createElement('ul');
    featureIDsdiv.appendChild(featureIDsul);

    for (var featureName in featureNamesAndColors) {
        featureNamesAndColors[featureName] = randomColorsForFeatures[colorIdx];

        var featureIDli = document.createElement('li');
        featureIDli.setAttribute('class','item');
        featureIDli.style.color = randomColorsForFeatures[colorIdx];

        var featureIDColorButton = document.createElement('button');
        var picker = new jscolor(featureIDColorButton);
        featureIDColorButton.innerHTML = '&nbsp;';
        picker.valueElement = null;
        picker.fromString(randomColorsForFeatures[colorIdx].substr(1));

        featureIDli.appendChild(featureIDColorButton);
        var featureIDliText = document.createTextNode(featureName);
        featureIDli.appendChild(featureIDliText);

        featureIDsul.appendChild(featureIDli);
        colorIdx += 1;
    }

    gffFeatures.forEach(function(gffFeature) {
        var regionGroupID = 'region__' + gffFeature.seqID;
        var regionGroupIDLine = 'region__line__' + gffFeature.seqID;
        console.log(regionGroupID);

        var regionGroup = document.getElementById(regionGroupID);
        var regionGroupLine = document.getElementById(regionGroupIDLine);
        console.log(regionGroup);

        if (regionGroup == null) {
            regionCount += 1;

            regionGroup = document.createElementNS(svgNS, 'g');

            regionGroup.setAttributeNS(null, 'id', regionGroupID);
            regionGroup.setAttributeNS(null, 'transform', 'translate(0 ' + (regionCount * regionHeight * regionLineYScaling + 100) + ')');

            var regionName = document.createElementNS(svgNS, 'text');
            regionName.setAttributeNS(null, 'x', '280');
            regionName.setAttributeNS(null, 'y', '6');
            regionName.setAttributeNS(null, 'font-size', '16');
            regionName.setAttributeNS(null, 'text-anchor', 'end');
            regionName.setAttributeNS(null, 'fill', 'black');

            var regionNameData = document.createTextNode(gffFeature.seqID);
            regionName.appendChild(regionNameData);

            regionGroup.appendChild(regionName);

            regionGroupLine = document.createElementNS(svgNS, 'g');

            regionGroupLine.setAttributeNS(null, 'id', regionGroupIDLine);
            //regionGroupLine.setAttributeNS(null, 'transform', 'scale(' + regionLineXscale.toString() + ',' + regionLineYScaling.toString() + ')');
            regionGroupLine.setAttributeNS(null, 'transform',
                'matrix(' + regionLineXScaling.toString() + ' 0  0 ' + regionLineYScaling.toString() + ' 300 0)');

            var regionLine = document.createElementNS(svgNS, 'rect');
            regionLine.setAttributeNS(null, 'x', '0');
            regionLine.setAttributeNS(null, 'y', '0');
            regionLine.setAttributeNS(null, 'height', '1');
            regionLine.setAttributeNS(null, 'width', (gffFeature.regionGenomicEnd - gffFeature.regionGenomicStart).toString());
            regionLine.setAttributeNS(null, 'fill', 'gray');
            regionGroupLine.appendChild(regionLine);

            regionGroup.appendChild(regionGroupLine);

            toucanjsSVG.appendChild(regionGroup);
        }

        var feature = document.createElementNS(svgNS, 'rect');
        feature.setAttributeNS(null, 'x', gffFeature.relativeStart.toString());
        if (gffFeature.strand == '-') {
            feature.setAttributeNS(null, 'y', '1');
        } else {
            feature.setAttributeNS(null, 'y', '-' + (gffFeature.score * featureScoreScaling).toString());
        }
        feature.setAttributeNS(null, 'height', (gffFeature.score * featureScoreScaling).toString());
        feature.setAttributeNS(null, 'width', (gffFeature.relativeEnd - gffFeature.relativeStart + 1).toString());
        if (!(gffFeature.attributes[attributeNameID] in featureNamesAndColors)) {
            featureNamesAndColors[gffFeature.attributes[attributeNameID]] = randomColor({luminosity: 'dark'});
        }
        feature.setAttributeNS(null, 'fill', featureNamesAndColors[gffFeature.attributes[attributeNameID]]);
        feature.setAttributeNS(null, 'stroke', featureNamesAndColors[gffFeature.attributes[attributeNameID]]);

        var featureTooltip = document.createElementNS(svgNS, 'title');
        var featureTooltipData = document.createTextNode(attributeNameID + ': ' + gffFeature.attributes[attributeNameID]);
        featureTooltipData.nodeValue += '\nScore: ' + gffFeature.score.toString();
        featureTooltipData.nodeValue += '\nRelative start: ' + gffFeature.relativeStart.toString();
        featureTooltipData.nodeValue += '\nRelative end: ' + gffFeature.relativeEnd.toString();
        featureTooltipData.nodeValue += '\nGenomic chromosome: ' + gffFeature.genomicChrom.toString();
        featureTooltipData.nodeValue += '\nGenomic start: ' + gffFeature.genomicStart.toString();
        featureTooltipData.nodeValue += '\nGenomic end: ' + gffFeature.genomicEnd.toString();
        featureTooltipData.nodeValue += '\nStrand: ' + gffFeature.strand;
        featureTooltipData.nodeValue += '\nPhase: ' + gffFeature.phase;
        featureTooltipData.nodeValue += '\nSeqID: ' + gffFeature.seqID;
        featureTooltipData.nodeValue += '\nSource: ' + gffFeature.source;
        featureTooltipData.nodeValue += '\nFeature type: ' + gffFeature.featureType;

        for (var attributeID in gffFeature.attributes) {
            if (attributeID != attributeNameID) {
                featureTooltipData.nodeValue += '\n' + attributeID + ': ' + gffFeature.attributes[attributeID];
            }
        }

        featureTooltip.appendChild(featureTooltipData);
        feature.appendChild(featureTooltip);

        regionGroupLine.appendChild(feature);
    });

    toucanjsSVG.setAttribute('height', (regionCount * regionHeight * regionLineYScaling + regionHeight * regionLineYScaling + 80).toString());
    toucanjsSVG.setAttribute('width', (longestRegionSize * regionLineXScaling + 400).toString());
    title.setAttributeNS(null, 'x', ((longestRegionSize * regionLineXScaling + 400) / 2).toString());
}



// GFFFeature.prototype = {
//     constructor: GFFFeature,
//     saveScore:function (theScoreToAdd)  {
//         this.quizScores.push(theScoreToAdd)
//     },
//     showNameAndScores:function ()  {
//         var scores = this.quizScores.length > 0 ? this.quizScores.join(",") : "No Scores Yet";
//         return this.name + " Scores: " + scores;
//     },
//     changeEmail:function (newEmail)  {
//         this.email = newEmail;
//         return "New Email Saved: " + this.email;
//     }
//     changeEmail2:function (newEmail)  {
//         this.email = newEmail;
//         return "New Email Saved: " + this.email;
//     }
// }


