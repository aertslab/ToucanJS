/**
 * Created by ghuls on 8/24/16.
 */


function ToucanJs() {

    var svgNS = 'http://www.w3.org/2000/svg';
    var toucanjsSVG = document.getElementById('toucanjs_svg');
    var toucanjsSVGDefs = document.getElementsByTagNameNS(svgNS, 'defs')[0];
    var featureIDsdiv = document.getElementById('feature_ids');

    var gffFeatures = [];

    var options = {};

    function reset() {
        gffFeatures = [];

        options.seqIDToRegionSize = {};
        options.featureNamesToColors = {};
        options.attributeNameID = 'Name';
        options.regionLineXScaling = 1.0;
        options.regionLineYScaling = 1.0;
        options.featureScoreScaling = 1.0;
        options.regionCount = 0;
        options.regionHeight = 50;
        options.longestRegionSize = 0;
        options.axisTicksSpacing = 100;

        options.backgroundColor = 'white';
        options.titleText = 'TOUCANJS';
    }


    function ForEachGFFLine(element, index, array) {
        var gffLine = element;

        var GffFeatureFromLine = ParseGFFLine(gffLine);
        if (GffFeatureFromLine instanceof GFFFeature) {
            gffFeatures.push(GffFeatureFromLine);
        }
    }


    function ParseGFFLine(gffLine) {
        var gffColumns = gffLine.split('\n', 1)[0].split('\t');

        if (gffColumns.length === 9 && gffColumns[0].length !== 0 && gffColumns[0][0] !== '#') {
            return new GFFFeature(...gffColumns);
        }
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

            if (re_chrom_pos_from_seqID_match.length === 5) {
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
            reader.onload = function (e) {
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
            };

            reader.readAsText(gffFile);
        }
    }


    function setBackground(backgroundColor) {
        /* Set background of SVG. */

        if (backgroundColor === undefined) {
            /* Set the title text to value specified in the options object, if it was not specified. */
            backgroundColor = options.backgroundColor;
        }

        var background = toucanjsSVG.getElementById('svg_background');

        if (background === null) {
            /* Add a background element if it did not exist yet. */
            background = document.createElementNS(svgNS, 'rect');
            background.setAttributeNS(null, 'id', 'svg_background');
            background.setAttributeNS(null, 'height', '100%');
            background.setAttributeNS(null, 'width', '100%');
            toucanjsSVG.appendChild(background);
        }

        background.setAttributeNS(null, 'fill', backgroundColor);
    }


    function setTitle(titleText) {
        /* Set title of SVG. */

        if (titleText === undefined) {
            /* Set the title text to value specified in the options object, if it was not specified. */
            titleText = options.titleText;
        }

        var title = toucanjsSVG.getElementById('svg_title');

        if (title === null) {
            /* Add a title element if it did not exist yet. */
            title = document.createElementNS(svgNS, 'text');
            title.setAttributeNS(null, 'id', 'svg_title');
            title.setAttributeNS(null, 'y', '80');
            title.setAttributeNS(null, 'font-size', 60);
            title.setAttributeNS(null, 'text-anchor', 'middle');
            title.setAttributeNS(null, 'fill', 'black');
            var titleData = document.createTextNode(titleText);
            title.appendChild(titleData);
            toucanjsSVG.appendChild(title);
        } else {
            title.firstChild.nodeValue = titleText;
        }

        /* Center the title. */
        title.setAttributeNS(null, 'x', ((options.longestRegionSize * options.regionLineXScaling + 400) / 2).toString());
    }


    function setAxisTicksSpacing(axisTicksSpacing) {
        /* Set axis ticks spacing. */

        if (axisTicksSpacing === undefined) {
            /* Set the title text to value specified in the options object, if it was not specified. */
            axisTicksSpacing =  options.axisTicksSpacing;
        }

        /* Get the old axisGroup if it exist. */
        var axisGroupOld = toucanjsSVG.getElementById('svg_axis');

        /* Create a new axisGroup. */
        var axisGroup = document.createElementNS(svgNS, 'g');
        axisGroup.setAttributeNS(null, 'id', 'svg_axis');
        axisGroup.setAttributeNS(null, 'transform', 'matrix(' + options.regionLineXScaling.toString() + ' 0  0 1 300 200)');

        var axisBar = document.createElementNS(svgNS, 'path');
        axisBar.setAttributeNS(null, 'fill', 'none');
        axisBar.setAttributeNS(null, 'stroke', 'black');
        axisBar.setAttributeNS(null, 'stroke-width', '1');

        var axisBarPath = 'M 0 0 L ' + options.longestRegionSize.toString() + ' 0';

        for (var x = 0; x <= options.longestRegionSize; x += axisTicksSpacing) {
            /* Add each tick to the axisBarPath. */
            axisBarPath += ' M ' + x.toString() + ' -5 L ' + x.toString() + ' 5';

            /* Add corresponding distance above the tick. */
            var axisTickText = document.createElementNS(svgNS, 'text');
            axisTickText.setAttributeNS(null, 'x', x.toString());
            axisTickText.setAttributeNS(null, 'y', '-20');
            axisTickText.setAttributeNS(null, 'font-size', 16);
            axisTickText.setAttributeNS(null, 'text-anchor', 'middle');
            axisTickText.setAttributeNS(null, 'fill', 'black');
            var axisTickTextData = document.createTextNode(x.toString());
            axisTickText.appendChild(axisTickTextData);
            axisGroup.appendChild(axisTickText);
        }
        axisBar.setAttributeNS(null, 'd', axisBarPath);
        axisGroup.appendChild(axisBar);

        if (axisGroupOld === null) {
            /* Add axisGroup, if there was not axis group before. */
            toucanjsSVG.appendChild(axisGroup);
        } else {
            /* Replace old axisGroup, with new one. */
            toucanjsSVG.replaceChild(axisGroup, axisGroupOld);
        }
    }


    function drawSVG() {
        var numberOfUniqueFeatures = 0;

        gffFeatures.forEach(function (gffFeature) {
            var currentRegionSize = 0;
            if ('regionGenomicStart' in gffFeature && 'regionGenomicEnd' in gffFeature) {
                currentRegionSize = gffFeature.regionGenomicEnd - gffFeature.regionGenomicStart;
            } else {
                currentRegionSize = gffFeature.relativeEnd;
            }

            options.longestRegionSize = Math.max(options.longestRegionSize, currentRegionSize);

            if (! (gffFeature.seqID in options.seqIDToRegionSize)) {
                options.seqIDToRegionSize[gffFeature.seqID] = currentRegionSize;
            } else {
                options.seqIDToRegionSize[gffFeature.seqID] = Math.max(options.seqIDToRegionSize[gffFeature.seqID], currentRegionSize);
            }

            if (! (gffFeature.attributes[options.attributeNameID] in options.featureNamesToColors)) {
                options.featureNamesToColors[gffFeature.attributes[options.attributeNameID]] = 'gray';
                numberOfUniqueFeatures += 1;
            }
        });

        /* Set background. */
        setBackground();

        var randomColorsForFeatures = randomColor({luminosity: 'dark', count: numberOfUniqueFeatures});
        var colorIdx = 0;

        var featureIDsul = document.createElement('ul');
        featureIDsdiv.appendChild(featureIDsul);

        for (var featureName in options.featureNamesToColors) {
            options.featureNamesToColors[featureName] = randomColorsForFeatures[colorIdx];

            var featureIDli = document.createElement('li');
            featureIDli.setAttribute('class', 'item');
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

        gffFeatures.forEach(function (gffFeature) {
            var regionGroupID = 'region__' + gffFeature.seqID;
            var regionLineGroupID = 'region__line__' + gffFeature.seqID;
            console.log(regionGroupID);

            var regionGroup = document.getElementById(regionGroupID);
            var regionLineGroup = document.getElementById(regionLineGroupID);
            console.log(regionGroup);

            if (regionGroup === null) {
                options.regionCount += 1;

                regionGroup = document.createElementNS(svgNS, 'g');

                regionGroup.setAttributeNS(null, 'id', regionGroupID);
                regionGroup.setAttributeNS(null, 'transform', 'translate(0 ' + (options.regionCount * options.regionHeight * options.regionLineYScaling + 200) + ')');

                var regionName = document.createElementNS(svgNS, 'text');
                regionName.setAttributeNS(null, 'x', '280');
                regionName.setAttributeNS(null, 'y', '6');
                regionName.setAttributeNS(null, 'font-size', '16');
                regionName.setAttributeNS(null, 'text-anchor', 'end');
                regionName.setAttributeNS(null, 'fill', 'black');
                var regionNameData = document.createTextNode(gffFeature.seqID);
                regionName.appendChild(regionNameData);

                regionGroup.appendChild(regionName);

                regionLineGroup = document.createElementNS(svgNS, 'g');

                regionLineGroup.setAttributeNS(null, 'id', regionLineGroupID);
                regionLineGroup.setAttributeNS(null, 'transform',
                    'matrix(' + options.regionLineXScaling.toString() + ' 0  0 ' + options.regionLineYScaling.toString() + ' 300 0)');

                var regionTicksLine = document.createElementNS(svgNS, 'path');
                regionTicksLine.setAttributeNS(null, 'fill', 'none');
                regionTicksLine.setAttributeNS(null, 'stroke', 'gray');
                regionTicksLine.setAttributeNS(null, 'stroke-width', '1');

                var regionTicksLinePath = 'M 0 0 L ' + options.seqIDToRegionSize[gffFeature.seqID].toString() + ' 0';

                for (var x = 0; x <= options.seqIDToRegionSize[gffFeature.seqID]; x += options.axisTicksSpacing) {
                    regionTicksLinePath += ' M ' + x.toString() + ' -5 L ' + x.toString() + ' 5';
                }
                regionTicksLine.setAttributeNS(null, 'd', regionTicksLinePath);
                regionLineGroup.appendChild(regionTicksLine);
                regionGroup.appendChild(regionLineGroup);

                toucanjsSVG.appendChild(regionGroup);
            }

            var feature = document.createElementNS(svgNS, 'rect');
            var featureCoordAndSize = {};

            featureCoordAndSize.x = gffFeature.relativeStart.toString();
            if (gffFeature.strand === '-') {
                featureCoordAndSize.y = '1';
            } else {
                featureCoordAndSize.y = '-' + (gffFeature.score * options.featureScoreScaling).toString();
            }
            featureCoordAndSize.height = (gffFeature.score * options.featureScoreScaling).toString();
            featureCoordAndSize.width = (gffFeature.relativeEnd - gffFeature.relativeStart + 1).toString();

            var featureCoordAndSizeDefID =
                'x_' + featureCoordAndSize.x
                + 'y_' + featureCoordAndSize.y
                + 'height_' + featureCoordAndSize.height
                + 'width_' + featureCoordAndSize.width;

            var featureCoordAndSizeDefClipPath = toucanjsSVG.getElementById(featureCoordAndSizeDefID);

            if (featureCoordAndSizeDefClipPath === null) {
                featureCoordAndSizeDefClipPath = document.createElementNS(svgNS, 'clipPath');
                featureCoordAndSizeDefClipPath.setAttributeNS(null, 'id', featureCoordAndSizeDefID);


                var featureCoordAndSizeDefClipPathRect = document.createElementNS(svgNS, 'rect');

                featureCoordAndSizeDefClipPathRect.setAttributeNS(null, 'x', featureCoordAndSize.x);
                featureCoordAndSizeDefClipPathRect.setAttributeNS(null, 'y', featureCoordAndSize.y);
                featureCoordAndSizeDefClipPathRect.setAttributeNS(null, 'height', featureCoordAndSize.height);
                featureCoordAndSizeDefClipPathRect.setAttributeNS(null, 'width', featureCoordAndSize.width);

                featureCoordAndSizeDefClipPath.appendChild(featureCoordAndSizeDefClipPathRect);

                toucanjsSVGDefs.appendChild(featureCoordAndSizeDefClipPath);
            }

            feature.setAttributeNS(null, 'x', featureCoordAndSize.x);
            feature.setAttributeNS(null, 'y', featureCoordAndSize.y);
            feature.setAttributeNS(null, 'height', featureCoordAndSize.height);
            feature.setAttributeNS(null, 'width', featureCoordAndSize.width);
            feature.setAttributeNS(null, 'clip-path', 'url(#' + featureCoordAndSizeDefID + ')');

            if (! (gffFeature.attributes[options.attributeNameID] in options.featureNamesToColors)) {
                options.featureNamesToColors[gffFeature.attributes[options.attributeNameID]] = randomColor({luminosity: 'dark'});
            }
            feature.setAttributeNS(null, 'fill', options.featureNamesToColors[gffFeature.attributes[options.attributeNameID]]);
            feature.setAttributeNS(null, 'stroke', options.featureNamesToColors[gffFeature.attributes[options.attributeNameID]]);

            var featureTooltip = document.createElementNS(svgNS, 'title');
            var featureTooltipData = document.createTextNode(options.attributeNameID + ': ' + gffFeature.attributes[options.attributeNameID]);
            featureTooltipData.nodeValue += '\nScore: ' + gffFeature.score.toString();
            featureTooltipData.nodeValue += '\nRelative start: ' + gffFeature.relativeStart.toString();
            featureTooltipData.nodeValue += '\nRelative end: ' + gffFeature.relativeEnd.toString();
            if ('genomicChrom' in gffFeature) {
                featureTooltipData.nodeValue += '\nGenomic chromosome: ' + gffFeature.genomicChrom.toString();
                featureTooltipData.nodeValue += '\nGenomic start: ' + gffFeature.genomicStart.toString();
                featureTooltipData.nodeValue += '\nGenomic end: ' + gffFeature.genomicEnd.toString();
            }
            featureTooltipData.nodeValue += '\nStrand: ' + gffFeature.strand;
            featureTooltipData.nodeValue += '\nPhase: ' + gffFeature.phase;
            featureTooltipData.nodeValue += '\nSeqID: ' + gffFeature.seqID;
            featureTooltipData.nodeValue += '\nSource: ' + gffFeature.source;
            featureTooltipData.nodeValue += '\nFeature type: ' + gffFeature.featureType;

            for (var attributeID in gffFeature.attributes) {
                if (attributeID !== options.attributeNameID) {
                    featureTooltipData.nodeValue += '\n' + attributeID + ': ' + gffFeature.attributes[attributeID];
                }
            }

            featureTooltip.appendChild(featureTooltipData);
            feature.appendChild(featureTooltip);

            regionLineGroup.appendChild(feature);
        });

        toucanjsSVG.setAttribute('height', (options.regionCount * options.regionHeight * options.regionLineYScaling
                                            + options.regionHeight * options.regionLineYScaling + 200).toString());
        toucanjsSVG.setAttribute('width', (options.longestRegionSize * options.regionLineXScaling + 400).toString());

        /* Set and center title. */
        setTitle(options.titleText);

        /* Set axis tick spacing. */
        setAxisTicksSpacing(options.axisTicksSpacing);
    }

    reset();

    return {
        'readGFFFile': readGFFFile,
        'drawSVG': drawSVG,
        'reset': reset
    }
}
