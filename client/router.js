/*global me, app*/
var Router = require('ampersand-router');
var ChatPage = require('./pages/chat');
var InfoPage = require('./pages/info');

module.exports = Router.extend({
    routes: {
        '': 'chat',
        'info': 'info',
        '(*path)': 'catchAll'
    },

    // ------- ROUTE HANDLERS ---------
    chat: function() {
        this.trigger('page', new ChatPage({
            collection: app.messages
        }));
    },

    info: function() {
        this.trigger('page', new InfoPage({
        }));
    },

    catchAll: function(path) {
        console.warn('catchAll route triggered', path);
        this.redirectTo('');
    }
});
