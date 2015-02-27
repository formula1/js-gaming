module.exports = (function () {
  var mongoose = require('mongoose') // MongoDB abstraction layer
    , Schema = mongoose.Schema // Mongoose Schema constructor
    , ObjectId = Schema.ObjectId // Mongoose ObjectId type

    , _ = require('underscore') // list utility library
    
    , io = require('../sockets') // configured and listening Socket.IO
    
    , db = require('./db') // make sure mongoose is connected

    , async = require('async') // sync/async control flow library

    , User = require('./user')

    /* the schema - defines the "shape" of the documents:
     *   gets compiled into one or more models */
    , PlayerSchema = new Schema({
    // instance properties
      // the socket by which we can communicate with this player
      socket: Schema.Types.Mixed
      // this player's username
    , username: String
      // the number of chips this player has at the current table
    , chips: { type: Number, default: 0 }
      // this player's hand, a list of Strings representing cards
    , hand: { type: [String], hand_default: function() { return []; } }
      // the number of chips this player is betting in the current stage
    , current_bet: { type: Number, hand_default: 0 }
      // whether this player has made a bet in the current hand
    , has_bet: { type: Boolean, hand_default: false }
      // how much this player has contributed to the current hand's pot
    , total_bet: { type: Number, hand_default: 0 }
    /*// whether this player has paid a big blind at this table yet
    , blind_paid: { type: Boolean, default: false }*/
      // the flags that describe how this player will act automatically
    , flags: { type: Schema.Types.Mixed, default: function() { return {}; } }
      // the seat number this player is currently sitting in, if any
    , seat: Number
      // which stages this player has acted in, in the current hand
    , has_acted: { type: Schema.Types.Mixed, hand_default: function() { return {}; } }
      // the numbers of chips thie player won this hand, from each pot (initialized before win is called)
    , chips_won: { type: [Number], hand_default: function() { return []; } }
      // a reference to the game class which describes the game this player is playing
    , game: Schema.Types.Mixed
      // a reference to the table on which this player is playing
    , table: Schema.Types.Mixed
      // whether this player is currently participating in a hand
    , in_hand: Boolean
      // actions this player will perform once the current hand is over
    , pending_actions: { type: Schema.Types.Mixed, default: function() { return {}; }, hand_default: function() { return {}; } }
      // what the outcome of the current (or last) hand was for this player
    , hand_result: { type: Schema.Types.Mixed, hand_default: function() { return {}; } }
      // whether this player is currently sitting out (not participating in future hands)
    , sitting_out: Boolean
      // whether this player is currently idle (didn't respond to the last prompt)
    , idle: Boolean
      // whether this player is currently disconnected
    , disconnected: Boolean
      // the outstanding prompt to the player, if any
    , current_prompt: Schema.Types.Mixed
      // the preferences that describe how this player wants his/r table to be displayed
    , preferences: { type: Schema.Types.Mixed, default: function() { return {}; } }
    });

  var static_properties = {
  // static properties (attached below) - Model.property_name
    // message-to-handler map, { message_name: instance_method_name }
    messages: {
    }
    // list of possible actions, used to determine which flags are auto-actino flags
  , action_list: ['fold', 'check', 'call', 'all_in']
  };

  // static methods - Model.method()
  PlayerSchema.statics.createPlayer = function(spec) {
    /* our "constructor" function. Usage: Player.createPlayer({prop: 'val'})
       (see Schema definition for list of properties)*/
    console.log('Player.createPlayer called!');
    var player = new Player(spec);
    player.initialize();
    return player;
  };

  // instance methods - document.method()
  PlayerSchema.methods.initialize = function() {
    var self = this;
    // set post_blind flag
    this.setFlag('post_blind', true);
  };

  PlayerSchema.methods.makeBet = function(amount) {
    var game = this.game
      , rounded_amount = game.roundNumChips(amount);
    if (rounded_amount !== amount) {
      console.error('Invalid amount:', amount, game.MIN_INCREMENT);
      amount = rounded_amount;
    }
    if (this.chips < amount) {
      amount = this.chips;
      console.log( this.username + ' cant afford to bet ' + amount);
    }
    this.chips -= amount;
    this.current_bet += amount;
    this.has_bet = true;
    return amount;
  };

  PlayerSchema.methods.giveBet = function() {
    var amount = this.current_bet;
    this.current_bet = 0;
    this.total_bet += amount;
    return amount;
  };

  // only called when we've raised beyond all other players' stacks
  PlayerSchema.methods.getBet = function(amount) {
    var game = this.game
      , rounded_amount = game.roundNumChips(amount);
    if (rounded_amount !== amount) {
      console.error('Invalid amount:', amount, game.MIN_INCREMENT);
      amount = rounded_amount;
    }
    this.chips += amount;
    this.current_bet -= amount;
  };

  PlayerSchema.methods.win = function(amount, pot_num) {
    this.chips += amount;
    this.chips_won[pot_num] = amount;
  };

  PlayerSchema.methods.receiveHand = function(first_card, second_card) {
    this.hand.push(first_card);
    this.hand.push(second_card);
  };

  PlayerSchema.methods.prompt = function(actions, timeout, default_action, cb) {
    var self = this
      , actions_obj = {}
      , auto_action_flags = self.getSetAutoActionFlags()
      , auto_action_amount
      , auto_action
      , auto_acted
      , game = self.game
      , total_timeout = timeout + self.game.TO_ACT_GRACE_PERIOD
      , act_timeout
      , update_interval;

    // combine possible actions into a single object, actions_obj
    _.each(actions, function(action_obj) {
      _.extend(actions_obj, action_obj);
    });

    // define validation and callback function
    function respondToPrompt(action, num_chips) {
      var action_arg = actions_obj[action] // the allowed value(s) for this action
        , flags_to_clear;
      
      // validate arguments
      if (_.isUndefined(action_arg)) {
        // invalid action; ignore it
        console.error('respondToPrompt given invalid action!', action, actions_obj);
        return false;
      }
      if (_.isNumber(num_chips)) {
        var rounded_num_chips = game.roundNumChips(num_chips);
        if (rounded_num_chips !== num_chips) {
          console.error('respondToPrompt given unrounded num_chips value!', num_chips, rounded_num_chips);
          num_chips = rounded_num_chips;
        }
      }
      else if (action_arg !== true) {
        console.error('respondToPrompt given non-Number num_chips value when a Number is required!', num_chips, action, action_arg);
        return false;
      }

      // action-specific stuff: perform validation and set flags_to_clear
      if (action === 'fold') {
        // doesn't matter; everything will be cleared by handEnd
        flags_to_clear = [];
      }
      else if (action === 'check') {
        // clear call X, not call any or fold (all_in should never happen)
        flags_to_clear = ['call'];
      }
      else if (action === 'call') {
        if (num_chips !== action_arg) {
          console.error('respondToPrompt given value other than to_call!', num_chips, action_arg);
          num_chips = action_arg;
        }
        flags_to_clear = ['fold', 'call'];
      }
      else if (action === 'bet' || action === 'raise') {
        var min_bet = action_arg[0]
          , max_bet = action_arg[1];
        if (num_chips < min_bet) {
          // value is too low; ignore it
          console.error('respondToPrompt given less than min_bet!', num_chips, min_bet);
          return false;
        }
        else if (num_chips > max_bet) {
          //value is too high; set to max
          console.error('respondToPrompt given more than max_bet!', num_chips, max_bet);
          num_chips = max_bet;
        }
        flags_to_clear = ['fold', 'check', 'call', 'call_any'];
      }
      else {
        console.error('unknown action', action);
        return false;
      }
      // determine whether each flag actually needs to be cleared
      var flags_obj = {};
      _.each(flags_to_clear, function(action) {
        if (action === 'call_any') {
          if (self.flags.call === true) {
            flags_obj.call = false;
          }
        }
        else if (action === 'call') {
          if (_.isNumber(self.flags.call)) {
            flags_obj.call = false;
          }
        }
        else if (self.flags[action]) {
          flags_obj[action] = false;
        }
      });
      // clear flags that need to be cleared
      if (! _.isEmpty(flags_obj)) {
        self.setFlags(flags_obj, true);
      }

      self.current_prompt = undefined;
      clearTimeout(act_timeout);
      clearInterval(update_interval);
      self.socket.removeAllListeners('act');
      cb(action, num_chips);
      return true;
    }

    // determine whether to auto-act
    _.all(auto_action_flags, function(action) {
      // all_in is a special case - it can mean raise, bet, or call
      if (action === 'all_in') {
        console.log('in all_in, actions_obj is', actions_obj);
        _.all(['raise', 'bet', 'call'], function(all_in_action) {
          if (! _.isUndefined(actions_obj[all_in_action])) {
            auto_action = all_in_action;
            if (all_in_action === 'call') {
              auto_action_value = actions_obj.call;
            }
            else {
              auto_action_value = actions_obj[all_in_action][1];
            }
            return false; //break
          }
          return true; //continue
        });
        console.log('after iterating:', auto_action, auto_action_value);
        if (auto_action) { return false; } //break
      }
      // "call any" flag
      else if (action === 'call' && self.flags[action] === true) {
        auto_action = 'call';
        auto_action_value = actions_obj.call;
      }
      // other auto-action flags (check, fold, call X)
      else if (! _.isUndefined(actions_obj[action])) {
        auto_action = action;
        auto_action_value = self.flags[action];
        return false; //break
      }
      return true; //continue
    });
    // auto-act if appropriate
    if (_.isString(auto_action)) {
      console.log(auto_action, 'flag was set to', auto_action_value, ', so responding immediately!');
      auto_acted = respondToPrompt(auto_action, auto_action_value);
    }

    if (! auto_acted) {
      console.log('prompting', self.username, 'for next action', actions, timeout);
      self.sendMessage('act_prompt', actions, timeout);

      self.socket.on('act', function(action, num_chips) {
        console.log(self.username, 'responds with', action, num_chips);
        self.idle = false;
        respondToPrompt(action, num_chips);
      });

      act_timeout = setTimeout(function() {
        console.log(self.username, 'fails to respond within', total_timeout, 'ms');
        self.idle = true;
        respondToPrompt(default_action);
      }, total_timeout);

      update_interval = setInterval(function() {
        timeout -= self.game.TO_ACT_UPDATE_INTERVAL;
        self.sendMessage('update_time_to_act', self.seat, timeout);
      }, self.game.TO_ACT_UPDATE_INTERVAL);

      self.current_prompt = {
        actions: actions
      , actions_obj: actions_obj
      , timeout: total_timeout
      , prompt_sent: new Date()
      , callback: respondToPrompt
      };
    }
  };

  PlayerSchema.methods.actedIn = function(stage) {
    //console.log('player acted in', stage);
    this.has_acted[stage] = true;
  };

  PlayerSchema.methods.hasActedIn = function(stage) {
    //console.log('has player acted in', stage, '?', this.has_acted[stage] || false);
    return this.has_acted[stage] || false;
  };

  PlayerSchema.methods.handStart = function() {
    var self = this
      , flags = {}
      , flag_value
      , hand_default_value;
    self.in_hand = true;

    // clear any auto-action flags that may have been set
    _.each(Player.action_list, function(action) {
      flag_value = self.flags[action];
      if (flag_value) {
        flags[action] = false;
      }
    });
    if (! _.isEmpty(flags)) {
      self.setFlags(flags, true);
    }

    // set values for fields that have declared a hand_default value
    _.each(PlayerSchema.tree, function(field_obj, field_name) {
      hand_default_value = field_obj.hand_default;
      if (_.isFunction(hand_default_value)) {
        //console.log('hand_default for', field_name, ', setting to', hand_default_value());
        self[field_name] = hand_default_value();
      }
      else if (! _.isUndefined(hand_default_value)) {
        //console.log('hand_default for', field_name, ', setting to', hand_default_value);
        self[field_name] = hand_default_value;
      }
      else {
        //console.log('No hand_default, so skipping', field_name);
      }
    });
  };

  PlayerSchema.methods.setHandResult = function(hand_result) {
    this.hand_result = hand_result;
  };

  PlayerSchema.methods.handEnd = function() {
    var self = this
      , action_order = ['addChips', 'sitOut', 'vacateSeat']
      , complete_events = {
          addChips: 'chips_added'
        , sitOut: 'sit_out'
        , vacateSeat: 'stand'
        }
      , actions = [];

    self.in_hand = false;
    
    _.each(action_order, function(method_name) {
      var args_array = self.pending_actions[method_name];
      if (_.isArray(args_array)) {
        actions.push(function(acb) {
          self.performAction(method_name, args_array);
          // wait until the event that the method triggers when it's done
          self.once(complete_events[method_name], function() {
            //console.log(method_name, 'completed, calling acb....');
            acb();
          });
        });
      }
    });
    async.series(actions, function onComplete() {
      console.log('Pending actions completed for', self.username, actions.length);
      console.log('sitting out?', self.sitting_out, ', seat:', self.seat, ', idle:', self.idle);
      if (! self.sitting_out && _.isNumber(self.seat)) {
        self.autoRebuy();
        if (self.idle) {
          self.sitOut();
        }
      }
    });
  };

  PlayerSchema.methods.sendMessage = function() {
    if (_.isObject(this.socket)) {
      this.socket.emit.apply(this.socket, arguments);
    }
  };

  PlayerSchema.methods.toObject = function() {
    return this.serialize(['chips_won', 'hand', 'has_acted']);
  };

  var default_include = ['username', 'seat', 'chips', 'current_bet', 'sitting_out'];
  PlayerSchema.methods.serialize = function(also_include) {
    var self = this
      , include = _.union(default_include, also_include || [])
      , player_obj = {};
    //console.log('player.serialize called, include is', include);
    _.each(include, function(key) {
      /*if (self[key] === undefined) {
        console.error(key, self[key]);
      }*/
      player_obj[key] = self[key];
    });
    return player_obj;
  };

  static_properties.messages.sit = 'handleSit';
  PlayerSchema.methods.handleSit = function(seat_num) {
    var error
      , game = this.game;
    if (! _.isNumber(seat_num)) {
      error = 'sit message received with non-Number seat_num: ' + seat_num;
    }
    else if (seat_num < 0 || seat_num >= game.MAX_PLAYERS) {
      error = 'sit message received with invalid seat_num: ' + seat_num;
    }
    else if (this.table.seats[seat_num] !== undefined) {
      error = 'A player is already sitting in seat ' + seat_num;
    }
    else if (_.isNumber(this.seat)) {
      error = 'Player is already sitting at the table!';
    }
    else if (this.table.flags.stop) {
      error = 'Play at this table has been stopped!';
    }
    if (error) {
      console.error(error);
      this.sendMessage('error', error);
    }
    else {
      this.takeSeat(seat_num);
    }
  };

  function first_buyin_handler(self) {
    if (! _.isFunction(self._first_buyin_handler)) {
      self._first_buyin_handler = function() {
        self.sitIn();
      };
    }
    return self._first_buyin_handler;
  }
  PlayerSchema.methods.takeSeat = function(seat_num) {
    this.seat = seat_num;
    this.once('chips_added', first_buyin_handler(this));
    // emit the "sit" event
    this.emit('sit', seat_num);
  };

  static_properties.messages.stand = 'handleStand';
  PlayerSchema.methods.handleStand = function() {
    var error;
    if (_.isUndefined(this.seat)) {
      error = 'Player is not sitting at the table!';
    }
    if (error) {
      console.error(error);
      this.sendMessage('error', error);
    }
    else {
      this.pendAction('vacateSeat');
    }
  };

  PlayerSchema.methods.vacateSeat = function() {
    var self = this
      , seat_num = self.seat
      , game = self.game
      , stack_in_chips = self.chips
      , stack_in_currency = stack_in_chips * game.CURRENCY_PER_CHIP
      , user = self.socket.user;
    if (self.in_hand) {
      console.error('Cannot stand while currently in a hand!');
      return;
    }
    self.seat = undefined;
    // clear the sit-out timer, if any
    clearInterval(self.full_table_check);
    // clear the sit-in-on-first-buyin timer, if any
    self.removeListener('chips_added', first_buyin_handler(self));
    
    if (stack_in_chips < 0) {
      console.error('player attempted to cash out with ' + stack_in_chips + ' chips! resetting to 0..');
      stack_in_chips = 0;
      // emit the "stand" event
      self.emit('stand', seat_num);
    }
    else if (stack_in_chips === 0) {
      // emit the "stand" event
      self.emit('stand', seat_num);
    }
    else if (stack_in_chips > 0) {
      // credit this player's account with the appropriate number of game.CURRENCY
      var transaction = {
            type: 'cashout'
          , amount: stack_in_currency
          , table_name: self.table.name
          , timestamp: new Date()
      };
      user.updateBalance(game.CURRENCY, stack_in_currency, transaction, function(update_err, new_balance) {
        if (update_err) {
          self.sendMessage('error', 'error while updating balance: ' + update_err.message || update_err);
          return;
        }
        else {
          if (stack_in_chips > game.MIN_CHIPS) {
            self.min_buyin = stack_in_chips;
            self.min_buyin_timeout = setTimeout(function() {
              delete self.min_buyin;
            }, game.MIN_BUYIN_TIME_ENFORCED);
          }
          self.chips = 0;
          // emit the "stand" event
          self.emit('stand', seat_num);
          user.broadcastBalanceUpdate(game.CURRENCY, new_balance);
        }
      });
    }
  };

  static_properties.messages.sit_out = 'handleSitOut';
  PlayerSchema.methods.handleSitOut = function() {
    var error;
    /*if (this.sitting_out) {
      error = 'sitOut called when', self.username, 'is already sitting out!';
    }*/
    if (error) {
      console.error(error);
      this.sendMessage('error', error);
    }
    else {
      this.pendAction('sitOut');
    }
  };

  PlayerSchema.methods.sitOut = function() {
    var self = this
      , game = self.game;
    if (! self.sitting_out) {
      self.sitting_out = true;
      self.setFlag('post_blind', false);
      // set sit-out timer
      console.log('setting sit_out_timer', game.SIT_OUT_TIME_ALLOWED);
      self.full_table_check = setInterval(function() {
        if (self.table.isFull()) {
          self.vacateSeat();
        }
      }, game.SIT_OUT_TIME_ALLOWED);
      // emit the "sit_out" event
      self.emit('sit_out');
    }
    else {
      console.log('sitOut called when', self.username, 'is already sitting out!');
    }
  };

  static_properties.messages.sit_in = 'sitIn';
  PlayerSchema.methods.sitIn = function() {
    console.log('sitIn called!');
    if (this.sitting_out) {
      if (this.chips > 0) {
        clearInterval(this.full_table_check);
        this.idle = false;
        this.sitting_out = false;
        this.setFlag('post_blind', true);
        this.emit('sit_in');
        // clear the sit-out timer, if any
        clearTimeout(this.sit_out_timer);
      }
      else {
        console.error('player tried to sit in when s/he has no chips!');
      }
    }
    else {
      console.log('sitIn called when', this.username, 'is not sitting out');
      delete this.pending_actions.sitOut;
      this.sendMessage('pending_sit_out', false);
    }
  };

  PlayerSchema.methods.calculateAddChipsInfo = function(cb) {
    var self = this
      , game = self.game;
    self.socket.user.checkBalance(game.CURRENCY, function(check_err, balance) {
      if (check_err) {
        return cb(check_err);
      }
      var currency_per_chip = game.CURRENCY_PER_CHIP
        , balance_in_chips = game.roundNumChips(balance / currency_per_chip, 'floor')
        , stack = self.chips
        , num_to_min = game.MIN_CHIPS - stack
        , num_to_max = game.MAX_CHIPS - stack
        , add_chips_info = {
            balance_in_currency: balance
          , balance_in_chips: balance_in_chips
          , stack: stack
          , currency_per_chip: currency_per_chip
        }
        , min_buyin = self.min_buyin
        , min
        , max;
      // set min and max
      if (! _.isNumber(min_buyin)) {
        min_buyin = 0;
      }
      min = _.max([min_buyin, num_to_min]);
      max = _.max([min_buyin, num_to_max]);
      /*if (balance_in_chips < min) {
        min = max = -1;
      }
      else if (balance_in_chips < max) {
        max = balance_in_chips;
      }*/
      _.extend(add_chips_info, {
        min: min
      , max: max
      });
      self.add_chips_info = add_chips_info;
      cb(null, add_chips_info);
    });
  };

  static_properties.messages.add_chips = 'handleAddChips';
  PlayerSchema.methods.handleAddChips = function(amount, currency_or_chips) {
    var self = this
      , game = self.game
      , error
      , rounded_num_chips
      , add_chips_info = self.add_chips_info
      , num_chips;
    
    if (! _.isObject(add_chips_info)) {
      error = 'add_chips message received before add_chips_info was sent!';
    }
    else if (add_chips_info.min === -1) {
      error = 'add_chips message received when player after -1 add_chips_info!';
    }
    // validate the amount
    if (! _.isNumber(amount)) {
      error = 'add_chips message received with non-Number amount: ' + amount;
    }
    if (error) {
      self.sendMessage('error', error);
      return;
    }
    if (currency_or_chips === game.CURRENCY) {
      num_chips = amount / add_chips_info.currency_per_chip;
    }
    else if (currency_or_chips === 'chips') {
      num_chips = amount;
    }
    else {
      console.error('Unsupported currency type', currency_or_chips);
      currency_or_chips = 'chips';
      num_chips = amount;
    }
    rounded_num_chips = game.roundNumChips(num_chips);
    if (rounded_num_chips !== num_chips) {
      console.error('add_chips message sent with unrounded num_chips:', num_chips, game.MIN_INCREMENT);
      num_chips = rounded_num_chips;
    }
    self.pendAction('addChips', num_chips);
  };

  PlayerSchema.methods.addChips = function(num_chips) {
    var self = this
      , game = self.game
      , stack = self.chips
      , num_to_max = game.MAX_CHIPS - stack // current max buyin
      , sent_min = self.add_chips_info.min // min sent in last add_chips_info message
      , sent_balance_in_chips = self.add_chips_info.balance_in_chips // balance sent in last add_chips_info message
      , error
      , user = self.socket.user;
    if (num_chips > sent_balance_in_chips) {
      error = 'add_chips request exceeds player\'s chip balance: ' + sent_balance_in_chips;
    }
    else if (num_chips < 0) {
      error = 'cannot add negative numbers of chips!';
    }
    else if (num_to_max === 0) {
      error = 'cannot add any more chips!';
    }
    else if (num_chips < sent_min) {
      error = 'cannot add fewer than ' + sent_min + ' chips!';
    }
    else if (num_chips > num_to_max && num_chips !== sent_min) {
      //self.sendMessage('error', 'cannot add more than ' + num_to_max + ' chips!');
      console.error('cannot add more than ' + num_to_max + ' chips, so limiting to ' + num_to_max);
      num_chips = num_to_max;
    }
    if (error) {
      self.sendMessage('error', error);
      return;
    }

    user.checkBalance(game.CURRENCY, function(check_err, balance) {
      if (check_err) {
        self.sendMessage('error', 'error while checking balance: ' + check_err.message || check_err);
        return;
      }
      var num_currency = num_chips * game.CURRENCY_PER_CHIP
        , transaction = {
            type: 'buyin'
          , amount: num_currency
          , table_name: self.table.name
          , timestamp: new Date()
      };
      if (num_currency > balance) {
        self.sendMessage('error', 'player no longer has enough currency to add ' + num_chips + ' chips!');
        return;
      }
      user.updateBalance(game.CURRENCY, -1 * num_currency, transaction, function(update_err, new_balance) {
        if (update_err) {
          self.sendMessage('error', 'error while updating balance: ' + update_err.message || update_err);
          return;
        }
        self.chips += num_chips;
        self.emit('chips_added', num_chips);
        user.broadcastBalanceUpdate(game.CURRENCY, new_balance);
      });
    });
  };

  PlayerSchema.methods.autoRebuy = function() {
    var self = this
      , auto_rebuy_amount = self.flags.autorebuy
      , game = self.game;

    if (! _.isNumber(auto_rebuy_amount)) {
      return;
    }

    var stack = self.chips
      , chips_to_add = auto_rebuy_amount - stack;
    console.log('autoRebuy called for', self.username, auto_rebuy_amount, stack, chips_to_add);

    if (chips_to_add <= 0) {
      // stack is already >= auto_rebuy_amount
      return;
    }

    self.socket.user.fetch(function(fetch_err, user) {
      console.log('user fetched!', fetch_err, user);
      if (fetch_err) {
        console.error('error while looking up user: ' + fetch_err.message || fetch_err);
        return;
      }
      var currency_per_chip = game.CURRENCY_PER_CHIP
        , currency_to_add = chips_to_add * currency_per_chip
        , currency_balance = user[game.CURRENCY]
        , new_balance = currency_balance - currency_to_add;
      
      if (new_balance < 0) {
        console.log('player doesn\'t have enough currency to rebuy to ' + auto_rebuy_amount);
        chips_to_add = game.roundNumChips(currency_balance / currency_per_chip, 'floor');
        currency_to_add = chips_to_add * currency_per_chip;
        new_balance = currency_balance - currency_to_add;
      }
      //console.log('chips_to_add:', chips_to_add, 'new_balance:', new_balance, 'currency_to_add:', currency_to_add);
      if (stack + chips_to_add < game.MIN_CHIPS) {
        console.log('player doesn\'t have enough currency to buy to table minimum!');
        return;
      }
      user[game.CURRENCY] = new_balance;
      user.save(function(save_err) {
        if (save_err) {
          console.error('error while saving user: ' + save_err.message || save_err);
          return;
        }
        else {
          self.chips += chips_to_add;
          self.emit('chips_added', chips_to_add);
          user.broadcastBalanceUpdate(game.CURRENCY, new_balance);
        }
      });
    });
  };

  static_properties.messages.set_flag = 'setFlag';
  PlayerSchema.methods.setFlag = function(name, value) {
    console.log('setFlag called for', this.username, 'with', name, value);

    // call handleAutoActionFlag instead
    if (value !== false && _.contains(Player.action_list, name)) {
      this.handleAutoActionFlag(name, value);
      return;
    }
    if (name === 'autorebuy') {
      // check autorebuy flag value
      value = this.handleAutoRebuyFlag(value);
    }
    this.flags[name] = value;
    this.sendMessage('flag_set', name, value);
  };

  PlayerSchema.methods.handleAutoRebuyFlag = function(value) {
    var game = this.game;
    if (value !== false && value < game.MIN_CHIPS) {
      console.error('Received set_flag message with invalid auto-rebuy value:', value);
      value = false;
    }
    else if (value > game.MAX_CHIPS) {
      console.error('Received set_flag message with auto-rebuy amount > MAX_CHIPS:', value);
      value = game.MAX_CHIPS;
    }
    this.flags.autorebuy = value;
    if (! this.in_hand) {
      this.autoRebuy();
    }
    return value;
  };

  PlayerSchema.methods.handleAutoActionFlag = function(action, value) {
    var actions = {};
    actions[action] = value;
    switch(action) {
    case 'fold':
      _.extend(actions, { call: false, all_in: false });
      break;
    case 'check':
      _.extend(actions, { all_in: false });
      break;
    case 'call':
      _.extend(actions, { fold: false, all_in: false });
      break;
    case 'all_in':
      _.extend(actions, { fold: false, check: false, call: false });
      break;
    default: console.error('handleAutoActionFlag called with unknown action', action);
    }
    this.setFlags(actions, true);

    // handle flag immediately if it might be an answer to an outstanding prompt
    if (_.isObject(this.current_prompt)) {
      this.idle = false;
      if (action === 'all_in') {
        var actions_obj = this.current_prompt.actions_obj;
        console.log('in handleAutoActionFlag all_in, actions_obj is', actions_obj);
        _.all(['raise', 'bet', 'call'], function(all_in_action) {
          if (! _.isUndefined(actions_obj[all_in_action])) {
            action = all_in_action;
            if (all_in_action === 'call') {
              value = actions_obj.call;
            }
            else {
              value = actions_obj[all_in_action][1];
            }
            return false; //break
          }
          return true; //continue
        });
        console.log('after iterating:', action, value);
      }
      // clear "call X " bets after they are triggered
      else if (action === 'call' && value !== true) {
        this.flags.call = false;
      }
      this.current_prompt.callback(action, value);
    }
  };

  PlayerSchema.methods.getSetAutoActionFlags = function() {
    var self = this
      , auto_action_flags = [];
    _.each(Player.action_list, function(action) {
      if (self.flags[action] !== false && self.flags[action] !== undefined) {
        auto_action_flags.push(action);
      }
    });
    return auto_action_flags;
  };

  static_properties.messages.set_flags = 'setFlags';
  PlayerSchema.methods.setFlags = function(flags, send_flags_set) {
    var self = this;
    // send_flags_set determines whether to send flags_set or flag_set; default is flag_set
    
    if (send_flags_set !== true) {
      // default behavior - just call setFlag
      _.each(flags, function(value, name) {
        self.setFlag(name, value);
      });
    }
    else {
      // send_flags_set behavior - set flags by hand, don't process autorebuy/autoactions, send flags_set
      _.each(flags, function(value, name) {
        self.flags[name] = value;
      });
      self.sendMessage('flags_set', flags);
    }
  };

  PlayerSchema.methods.isFlagSet = function(name) {
    return this.flags[name] || false;
  };

  PlayerSchema.methods.onConnect = function(socket) {
    var self = this;
    self.disconnected = false;
    self.preferences = self.socket.user.preferences;

    // override message-received trigger (called $emit) to log, trigger player event, then trigger
    var $emit = self.socket.$emit;
    self.socket.$emit = function() {
      var args_array = _.toArray(arguments)
        , message_name = args_array[0]
        , event_name = 'message:' + message_name;
      if (args_array[0] !== 'newListener') {
        //console.log('(player) ' + self.username + ' sent:', args_array);
        // trigger event (prefixed by "message:") on this player object
        args_array[0] = event_name;
        self.emit.apply(self, args_array);
        // trigger any message handlers as normal
        $emit.apply(self.socket, arguments);
      }
    };

    // attach handlers for messages as defined in Player.messages
    io.bindMessageHandlers.call(this, this.socket, static_properties.messages);
  };

  PlayerSchema.methods.sendCurrentPromptIfAny = function() {
    var self = this;
    if (_.isObject(self.current_prompt)) {
      var current_prompt = self.current_prompt
        , actions = current_prompt.actions
        , elapsed_timeout = new Date() - current_prompt.prompt_sent
        , remaining_timeout = current_prompt.timeout - elapsed_timeout
        , respondToPrompt = current_prompt.callback;

      if (remaining_timeout > 0) {
        self.sendMessage('act_prompt', actions, remaining_timeout);

        self.socket.once('act', function(action, num_chips) {
          console.log(self.username, 'responds with', action, num_chips);
          self.idle = false;
          respondToPrompt(action, num_chips);
        });
      }
      else {
        console.error('expired current_prompt found!', current_prompt);
        self.current_prompt = undefined;
      }
    }
    else {
      //console.log('Not sending prompt because current_prompt is', this.current_prompt);
    }
  };

  PlayerSchema.methods.onDisconnect = function(socket) {
    if (! (_.isObject(socket) && this.socket.id === socket.id) ) {
      console.error('Player.onDisconnect called with non-matching socket', socket);
    }
    this.disconnected = true;
  };

  PlayerSchema.methods.pendAction = function(method_name) {
    var args_array = _.toArray(arguments);
    args_array.shift(); // remove method_name from arguments
    if (this.in_hand) {
      this.pending_actions[method_name] = args_array;
      // notify user that the requested action has been delayed
      if (method_name === 'addChips') {
        this.sendMessage('notification',
                         'You will add ' + args_array + ' chips as soon as the hand is over.');
      }
      else if (method_name === 'vacateSeat') {
        this.sendMessage('notification',
                         'You will stand as soon as the hand is over.');
      }
      else {
        this.sendMessage('pending_sit_out', true);
      }
    }
    else {
      this.performAction(method_name, args_array);
    }
  };

  PlayerSchema.methods.performAction = function(method_name, args_array) {
    var handler = this[method_name];
    if (_.isFunction(handler)) {
      handler.apply(this, args_array);
    }
    else {
      console.error('player has no function', method_name);
    }
  };

  static_properties.messages.set_preference = 'setPreference';
  PlayerSchema.methods.setPreference = function(name, value) {
    var self = this;
    self.socket.user.setPreference(name, value, function(user) {
      self.socket.user = user;
      self.preferences = user.preferences;
    });
  };

  static_properties.messages.set_preferences = 'setPreferences';
  PlayerSchema.methods.setPreferences = function(preferences) {
    var self = this;
    self.socket.user.setPreferences(preferences, function(user) {
      self.socket.user = user;
      self.preferences = user.preferences;
    });
  };

  static_properties.messages.get_preferences = 'getPreferences';
  PlayerSchema.methods.getPreferences = function() {
    this.sendMessage('preferences', this.preferences);
  };

  /* the model - a fancy constructor compiled from the schema:
   *   a function that creates a new document
   *   has static methods and properties attached to it
   *   gets exported by this module */
  var Player = mongoose.model('Player', PlayerSchema);

  //static properties (defined above)
  _.extend(Player, static_properties);

  return Player;
})();