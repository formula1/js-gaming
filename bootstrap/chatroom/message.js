var Waterline = require('waterline');
var moment = require("moment");
var stdSchema = require(__dirname+"/../database/abstract/waterline");


module.exports = Waterline.Collection.extend(stdSchema({
  // Define a custom table name
  connection: "database",
  identity: 'message',
  tableName: 'messages',
  schema: true,
  attributes: {
    sender: {
      type: 'string',
      required: true
    },
    message: {
      type: 'string',
      required: true
    },
    timestamp: {
      type: 'string',
      required: true,
      defaultsTo:Date.now
    },
    readableTimeStamp: function(){
      return moment(this.timestamp).fromNow();
    }
  }
}));
