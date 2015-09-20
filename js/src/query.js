var d3 = require('d3'),
    ajax = require('reqwest'),
    store = require('store'),
    time = require('./time.js');

var svg = d3.select('#main').append('svg'),
    w = 800,
    h = 400,
    padding = 75,
    barPadding = 5;

var commas = d3.format('0,000');

function PageQuery(title) {

    var edits = [],
        years = {},
        editsByYear = {},
        yearMax = 0,
        yScale,
        yAxisScale,
        yAxis,
        rect,
        text;

    window.location.hash = title;

    function parseNewEdits(arr) {
        arr.forEach(function(item) {

            var time = new Date(item.timestamp),
                year = time.getFullYear(),
                month = time.getMonth();

            if ( editsByYear[year] ) {
                editsByYear[year].total++;
            } else {
                editsByYear[year] = {
                    total: 1
                };
            }

            if ( editsByYear[year].total > yearMax ) yearMax = editsByYear[year].total;
            editsByYear[year][month] = editsByYear[year][month] ? editsByYear[year][month] + 1 : 1;
        });
    }

    function updateScale(domain, range) {
        if ( domain[1] < domain[0] ) domain[1] = domain[0];
        return d3.scale.linear()
            .domain(domain)
            .range(range);
    }

    function yOffset(d) { return d3.min([padding + h - 5, padding + h - yScale(d.value.total)]); }
    function height(d) { return d3.max([5, yScale(d.value.total)]); }

    function update(year) {

        var data = {},
            query = this;

        if ( year ) {
            var i = 0,
                monthMax = 0;
            while ( i < 12 ) {
                data[time.monthName(i)] = {
                    total: editsByYear[year][i]
                };
                if ( data[time.monthName(i)].total > monthMax ) monthMax = data[time.monthName(i)].total;
                i++;
            }

            updateYAxis(0, monthMax);
            updateViewing.call(query, false, year);
        } else {
            updateYAxis(8, yearMax);
            updateViewing.call(query, false);
            data = editsByYear;
        }

        var barLeft = function(d, i) {
                return barPadding + padding + i * (w / d3.entries(data).length);
            },
            barWidth = w / d3.entries(data).length - barPadding;

        rect = svg.selectAll('rect').data(d3.entries(data));
        text = svg.selectAll('.label').data(d3.entries(data));

        // create new <rect> elements for new data
        rect.reverse().enter().append('rect');
        text.enter().append('text');

        // apply transition, dimensions, position
        rect.transition().duration(250)
            .attr('class', 'fill-default')
            .attr('x', barLeft)
            .attr('y', yOffset)
            .attr('width', barWidth)
            .attr('height', height);
        rect.exit().remove();

        text.attr('class', 'label')
            .attr('x', function(d, i) {
                return barLeft(d, i) + 0.5 * barWidth;
            })
            .attr('y', function() {
                return h + padding + 20;
            })
            .attr('transform', function(d, i) {
                return 'rotate(45 ' + (barLeft(d, i) + 0.5 * barWidth) + ' ' + (h + padding) + ')';
            })
            .text(function(d) {
                return d.key;
            })
            .attr('height', height);
        text.exit().remove();

        rect.on('mouseover', showModal)
            .on('mousemove', showModal)
            .on('mouseout', function() {
                d3.select(this).attr('class', '');
            });

        // only go further for year views
        rect.on('click', function(d) {
            if ( !isNaN(+d.key) ) update.call(query, d.key);
        });
    }

    function showModal(d) {

        var $this = d3.select(this),
            modalWidth = 150,
            modalLeft = d3.event.pageX - 0.5 * modalWidth,
            modalTop = d3.event.pageY - 60;

        rect.each(function() {
            d3.select(this).attr('class', '');
        });

        $this.attr('class', 'fill-red');

        d3.select('#modal')
            .style({
                display: 'block',
                left: modalLeft + 'px',
                top: modalTop + 'px',
                width: modalWidth + 'px'
            })
            .html('<p><b>' + commas(d.value.total || 0) + '</b>&nbsp;edit' + (d.value.total === 1 ? '' : 's') + '</p>');
    }

    svg.on('mouseout', function() {
        d3.select('#modal').style('display', 'none');
    });

    function archive() {
        store.set('wikitracking-' + title, edits);
    }

    function updateViewing(viewingNode, year) {

        // set default viewing node
        if ( !this._viewingNode ) this._viewingNode = viewingNode;

        this._viewingNode.innerHTML = 'You are viewing Wikipedia edits ' + (year ? 'in ' + year : 'by year') + ' for: <b>' + decodeURIComponent(title) + '</b>';

        if ( year ) {
            var back = document.createElement('p');
            back.id = 'back';
            back.innerHTML = '<a href="#">Back to all years</a>';
            var _this = this;
            back.addEventListener('click', update.bind(this, null), false);

            this._viewingNode.parentNode.insertBefore(back, this._viewingNode.nextSibling);
        } else {
            d3.select('#back').remove();
        }

        return this;
    }

    function updateYAxis(min, max) {
        yScale = updateScale([min, max], [0, h]);
        yAxisScale = updateScale([min, max], [h + padding, padding]);
        yAxis.scale(yAxisScale);
        svg.select('.y.axis')
            .transition()
            .call(yAxis);
    }

    return {
        updateViewing: updateViewing,
        getRevisions: function getRevisions(param_continue, param_rvcontinue) {

            if ( !store.get('wikitracking-' + title) ) {

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
                        } else {
                            archive();
                        }

                        // update y axis
                        updateYAxis(8, yearMax);

                        update.call(this);
                    }
                });
            } else {
                edits = store.get('wikitracking-' + title);
                parseNewEdits(edits);

                // update y axis
                updateYAxis(8, yearMax);
            }

            update.call(this);

            return this;
        },
        makeGraph: function makeGraph() {

            var realWidth = w + 1.5 * padding,
                realHeight = h + 2 * padding;

            function clamp(val, min, max) {
                return d3.min([d3.max([val, min]), max]);
            }

            function svgStyle() {

                var containerWidth = svg.node().parentNode.clientWidth;
                svg.attr('width', realWidth ).attr('height', realHeight);
                svg.attr('viewBox', '0 0 ' + (realWidth > containerWidth ? realWidth * realWidth / containerWidth : realWidth) + ' ' + realHeight);
                svg.style('font-size', clamp(containerWidth / realWidth, 0.8, 1) + 'em');
            }

            yScale = updateScale([8, yearMax], [0, h]);
            yAxisScale = updateScale([8, yearMax], [h + padding, padding]);

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

            svgStyle();

            window.addEventListener('resize', svgStyle);

            return this;
        }
    };
}

module.exports = PageQuery;
