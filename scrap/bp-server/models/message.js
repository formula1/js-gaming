module.exports = (function() {
  var mongoose = require('mongoose')
    , Schema = mongoose.Schema
    , ObjectId = Schema.ObjectId

    , async = require('async')
    , request = require('request')
    , _ = require('underscore')

    , db = require('./db');

  //Create Message Mongoose model:
  //Define MessageSchema (hand_num, type, message, timestamp?)
  var MessageSchema = new Schema({
    hand_num: Number
  , type: String
  , message: String
  , timestamp : { type: Date, default: Date.now }  
  });

  //Write Message.createMessage(spec) static function
  MessageSchema.statics.createMessage = function(spec) {
    /* our "constructor" function.*/
    //console.log('Message.createMessage called!', spec);
    var message = new Message(spec);
    return message;
  };

  //Write Message.getMessagesByHandNum static function(hand_num)
  MessageSchema.statics.getMessagesByHandNum = function(hand_num, cb) {
    //similar to getLeaders
    Message.find({ hand_num: hand_num })
      .sort('timestamp')
      .select('message')
      .exec(function (err, messages) {
        if (err) return cb(err);
        messages = _.pluck(messages, 'message');
        //console.log('messages are', messages);
        cb(err, messages);
      });
  };

  //Write Message.deleteMessagesWithHandNum static function(hand_num)?
  MessageSchema.statics.deleteMessagesWithHandNum = function (hand_num, cb) {
    Message.remove({ hand_num: hand_num }, cb);
  };

  var Message = mongoose.model('Message', MessageSchema);

  return Message;
})();