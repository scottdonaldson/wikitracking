var PageQuery = require('./query.js');
var time = require('./time.js');

var d3 = require('d3'),
    ajax = require('reqwest');

var liveQuery = false;

var query = document.getElementById('query'),
    suggestions = document.getElementById('suggestions'),
    viewing = document.getElementById('viewing');

var now = time.now(),
    theYear = now.getFullYear(),
    theMonth = now.getMonth() + 1,
    theDate = now.getDate(),
    theHour = now.getHours();

liveQuery = new PageQuery('Pittsburgh')
    .updateViewing(viewing)
    .makeGraph()
    .getRevisions();

document.getElementById('submit').addEventListener('click', function(e) {

    e.preventDefault();

    if ( liveQuery ) liveQuery.archive();

    liveQuery = new PageQuery(encodeURIComponent(query.value)).updateViewing(viewing).makeGraph().getRevisions();
});

function autofill() {
    var title = this.value,
        url = 'https://en.wikipedia.org/w/api.php?action=opensearch&format=json&search=' + title + '&limit=10';

    ajax({
        url: url,
        type: 'jsonp',
        success: function success(data) {

            while (suggestions.firstChild) suggestions.removeChild(suggestions.firstChild);

            data[1].forEach(function(name, i) {

                var suggestion = document.createElement('p'),
                    description = document.createElement('small'),
                    descriptionText = data[2][i];

                suggestion.setAttribute('data-suggestion', name);

                descriptionText = descriptionText.split(' ').slice(0, 20).join(' ');

                suggestion.innerHTML += name;
                description.innerHTML += descriptionText ? descriptionText + '...' : '';
                suggestion.appendChild(description);
                suggestions.appendChild(suggestion);
            });
        }
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
        .updateViewing(viewing)
        .makeGraph()
        .getRevisions();
});

query.addEventListener('keyup', autofill, false);
