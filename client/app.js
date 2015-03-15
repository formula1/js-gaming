/*global app, me, $*/
var _ = require('lodash');
var async = require('async');
var logger = require('andlog');
var config = require('clientconfig');

var Router = require('./router');
var tracking = require('./helpers/metrics');
var MainView = require('./views/main');
var models = require('./models')(config);
var domReady = require('domready');

module.exports = {
    // this is the the whole app initter
    blastoff: function () {
        var self = window.app = this;

        // init our URL handlers and the history tracker
        this.router = new Router();

        // wait for document ready to render our main view
        // this ensures the document has a body, etc.
        // also, wait for models to load
        async.parallel([
            models.collect.bind(models),
            domReady
        ],
        function(err) {
            if (err) throw err;
            // render our main view
            self.view = MainView.render(document.getElementById('container'), models);

            // we have what we need, we can now start our router and show the appropriate page
            self.router.history.start({pushState: true, root: '/'});
        });
    },

    // This is how you navigate around the app.
    // this gets called by a global click handler that handles
    // all the <a> tags in the app.
    // it expects a url without a leading slash.
    // for example: "costello/settings".
    navigate: function (page) {
        var url = (page.charAt(0) === '/') ? page.slice(1) : page;
        this.router.history.navigate(url, {trigger: true});
    }
};

// run it
module.exports.blastoff();
