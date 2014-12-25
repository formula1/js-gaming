var View = require('ampersand-view');
var templates = require('../templates');

module.exports = View.extend({
    template: templates.includes.message,
    bindings: {
        'model.sender': '[data-hook~=sender]',
        'model.message': '[data-hook~=message]',
        'model.readableTimestamp': '[data-hook~=timestamp]'
    }
});
