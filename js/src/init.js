var liveQuery = false,
    svg = d3.select('#main').append('svg'),
    w = 800,
    h = 500,
    padding = 80,
    barPadding = 5;

var now = new Date(),
    theYear = now.getFullYear(),
    theMonth = now.getMonth() + 1,
    theDate = now.getDate(),
    theHour = now.getHours();

var theMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Array with number of days in each month (consider leap years)
var monthDays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
if ( theYear % 4 === 0 && theYear !== 2100 ) {
    monthDays[1] = 29;
}

function PageQuery(title) {

    var edits = [],
        years = {},
        byYear = {},
        yScale,
        yAxisScale,
        yAxis,
        rect;

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

    function updateRectangles() {
        rect = svg.selectAll('rect').data(d3.entries(byYear));

        // create new <rect> elements for new data
        rect.reverse().enter().append('rect');

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
            .attr('x', function(d, i) {
               return 20 + padding + i * (w / d3.entries(byYear).length);
            })
            .attr('y', yOffset)
            .attr('width', w / d3.entries(byYear).length - barPadding)
            .attr('height', height)
        rect.exit().remove();

        rect.on('mouseover', function(d) {

            var $this = d3.select(this);

            rect.each(function() {
                d3.select(this).style({
                    fill: '#000'
                });
            });

            $this.style({
                fill: '#f70'
            });

            d3.select('#modal')
                .style({
                    display: 'block',
                    left: (+$this.attr('x') - 100 + 0.5 * +$this.attr('width')) + 'px',
                    top: 0.5 * (h + (+$this.attr('y'))) + 'px'
                })
                .select('[data-edits]')
                .html(d.key + '<br>' + d.value + '&nbsp;edits');
        });
    }

    return {
        getRevisions: function getRevisions(param_continue, param_rvcontinue) {

            if ( !localStorage.getItem('wikitracking-' + title) ) {

                if (!param_continue) param_continue = '';
                if (!param_rvcontinue) param_rvcontinue = '';

                var url = 'http://en.wikipedia.org/w/api.php?action=query&format=json&prop=revisions&titles=' + title + '&rvprop=timestamp|user&continue=' + param_continue + '&rvlimit=500' + (param_rvcontinue ? '&rvcontinue=' + param_rvcontinue : '');
                AJAX.get(url, function(data) {

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

                        updateRectangles();
                    } else {
                        // done
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

                updateRectangles();
            }

            return this;
        },
        makeGraph: function makeGraph() {

            svg.attr('width', w + 2 * padding ).attr('height', h + 2 * padding);

            yScale = updateScale([8, d3.max(d3.values(byYear))], [0, h]);
            yAxisScale = updateScale([8, d3.max(d3.values(byYear))], [h + padding, padding]);

            //Define Y axis
            yAxis = d3.svg.axis()
                .scale(yAxisScale)
                .orient("left")
                .ticks(5);

            //Create Y axis
            svg.append("g")
                .attr("class", "y axis")
                .attr("transform", "translate(" + padding + ",0)")
                .call(yAxis);

            return this;
        },
        archive: function archive() {
            localStorage.setItem('wikitracking-' + title, JSON.stringify(edits));
        }
    };
}

//new PageQuery('Mitt Romney').getRevisions().makeGraph();
var query = document.getElementById('query');
document.getElementById('submit').addEventListener('click', function(e) {

    e.preventDefault();

    if ( liveQuery ) liveQuery.archive();

    liveQuery = new PageQuery(encodeURIComponent(query.value)).makeGraph().getRevisions();
});

var suggestions = document.getElementById('suggestions');

function autofill() {
    var title = this.value,
        url = 'http://en.wikipedia.org/w/api.php?action=opensearch&format=json&search=' + title + '&limit=10';

    AJAX.get(url, function(data) {

        while (suggestions.firstChild) suggestions.removeChild(suggestions.firstChild);

        data[1].forEach(function(name, i) {

            var suggestion = document.createElement('p'),
                description = document.createElement('small');

            suggestion.setAttribute('data-suggestion', name);

            suggestion.innerHTML += name;
            description.innerHTML += data[2][i];
            suggestion.appendChild(description);
            suggestions.appendChild(suggestion);
        });
    });
}

suggestions.addEventListener('click', function(e) {
    var target = e.target;
    while ( target !== suggestions ) {
        if ( target.hasAttribute('data-suggestion') ) {
            break;
        } else {
            target = target.parentNode;
        }
        return false;
    }

    while (suggestions.firstChild) suggestions.removeChild(suggestions.firstChild);

    query.value = '';

    if (liveQuery) liveQuery.archive();

    liveQuery = new PageQuery(encodeURIComponent(target.getAttribute('data-suggestion')))
        .makeGraph()
        .getRevisions();
});

query.addEventListener('keyup', autofill, false);
