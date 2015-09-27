var ajax = require('reqwest');

function suggest() {
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

function chooseSuggestion(e) {

    var target = e.target;
    while ( target !== suggestions ) {
        if ( target.hasAttribute('data-suggestion') ) {
            break;
        } else {
            target = target.parentNode;
        }
    }

    while (suggestions.firstChild) suggestions.removeChild(suggestions.firstChild);

    query.value = '';

    return target.getAttribute('data-suggestion');
}

module.exports = function autofill(input, suggestionsNode, cb) {
    suggestionsNode.addEventListener('click', function(e) {
        var suggestion = chooseSuggestion(e);
        if (cb) cb(suggestion);
    }, false);
    input.addEventListener('keyup', suggest, false);
};
