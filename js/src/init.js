var PageQuery = require('./query.js');
var Graph = require('./graph.js');
var autofill = require('./autofill.js');

var query = document.getElementById('query'),
    suggestions = document.getElementById('suggestions'),
    container = document.getElementById('main'),
    viewing = document.getElementById('viewing');

document.getElementById('about').addEventListener('click', function() {
    var content = document.getElementById('about-content');
    content.style.display = (content.style.display === 'none') ? 'block' : 'none';
});

/* ----- Initial query on page load ----- */

var initQuery = window.location.hash ? window.location.hash.slice(1) : 'Pittsburgh',
    graph = Graph(container, viewing);

function makeQuery(query) {
    PageQuery(query, function(response) {
        graph.set(response);
        graph.update();
    });
}

makeQuery(initQuery);
autofill(query, suggestions, makeQuery);
