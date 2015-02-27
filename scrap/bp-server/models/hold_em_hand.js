module.exports = (function () {
  var mongoose = require('mongoose') // MongoDB abstraction layer
    , Schema = mongoose.Schema // Mongoose Schema constructor
    , ObjectId = Schema.ObjectId // Mongoose ObjectId type

    , _ = require('underscore') // list utility library
    , async = require('async') // sync/async control flow library
    
    , io = require('../sockets') // configured and listening Socket.IO

    , PokerEvaluator = require('poker-evaluator')
    , evaluator = new PokerEvaluator('./node_modules/poker-evaluator/HandRanks.dat')
    
    , db = require('./db') // make sure mongoose is connected

    , Deck = require('./deck')
    , Player = require('./player')
    , HandHistory = require('./hand_history')
    , HandCounter = require('./hand_counter');

  var static_properties = {
  // static properties (attached below) - Model.property_name
    // the stages this hand can be in, in order
    STAGES: [
      'initializing'
    , 'shuffling'
    , 'waiting'
    , 'blinding'
    , 'dealing'
    , 'betting_preflop'
    , 'flopping'
    , 'betting_postflop'
    , 'turning'
    , 'betting_preriver'
    , 'rivering'
    , 'betting_postriver'
    , 'showing_down'
    , 'paying_out'
    , 'done'
    ]
    // how a HoldEmHand should handle each stage
    // {String stage_name: Function stage_handler}
  , stage_handlers: {}
  };

  /* the schema - defines the "shape" of the documents:
   *   gets compiled into one or more models */
  var HoldEmHandSchema = new Schema({
  // instance properties - document.field_name
    // the hold-em game this hand is an instance of (holds game constants)
    game            : Schema.Types.Mixed
    // a reference to the seats at the table, {seat_num: Player}
  , seats           : Schema.Types.Mixed
    // the current stage, an index of HoldEmHand.STAGES
  , stage_num       : { type: Number, default: 0 }
    // the current stage, one of HoldEmHand.STAGES
  , stage_name      : { type: String, default: 'initializing' }
    // the function this hand can call to broadcast to all players in the room
  , broadcast       : Schema.Types.Mixed
  , broadcastAndSave: Schema.Types.Mixed
  
    // the seat number of the dealer (calculated and used to calculate order-adjusted players)
  , dealer          : Number
    // the seat number of the small blind (as determined when collecting blinds)
  , small_blind_seat: Number
    // the seat number of the big blind (as determined when collecting blinds)
  , big_blind_seat  : Number

    // the names of the players sitting in when players are calculated (before blinds)
  , initial_username: [String]
    // the players that are currently participating in the hand, in order of action
  , players         : { type: [Schema.Types.Mixed], default: function() { return []; } }
    // the index (within this.players) of the next player to act
  , to_act          : { type: Number, default: 0 }
    // the highest bet so far in this betting round
  , high_bet        : Number
    // the number of chips in each pot [{ usernames: [active Players], value: pot value }]
  , pots            : { type: Schema.Types.Mixed, default: function() { return []; } }
    // any bets forfeited by folding players
  , forfeited_bets  : { type: [Schema.Types.Mixed], default: function() { return []; } }
    // the deck this hand uses (created in initialize)
  , deck            : Schema.Types.Mixed
    // the recorded history of this hand
  , hand_history    : Schema.Types.Mixed
    // the cards that are visible to everyone
  , community       : { type: [String], default: function() { return []; } }

    // unique identifier for the table at which this HoldEmHand is being played
  , table_name      : String
    // number of this HoldEmHand (unique)
  , hand_num        : Number

    // the number of chips to start with (carried over from previous hands)
  , initial_pot     : Number
    // the number of chips to carry over to next hand
  , pot_remainder   : { type: Number, default: 0 }

    // whether this hand is the first one of the table (and shouldn't send an initial dealer_chip message)
  , first_hand     : Boolean
  });

  // static methods - Model.method()
  HoldEmHandSchema.statics.createHoldEmHand = function(spec) {
    /* our "constructor" function. Usage: HoldEmHand.createHoldEmHand({prop: 'val'})
       (see Schema definition for list of properties)*/
    //console.log('HoldEmHand.createHoldEmHand called!', spec);
    var hand = new HoldEmHand(spec)
      , constants
      , game = spec.game;
    if (! _.isObject(game)) {
      console.error('HoldEmHand.createHoldEmHand called without a game!');
      return;
    }
    else if (! _.isFunction(game.roundNumChips)) {
      console.error('HoldEmHand.createHoldEmHand called with a game without a roundNumChips method!');
      return;
    }
    constants = _.pick(game, ['MIN_CHIPS', 'MAX_CHIPS', 'SMALL_BLIND', 'BIG_BLIND']);
    // make sure the constants are all even multiples of the MIN_INCREMENT
    _.each(constants, function(value, name) {
      if (game.roundNumChips(value) !== value) {
        console.error('Invalid', name, ':', value, 'given MIN_INCREMENT', spec.game.MIN_INCREMENT);
      }
    });
    if (game.SMALL_BLIND % game.MIN_INCREMENT !== 0 ||
        game.BIG_BLIND % game.MIN_INCREMENT !== 0) {
      console.error('Invalid blinds/increment!', game.SMALL_BLIND, game.BIG_BLIND, game.MIN_INCREMENT);
    }
    hand.initialize();

    return hand;
  };

  // instance methods - document.method()
  HoldEmHandSchema.methods.initialize = function() {
    var self = this
      , player
      , handler;

    self.deck = Deck.createDeck({});

    _.each(HoldEmHand.stage_handlers, function(handler, stage_name) {
      self.onStage(stage_name, handler);
    });

    self.nextStage();
  };

  static_properties.stage_handlers.shuffling = function() {
    var self = this;
    self.deck.shuffle(function onShuffled() {
      self.nextStage();
    });
  };

  static_properties.stage_handlers.waiting = function() {
    var self = this
      , game = self.game
      , waiting = (self.first_hand === true);
    (function pollSeats() {
      //console.log('Checking if # ready players > ', game.MIN_PLAYERS);
      var num_ready = 0;
      _.each(self.seats, function(player, seat_num) {
        //console.log('waiting:', seat_num, player, player.sitting_out);
        if (player instanceof Player) {
          if (! player.sitting_out) {
            if (player.chips < game.SMALL_BLIND) {
              // player can't afford small blind - should be sitting out.
              player.sitOut();
            }
            else {
              // player is ready.
              num_ready++;
            }
          }
          else {
            // player is sitting out. ignore.
          }
        }
        else {
          console.error('seats contains non-player', player);
        }
      });

      if (num_ready >= game.MIN_PLAYERS) {
        // ready to go - grab a hand number
        HandCounter.increment(function(err, hand_num) {
          if (err) {
            console.error('Error during HandCounter.increment:', err);
            throw err;
          }
          self.hand_num = hand_num;
          // create a HandHistory object to store what happens in this hand
          self.hand_history = HandHistory.createHandHistory({
            hand: self
          , table_name: self.table_name
          , hand_num: hand_num
          , broadcast: self.broadcast
          , broadcastAndSave: self.broadcastAndSave
          });
          // start the game
          self.calculatePlayers();
          self.broadcast('dealer_chip', self.dealer)
          setTimeout(function() {
            self.nextStage();
          }, game.DEALER_CHANGE_DELAY)
          waiting = false; // not necessary
        });
      }
      else {
        if (waiting === false) {
          self.broadcast('dealer_chip', null);
          waiting = true; // don't send null dealer_chip message again
        }
        setTimeout(pollSeats, game.WAIT_POLL_INTERVAL);
      }
    })();
  };

  static_properties.stage_handlers.blinding = function() {
    var self = this
      , game = self.game
      , SMALL_BLIND_PAID = false
      , BIG_BLIND_PAID = false
      , player
      , big_blind_player;

    self.initial_usernames = _.pluck(self.players, 'username');
    self.pots.push({ usernames: self.initial_usernames, value: self.initial_pot });

    self.hand_history.logStart();

    while (SMALL_BLIND_PAID === false &&
           self.players.length >= game.MIN_PLAYERS) {
      player = self.players[self.to_act];
      //console.log('this.to_act is', this.to_act, 'player is', player, 'players is', self.players);
      if (! player.isFlagSet('post_blind') || player.disconnected) {
        console.log('Player\'s post_blind flag is unset, or player is disconnected - sitting player out!');
        self.playerOut(self.to_act, 'failed to pay small blind');
        player.sitOut();
      }
      else {
        //console.log('player will post small blind:', player, game.SMALL_BLIND);
        player.makeBet(game.SMALL_BLIND);
        self.broadcast('player_acts', player.serialize(), 'post_blind', self.calculatePotTotal());
        self.hand_history.logAction(player, 'post_blind', game.SMALL_BLIND);
        self.small_blind_seat = player.seat;
        SMALL_BLIND_PAID = true;
      }
      self.nextPlayer();
    }

    while (SMALL_BLIND_PAID &&
           BIG_BLIND_PAID === false &&
           self.players.length >= game.MIN_PLAYERS) {
      player = self.players[this.to_act];
      //console.log('this.to_act is', this.to_act, 'player is', player, 'players is', self.players);
      if (! player.isFlagSet('post_blind') || player.disconnected || player.chips < game.BIG_BLIND) {
        console.log('Player\'s post_blind flag is unset, or player is disconnected - sitting player out!');
        self.playerOut(self.to_act, 'failed to pay big blind');
        player.sitOut();
      }
      else {
        //console.log('player will post big blind:', player, game.BIG_BLIND);
        player.makeBet(game.BIG_BLIND);
        // moved below to implement delay
        //self.broadcast('player_acts', player.serialize(), 'post_blind', self.calculatePotTotal());
        //self.hand_history.logAction(player, 'post_blind', game.BIG_BLIND);
        self.big_blind_seat = player.seat;
        big_blind_player = player;
        BIG_BLIND_PAID = true;
      }
      self.nextPlayer();
    }

    if (SMALL_BLIND_PAID && BIG_BLIND_PAID) {
      setTimeout(function() {
        self.broadcast('player_acts', big_blind_player.serialize(), 'post_blind', self.calculatePotTotal());
        self.hand_history.logAction(player, 'post_blind', game.BIG_BLIND);
        setTimeout(function() {
          self.nextStage();
        }, game.POST_BLIND_DELAY);
      }, game.POST_BLIND_DELAY);
    }
    else if (SMALL_BLIND_PAID) {
      if (self.players.length !== 1) {
        console.error('Exactly one blind paid, but not exacly 1 player in self.players!');
      }
      player = self.players[0];
      player.getBet(game.SMALL_BLIND);
      // notify everyone that this player received a refund
      self.broadcast('player_gets_refund', player.serialize(), game.SMALL_BLIND, self.calculatePotTotal());
      console.log('Big blind not paid!', self.players);
      self.toStage('done');
    }
    else {
      console.log('Blinds not paid!', SMALL_BLIND_PAID, BIG_BLIND_PAID, self.players);
      self.toStage('done');
    }
  };

  static_properties.stage_handlers.dealing = function deal() {
    var self = this
      , first_card
      , second_card
      , player_objs = self.getPlayerObjs()
      , num_players = self.players.length;

    _.each(self.players, function(player) {
      first_card = self.deck.deal();
      second_card = self.deck.deal();
      player.receiveHand(first_card, second_card);
      player.sendMessage('hole_cards_dealt', player.hand);
    });
    self.broadcast('hands_dealt', player_objs, {
      small_blind_seat: self.small_blind_seat
    , big_blind_seat: self.big_blind_seat
    , table_name: self.table_name
    , hand_num: self.hand_num
    });
    self.hand_history.logStage('dealing');

    setTimeout(function() {
      self.nextStage();
    }, num_players * self.game.PER_PLAYER_DEAL_DELAY);
  };

  static_properties.stage_handlers.betting_preflop   =
  static_properties.stage_handlers.betting_postflop  =
  static_properties.stage_handlers.betting_preriver  =
  static_properties.stage_handlers.betting_postriver = function bettingRound() {
    var self = this
      , game = self.game
      , player
      , to_call
      , last_raise
      , min_bet
      , max_bet
      , high_stack
      , refund
      , actions
      , free_action
      , free_action_obj
      , bet_action
      , bet_action_obj;

    switch(self.stage_name) {
      case 'betting_preflop':
        // big-blind-player has already started the betting at the big blind level
        self.high_bet = game.BIG_BLIND;
        last_raise = game.SMALL_BLIND;
        break;
      case 'betting_postflop':
        console.log('Not in betting_preflop, so resetting high_bet and to_act');
        last_raise = game.SMALL_BLIND;
        self.high_bet = 0;
        self.to_act = self.first_to_act;
        break;
      case 'betting_preriver':
      case 'betting_postriver':
        console.log('Not in betting_preflop, so resetting high_bet and to_act');
        last_raise = game.BIG_BLIND;
        self.high_bet = 0;
        self.to_act = self.first_to_act;
        break;
      default:
        console.error('bettingRound called when stage_name is', self.stage_name);
    }

    player = self.currentPlayer();

    async.whilst(
      function shouldRunBody() { // test called before body - determines whether to run or skip
        console.log('testing ' + player.username + ':',
                      '# of players: ' + self.players.length + ' vs. MIN_PLAYERS: ' + game.MIN_PLAYERS,
                      'Has player acted yet? ' + player.hasActedIn(self.stage_num),
                      'current_bet: ' + player.current_bet + ' vs. high_bet: ' + self.high_bet);
        high_stack = self.calculateHighestStack(player); // how high other players can/have called to
        if (player.current_bet > high_stack) {
          // adjust player's current bet to be the high bet
          refund = player.current_bet - high_stack;
          player.getBet(refund);
          // notify everyone that this player received a refund
          self.broadcast('player_gets_refund', player.serialize(), refund, self.calculatePotTotal());
        }
        else {
          refund = 0;
        }
        return self.players.length >= game.MIN_PLAYERS && // don't run body if we have too few people to continue
               (! player.hasActedIn(self.stage_num) || // run if player hasn't acted yet
               (player.current_bet < self.high_bet && refund === 0)); // run if player hasn't bet enough yet
      },
      function loopBody(cb) {
        // handle "no chips" condition
        if (player.chips === 0) {
          console.log('player is out of chips, so skipping!', player);
          setTimeout(function() {
            performAction('skip');
            cb();
          }, game.SKIP_PLAYER_DELAY);
          return;
        }
        else if (game.roundNumChips(player.chips) !== player.chips) {
          console.error('player has an invalid chips value:', player.chips, game.MIN_INCREMENT );
        }
        // handle "everyone else out of chips" condition
        if (high_stack === 0) {
          console.log('all other players are out of chips, so skipping!', player);
          setTimeout(function() {
            performAction('skip');
            cb();
          }, game.SKIP_PLAYER_DELAY);
          return;
        }
        // calculate/set actions and free_action to be used in prompt
        actions = [];
        // raise/bet - "raise to" values
        to_call = self.high_bet - player.current_bet;
        min_bet = self.high_bet + last_raise;
        max_bet = player.current_bet + player.chips; // how much this player can raise to
        //console.log('high_bet', self.high_bet, 'to_call', to_call, 'min_bet', min_bet, 'max_bet', max_bet);
        if (max_bet < min_bet) {
          // player can't afford to raise at minimum raise level
          min_bet = max_bet;
        }
        // bet/raise
        //console.log('max_bet:', max_bet, 'to_call:', to_call, 'high_stack:', high_stack, 'high_bet:', self.high_bet);
        if (max_bet > self.high_bet && high_stack > self.high_bet) {
          bet_action = self.high_bet > 0 ? 'raise' : 'bet';
          bet_action_obj = {};
          bet_action_obj[bet_action] = [min_bet, max_bet];
          actions.push(bet_action_obj);
        }
        // call
        if (to_call > 0) {
          if (player.chips < to_call) {
            // player can't afford to call
            to_call = player.chips;
          }
          // player must pay to_call or fold
          actions.push({ call: to_call });
          free_action = 'fold';
        }
        else {
          // player can check
          free_action = 'check';
        }
        // fold/check
        free_action_obj = {};
        free_action_obj[free_action] = true;
        actions.push(free_action_obj);

        // notify everyone that this player is being waited on to act
        self.broadcast('player_to_act', player.serialize(), game.ACT_TIMEOUT);
        player.prompt(actions, game.ACT_TIMEOUT, free_action,
                      _.once(function(action_choice, num_chips_choice) {
          performAction(action_choice, num_chips_choice);
          cb();
        }));
      },
      function loopComplete() {
        // send hands_shown message if only one player has chips
        if (! self.hands_shown && self.getNumPlayersWithChips() < game.MIN_PLAYERS) {
          console.log('Hands not yet shown and only 1 player with chips, so showing hands');
          var player_objs = self.getPlayerObjs(['hand']);
          self.broadcast('hands_shown', player_objs);
          self.hands_shown = true;
        }
        // construct an Object of the form { bet_amount : [usernames] }
        var bets_obj = {}
          , pots_increased
          , bet;
        _.each(self.players, function(player) {
          bet = player.giveBet();
          /*if (bet !== game.roundNumChips(bet)) {
            console.error('Invalid bet returned by giveBet:', bet, game.MIN_INCREMENT);
            bet = game.roundNumChips(bet);
          }*/
          if (bet > 0) {
            bets_obj[player.username] = bet;
          }
          else {
            console.log('Not adding', player.username, 'to bet_obj since bet is', bet);
          }
        });
        pots_increased = ! _.isEmpty(bets_obj);
        //console.log('Calculated pots_increased:', pots_increased, bets_obj);
        // collect forfeited bets if bets_obj loop wouldn't do it
        if (_.isEmpty(bets_obj)) {
          //console.log('Collecting forfeited bets');
          var usernames = _.pluck(self.players, 'username')
            , pot_obj;
          pot_obj = _.find(self.pots, function(_pot_obj) {
            return _pot_obj.usernames.length === usernames.length &&
                   _.every(_pot_obj.usernames, function(_username) {
                    return usernames.indexOf(_username) !== -1;
                   });
          });
          if (_.isEmpty(pot_obj)) {
            pot_obj = { usernames: usernames, value: 0 };
            self.pots.push(pot_obj);
          }
          pot_obj.value += self.collectForfeitedBets(min_bet);
        }
        // move bets from bets_obj into pots
        while (! _.isEmpty(bets_obj)) {
          //console.log('Iterating over bets_obj, which is', bets_obj);
          var min_bet = _.min(bets_obj)
            , usernames = []
            , pot_obj
            , pot_value;
          _.each(bets_obj, function(bet_amount, username) {
            usernames.push(username);
            if (bet_amount === min_bet) {
              delete bets_obj[username];
            }
            else {
              bets_obj[username] = bet_amount - min_bet;
            }
          });
          //console.log('Iterating over self.pots, which is', self.pots);
          pot_obj = _.find(self.pots, function(_pot_obj) {
            return _pot_obj.usernames.length === usernames.length &&
                   _.every(_pot_obj.usernames, function(_username) {
                    return usernames.indexOf(_username) !== -1;
                   });
          });
          if (_.isEmpty(pot_obj)) {
            pot_obj = { usernames: usernames, value: 0 };
            self.pots.push(pot_obj);
          }
          pot_value = pot_obj.value;
          //console.log('usernames is', usernames, ', pot_obj is', pot_obj, ', pot_value is', pot_value);
          pot_value += usernames.length * min_bet;
          //console.log('pot_value is', pot_value);
          //console.log('About to iterate over forfeited_bets, which is', self.forfeited_bets);
          pot_value += self.collectForfeitedBets(min_bet);
          //console.log('pot_value is', pot_value);
          // save the new pot value
          pot_obj.value = pot_value;
        }
        if (self.players.length >= game.MIN_PLAYERS) {
          console.log('Betting round completed!', self.pots, self.players);
          setTimeout(function() {
            self.broadcast('street_ends', self.getPotValues());
            setTimeout(function() {
              self.nextStage();
            }, pots_increased ? game.BET_COLLECTION_DELAY : 0);
          }, game.STREET_END_DELAY);
        }
        else {
          console.log('Not enough players to continue to next stage!', self.players);
          // create a results_obj that mimics that created by showing_down handler
          var winners = _.map(self.players, function(player) {
            var result_obj = {};
            result_obj[player.username] = player;
            return result_obj;
          });
          self.toStage('paying_out', winners);
        }
      }
    );
    // describes how to handle each action (values pre-validated in Player.prompt)
    function performAction(action, num_chips) {
      switch(action) {
      case 'check':
      case 'skip':
        break;
      case 'call':
        player.makeBet(num_chips);
        break;
      case 'bet':
      case 'raise':
        var bet = num_chips - player.current_bet // how much the player bet
          , raise = bet - to_call; // how much the player RAISED
        player.makeBet(bet);
        self.high_bet += raise;
        last_raise = raise;
        break;
      case 'fold':
        // nothing here - call playerOut after emitting player_acts, for message order
        break;
      }
      self.broadcast('player_acts', player.serialize(), action, self.calculatePotTotal());
      if (action === 'raise') {
        self.hand_history.logAction(player, action, last_raise, self.high_bet);
      }
      else if (action !== 'skip') {
        self.hand_history.logAction(player, action, num_chips);
      }
      player.actedIn(self.stage_num);
      if (action === 'fold') {
        self.playerOut(self.to_act, 'folded');
      }
      player = self.nextPlayer();
    }
  };

  static_properties.stage_handlers.flopping = function() {
    var self = this;
    setTimeout(function() {
      self.community.push(self.deck.deal(), self.deck.deal(), self.deck.deal());
      self.broadcast('community_dealt', self.community);
      self.hand_history.logStage('flopping');
      self.nextStage();
    }, self.game.PRE_DEAL_DELAY);
  };

  static_properties.stage_handlers.turning = function() {
    var self = this;
    setTimeout(function() {
      self.community.push(self.deck.deal());
      self.broadcast('community_dealt', self.community);
      self.hand_history.logStage('turning');
      self.nextStage();
    }, self.game.PRE_DEAL_DELAY);
  };

  static_properties.stage_handlers.rivering = function() {
    var self = this;
    setTimeout(function() {
      self.community.push(self.deck.deal());
      self.broadcast('community_dealt', self.community);
      self.hand_history.logStage('rivering');
      self.nextStage();
    }, self.game.PRE_DEAL_DELAY);
  };

  static_properties.stage_handlers.showing_down = function() {
    var self = this
      , whole_hand
      , res
      , players;
    self.showed_down = true;
    // evaluate each player's hand and attach result object
    players = _.map(self.players, function(player) {
      whole_hand = _.union(player.hand, self.community);
      res = evaluator.evalHand(whole_hand);
      console.log(whole_hand, 'evaluated as', res);
      player.setHandResult({ evaluated: res });
      //res.player = player;
      return player;
    });
    console.log('players is', players);
    // group players by their hands' values
    // [player] -> { res.value : [player] }
    // equal value means equal hand rank (tie)
    players = _.groupBy(players, function(player) {
      return player.hand_result.evaluated.value;
    });
    console.log('grouped players:', players);
    // sort grouped_by_value players by value
    // { res.value : [player] } -> [[player]], in order of hand value
    players = _.sortBy(players, function(player_list, value) {
      return (- parseInt(value, 10));
    });
    console.log('sorted players:', players);
    // replace internal player list with { username: player }
    // [[player]] -> [{ username: player }], in order of hand value
    _.each(players, function(player_list, i) {
      players[i] = _.object(_.pluck(player_list, 'username'), player_list);
    });
    console.log('transformed players:', players);
    // pass player list to next stage (paying_out)
    self.hand_history.logStage('showing_down', players);
    self.nextStage(players);
  };

  static_properties.stage_handlers.paying_out = function(sorted_players) {
    var self = this
      , game = self.game
      , num_pots = self.pots.length
      , pot_values = _.pluck(self.pots, 'value')
      , player_objs
      , pot_winners
      , pot_value
      , pot_remainder
      , winnings
      , hand_result;
    console.log('paying out, results:', sorted_players);
    if (! self.hands_shown) {
      console.log('Hands not yet shown and showdown over, so showing hands');
      player_objs = self.getPlayerObjs(['hand']);
      self.broadcast('hands_shown', player_objs);
    }
    // (re)initialize players' chips_won Arrays
    _.each(self.players, function(player) {
      var arr = [];
      _.times(num_pots, function() { arr.push(0); });
      player.chips_won = arr;
    });
    // iterate over all active players, in order of their hand rank, best to worst
    _.each(sorted_players, function(players_obj) {
      // players_obj is { username: player } (see showing_down handler)
      rank_usernames = _.keys(players_obj);
      console.log('players_obj is', players_obj, ', rank_usernames is', rank_usernames);
      // iterate over all pots
      console.log('paying_out: pots is now', self.pots);
      _.each(self.pots, function(pot_obj, pot_num) {
        pot_value = pot_obj.value
        if (pot_value > 0) {
          // intersect winners' usernames with this pot's usernames
          pot_winners = _.intersection(rank_usernames, pot_obj.usernames);
          num_winners = pot_winners.length;
          console.log('pot_winners is', pot_winners, 'pot_obj.value is', pot_obj.value);
          if (num_winners > 0) {
            pot_remainder = pot_value % num_winners;
            if (pot_remainder > 0) {
              self.pot_remainder += pot_remainder;
              pot_value -= pot_remainder;
            }
            winnings = game.roundNumChips(pot_value / num_winners);
            _.each(pot_winners, function(username) {
              //console.log('username is', username, 'player is', players_obj[username].player, 'winnings is', winnings);
              players_obj[username].win(winnings, pot_num);
              self.hand_history.logWinnings(username, winnings, pot_num, num_pots);
            });
            // set this pot's value to 0 (so future players_obj iterations don't check emptied pots)
            pot_obj.value = 0;
          }
          else {
            // no winners in this result_usernames/pot_obj.usernames intersection
          }
        }
      });
    });
    // set players' hand_result Objects
    _.each(self.players, function(player) {
      hand_result = player.hand_result;
      hand_result.stage_name = self.stage_name;
      hand_result.chips_won_total = _.reduce(player.chips_won,
                                             function(memo, amount) { return memo + amount; },
                                             0);
      if (self.players.length === 1) {
        hand_result.type = 'collected'; // all other players folded
      }
      else if (hand_result.chips_won_total > 0) {
        hand_result.type = 'won';
      }
      else {
        hand_result.type = 'lost';
      }
    });

    player_objs = self.getPlayerObjs(['hand', 'chips_won']);

    self.hand_history.logEnd(pot_values, player_objs);
    
    self.broadcast('winners', player_objs);
    setTimeout(function() {
      self.nextStage();
    }, game.DISPLAY_HANDS_DURATION * num_pots);
  };

  static_properties.stage_handlers.done = function() {
    var self = this
      , game = self.game
      , num_players = self.players.length;
    if (num_players > game.MIN_PLAYERS) {
      console.error(num_players + ' players in at cleanup!', self.players);
    }
    console.log('Hand over! Notifying players...');
    _.each(self.players, function(player) {
      player.handEnd();
    });
  };

  HoldEmHandSchema.methods.nextStage = function() {
    if (this.stage_num + 1 >= HoldEmHand.STAGES.length) {
      console.error('nextStage called when stage_num is', this.stage_num);
      return;
    }
    else {
      var args_array = [].slice.apply(arguments)
        , next_stage_num = this.stage_num + 1;
      args_array.unshift(next_stage_num);
      this.toStage.apply(this, args_array);
    }
  };

  HoldEmHandSchema.methods.toStage = function(stage) {
    var stage_num = _.indexOf(HoldEmHand.STAGES, stage);
    if (stage_num === -1) {
      stage_num = stage;
    }
    var stage_name = HoldEmHand.STAGES[stage_num];
    if (! _.isString(stage_name) || ! _.contains(HoldEmHand.STAGES, stage_name)) {
      console.error('toStage called with', stage, stage_num, stage_name);
    }
    else if (stage_num < this.stage_num) {
      console.error('cannot go back to a previous stage!');
    }
    else {
      this.stage_num = stage_num;
      this.stage_name = stage_name;
      if (! _.contains(['shuffling', 'waiting'], stage_name) ) {
        console.log('*Stage: ' + stage_name + '*');
      }
      var args_array = [].slice.apply(arguments)
        , event_name = 'stage_' + stage_name;
      args_array[0] = event_name;
      this.emit.apply(this, args_array);
    }
  };

  HoldEmHandSchema.methods.isInStage = function(stage) {
    if (_.isNumber(stage)) {
      return this.stage_num === stage;
    }
    else if (_.isString(stage)) {
      return HoldEmHand.STAGES[this.stage_num] === stage;
    }
    else {
      console.error('isInStage called with', stage);
    }
  };

  HoldEmHandSchema.methods.isAfterStage = function(stage) {
    var stage_num;
    if (_.isString(stage)) {
      stage_num = _.indexOf(HoldEmHand.STAGES, stage);
    }
    else if (_.isNumber(stage)) {
      stage_num = stage;
    }
    if (! _.isNumber(stage_num)) {
      console.error('isAfterStage called with', stage);
    }
    return this.stage_num > stage_num;
  };

  HoldEmHandSchema.methods.onStage = function(stage, handler) {
    if (! _.isFunction(handler)) {
      console.error('onStage called with non-function', handler);
    }
    else {
      this.on('stage_' + stage, handler);
    }
  };

  HoldEmHandSchema.methods.calculatePlayers = function() {
    var self = this
      , game = self.game
      , seat_counter
      , player
      , calculated_dealer
      , first_round = true;
    for (seat_counter = self.dealer;
         first_round || seat_counter !== self.dealer;
         first_round = false,
         seat_counter = (seat_counter + 1) % game.MAX_PLAYERS) {
      player = self.seats[seat_counter];
      if (player instanceof Player && ! player.sitting_out && player.chips >= game.SMALL_BLIND) {
        self.players.push(player);
        player.handStart();
        if (_.isUndefined(calculated_dealer)) {
          calculated_dealer = player.seat;
          self.dealer = calculated_dealer;
        }
      }
    }
    if (self.players.length > 2) {
      // make the dealer go last for blinding and betting
      self.players.push(self.players.shift());
      // small blind bets first (except preflop)
      self.first_to_act = 0;
    }
    else {
      // big blind bets first (except preflop)
      self.first_to_act = 1;
    }
    //console.log('calculated players:', self.players, 'small_blind_seat:', self.small_blind_seat);
  };

  // calculate how much is in all pots, including current bets
  HoldEmHandSchema.methods.calculatePotTotal = function() {
    var pot_total = _.reduce(this.pots, function(memo, pot_obj) {
      return memo + pot_obj.value;
    }, 0);
    //console.log('pot total:', pot_total);
    _.each(this.players, function(player) {
      pot_total += player.current_bet;
    });
    //console.log('pot total including bets:', pot_total);
    return pot_total;
  };

  // sort pots by number of users in each
  HoldEmHandSchema.methods.getPotValues = function() {
    var pot_values = _.pluck(this.pots, 'value');
    return pot_values;
  };

  HoldEmHandSchema.methods.collectForfeitedBets = function(min_bet) {
    var collected = 0
      , self = this;
    _.each(self.forfeited_bets, function(forfeited_bet, i) {
      if (forfeited_bet === 0) {
        // skip this bet
        return;
      }
      if (forfeited_bet >= min_bet) {
        collected += min_bet;
        forfeited_bet -+ min_bet;
      }
      else {
        collected += forfeited_bet;
        forfeited_bet = 0;
      }
      self.forfeited_bets[i] = forfeited_bet;
      // remove zero-value bets so they are skipped by future iterations (removed - unnecessary)
      //self.forfeited_bets = _.without(self.forfeited_bets, 0);
    });
    return collected;
  };

  // calculate what's the highest amount any player (other than the given one) can bet,
  // including current bets
  HoldEmHandSchema.methods.calculateHighestStack = function(player_to_ignore) {
    var stack_including_bet
      , high_stack = 0;
    _.each(this.players, function(player) {
      if (player.username !== player_to_ignore.username) {
        stack_including_bet = player.chips + player.current_bet;
        if (stack_including_bet > high_stack) {
          high_stack = stack_including_bet;
        }
      }
      // else ignore
    });
    return high_stack;
  };

  HoldEmHandSchema.methods.getNumPlayersWithChips = function() {
    var num_players = 0;
    _.each(this.players, function(player) {
      if (player.chips > 0) {
        num_players++;
      }
      // else ignore
    });
    return num_players;
  };

  HoldEmHandSchema.methods.getPlayerObjs = function(player_include) {
    return _.map(this.players, function(player) {
      return player.serialize(player_include);
    });
  };

  HoldEmHandSchema.methods.currentPlayer = function() {
    return this.players[this.to_act];
  };

  HoldEmHandSchema.methods.nextPlayer = function() {
    this.to_act++;
    if (this.to_act >= this.players.length) {
      this.to_act = 0;
    }
    //console.log('nextPlayer:', this.to_act, this.players[this.to_act]);
    return this.players[this.to_act];
  };

  HoldEmHandSchema.methods.playerOut = function(index, result_string) {
    var self = this
      , player = self.players[index]
      , username = player.username
      , bet = player.giveBet();
    if (bet > 0) {
      console.log(username, 'forfeited', bet);
      self.forfeited_bets.push(bet);
    }
    player.setHandResult({ result: result_string, stage_name: self.stage_name });
    player.handEnd();
    self.players.splice(index, 1);
    if (self.to_act >= index) {
      self.to_act--;
    }
    // remove user's name from any and all pots
    console.log('playerOut: pots before:', self.pots);
    _.each(self.pots, function(pot_obj) {
      pot_obj.usernames = _.without(pot_obj.usernames, username);
    })
    console.log('playerOut: pots after:', self.pots);
    //console.log('playerOut:', index, self.players[self.to_act]);
  };

  static_properties.includes = {
    all: ['stage_name', 'dealer', 'small_blind_seat', 'to_act',
          'high_bet', 'pots', 'community', 'hand_id',
          'max_players', 'min_chips', 'max_chips', 'min_increment', 
          'small_blind', 'big_blind', 'currency', 'currency_per_chip', 'act_timeout',
          'seats', 'players']
  };
  HoldEmHandSchema.methods.serialize = function(this_username, include) {
    var self = this
      , game = self.game
      , hand_include = include
      , all_players_include = []
      , this_player_include = ['hand', 'flags', 'preferences']
      , hand_obj = {};

    if (_.isString(include)) {
      hand_include = HoldEmHand.includes[include];
      if (_.isUndefined(hand_include)) {
        try {
          hand_include = JSON.parse(include);
        }
        catch(e) {
          console.error('Error while parsing include:', e);
        }
      }
    }
    if (! _.isArray(hand_include)) {
      console.error('HoldEmHand.serialize called with include:', include, '.. defaulting to "all"');
      hand_include = static_properties.includes.all;
    }

    if (self.showed_down) {
      all_players_include.push('hand');
    }
    if (self.isInStage('paying_out') || self.isInStage('done')) {
      all_players_include.push('chips_won');
      this_player_include.push('chips_won');
    }
    //console.log('hand.serialize called, hand_include is', hand_include);
    _.each(hand_include, function(key) {
      hand_obj[key] = self[key];
    });
    //console.log('hand_obj is', hand_obj);
    if (_.contains(hand_include, 'max_players')) hand_obj.max_players = game.MAX_PLAYERS;
    if (_.contains(hand_include, 'min_chips')) hand_obj.min_chips = game.MIN_CHIPS;
    if (_.contains(hand_include, 'max_chips')) hand_obj.max_chips = game.MAX_CHIPS;
    if (_.contains(hand_include, 'small_blind')) hand_obj.small_blind = game.SMALL_BLIND;
    if (_.contains(hand_include, 'big_blind')) hand_obj.big_blind = game.BIG_BLIND;
    if (_.contains(hand_include, 'currency')) hand_obj.currency = game.CURRENCY;
    if (_.contains(hand_include, 'min_increment')) hand_obj.min_increment = game.MIN_INCREMENT;
    if (_.contains(hand_include, 'currency_per_chip')) hand_obj.currency_per_chip = game.CURRENCY_PER_CHIP;
    if (_.contains(hand_include, 'act_timeout')) hand_obj.act_timeout = game.ACT_TIMEOUT;
    if (_.contains(hand_include, 'seats')) hand_obj.seats = _.map(hand_obj.seats, serializePlayer);
    if (_.contains(hand_include, 'players')) hand_obj.players = _.map(hand_obj.players, serializePlayer);
    function serializePlayer(player) {
      var player_obj;
      if (player.username === this_username) {
        player_obj = player.serialize(this_player_include);
        player_obj.is_you = true;
      }
      else {
        player_obj = player.serialize(all_players_include);
      }
      return player_obj;
    }
    return hand_obj;
  };

  HoldEmHandSchema.methods.refundAndEndHand = function() {
    var self = this
      , refund
      , pot_total;
    // refund players' current bets
    _.each(self.players, function(player) {
      refund = player.current_bet;
      console.log(player.username, 'gets refund:', refund);
      if (refund > 0) {
        player.getBet(refund);
        self.broadcast('player_gets_refund', player.serialize(), refund, self.calculatePotTotal());
      }
    });
    // refund players' pot contributions
    pot_total = self.calculatePotTotal();
    _.each(self.players, function(player) {
      if (player.total_bet > 0) {
        refund = player.total_bet;
        player.chips += refund;
        pot_total -= refund;
      }
    });
    // split up anything remaining in the pot
    refund = Math.floor(pot_total / self.players.length);
    _.each(self.players, function(player) {
      console.log(player.username, 'gets refund:', refund);
      player.chips += refund;
    });
    self.toStage('done');
  };

  /* the model - a fancy constructor compiled from the schema:
   *   a function that creates a new document
   *   has static methods and properties attached to it
   *   gets exported by this module */
  var HoldEmHand = mongoose.model('hold_em_hand', HoldEmHandSchema);

  //static properties (defined above)
  _.extend(HoldEmHand, static_properties);

  return HoldEmHand;
})();