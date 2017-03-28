angular.module("ToucanJS")
.directive('visualization', function($location) {
    return {
        restrict: 'E',
        templateUrl: 'app/shared/visualization/visualization.html',
        scope: {
            options : '<',
            features: '<',
            sequences: '<',
            featureColors: '<',
            size: '<'
        },
        link: function(scope, elem, attr) {

            // drawind custom focus X axis
            var customFocusAxis = function(g) {
                g.call(focusAxis);
                g.select(".domain").remove();
                g.selectAll(".tick line").attr("stroke", scope.options.axisStrokeColor).attr("stroke-dasharray", scope.options.axisStrokeArray);
                g.selectAll(".tick text").attr("y", focusHeight);
            };

            // resizing the focus scale
            function updateFocusScale() {
                // length of sequence
                focus.selectAll("line.sequence")
                    .attr("x2", function(d) {
                        return parseInt(focusScale(d.regionSize));
                    });
                // length and position of feature
                focus.selectAll("rect.feature")
                    .attr("x", function(d) {
                        return parseInt(focusScale(d.relativeStart));
                    })
                    .attr("width", function(d) {
                        return parseInt(focusScale(d.relativeEnd) - focusScale(d.relativeStart));
                    });
            }

            // handling brush events
            function brushed() {
                // ignore brush-by-zoom
                if (d3.event && d3.event.sourceEvent && d3.event.sourceEvent.type === "zoom") return;
                // select area
                var s = d3.event ? d3.event.selection || contextScale.range() : contextScale.range();
                // update focus scale domain
                focusScale.domain(s.map(contextScale.invert, contextScale));
                // redraw focus X axis
                focus.select(".axis--x")
                    .call(customFocusAxis);
                // update zoom rect
                svg.select(".zoom").call(zoom.transform, d3.zoomIdentity
                    .scale(width / (s[1] - s[0]))
                    .translate(-s[0], 0));
                // update focus scale
                updateFocusScale();
            }

            // handling zoom events
            function zoomed() {
                // ignore zoom-by-brush
                if (d3.event.sourceEvent && d3.event.sourceEvent.type === "brush") return;
                // source transform
                var t = d3.event.transform;
                // update focus scale domain
                focusScale.domain(t.rescaleX(contextScale).domain());
                // redraw focus X axis
                focus.select(".axis--x")
                    .call(customFocusAxis);
                // update brush rect
                context.select("g.brush")
                    .call(brush.move, [0, width].map(t.invertX, t));
                // update focus scale
                updateFocusScale();
            }

            // handling changes to options object
            scope.updateDimensions = function() {
                // get the parent width
                width = elem.parent().width();
                if (!width) return;

                // calculate the dimensions
                height = scope.options.height;
                focusMargins = {
                    top: 2*scope.options.margin + scope.options.contextHeight,
                    right: scope.options.margin,
                    bottom: scope.options.margin,
                    left: scope.options.margin + scope.options.sequenceMargin
                };
                contextMargins = {
                    top: scope.options.margin,
                    right: scope.options.margin,
                    bottom: height - scope.options.margin - scope.options.contextHeight,
                    left: scope.options.margin + scope.options.sequenceMargin
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
                focusScale.range([0, width]);
                contextScale.range([0, width]);
                brush.extent([[0, 0], [width, contextHeight]]);
                zoom.translateExtent([[0, 0], [width, focusHeight]])
                    .extent([[0, 0], [width, focusHeight]]);
                yScale.range([scope.options.featureHeight, focusHeight - scope.options.featureHeight]);
                focusAxis.ticks(scope.options.numberOfTicks)
                    .tickSize(focusHeight);
                contextAxis.ticks(scope.options.numberOfTicks);
                focus.select(".axis--x")
                    .call(customFocusAxis);
                context.select(".axis--x")
                    .call(contextAxis);

                // update the focus clip rect
                svg.select("#focusClip").select('rect')
                    .attr("width", width)
                    .attr("height", height);

                // update focus zoom rect
                svg.select('rect.zoom')
                    .attr("width", width)
                    .attr("height", focusHeight)
                    .attr("transform", "translate(" + focusMargins.left + "," + focusMargins.top + ")")

                // position the blocks
                names.attr("transform", "translate(" + scope.options.margin + "," + focusMargins.top + ")");
                focus.attr("transform", "translate(" + focusMargins.left + "," + focusMargins.top + ")");
                context.attr("transform", "translate(" + contextMargins.left + "," + contextMargins.top + ")");
                context.select('g.axis').attr("transform", "translate(0," + (contextHeight / 2) + ")")
                context.select('g.brush').call(brush);
            }

            scope.updatePositioning = function() {
                // update sequence name positions
                names.selectAll("text.name")
                    .attr("dy", function(d, i) {
                        return parseInt(yScale(i));
                    });

                // update sequence line color and position
                focus.selectAll("g.sequence").attr("stroke", scope.options.sequenceColor)
                    .attr("stroke-width", scope.options.sequenceWidth)
                    .selectAll("line.sequence")
                    .attr("y1", function(d) {
                        return parseInt(yScale(d.seqNr));
                    })
                    .attr("y2", function(d) {
                        return parseInt(yScale(d.seqNr));
                    });

                // update sequence feature dimensions, colors and position
                focus.selectAll("rect.feature")
                    .attr("y", function(d) {
                        if (d.strand == '+')
                            return parseInt(yScale(d.seqNr) - scope.options.featureHeight)
                        else
                            return parseInt(yScale(d.seqNr))
                    })
                    .attr("height", scope.options.featureHeight)
                    .attr("fill", function(d) {
                        return scope.featureColors[d.featureID];
                    })
                    .attr("stroke", scope.options.featureStrokeColor)
                    .attr("stroke-width", scope.options.featureStrokeWidth)
                    .attr("fill-opacity", scope.options.featureFillOpacity)
                    .attr("stroke-opacity", scope.options.featureStrokeOpacity);

            }

            // handling changes to feature object
            scope.updateSequences = function() {
                if (!scope.features) return;

                // update scale domains
                yScale.domain([0, scope.options.sequencesLength]);
                focusScale.domain([0, scope.size]);
                contextScale.domain([0, scope.size]);
                focus.select(".axis--x")
                    .call(customFocusAxis);
                context.select(".axis--x")
                    .call(contextAxis);
                updateFocusScale();

                // process changes to sequence names block
                var name = names.selectAll("text.name")
                   .data(Object.values(scope.sequences));

                // foreach added seqence add name
                name.enter()
                    .append("text")
                    .attr("class", "name")
                    .text(function(d) {
                        return d.seqID;
                    });

                // foreach removed sequence remove the name
                name.exit().remove();

                // process changes to focus block
                var sequence = focus.selectAll("g.sequence")
                    .data(function(d) {
                        var seqs = Object.values(scope.sequences);
                        seqs.forEach(function(s, i) {
                            s.seqNr = i;
                        });
                        return seqs;
                    });

                // foreach added sequence add group
                var sequenceAdded = sequence.enter()
                    .append("g")
                    .attr("class", "sequence");

                // foreach added sequence append a sequence line
                sequenceAdded.append("line")
                    .attr("class", "sequence")
                    .attr("x1", 0);

                // foreach added sequence draw sequence features
                sequenceAdded.selectAll("rect.feature")
                    .data(function(d, i) {
                        d.features.forEach(function(f) {
                            f.seqNr = d.seqNr;
                        });
                        return d.features;
                    }).enter()
                    .append("rect")
                    .attr("class","feature")
                    // foreach added sequence add hover tooltip
                    .append("title")
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
                        tooltip += '\nFeature type: ' + d.featureType;
                        for (var attributeID in d.attributes) {
                            tooltip += '\n' + attributeID + ': ' + d.attributes[attributeID];
                        }
                        return tooltip;
                    });

                var sequenceRemoved = sequence.exit()
                    .remove();
                // foreach removed sequence remove sequnce line
                sequenceRemoved.selectAll("line.sequence")
                    .remove();
                // foreach updated sequence remove sequnce features
                sequenceRemoved.selectAll("rect.feature")
                    .remove();

                scope.updatePositioning();
            }

            // define general visualization properties
            var width = 0, height = 0, focusHeight = 0, contextHeight = 0, focusMargins = {}, contextMargins = {};

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
            var focusScale      = d3.scaleLinear();
            var contextScale    = d3.scaleLinear();
            var yScale          = d3.scaleLinear();
            var focusAxis       = d3.axisBottom(focusScale);
            var contextAxis     = d3.axisBottom(contextScale);
            var brush           = d3.brushX()
                                    .on("brush end", brushed);
            var zoom            = d3.zoom()
                                    .scaleExtent([1, Infinity])
                                    .on("zoom", zoomed);

            // define focus clip rect
            svg.append("defs")
                .append("clipPath")
                .attr("id", "focusClip")
                .append("rect")
                .attr("x", 0)
                .attr("y", 0);

            // add focus zoom rect
            svg.append("rect")
                .attr("class", "zoom")
                .call(zoom);

            // define a group for sequence names
            var names = svg.append("g")
                .attr("class", "names");

            // define a group for focus visualization
            var focus = svg.append("g")
                .attr("class", "focus")
                .attr("clip-path", "url(#focusClip)");
            focus.append("g")
                .attr("class", "axis axis--x")
                .call(customFocusAxis);

            // define a group for context visualization
            var context = svg.append("g")
                .attr("class", "context");

            // add context axis and brush rect
            context.append("g")
                .attr("class", "axis axis--x")
                .call(contextAxis);
            context.append("g")
                .attr("class", "brush");

            // trigger updates
            scope.updateDimensions();
            scope.updateSequences();

            // setting full width context
            svg.select("g.brush").call(brush.move, [0, width]);

            // handling attr changes
            scope.$watch('features', function() {
                scope.updateSequences();
            }, true);
            scope.$watch('featureColors', function() {
                scope.updatePositioning();
            }, true);
            scope.$watch('options', function() {
                scope.updateDimensions();
                scope.updatePositioning();
            }, true);
        }
    };
});