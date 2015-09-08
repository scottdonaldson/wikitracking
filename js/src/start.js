(function() {

// mini-library for JSONP
var AJAX = (function() {
    var that = {};

    that.get = function(url, callback) {

        url += '&callback=_dummy';

        var timeout_trigger = window.setTimeout(function(){
            window.dummy = function(){};
            on_timeout();
        }, 1000);

        window._dummy = function(data) {
            window.clearTimeout(timeout_trigger);
            callback(data);
        };

        var script = document.createElement('script');
        script.type = 'text/javascript';
        script.async = true;
        script.src = url;

        document.getElementsByTagName('head')[0].appendChild(script);
    }

    return that;
})();
