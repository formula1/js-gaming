module.exports = (function() {
  var mongoose = require('mongoose') // MongoDB abstraction layer
    , Schema = mongoose.Schema // Mongoose Schema constructor
    , ObjectId = Schema.ObjectId // Mongoose ObjectId type

    , crypto = require('crypto') // encryption utility library
    , async = require('async') // flow control utility library
    , request = require('request') // HTTP/HTTPS request library
    , _ = require('underscore') // list utility library
    
    , db = require('./db'); // make sure db is connected


  /* Create collection */
  var HandCounterSchema = new Schema({
    next: Number
  });

  /* Create static method on schema, incrementing the hand counter */
  HandCounterSchema.statics.increment = function (callback) {
    //console.log('HandCounterSchema.statics.increment called');
    this.collection.findAndModify({}, [], { $inc: { next: 1 } }, {},
                                         function(err, hand_counter) {
      //console.log('findAndModify returns', err, hand_counter);
      if (_.isFunction(callback)) {
        callback(err, hand_counter && hand_counter.next);
      }
    });
  };

  /* Create model */
	var HandCounter = mongoose.model('hand_counter', HandCounterSchema);

  /* create a single counter if none currently exists */
  HandCounter.find(function(err, hand_counters) {
    if (hand_counters.length === 0) {
      console.log('Creating hand counter with next=0');
      new HandCounter({ next: 0 }).save();
    }
  });

  return HandCounter;
})();