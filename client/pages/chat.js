var PageView = require('./base');
var templates = require('../templates');
var MessageView = require('../views/message');
var MessageForm = require('../forms/message');

module.exports = PageView.extend({
    pageTitle: 'chat',
    template: templates.pages.chat,
    subviews: {
        form: {
            container: 'form',
            prepareView: function (el) {
                return new MessageForm({
                    model: window.me,
                    el: el,
                    submitCallback: function (data) {
                        console.log('Creating', data, app.messages.length, this.model);
                        app.messages.create(data);
                        this.resetMessage();
                    }
                });
            }
        }
    },
    render: function () {
        this.renderWithTemplate();
        this.renderCollection(this.collection, MessageView, this.queryByHook('message-list'));
        if (this.collection.length === 0) {
            this.fetchCollection();
        }
    },
    fetchCollection: function () {
        this.collection.fetch();
        return false;
    }
});
