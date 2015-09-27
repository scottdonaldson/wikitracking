var d3 = require('d3'),
    time = require('./time.js');

var commas = d3.format('0,000'),
    w = 800,
    h = 400,
    padding = 75,
    barPadding = 5;

function clamp(val, min, max) {
    return d3.min([d3.max([val, min]), max]);
}

function updateScale(domain, range) {
    if ( domain[1] < domain[0] ) domain[1] = domain[0];
    return d3.scale.linear()
        .domain(domain)
        .range(range);
}

function offsetFactory(min, max) {
    var yScale = updateScale([min, max], [0, h]);
    return function offset(d, i) {
        var total = d3.values(d.value).length > 0 ? d3.sum(d3.values(d.value)) : d.value;
        return d3.min([padding + h - 5, padding + h - yScale(total)]);
    }
}

function heightFactory(min, max) {
    var yScale = updateScale([min, max], [0, h]);
    return function height(d, i) {
        var total = d3.values(d.value).length > 0 ? d3.sum(d3.values(d.value)) : d.value;
        return d3.max([5, yScale(total)]);
    }
}

function leftFactory(dataLength) {
    return function(d, i) {
        return barPadding + padding + i * (w / dataLength);
    }
}

function widthFactory(dataLength) {
    return function(d, i) {
        return w / dataLength - barPadding;
    }
}

function Graph(container, viewingNode) {

    var svg,
        yAxisScale;

    // set up SVG elemenet
    if ( !d3.select(container).select('svg')[0] ) {
        svg = d3.select(container).select('svg');
    } else {
        svg = d3.select(container).append('svg');
    }

    var realWidth = w + 1.5 * padding,
        realHeight = h + 2 * padding;

    function svgStyle() {

        var containerWidth = container.clientWidth;
        svg.attr('width', realWidth ).attr('height', realHeight);
        svg.attr('viewBox', '0 0 ' + (realWidth > containerWidth ? realWidth * realWidth / containerWidth : realWidth) + ' ' + realHeight);
        svg.style('font-size', clamp(containerWidth / realWidth, 0.8, 1) + 'em');
    }

    yAxisScale = updateScale([0, 100], [h + padding, padding]);

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

    function showModal(d, change) {

        var $this = d3.select(this),
            modalWidth = 150,
            modalLeft = d3.event.pageX - 0.5 * modalWidth,
            modalTop = d3.event.pageY - 60;

        var value = d3.values(d.value).length > 0 ? d3.sum(d3.values(d.value)) : d.value;

        d3.select('#modal')
            .style({
                display: 'block',
                left: modalLeft + 'px',
                top: modalTop + 'px',
                width: modalWidth + 'px'
            })
            .html('<p><b>' + commas(value) + '</b>&nbsp;edit' + (value === 1 ? '' : 's') + '</p>');
    }

    svg.on('mouseout', function() {
        d3.select('#modal').style('display', 'none');
    });

    function updateYAxis(min, max) {

        if ( max < 15 ) {
            min = 0;
            max = 15;
        }

        yAxisScale = updateScale([min, max], [h + padding, padding]);
        yAxis.scale(yAxisScale);
        svg.select('.y.axis')
            .transition()
            .call(yAxis);
    }

    function updateViewing(viewingNode, year) {

        viewingNode.innerHTML = 'You are viewing Wikipedia edits ' + (year ? 'in ' + year : 'by year') + ' for: <b>' + decodeURIComponent(this.title) + '</b>';

        if ( year ) {
            var back = document.createElement('p');
            back.id = 'back';
            back.innerHTML = '<a href="#">Back to all years</a>';
            back.addEventListener('click', update.bind(this, null), false);

            viewingNode.parentNode.insertBefore(back, viewingNode.nextSibling);
        } else {
            d3.select('#back').remove();
        }
    }

    // update the bar chart display (and axes) only
    function updateChart(data, max) {

        updateYAxis(0, max);

        var dataLength = d3.entries(data).length,
            rect,
            shadowRect,
            text;

        var barLeft = leftFactory(dataLength),
            barWidth = widthFactory(dataLength),
            barOffset = offsetFactory(0, max),
            barHeight = heightFactory(0, max);

        rect = svg.selectAll('.bar').data(d3.entries(data));
        shadowRect = svg.selectAll('.shadow').data(d3.entries(data));
        text = svg.selectAll('.label').data(d3.entries(data));

        // create new <rect> elements for new data
        shadowRect.enter().append('rect');
        rect.reverse().enter().append('rect');
        text.enter().append('text');

        shadowRect
            .attr('class', 'shadow')
            .attr('x', barLeft)
            .attr('y', padding)
            .attr('width', barWidth)
            .attr('height', h);
        shadowRect.exit().remove();

        rect.transition().duration(250)
            .attr('class', 'bar')
            .attr('x', barLeft)
            .attr('y', barOffset)
            .attr('width', barWidth)
            .attr('height', barHeight);
        rect.exit().remove();

        text.attr('class', 'label')
            .attr('x', function(d, i) {
                return barLeft(d, i) + 0.5 * barWidth();
            })
            .attr('y', function() {
                return h + padding + 20;
            })
            .attr('transform', function(d, i) {
                return 'rotate(45 ' + (barLeft(d, i) + 0.5 * barWidth()) + ' ' + (h + padding) + ')';
            })
            .text(function(d) {
                return d.key;
            })
            .attr('height', h);

        text.exit().remove();

        rect.on('mouseover', showModal)
            .on('mousemove', showModal);

        shadowRect.on('mouseover', showModal)
            .on('mousemove', showModal);

        shadowRect.on('mouseover', function(d, i) {
            // rect[0] refers to the array of <rect> elements
            rect[0].forEach(function(r, j) {
                r.classList.remove('hover');
                if ( i === j ) r.classList.add('hover');
            });
        }).on('mouseleave', function() {
            rect.attr('class', 'bar');
        });

        // only go further for year views
        var _this = this;
        rect.on('click', function(d) {
            if ( _this.data.hasOwnProperty(d.key) ) update.call(_this, d.key);
        });
    }

    // TODO: needs way of retrieving original data when returning to
    // all years' view from single year
    function update(year) {

        if ( !this.title && !this.data ) {
            throw new Error('You must set the graph with data before you can update the view.');
        }

        var max = 0,
            data;

        if ( !year ) {
            data = this.data;
            for ( var yr in data ) {
                if ( d3.sum(d3.values(data[yr])) > max ) {
                    max = d3.sum(d3.values(data[yr]));
                }
            }
        } else {
            data = this.data[year];
            max = d3.max(d3.values(data));
        }

        updateViewing.call(this, viewingNode, year);
        updateChart.call(this, data, max);
    }

    return {
        set: function(response) {
            this.title = response.title;
            this.data = response.data;
        },
        update: update
    };
}

module.exports = Graph;
