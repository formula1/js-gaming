  module.exports = (function () {
  var mongoose = require('mongoose') // MongoDB abstraction layer
    , Schema = mongoose.Schema // Mongoose Schema constructor
    , ObjectId = Schema.ObjectId // Mongoose ObjectId type

    , _ = require('underscore') // list utility library

    , game_types = require('./game_types')
    , defaults = game_types.defaults;

  var static_properties = {
    // all the games in the world
    games: []
  }

  var NoLimitGameSchema = new Schema({
  // instance properties - document.field_name
    // how many chips the big blind costs
    SMALL_BLIND: { type: Number }
    // how many chips the small blind costs
  , BIG_BLIND: { type: Number }
    // at least how many chips must players bring to the table to play?
  , MIN_CHIPS: { type: Number }
    // at most how many chips can players bring to the table to play?
  , MAX_CHIPS: { type: Number }
    // the number of players who need to be sitting/blinding before the hand can begin
  , MIN_PLAYERS: { type: Number, default: defaults.MIN_PLAYERS }
    // the maximum number of players this came can have
  , MAX_PLAYERS: { type: Number }

    // how much currency it takes to buy a single chip at this table
  , CURRENCY_PER_CHIP: { type: Number }
    // which currency this game deals in (funbucks or satoshi)
  , CURRENCY: { type: String }
    // which currency this game deals in (FB or sat)
  , CURRENCY_ABBREV: { type: String }
    // the minimum difference between two possible chip amounts at this table
  , MIN_INCREMENT: { type: Number, default: defaults.MIN_INCREMENT }

    // how many ms to wait between polling to see how many players are ready
  , WAIT_POLL_INTERVAL: { type: Number, default: defaults.WAIT_POLL_INTERVAL }
    // how long (in ms) between notifying about dealer change and posting small blind
  , DEALER_CHANGE_DELAY: { type: Number, default: defaults.DEALER_CHANGE_DELAY }
    // how long (in ms) to wait - per player - after sending the hands_dealt message
  , PER_PLAYER_DEAL_DELAY: { type: Number, default: defaults.PER_PLAYER_DEAL_DELAY }
    // how long (in ms) between posting blinds and next action (next blind or dealing)
  , POST_BLIND_DELAY: { type: Number, default: defaults.POST_BLIND_DELAY }
    // how long (in ms) between last betting action and street_ends message
  , STREET_END_DELAY: { type: Number, default: defaults.STREET_END_DELAY }
    // how long (in ms) between street_ends message and next round, when bets have been collected
  , BET_COLLECTION_DELAY: { type: Number, default: defaults.BET_COLLECTION_DELAY }
    // how long (in ms) between street_ends and community_dealt messages
  , PRE_DEAL_DELAY: { type: Number, default: defaults.PRE_DEAL_DELAY }
    // how long (in ms) to wait before automatically skipping players who should be skipped
  , SKIP_PLAYER_DELAY : { type: Number, default: defaults.SKIP_PLAYER_DELAY }
    // how long (in ms) to wait for players to respond to prompts
  , ACT_TIMEOUT: { type: Number, default: defaults.ACT_TIMEOUT }
    // how long (in ms, per pot) to wait after winners message and before reset_table message
  , DISPLAY_HANDS_DURATION: { type: Number, default: defaults.DISPLAY_HANDS_DURATION }
    // how long (in ms) players can sit out before being forced from their seats
  , SIT_OUT_TIME_ALLOWED: { type: Number, default: defaults.SIT_OUT_TIME_ALLOWED }
    // how long (in ms) players are forced to wait before buying with less than they stood up with
  , MIN_BUYIN_TIME_ENFORCED: { type: Number, default: defaults.MIN_BUYIN_TIME_ENFORCED }
    // how often (in ms) to update the active player's time_to_act
  , TO_ACT_UPDATE_INTERVAL: { type: Number, default: defaults.TO_ACT_UPDATE_INTERVAL }
    // how much longer to wait for a player's action than what we tell him/her
  , TO_ACT_GRACE_PERIOD: { type: Number, default: defaults.TO_ACT_GRACE_PERIOD }
  });

  NoLimitGameSchema.statics.setup = function() {
    var currency_constants
      , game_constants;
    _.each(game_types.currency_types, function(currency_values) {
      currency_constants = _.object(game_types.set_per_currency, currency_values);
      _.each(game_types.game_types, function(game_values) {
        game_constants = _.object(game_types.set_per_game, game_values);
        _.extend(game_constants, currency_constants);
        NoLimitGame.createNoLimitGame(game_constants);
      });
    });
  };

  NoLimitGameSchema.statics.createNoLimitGame = function(spec) {
    if (_.isNumber(spec.SMALL_BLIND) && _.isUndefined(spec.BIG_BLIND)) {
      spec.BIG_BLIND = spec.SMALL_BLIND * 2;
    }
      if (_.isNumber(spec.SMALL_BLIND) && _.isUndefined(spec.MIN_INCREMENT)) {
     if(spec.SMALL_BLIND>=1000) spec.MIN_INCREMENT = spec.SMALL_BLIND / 1000;
     else if(spec.SMALL_BLIND<1) spec.MIN_INCREMENT = spec.SMALL_BLIND
    }
    
    //console.log('creating NoLimitGame:', spec);
    var game = new NoLimitGame(spec);
    NoLimitGame.games.push(game);

    return game;
  };

  function roundBy(amount, round_by, round_type) {
    var rounded_amount
      , roundFunction = (round_type === 'floor') ? Math.floor :
                        ((round_type === 'ceiling') ? Math.ceiling : Math.round);
    //console.log('game.roundBy called with', amount, round_by);
    if (round_by > 1) {
      //divide by round_by, round, multiply
      rounded_amount = amount / round_by;
      rounded_amount = roundFunction(rounded_amount);
      rounded_amount = rounded_amount * round_by;
    }
    else {
      //multiply by Math.round(1 / round_by), round, divide
      var round_by_inverse = Math.round(1 / round_by);
      //console.log('round_by_inverse:', round_by_inverse);
      rounded_amount = amount * round_by_inverse;
      //console.log('after multiplying:', rounded_amount);
      rounded_amount = roundFunction(rounded_amount);
      //console.log('after rounding:', rounded_amount);
      rounded_amount = rounded_amount / round_by_inverse;
      //console.log('after dividing:', rounded_amount);
    }
    //console.log('rounded', amount, 'to', rounded_amount);
    return rounded_amount;
  }

  // rounds chip numbers to the nearest MIN_INCREMENT value
  NoLimitGameSchema.methods.roundNumChips = function(amount, round_type) {
    var rounded_amount = roundBy(amount, this.MIN_INCREMENT, round_type);
    //console.log('rounded', amount, 'to', rounded_amount);
    return rounded_amount;
  };

  NoLimitGameSchema.methods.roundNumCurrency = function(amount, round_type) {
    var rounded_amount = roundBy(amount, this.CURRENCY_PER_CHIP, round_type);
    //console.log('rounded', amount, 'to', rounded_amount);
    return rounded_amount;
  };

  // returns a copy of this class's constants
  NoLimitGameSchema.methods.constants = function() {
    var serialized = this.toObject();
    delete serialized.serialize;
    delete serialized.roundNumChips;
    delete serialized._id;
    //console.log('serialized:', serialized);
    return serialized;
  }

  /* the model - a fancy constructor compiled from the schema:
   *   a function that creates a new document
   *   has static methods and properties attached to it
   *   gets exported by this module */
  var NoLimitGame = mongoose.model('no_limit_game', NoLimitGameSchema);

  // static properties (defined above)
  _.extend(NoLimitGame, static_properties);

  NoLimitGame.setup();
  
  return NoLimitGame;
})();