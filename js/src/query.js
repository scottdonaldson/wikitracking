var d3 = require('d3'),
    ajax = require('reqwest');

var svg = d3.select('#main').append('svg'),
    w = 800,
    h = 400,
    padding = 60,
    barPadding = 5;

var commas = d3.format('0,000');

function PageQuery(title) {

    var edits = [],
        years = {},
        byYear = {},
        yScale,
        yAxisScale,
        yAxis,
        rect,
        text;

    function parseNewEdits(arr) {
        arr.forEach(function(item) {

            var year = new Date(item.timestamp).getFullYear();

            if ( byYear[year] ) {
                byYear[year]++;
            } else {
                byYear[year] = 1;
            }
        });
    }

    function updateScale(domain, range) {
        return d3.scale.linear()
            .domain(domain)
            .range(range);
    }

    function yOffset(d) { return d3.min([padding + h - 5, padding + h - yScale(d.value)]); }
    function height(d) { return d3.max([5, yScale(d.value)]); }

    function update() {

        var barLeft = function(d, i) {
                return barPadding + padding + i * (w / d3.entries(byYear).length);
            },
            barWidth = w / d3.entries(byYear).length - barPadding;

        rect = svg.selectAll('rect').data(d3.entries(byYear));
        text = svg.selectAll('text.year').data(d3.entries(byYear));

        // create new <rect> elements for new data
        rect.reverse().enter().append('rect');
        text.enter().append('text');

        // apply transition, dimensions, position
        rect.transition().duration(250)
            .each('start', function() {
                d3.select(this)
                    .attr('fill', '#333')
            })
            .each('end', function() {
                d3.select(this)
                    .attr('fill', '#000')
            })
            .attr('x', barLeft)
            .attr('y', yOffset)
            .attr('width', barWidth)
            .attr('height', height);
        rect.exit().remove();

        text.transition().duration(250)
            .attr('x', function(d, i) {
                return barLeft(d, i) + 0.5 * barWidth;
            })
            .attr('y', function() {
                return h + padding + 16;
            })
            .text(function(d) {
                return d.key;
            })
            .attr('text-anchor', 'middle')
            .attr('height', height);
        text.exit().remove();

        rect.on('mouseover', function(d) {

            var $this = d3.select(this);

            rect.each(function() {
                d3.select(this).attr('class', '');
            });

            $this.attr('class', 'fill-red');

            d3.select('#modal')
                .style({
                    display: 'block',
                    left: (+$this.attr('x') - 100 + 0.5 * +$this.attr('width')) + 'px',
                    top: 0.5 * (h + (+$this.attr('y'))) + 'px'
                })
                .select('[data-edits]')
                .html(d.key + '<br><b>' + commas(d.value) + '</b>&nbsp;edits');
        });
    }

    return {
        updateViewing: function(viewingNode) {

            viewingNode.innerHTML = 'You are viewing Wikipedia edits by year for: <b>' + decodeURIComponent(title) + '</b>';

            return this;
        },
        getRevisions: function getRevisions(param_continue, param_rvcontinue) {

            if ( !localStorage.getItem('wikitracking-' + title) ) {

                if (!param_continue) param_continue = '';
                if (!param_rvcontinue) param_rvcontinue = '';

                var url = 'https://en.wikipedia.org/w/api.php?action=query&format=json&prop=revisions&titles=' + title + '&rvprop=timestamp&continue=' + param_continue + '&rvlimit=500' + (param_rvcontinue ? '&rvcontinue=' + param_rvcontinue : '');

                ajax({
                    url: url,
                    type: 'jsonp',
                    success: function success(data) {

                        for ( var page in data.query.pages ) {
                            edits = edits.concat(data.query.pages[page].revisions);
                            parseNewEdits(data.query.pages[page].revisions);
                        }

                        if ( data.continue ) {

                            getRevisions(
                                data.continue ? data.continue.continue : '',
                                data.continue ? data.continue.rvcontinue : ''
                            );

                            // update y axis
                            yScale = updateScale([8, d3.max(d3.values(byYear))], [0, h]);
                            yAxisScale = updateScale([8, d3.max(d3.values(byYear))], [h + padding, padding]);
                            yAxis.scale(yAxisScale);
                            svg.select('.y.axis')
                                .transition()
                                .call(yAxis);
                        }
                        update();
                    }
                });
            } else {
                edits = JSON.parse(localStorage.getItem('wikitracking-' + title));
                parseNewEdits(edits);

                // update y axis
                yScale = updateScale([8, d3.max(d3.values(byYear))], [0, h]);
                yAxisScale = updateScale([8, d3.max(d3.values(byYear))], [h + padding, padding]);
                yAxis.scale(yAxisScale);
                svg.select('.y.axis')
                    .transition()
                    .call(yAxis);
            }

            update();

            return this;
        },
        makeGraph: function makeGraph() {

            svg.attr('width', w + 2 * padding ).attr('height', h + 2 * padding);

            yScale = updateScale([8, d3.max(d3.values(byYear))], [0, h]);
            yAxisScale = updateScale([8, d3.max(d3.values(byYear))], [h + padding, padding]);

            //Define Y axis
            yAxis = d3.svg.axis()
                .scale(yAxisScale)
                .orient('left')
                .ticks(5);

            // Create axes
            svg.append('g')
                .attr('class', 'y axis')
                .attr('transform', 'translate(' + padding + ',0)')
                .call(yAxis);

            return this;
        },
        archive: function archive() {
            localStorage.setItem('wikitracking-' + title, JSON.stringify(edits));
        }
    };
}

module.exports = PageQuery;
