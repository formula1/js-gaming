var Waterline = require('waterline');
var moment = require('moment');

var message_schema = require('app/abstract/models/message');

message_schema.connection = 'rest';

message_schema.attributes.readableTimestamp = function() {
    return moment(this.timestamp).fromNow();
};

module.exports = Waterline.Collection.extend(message_schema);