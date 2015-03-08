module.exports = (function () {
  var mongoose = require('mongoose') // MongoDB abstraction layer
    , Schema = mongoose.Schema // Mongoose Schema constructor
    , ObjectId = Schema.ObjectId // Mongoose ObjectId type

    , _ = require('underscore') // list utility library
    , async = require('async'); // sync/async control flow library
  _.str = require('underscore.string'); // string manipulation utility library

  var static_properties = {
  // static properties (attached below) - Model.property_name
    SITE_NAME: 'Bitpoker'
  , TABLE_TYPE: 'Cash Game'
  , GAME_TYPE: 'No Limit Hold\'em'
  };

  /* the schema - defines the "shape" of the documents:
   *   gets compiled into one or more models */
  var HandHistorySchema = new Schema({
  // instance properties - document.field_name
    // the HoldEmHand this HandHistory is recording (not stored in DB)
    hand               : Schema.Types.Mixed
    // unique identifier for the table at which this HoldEmHand is being played
  , table_name         : String
    // number of this HoldEmHand (unique)
  , hand_num           : { type: Number, unique: true }

    // the hand history string, compatible with pokerhand.org
  , history_string     : { type: String, default: '' }
    // the function this hand history can call to broadcast to all players in the room
  , broadcast          : Schema.Types.Mixed
  , broadcastAndSave   : Schema.Types.Mixed

    // time at which hands were dealt
  , started_at         : Date
    // serialized player objects at deal-time
  , initial_player_objs: { type: [Schema.Types.Mixed], default: function() { return []; } }
    // names of users who participated in this hand
  , initial_usernames  : { type: [String], default: function() { return []; } }

    // community cards dealt
  , community          : { type: [String], default: function() { return []; } }

    // time at which winnings were paid out
  , finished_at        : Date
    // serialized player objects at payout-time
  , final_player_objs  : { type: [Schema.Types.Mixed], default: function() { return []; } }
    // pot total at payout-time
  , pot_total          : Number
  });

  // static methods - Model.method()
  HandHistorySchema.statics.createHandHistory = function(spec) {
    /* our "constructor" function. Usage: HandHistory.createHandHistory({prop: 'val'})
       (see Schema definition for list of properties)*/
    //console.log('HandHistory.createHandHistory called!', spec);
    var hand_history = new HandHistory(spec);
    return hand_history;
  };

  // instance methods - document.method()
  HandHistorySchema.methods.logStart = function() {
    var self = this
     , hand = self.hand
     , game = hand.game;

    if (! _.isObject(game) ) {
      console.error('HandHistory given hand without game:', game);
    }

    // override instance properties
    self.started_at = new Date();
    self.initial_player_objs = hand.getPlayerObjs();
    self.initial_usernames = hand.initial_usernames;
    
    // add first line
    self.appendToHistoryString(_.str.sprintf(
      '%s Game #%s, %d/%d %s %s - %s'
    , HandHistory.SITE_NAME
    , self.table_name + '.' + self.hand_num
    , game.SMALL_BLIND
    , game.BIG_BLIND
    , game.CURRENCY_ABBREV
    , HandHistory.GAME_TYPE
    , self.started_at
    ));
    // add second line
    self.appendToHistoryString(_.str.sprintf(
      "Table '%s' %d-max Seat #%d is the dealer"
    , self.table_name
    , game.MAX_PLAYERS
    , hand.dealer
    ));
    // add seat lines
    console.log(hand.seats);
    _.each(_.sortBy(hand.seats, 'seat'), function(player, seat_num) {
      if (player.in_hand) {
        self.appendToHistoryString(_.str.sprintf(
          'Seat %d: %s (%d in chips)'
        , player.seat
        , player.username
        , player.chips
        ));
      }
      else {
        console.log(player.username, 'is not in hand, so skipping!');
      }
    });
  };

  HandHistorySchema.methods.logStage = function(stage_name, arg) {
    // log based on stage that just happened
    var self = this
      , community = self.hand.community;
    switch(stage_name) {
    case 'dealing':
      self.appendToHistoryString('*** HOLE CARDS ***');
      _.each(self.hand.players, function(player) {
        if (_.isArray(player.hand)) {
          self.appendToHistoryString(_.str.sprintf(
            'Dealt to %s [%s %s]'
          , player.username
          , player.hand[0]
          , player.hand[1]
          ), false);
        }
        else {
          console.error('player in players without hand after dealing!', player);
        }
      })
      break;
    case 'flopping':
      self.appendToHistoryString(_.str.sprintf(
        '*** FLOP *** [%s %s %s]'
      , community[0], community[1], community[2]
      ));
      break;
    case 'turning':
      self.appendToHistoryString(_.str.sprintf(
        '*** TURN *** [%s %s %s] [%s]'
      , community[0], community[1], community[2]
      , community[3]
      ));
      break;
    case 'rivering':
      self.appendToHistoryString(_.str.sprintf(
        '*** RIVER *** [%s %s %s %s] [%s]'
      , community[0], community[1], community[2], community[3]
      , community[4]
      ));
      break;
    case 'showing_down':
      self.appendToHistoryString('*** SHOW DOWN ***');
      // arg is sorted [{ username: player }] in order of hand value
      _.each(arg, function(player_obj) {
        _.each(player_obj, function(player, username) {
          self.appendToHistoryString(_.str.sprintf(
            '%s: shows [%s %s] (%s #%s)'
          , username
          , player.hand[0]
          , player.hand[1]
          , player.hand_result.evaluated.handName
          , player.hand_result.evaluated.handRank
          ));
        });
      });
      break;
    default: console.error('Unknown stage name', stage_name);
    }
  };

  HandHistorySchema.methods.logAction = function(player, action, amount, raised_to) {
    // log based on action that was performed
    var line = player.username + ': '
      , game = this.hand.game;
    switch(action) {
    case 'post_blind':
      line += 'posts '
      if (amount === game.SMALL_BLIND) { line += 'small'; }
      else if (amount === game.BIG_BLIND) { line += 'big'; }
      else { console.error('Unknown blind value:', amount); }
      line += ' blind ' + amount;
      if (player.chips === 0) { line += ' and is all-in'; }
      break;
    case 'check':
      line += 'checks';
      break;
    case 'call':
      line += 'calls ' + amount;
      if (player.chips === 0) { line += ' and is all-in'; }
      break;
    case 'fold':
      line += 'folds';
      break;
    case 'bet':
      line += 'bets ' + amount;
      if (player.chips === 0) { line += ' and is all-in'; }
      break;
    case 'raise':
      line += 'raises ' + amount + ' to ' + raised_to;
      if (player.chips === 0) { line += ' and is all-in'; }
      break;
    default: console.error('Unknown action', action);
    }
    this.appendToHistoryString(line);
  };

  HandHistorySchema.methods.logWinnings = function(username, chips_won, pot_num, num_pots) {
    // calculate pot_string
    var pot_string = '';
    if (num_pots > 1) {
      if (pot_num === 0) {
        pot_string += 'main';
      }
      else {
        pot_string += 'side';
      }
      pot_string += ' ';
    }
    pot_string += 'pot';

    this.appendToHistoryString(_.str.sprintf(
      '%s collected %d from %s'
    , username
    , chips_won
    , pot_string
    ));
  };

  HandHistorySchema.methods.logEnd = function(pot_values, final_player_objs) {
    var self = this
      , hand = self.hand
      , pot_total = _.reduce(pot_values, 
                             function(memo, amount) { return memo + amount; },
                             0)
      , community = hand.community;

    // override instance properties
    self.community = community;
    self.finished_at = new Date();
    self.final_player_objs = final_player_objs;
    self.pot_total = pot_total;

    self.appendToHistoryString('*** SUMMARY ***');

    // calculate pots_string
    var pots_string = '';
    if (pot_values.length > 1) {
      _.each(pot_values, function(pot_value, i) {
        if (i === 0) {
          pots_string += 'Main pot ';
        }
        else {
          pots_string += 'Side pot ';
        }
        pots_string += pot_value + '. ';
      })
    }
    self.appendToHistoryString(_.str.sprintf(
      'Total pot %d %s| Rake %d'
    , pot_total
    , pots_string
    , 0
    ));

    // print the "board"
    self.appendToHistoryString(_.str.sprintf(
      'Board [%s]'
    , community.join(' ')
    ));

    // print each seat's results
      // player's special position, e.g. (button), if any
    var seat_position
      , hand_result // player.hand_result
      , result_type // player.hand_result.type
      , hand_result_string; // string to print
    _.each(hand.seats, function(player, seat_num) {
      seat_num = parseInt(seat_num, 10);
      if (_.contains(self.initial_usernames, player.username)) {
        hand_result = player.hand_result;
        result_type = hand_result.type;
        // calculate seat_position
        switch(seat_num) {
        case hand.dealer: seat_position = '(button)'; break;
        case hand.small_blind_seat: seat_position = '(small blind)'; break;
        case hand.big_blind_seat: seat_position = '(big blind)'; break;
        default: seat_position = '';
        }
        // calculate hand_result_string
        hand_result_string = '';
        switch(result_type) {
        case 'folded':
          hand_result_string += 'folded ';
          hand_result_string += {
            'betting_preflop': 'before Flop'
          , 'betting_postflop': 'at Flop'
          , 'betting_preriver': 'at Turn'
          , 'betting_postriver': 'at River'
          }[hand_result.stage_name];
          if (! player.has_bet) {
            hand_result_string += ' (didn\'t bet)';
          }
          break;
        case 'collected':
          hand_result_string += 'collected ' + hand_result.chips_won_total;
          break;
        case 'won':
        case 'lost':
          hand_result_string += _.str.sprintf(
            'showed [%s %s] and %s %swith %s #%s'
          , player.hand[0]
          , player.hand[1]
          , result_type
          , result_type === 'won' ? '(' + hand_result.chips_won_total + ') ' : ''
          , hand_result.evaluated.handName
          , hand_result.evaluated.handRank
          );
        default:
          console.log('ignoring hand_result_string', hand_result_string);
        }
        // print this player's results
        self.appendToHistoryString(_.str.sprintf(
          'Seat %d: %s %s %s'
        , seat_num
        , player.username
        , seat_position
        , hand_result_string
        ));
      }
    })

    self.save(function(err, result) {
      console.log('Returned from hand_history.save:', err, result);
    });
  };

  HandHistorySchema.methods.appendToHistoryString = function(line_to_append, broadcast) {
    this.history_string += line_to_append + '\n';
    if (broadcast !== false) {
      this.broadcastAndSave(this.hand_num, 'game_event', line_to_append, new Date());
    }
  };

  HandHistorySchema.pre('save', function(next) {
    this.hand = null;
    next();
  });

  /* the model - a fancy constructor compiled from the schema:
   *   a function that creates a new document
   *   has static methods and properties attached to it
   *   gets exported by this module */
  var HandHistory = mongoose.model('hand_history', HandHistorySchema);

  //static properties (defined above)
  _.extend(HandHistory, static_properties);

  return HandHistory;
})();
