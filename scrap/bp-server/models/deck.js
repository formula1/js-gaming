module.exports = (function () {
  var mongoose = require('mongoose') // MongoDB abstraction layer
    , Schema = mongoose.Schema // Mongoose Schema constructor
    , ObjectId = Schema.ObjectId // Mongoose ObjectId type

    , _ = require('underscore') // list utility library
    , crypto = require('crypto') // randomization & cryptography library
    
    , io = require('../sockets') // configured and listening Socket.IO
    
    , db = require('./db') // make sure mongoose is connected

    /* the schema - defines the "shape" of the documents:
     *   gets compiled into one or more models */
    , DeckSchema = new Schema({
    // instance properties
      cards : { type: [String], default: function() { return _.clone(Deck.CARDS); } }
      // the number of cards this deck has dealt
    , cards_dealt: { type: Number, default: 0 }
    });

  var static_properties = {
  // static properties (attached below) - Model.property_name
    CARDS: ['2c', '2d', '2h', '2s',
            '3c', '3d', '3h', '3s',
            '4c', '4d', '4h', '4s',
            '5c', '5d', '5h', '5s',
            '6c', '6d', '6h', '6s',
            '7c', '7d', '7h', '7s',
            '8c', '8d', '8h', '8s',
            '9c', '9d', '9h', '9s',
            'tc', 'td', 'th', 'ts',
            'jc', 'jd', 'jh', 'js',
            'qc', 'qd', 'qh', 'qs',
            'kc', 'kd', 'kh', 'ks',
            'ac', 'ad', 'ah', 'as']
  , SHUFFLE_ROUNDS: 3
  };

  // static methods - Model.method()
  DeckSchema.statics.setup = function() {
    // set up static variables
    // and define any instances that should exist from the start
  };

  DeckSchema.statics.createDeck = function(spec) {
    /* our "constructor" function. Usage: Deck.createDeck({prop: 'val'})
       (see Schema definition for list of properties)*/
    //console.log('Deck.createDeck called!');
    var deck = new Deck(spec);
    return deck;
  };

  // instance methods - document.method()
  DeckSchema.methods.shuffle = function(cb) {
    var self = this
      , current_byte_num = 0
      , ops_count = Math.ceil(self.cards.length * Math.log(self.cards.length) * Deck.SHUFFLE_ROUNDS);
    crypto.randomBytes(ops_count, function(err, buf) {
      if (err) { throw err; }
      for (var shuffle_round = Deck.SHUFFLE_ROUNDS; shuffle_round > 0; shuffle_round--) {
        self.cards.sort(function() {
          var val = buf[current_byte_num % ops_count];
          current_byte_num++;
          if (val % 2 === 1) {
            return 1;
          } else {
            return -1;
          }
        });
      }
      cb();
    });
  };

  DeckSchema.methods.deal = function() {
    return this.cards[this.cards_dealt++];
  };

  /* the model - a fancy constructor compiled from the schema:
   *   a function that creates a new document
   *   has static methods and properties attached to it
   *   gets exported by this module */
  var Deck = mongoose.model('Deck', DeckSchema);

  //static properties (defined above)
  _.extend(Deck, static_properties);

  return Deck;
})();