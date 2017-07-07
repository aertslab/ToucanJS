angular.module("ToucanJS")
.directive('visualization', function($location) {
    return {
        restrict: 'E',
        templateUrl: 'app/components/visualization/visualization.html',
        scope: false,
        /*
        {
            options : '=',
            workspace: '=',
            move: '=',
            search: '=',
            cut: '='
        },
        */
        link: function(scope, elem, attr) {
            scope.search.matches = {};
            var debug = 1;

            // drawind custom focus X axis
            var customFocusAxis = function(g) {
                g.call(focusXAxis);
                g.select(".domain").remove();
                g.selectAll(".tick line").attr("stroke", scope.options.axisStrokeColor).attr("stroke-dasharray", scope.options.axisStrokeArray);
                g.selectAll(".tick text").attr("y", focusHeight - scope.options.featureHeight);
            };

            var featureComparator = function (b, a) {
                var r = (a.relativeEnd - a.relativeStart) - (b.relativeEnd - b.relativeStart);
                if (r == 0) {
                    r = a.score - b.score;
                }
                return r;
            }

            // handling brush events
            function brushedX() {
                // ignore brush-by-zoom
                if (d3.event && d3.event.sourceEvent && d3.event.sourceEvent.type === "zoom") return;
                if (d3.event && !d3.event.sourceEvent) return;

                if (debug) console.log("brushedX", d3.event);

                // select area
                var s = d3.event ? d3.event.selection || contextXScale.range() : contextXScale.range();
                // update focus scale domain
                focusXScale.domain(s.map(contextXScale.invert, contextXScale));
                // redraw focus X axis
                focus.select(".axis--x")
                    .call(customFocusAxis);
                // update zoom rect
                translateX = -s[0];
                scaleX = width / (s[1] - s[0]);
                svg.select(".zoom").call(zoom.transform, d3.zoomIdentity
                    .scale(scaleX, scaleY)
                    .translate(translateX, translateY));
                // update focus scale
                scope.updatePositioning();
            }


            function brushedY() {
                // ignore brush-by-zoom
                if (d3.event && d3.event.sourceEvent && d3.event.sourceEvent.type === "zoom") return;
                if (d3.event && !d3.event.sourceEvent) return;
                if (debug) console.log("brushedY", d3.event);

                // select area
                var s = d3.event ? d3.event.selection || contextYScale.range() : contextYScale.range();
                // update focus scale domain
                //focusXScale.domain(s.map(contextXScale.invert, contextXScale));
                focusYScale.domain(s.map(contextYScale.invert, contextYScale));
                var r = contextYScale.range();
                scoreScale.range([0, scope.options.featureHeight * (r[1] - r[0]) / (s[1] - s[0])]);
                for (var seqID in bigWigScales) {
                    bigWigScales[seqID].range([0, 2*scope.options.featureHeight * (r[1] - r[0]) / (s[1] - s[0])]);
                }
                // update zoom rect
                translateY = -s[0];
                scaleY = focusHeight / (s[1] - s[0]);
                // update transform ?
                svg.select(".zoom").call(zoom.transform, d3.zoomIdentity
                    .scale(scaleX, scaleY)
                    .translate(translateX, translateY));
                // update focus scale
                scope.updatePositioning();
            }

            // handling zoom events
            function zoomed() {
                // ignore zoom-by-brush
                var mouseEvent = d3.event.sourceEvent;
                if (mouseEvent && mouseEvent.type === "brush") return;
                if (mouseEvent && mouseEvent.type === "end") return;
                if (scope.cut.cutting && scope.cut.state == 1) return updateCutPosition(mouseEvent ? mouseEvent.target : null);

                // source transform
                var t = d3.event.transform;
                // one transform for two things
                if (debug) console.log("zoomed", t);

                // update focus scale domain
                focusXScale.domain(t.rescaleX(contextXScale).domain());
                focusYScale.domain(t.rescaleY(contextYScale).domain());
                scoreScale.range([0, t.scale(scope.options.featureHeight).ky]);
                for (var seqID in bigWigScales) {
                    bigWigScales[seqID].range([0, t.scale(2 * scope.options.featureHeight).ky]);
                }
                scaleX = t.k;
                scaleY = t.ky;
                translateX = t.x;
                translateY = t.y;
                // redraw focus X axis
                focus.select(".axis--x")
                    .call(customFocusAxis);
                // update brush rect
                contextX.select("g.brushX")
                    .call(brushX.move, [0, width].map(t.invertX, t));
                contextY.select("g.brushY")
                    .call(brushY.move, [0, focusHeight].map(t.invertY, t));
                // update focus scale
                scope.updatePositioning();
            }

            // handling changes to options object
            scope.updateDimensions = function() {
                if (debug) console.log("updateDimensions");

                // get the parent width
                width = elem.parent().width();
                if (!width) return;

                if (scope.options.maxScore == 0) scope.options.maxScore = 10;
                scoreScale.domain([0, scope.options.maxScore]);

                // calculate the dimensions
                height = scope.options.height;
                focusMargins = {
                    top: 2*scope.options.margin + scope.options.contextHeight,
                    right: 2*scope.options.margin + scope.options.contextHeight,
                    bottom: scope.options.margin,
                    left: scope.options.margin + scope.options.sequenceMargin
                };
                contextXMargins = {
                    top: scope.options.margin,
                    right: scope.options.margin,
                    bottom: height - scope.options.margin - scope.options.contextHeight,
                    left: scope.options.margin + scope.options.sequenceMargin
                };
                contextYMargins = {
                    top: 2*scope.options.margin + scope.options.contextHeight,
                    right: scope.options.margin,
                    bottom: height - 3*scope.options.margin - scope.options.contextHeight,
                    left: width - scope.options.margin - scope.options.contextHeight
                };

                // update the main SVG containter
                svg.attr("viewBox", "0 0 "+width+" "+height)
                    .attr("width", width+"px")
                    .attr("height", height+"px");

                // recalculate the child dimensions
                width = width - focusMargins.left - focusMargins.right;
                if (width < 0) width = 0;
                focusHeight = height - focusMargins.top - focusMargins.bottom;
                if (focusHeight < 0) focusHeight = 0;
                contextHeight = scope.options.contextHeight;

                // update the scales
                focusXScale.range([0, width]);
                focusYScale.range([scope.options.featureHeight, focusHeight - scope.options.featureHeight]);
                var t = d3.zoomTransform(zoomRect.node());
                scoreScale.range([0, t.scale(scope.options.featureHeight).ky]);
                contextXScale.range([0, width]);
                contextYScale.range([0, focusHeight]);
                brushX.extent([[0, 0], [width, contextHeight]]);
                brushY.extent([[0, 0], [contextHeight, focusHeight]]);
                zoom.translateExtent([[0, -10], [width, focusHeight+10]])
                    .extent([[0, 0], [width, focusHeight]]);
                focusXAxis.ticks(scope.options.numberOfTicks)
                    .tickSize(focusHeight);
                contextXAxis.ticks(scope.options.numberOfTicks);
                focus.select(".axis--x")
                    .call(customFocusAxis);
                contextX.select(".axis--x")
                    .call(contextXAxis);
                contextY.select(".axis--y")
                    .call(contextYAxis);

                // update the focus clip rect
                svg.select("#focusClip").select('rect')
                    .attr("width", width)
                    .attr("height", focusHeight);
                svg.select("#namesClip").select('rect')
                    .attr("width", scope.options.sequenceMargin)
                    .attr("height", focusHeight);

                // update focus zoom rect
                svg.select('rect.zoom')
                    .attr("width", width)
                    .attr("height", focusHeight)
                    .attr("transform", "translate(" + focusMargins.left + "," + focusMargins.top + ")")

                // position the blocks
                names.attr("transform", "translate(" + scope.options.margin + "," + focusMargins.top + ")");
                focus.attr("transform", "translate(" + focusMargins.left + "," + focusMargins.top + ")");
                contextX.attr("transform", "translate(" + contextXMargins.left + "," + contextXMargins.top + ")");
                contextX.select('g.axis').attr("transform", "translate(0," + (contextHeight / 2) + ")")
                contextX.select('g.brushX').call(brushX);
                contextY.attr("transform", "translate(" + contextYMargins.left + "," + contextYMargins.top + ")");
                contextY.select('g.axis').attr("transform", "translate(" + (contextHeight / 2) + ", 0)")
                contextY.select('g.brushY').call(brushY);
            }

            scope.updatePositioning = function() {
                if (debug) console.log("updatePositioning");

                // update sequence name positions
                names.selectAll("text.name")
                    .attr("dy", function(d, i) {
                        return parseInt(focusYScale(i));
                    });

                // length of sequence
                focus.selectAll("line.sequence")
                    .attr("x1", function(d) {
                        if (scope.move.moving && scope.move.seq.seqID == d.seqID) {
                            d.translate = scope.move.seq.translate;
                        }
                        if (!d.translate) d.translate = 0;
                        return parseInt(focusXScale(d.translate));
                    })
                    .attr("x2", function(d) {
                        if (scope.move.moving && scope.move.seq.seqID == d.seqID) {
                            d.translate = scope.move.seq.translate;
                        }
                        if (!d.translate) d.translate = 0;
                        return parseInt(focusXScale(d.translate + d.regionSize));
                    })
                    .attr("y1", function(d) {
                        return parseInt(focusYScale(d.seqNr));
                    })
                    .attr("y2", function(d) {
                        return parseInt(focusYScale(d.seqNr));
                    });

                // length and position of feature
                focus.selectAll("rect.feature")
                    .attr("x", function(d) {
                        var sequence = d3.select(this.parentNode).datum();
                        if (!sequence.translate) sequence.translate = 0;
                        var x = 0;
                        if (sequence.reverse)  {
                            x = parseInt(focusXScale(sequence.translate + sequence.regionSize - d.relativeEnd));
                        } else {
                            x = parseInt(focusXScale(sequence.translate + d.relativeStart));
                        }
                        return x;
                    })
                    .attr("y", function(d) {
                        var reverse = d3.select(this.parentNode).datum().reverse;
                        if ((!reverse && d.strand == '+') || (reverse && d.strand == '-'))
                            return parseInt(focusYScale(d.seqNr) - scoreScale(d.score))
                        else
                            return parseInt(focusYScale(d.seqNr))
                    })
                    .attr("width", function(d) {
                        // something wrong when cut
                        return parseInt(focusXScale(d.relativeEnd) - focusXScale(d.relativeStart));
                    })
                    .attr("height", function(d) {
                        return scoreScale(d.score);
                    });

                // lenght and position of searched motifs
                focus.selectAll("rect.search")
                    .attr("x", function(d) {
                        var sequence = d3.select(this.parentNode).datum()
                        if (sequence.reverse)  {
                            return parseInt(focusXScale(sequence.translate + sequence.regionSize - d.start));
                        }
                        return parseInt(focusXScale(sequence.translate + d.start));
                    })
                    .attr("y", function(d) {
                        var reverse = d3.select(this.parentNode).datum().reverse;
                        if ((!reverse && d.strand == '+') || (reverse && d.strand == '-'))
                            return parseInt(focusYScale(d.seqNr) - scoreScale(scope.search.score))
                        else
                            return parseInt(focusYScale(d.seqNr))
                    })
                    .attr("width", function(d) {
                        return parseInt(focusXScale(d.end) - focusXScale(d.start));
                    })
                    .attr("height", function(d) {
                        return scoreScale(scope.search.score);
                    });

                focus.selectAll("rect.cut")
                    .attr("x", scope.cut.start < scope.cut.end ? focusXScale(scope.cut.start) : focusXScale(scope.cut.end))
                    .attr("width", scope.cut.start < scope.cut.end ? focusXScale(scope.cut.end) - focusXScale(scope.cut.start) : focusXScale(scope.cut.start) - focusXScale(scope.cut.end));

                if (scope.move.moving) {
                    if (!scope.move.seq.translate) scope.move.seq.translate = 0;
                    focus.selectAll("rect.highlight")
                        .attr("x", focusXScale(scope.move.seq.translate))
                        .attr("width", parseInt(focusXScale(scope.move.seq.regionSize + scope.move.seq.translate) - focusXScale(scope.move.seq.translate)))
                        .attr("y", focusYScale(scope.sequencePositions[scope.move.seq.seqID]) - scoreScale(scope.options.maxScore))
                        .attr("height", 2*scoreScale(scope.options.maxScore));
                }

                var linePath = d3.line()
                    .defined(function(d) {
                        return d;
                    })
                    .x(function(d, i , j) {
                        var sequence = scope.workspace.sequences[d.seqID];
                        if (sequence.reverse) {
                            return focusXScale(sequence.translate + sequence.regionSize - d.position);
                        } else {
                            return focusXScale(sequence.translate + d.position);
                        }
                    })
                    .y(function(d) {
                        var t = d3.zoomTransform(zoomRect.node());
                        return focusYScale(scope.sequencePositions[d.seqID]) + t.scale(scope.options.featureHeight).ky - bigWigScales[d.seqID](d.value);
                    })
                    .curve(d3.curveStepAfter);

                var areaPath = d3.area()
                    .defined(function(d) {
                        return d;
                    })
                    .x(function(d) {
                        return focusXScale(d.position);
                    })
                    .y1(function(d) {
                        var t = d3.zoomTransform(zoomRect.node());
                        return focusYScale(scope.sequencePositions[d.seqID]) + t.scale(scope.options.featureHeight).ky - bigWigScales[d.seqID](d.value);
                    })
                    .y0(function(d) {
                        var t = d3.zoomTransform(zoomRect.node());
                        return focusYScale(scope.sequencePositions[d.seqID]) + t.scale(scope.options.featureHeight).ky;
                    })
                    .curve(d3.curveStepAfter);

                // update the bigwig line values
                focus.selectAll("path.bigWigArea")
                    .attr("d", function(d) {
                        return areaPath(d.data);
                    });
                focus.selectAll("path.bigWigLine")
                    .attr("d", function(d) {
                        return linePath(d.data);
                    });
            }

            scope.updateSearchStrokeAndFill = function() {
                if (debug) console.log("updateSearchStrokeAndFill");

                focus.selectAll("rect.search")
                    .attr("fill", function(d) {
                        return scope.search.color;
                    })
                    .attr("fill-opacity", function(d) {
                        return scope.search.opacity;
                    })
                    .attr("stroke", scope.options.featureStrokeColor)
                    .attr("stroke-width", scope.options.featureStrokeWidth)
                    .attr("stroke-opacity", scope.options.featureStrokeOpacity);
            }

            scope.updateSearchResults = function() {
                if (debug) console.log("updateSearchResults");

                var foundFeatures = focus.selectAll("g.sequence")
                    .selectAll("rect.search")
                    .data(function(d) {
                        if (!scope.search.matches[d.seqID]) return [];
                        scope.search.matches[d.seqID].forEach(function(m) {
                            m.seqNr = d.seqNr;
                        });
                        return scope.search.matches[d.seqID];
                    });

                foundFeatures.enter()
                    .append("rect")
                    .attr("class","search");

                foundFeatures.exit()
                    .remove();

                scope.updateSearchStrokeAndFill();
                scope.updatePositioning();
            }

            scope.updateVisibility = function() {
                names.selectAll("text.name")
                    .attr("visibility", function(d) {
                        return d.show ? "visible" : "hidden";
                    });

                focus.selectAll("g.sequence")
                    .attr("visibility", function(d) {
                        return d.show ? "visible" : "hidden";
                    });

                focus.selectAll("path.bigWigArea")
                    .attr("visibility", function(d) {
                        var sequence = d3.select(this.parentNode).datum();
                        var show = scope.workspace.files[d.fileID] && scope.workspace.files[d.fileID].show;
                        show = show && sequence.show;
                        return show ? "visible" : "hidden";
                    });

                focus.selectAll("path.bigWigLine")
                    .attr("visibility", function(d) {
                        var sequence = d3.select(this.parentNode).datum();
                        var show = scope.workspace.files[d.fileID] && scope.workspace.files[d.fileID].show;
                        show = show && sequence.show;
                        return show ? "visible" : "hidden";
                    });

                focus.selectAll("rect.feature")
                    .attr("visibility", function(d) {
                        var sequence = d3.select(this.parentNode).datum();
                        var show = scope.workspace.features[d.featureID] ? scope.workspace.features[d.featureID].show : false;
                        show = show && sequence.show;
                        if (scope.workspace.files[d.fileID]) show = show && scope.workspace.files[d.fileID].show;
                        return show ? 'visible' : 'hidden';
                    });
            }

            scope.updateStrokeAndFill = function() {
                if (debug) console.log("updateStrokeAndFill");

                // update sequence line color
                focus.selectAll("g.sequence")
                    .attr("stroke", scope.options.sequenceColor)
                    .attr("stroke-width", scope.options.sequenceWidth);

                // update seuence feature colors
                focus.selectAll("rect.feature")
                    .attr("fill", function(d) {
                        return scope.workspace.features[d.featureID] ? scope.workspace.features[d.featureID].color : 'black';
                    })
                    .attr("fill-opacity", function(d) {
                        return scope.workspace.features[d.featureID] ? scope.workspace.features[d.featureID].opacity : 1;
                    })
                    .attr("stroke", scope.options.featureStrokeColor)
                    .attr("stroke-width", scope.options.featureStrokeWidth)
                    .attr("stroke-opacity", scope.options.featureStrokeOpacity)

                focus.selectAll("path.bigWigLine")
                    .attr("fill", "none")
                    .attr("stroke", function(d) {
                        return scope.workspace.files[d.fileID].color;
                    })
                    .attr("stroke-opacity", function(d) {
                        return scope.workspace.files[d.fileID].opacity;
                    });

                scope.updateSearchStrokeAndFill();
                scope.updateNamesStrokeAndFill();
            }

            scope.updateNamesStrokeAndFill = function() {
                if (debug) console.log("updateStrokeAndFill");

                names.selectAll("text.name")
                    .attr("fill", function(d) {
                        if (scope.search.matches[d.seqID] && scope.search.matches[d.seqID].length) return scope.options.sequenceFoundColor;
                        if (d.DNAsequence.length) return scope.options.sequenceDownloadedColor;
                        return scope.options.sequenceNameColor;
                    })
            }

            scope.moveSequence = function() {
                if (debug) console.log("moveSequence");

                focus.selectAll("rect.highlight")
                    .attr("visibility", scope.move.moving ? 'visible' : 'hidden');
                scope.updatePositioning();
            }

            scope.cutSequence = function() {
                if (debug) console.log("cutSequence");

                if (scope.cut.state == 3) {
                    scope.cut.state = 0;
                }
                if (scope.cut.cutting) {
                    svg.selectAll("rect.zoom")
                        .classed("cutting", true);
                } else {
                    svg.selectAll("rect.zoom")
                        .classed("cutting", false);
                }
            }

            // handling changes to feature object
            scope.updateSequences = function() {

                var sequenceComparator = function(a, b) {
                    // ignore upper and lowercase
                    var nameA = a.seqID.toUpperCase();
                    var nameB = b.seqID.toUpperCase();
                    if (nameA < nameB) return -1;
                    if (nameA > nameB) return 1;
                    return 0;
                }

                if (scope.workspace.sequencesLength == 0) return;
                if (debug) console.log("updateSequences");

                // update scale domains
                focusYScale.domain([0, scope.workspace.sequencesLength]);
                focusXScale.domain([0, scope.options.longestRegionSize]);
                contextXScale.domain([0, scope.options.longestRegionSize]);
                contextYScale.domain([0, scope.workspace.sequencesLength]);
                focus.select(".axis--x")
                    .call(customFocusAxis);
                contextX.select(".axis--x")
                    .call(contextXAxis);
                contextY.select(".axis--x")
                    .call(contextYAxis);

                // get sequences
                var seqs = Object.values(scope.workspace.sequences);
                scope.sequencePositions = {};
                seqs.sort(sequenceComparator);
                seqs.forEach(function(s, i) {
                    s.seqNr = i;
                    scope.sequencePositions[s.seqID] = s.seqNr;
                    s.features.forEach(function(f) {
                        f.seqNr = s.seqNr;
                    });
                    s.features = s.features.sort(featureComparator);
                });

                // process changes to sequence names block
                var name = names.selectAll("text.name")
                   .data(seqs);

                // foreach added sequence add name
                name.enter()
                    .append("text")
                    .attr("class", "name");

                // foreach removed sequence remove the name
                name.exit()
                    .remove();

                // update text
                names.selectAll("text.name").text(function(d) {
                    return d.seqID;
                });

                // process changes to focus block
                var sequence = focus.selectAll("g.sequence")
                    .data(seqs);

                // foreach added sequence add group
                sequence.enter()
                    .append("g")
                    .attr("class", "sequence");
                sequence.exit()
                    .remove();

                focus.selectAll("g.sequence")
                    .attr("seqID", function(d) {
                        return (d.seqID);
                    });

                bigWigScales = {};

                seqs.forEach(function(s){
                    // TODO: not valid selector
                    var group = focus.selectAll("g.sequence[seqID='"+(s.seqID)+"']");

                    // foreach added sequence append a sequence line
                    var line = group.selectAll("line.sequence")
                        .data([s]);
                    line.enter()
                        .append("line")
                        .attr("class", "sequence");
                    line.exit().remove();

                    var bwScale = d3.scaleLinear().domain([0, s.bigWigMaxValue]).range([0, 2 * scope.options.featureHeight]);
                    bigWigScales[s.seqID] = bwScale;
                    // foreach added sequence append a bigwig line
                    var bigWigLine = group.selectAll("path.bigWigLine")
                        .data(s.bigWigData ? Object.values(s.bigWigData) : []);
                    bigWigLine.enter()
                        .insert("path", ":first-child")
                        .attr("class", "bigWigLine");
                    bigWigLine.exit().remove();

                    /*
                    var bigWigArea = group.selectAll("path.bigWigArea")
                        .data(s.bigWigData ? Object.values(s.bigWigData) : []);
                    bigWigArea.enter()
                        .insert("path", ":first-child")
                        .attr("class", "bigWigArea")
                        .attr("fill", "#eee")
                        .attr("stroke", "none");
                    bigWigArea.exit().remove();
                    */

                    // foreach added sequence draw sequence features
                    var features = group
                        .selectAll("rect.feature")
                        .data(s.features);
                    features.enter()
                        .append("rect")
                        .attr("class","feature")
                        .append("title");

                    // foreach added sequence add hover tooltip
                    // TODO: this is not updated after seq has been removed
                    group.selectAll("rect.feature")
                        .selectAll("title")
                        .text(function(d) {
                            var tooltip = 'Feature ID: ' + d.featureID;
                            tooltip += '\nScore: ' + d.score.toString();
                            tooltip += '\nRelative start: ' + d.relativeStart.toString();
                            tooltip += '\nRelative end: ' + d.relativeEnd.toString();
                            if ('genomicChrom' in d) {
                                tooltip += '\nGenomic chromosome: ' + d.genomicChrom.toString();
                                tooltip += '\nGenomic start: ' + d.genomicStart.toString();
                                tooltip += '\nGenomic end: ' + d.genomicEnd.toString();
                            }
                            tooltip += '\nStrand: ' + d.strand;
                            tooltip += '\nPhase: ' + d.phase;
                            tooltip += '\nSeqID: ' + d.seqID;
                            tooltip += '\nSource: ' + d.source;
                            tooltip += '\nGene: ' + d.gene;
                            tooltip += '\nFeature type: ' + d.featureType;
                            for (var attributeID in d.attributes) {
                                tooltip += '\n' + attributeID + ': ' + d.attributes[attributeID];
                            }
                            return tooltip;
                        });
                    features.exit().remove();
                });

                contextX.select("g.brushX")
                    .call(brushX.move, [0, width]);
                contextY.select("g.brushY")
                    .call(brushY.move, [0, focusHeight]);

                scope.updatePositioning();
                scope.updateStrokeAndFill();
            }

            // define general visualization properties
            var width = 0, height = 0, focusHeight = 0, contextXHeight = 0, focusMargins = {}, contextXMargins = {};
            var scaleX = 1, scaleY = 1, translateX = 0, translateY = 0;

            // insert main SVG container
            var svg = d3.select("#visualization")
                .insert("svg")
                .attr("id", "mainVisualization")
                .attr("baseProfile", "full")
                .attr("overflow", "hidden")
                .attr("version", "1.1")
                .attr("font-family", "Open Sans")
                .attr("xmlns", "http://www.w3.org/2000/svg");

            // d3 components (scales, brushes, zooms, etc.)
            var bigWigScales = {};
            var scoreScale      = d3.scaleLinear();
            var focusXScale     = d3.scaleLinear();
            var focusYScale     = d3.scaleLinear();
            var contextXScale   = d3.scaleLinear();
            var contextYScale   = d3.scaleLinear();
            var focusXAxis      = d3.axisBottom(focusXScale);
            var contextXAxis    = d3.axisBottom(contextXScale);
            var contextYAxis    = d3.axisRight(contextYScale);
            var brushX          = d3.brushX()
                                    .on("brush end", brushedX);
            var brushY          = d3.brushY()
                                    .on("brush end", brushedY);
            var zoom            = d3.zoom()
                                    .scaleExtent([1, Infinity])
                                    .scaleLock(function() {
                                        return [d3.event ? d3.event.altKey : false, d3.event ? d3.event.ctrlKey : false];
                                    })
                                    .on("zoom", zoomed);

            // define focus clip rect
            var defs = svg.append("defs");
            defs.append("clipPath")
                .attr("id", "focusClip")
                .append("rect")
                .attr("x", 0)
                .attr("y", 0);
            defs.append("clipPath")
                .attr("id", "namesClip")
                .append("rect")
                .attr("x", 0)
                .attr("y", 0);

            var updateCutPosition = function(target) {
                if (scope.cut.cutting && scope.cut.state == 1) {
                    if (debug) console.log("updateCutPosition");
                    var coords = d3.mouse(target ? target : this);
                    if (scope.cut.drag && !target) return toggleCut();
                    if (target) scope.cut.drag = true;
                    scope.cut.endX = coords[0];
                    scope.cut.end = focusXScale.invert(scope.cut.endX);
                    focus.selectAll("rect.cut")
                        .attr("x", scope.cut.startX < scope.cut.endX ? scope.cut.startX : scope.cut.endX)
                        .attr("width", scope.cut.startX < scope.cut.endX ? scope.cut.endX - scope.cut.startX : scope.cut.startX - scope.cut.endX);
                }
            }

            var toggleCut = function() {
                if (scope.cut.cutting) {
                    if (debug) console.log("toggleCut");
                    if (scope.cut.state == 0 || scope.cut.state == 2) {
                        var coords = d3.mouse(this);
                        scope.cut.startX = coords[0];
                        focus.selectAll("rect.cut")
                            .attr("x", scope.cut.startX)
                            .attr("y", 0)
                            .attr("height", focusHeight)
                            .attr("visibility", "visible");
                        scope.cut.state = 1;
                        scope.cut.start = focusXScale.invert(scope.cut.startX);
                    } else if (scope.cut.state == 1) {
                        scope.cut.state = 2;
                        scope.cut.start = parseInt(scope.cut.start);
                        scope.cut.end = parseInt(scope.cut.end);
                        if (scope.cut.start > scope.cut.end) {
                            var e = scope.cut.end;
                            scope.cut.end = scope.cut.start;
                            scope.cut.start = e;
                        }
                        scope.$apply();
                        $("#cutModal").modal('show');
                        focus.selectAll("rect.cut")
                            .attr("visibility", "hidden")
                            .attr("x", 0)
                            .attr("width", 0);
                    }
                }
            }

            // add focus zoom rect
            var zoomRect = svg.append("rect")
                .attr("class", "zoom")
                .on("mousedown", toggleCut)
                .on("mousemove", updateCutPosition)
                .call(zoom);


            // define a group for sequence names
            var names = svg.append("g")
                .attr("class", "names")
                .attr("clip-path", "url(#namesClip)");

            // define a group for focus visualization
            var focus = svg.append("g")
                .attr("class", "focus")
                .attr("clip-path", "url(#focusClip)");
            focus.append("g")
                .attr("class", "axis axis--x")
                .call(customFocusAxis);

            // define a group for contextX visualization
            var contextX = svg.append("g")
                .attr("class", "contextX");

            // add contextX axis and brush rect
            contextX.append("g")
                .attr("class", "axis axis--x")
                .call(contextXAxis);
            contextX.append("g")
                .attr("class", "brushX");

            // define a group for contextY visualization
            var contextY = svg.append("g")
                .attr("class", "contextY");
            // add contextY axis and brush rect
            contextY.append("g")
                .attr("class", "axis axis--y")
                .call(contextYAxis);
            contextY.append("g")
                .attr("class", "brushY");

            focus.append("rect")
                .attr("class", "highlight")
                .attr("fill", "yellow")
                .attr("fill-opacity", 0.5)
                .call(d3.drag().on("drag", function() {
                    scope.move.seq.translate += parseInt(d3.event.dx * (focusXScale.domain()[1] - focusXScale.domain()[0]) / width);
                    scope.updatePositioning();
                }));

            focus.append("rect")
                .attr("class", "cut")
                .attr("fill", "yellow")
                .attr("fill-opacity", 0.5)
                .attr("visibility","hidden")
                .on("mousedown", toggleCut)
                .on("mousemove", updateCutPosition);

        }
    };
});