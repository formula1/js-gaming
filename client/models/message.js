var AmpersandModel = require('ampersand-model');
var moment = require('moment');

module.exports = AmpersandModel.extend({
    props: {
        id: 'any',
        sender: ['string', true],
        message: ['string', true],
        timestamp: ['date', true, function() { return new Date(); }]
    },
    derived : {
    	readableTimestamp: {
    		deps: ['timestamp'],
    		fn : function () {
    			return moment(this.timestamp).fromNow();
    		}
    	}
    }
});
