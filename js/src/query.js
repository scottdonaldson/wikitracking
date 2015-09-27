var ajax = require('reqwest'),
    store = require('store'),
    time = require('./time.js');

function PageQuery(title, cb) {

    var edits = [],
        editsByYear = {};

    // purely to save memory -- rewrite the edit's "timestamp" key as "t"
    function parseEdit(item) {
        var copy = {
            "t": item.timestamp
        };
        return copy;
    }

    // Given an array (the parsed edits), organize our editsByYear from it
    function organize(arr) {
        arr.forEach(function(item) {

            var timestamp = new Date(item.timestamp || item.t),
                year,
                month,
                m = 0;

            year = timestamp.getFullYear(); // i.e. 2015
            month = timestamp.getMonth(); // i.e. 8
            month = time.monthName(month); // i.e. September

            if ( !editsByYear[year] ) editsByYear[year] = {};

            while ( m < 12 ) {
                if ( !editsByYear[year][time.monthName(m)] ) {
                    editsByYear[year][time.monthName(m)] = 0;
                }
                m++;
            }

            editsByYear[year][month] += 1;
        });
    }

    // Archive (called once all data has been retrieved from Wikipedia)
    function archive() {
        store.set('wikitracking-' + title, edits);
    }

    // Called each time more data is loaded from Wikipedia
    function success(data) {

        for ( var page in data.query.pages ) {
            organize(data.query.pages[page].revisions);
            edits = edits.concat(data.query.pages[page].revisions.map(parseEdit));
        }

        (cb || function() {})({
            "data": editsByYear,
            "title": title
        });

        if ( data.continue ) {
            getRevisions(
                data.continue ? data.continue.continue : '',
                data.continue ? data.continue.rvcontinue : ''
            );
        } else {
            archive();
            finished();
        }
    }

    // Called once we're totally, completely finished
    function finished() {
        edits = null; // clear up memory

        (cb || function() {})({
            "data": editsByYear,
            "title": title
        });
    }

    function getRevisions( param_continue, param_rvcontinue ) {
        if (!param_continue) param_continue = '';
        if (!param_rvcontinue) param_rvcontinue = '';

        var url = 'https://en.wikipedia.org/w/api.php?action=query&format=json&prop=revisions&titles=' + title + '&rvprop=timestamp&continue=' + param_continue + '&rvlimit=500' + (param_rvcontinue ? '&rvcontinue=' + param_rvcontinue : '');

        ajax({
            url: url,
            type: 'jsonp',
            success: success
        });
    }

    if ( !store.get('wikitracking-' + title) ) {
        getRevisions();
    } else {
        edits = store.get('wikitracking-' + title);
        organize(edits);
        finished();
    }
}

module.exports = PageQuery;
