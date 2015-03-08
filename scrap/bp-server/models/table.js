module.exports = (function () {
  var mongoose = require('mongoose') // MongoDB abstraction layer
    , Schema = mongoose.Schema // Mongoose Schema constructor
    , ObjectId = Schema.ObjectId // Mongoose ObjectId type

    , async = require('async') // flow control utility library
    , _ = require('underscore') // list utility library

    , io = require('../sockets') // configured and listening Socket.IO

    , db = require('./db') // make sure db is connected

    , Room = require('./room')
    , Message = require('./message')

    , NoLimitGame = require('./no_limit_game')
    , HoldEmHand = require('./hold_em_hand')
    , Player = require('./player');

  var static_properties = {
  // static properties (attached below) - Model.property_name
    // [this string] + table_id = room_name
    TABLE_PREFIX: 'table_'
    // the events a Table should react to, on its room
    // {String event_name: String handler_name}
  , room_events: {}
    // the events a Table should react to, on each player
    // {String event_name: String handler_name}
  , player_events: {}
    // all the tables in the world (should this be private?)
  , tables: {}
  };

  /* the schema - defines the "shape" of the documents:
   *   gets compiled into one or more models */
  var TableSchema = new Schema({
  // instance properties - document.field_name
    // uniquely identifies this table
    table_id    : String
    // readable name for this table (Table.TABLE_PREFIX + table_id)
  , name        : String
    // the game that this table creates hands of (e.g. NoLimitGame instance)
  , game        : { type: Schema.Types.Mixed }
    // the corresponding room
  , room        : { type: Schema.Types.Mixed }
    // the hands this table has gone through (oldest to newest)
  , hands       : { type: [Schema.Types.Mixed], default: function() { return []; } }
    // the players that are currently at this table (seated or not)
  , players     : { type: Schema.Types.Mixed, default: function() { return {}; } }
    // {seat_num: Player}
  , seats       : { type: Schema.Types.Mixed, default: function() { return {}; } }
    // number of seats currently taken by players
  , num_seats_taken : { type: Number, default: 0 }
    // current dealer seat
  , dealer      : { type: Number, default: 0 }
    // flags that define this table's state
  , flags       : {
      // whether this table has been stopped - allowing no new hands to begin
      stop        : { type: Boolean, default: false }
    }
  });

  // static methods - Model.method()
  TableSchema.statics.setup = function() {
    var game
      , i = 0;
    _.each( NoLimitGame.games, function(game) {
      Table.createTable({
        table_id: ++i
      , game: game
      });
    });
  };

  TableSchema.statics.createTable = function(spec) {
    //console.log('creating table', spec.table_id);
    var table = new Table(spec);
    table.initialize();

    return table;
  };

  TableSchema.statics.getTable = function(table_id) {
    // console.log('getting', table_id);
    return Table.tables[Table.TABLE_PREFIX + table_id];
  };

  TableSchema.statics.getTableNames = function() {
    // console.log('getting tables');
    return _.keys(Table.tables);
  };

  TableSchema.statics.getTableGames = function() {
    var table_games = _.map(Table.tables, function(table) {
      return _.pick(table, 'name', 'game', 'table_id', 'num_seats_taken')
    });
    return table_games;
  };

  TableSchema.statics.sendServerMessageToAllPlayers = function(message) {
    _.each(Table.tables, function(table) {
      _.each(table.players, function(player) {
        player.sendMessage('server_message', message);
      });
    });
  };

  TableSchema.statics.stopAllTables = function() {
    _.each(Table.tables, function(table) {
      table.stop();
    });
  };

  TableSchema.statics.refundAllTables = function(cb) {
    async.each(_.values(Table.tables), function(table, acb) {
      table.refund(acb);
    }, function() {
      cb();
    });
  };

  // instance methods - document.method()
  TableSchema.methods.initialize = function() {
    var self = this
      , table_id = self.table_id
      , name = Table.TABLE_PREFIX + table_id
      , room = Room.createRoom({
          room_id: name
      });

    self.set({
      name: name
    , room: room
    });

    self.newHand(true);

    _.each(Table.room_events, function(handler_name, event_name) {
      var handler = self[handler_name];
      if (! _.isFunction(handler)) {
        console.error('room_event points to non-function', handler);
      }
      else {
        self.room.on(event_name, function() {
          //console.log(event_name, 'triggered with', arguments, '; calling', handler);
          handler.apply(self, arguments);
        });
      }
    });

    Table.tables[name] = self;
  };

  TableSchema.methods.newHand = function(first_hand) {
    var self = this
      , hand = HoldEmHand.createHoldEmHand({
          table_name: self.name
        , game: self.game
        , seats: self.seats
        , broadcast: function() { self.room.broadcast.apply(self.room, arguments); }
        , broadcastAndSave: function() { self.room.broadcastAndSave.apply(self.room, arguments); }
        , dealer: self.dealer
        , initial_pot: self.initial_pot || 0
        , first_hand: first_hand
    });
    //console.log('Pushing new hand onto hands: ', hand.table_name);
    self.hands.push(hand);
    
    hand.onStage('done', function() {
      self.dealer = hand.dealer + 1;
      self.initial_pot = hand.pot_remainder;
      
      if (! self.flags.stop) {
        console.log('Hand is over! Creating a new hand in 1 second...');
        setTimeout(function() {
          self.room.broadcast('reset_table');
          self.newHand();
        }, 1000);
      }
      else {
        self.room.broadcast('reset_table');
        self.room.broadcast('server_message', 'The server is going down, and play at this table has stopped.');
      }
      Message.deleteMessagesWithHandNum(hand.hand_num, function (err, messages) {
        if (err) { console.error('error during deleteMessagesWithHandNum:', err); }
        //console.log('running Message.deleteMessagesWithHandNum', hand.hand_num);
      });
    });
    return hand;
  };

  TableSchema.methods.getCurrentHand = function(status) {
    return _.last(this.hands);
  };

  static_properties.room_events.socket_join = 'onSocketConnect';
  TableSchema.methods.onSocketConnect = function(socket) {
    var self = this
      , user = socket.user
      , username = user.username
      , player = self.players[username];
    if (! _.isFunction(user.checkBalance)) {
      console.error('Unauthenticated user somehow joined table room!', self.name);
      return;
    }
    if (! (player instanceof Player)) {
      // create a new player
      player = Player.createPlayer({
            username: username
          , game: self.game
          , table: self
      });
      self.players[username] = player;
      // attach handlers for events as defined in Table.player_events
      console.log('Created player', username, ', binding player events');
      _.each(Table.player_events, function(handler_name, event_name) {
        var handler = self[handler_name];
        if (! _.isFunction(handler)) {
          console.error('player_event points to non-function', handler);
        }
        else {
          player.on(event_name, function() {
            var args_array = _.toArray(arguments);
            // add player as first argument
            args_array.unshift(player);
            //console.log(event_name, 'triggered with', args_array, '; calling', handler);
            handler.apply(self, args_array);
          });
        }
      });
    }
    else {
      console.log('Socket joined with existing player', player);
    }
    // set socket.player to player
    socket.player = player;
    // disconnect player's existing socket, if any
    if (player.socket) {
      player.socket.emit(
        'error'
      , 'You have connected to the same table multiple times.\n' +
        'This window will close now.\n' +
        'You may continue playing on the newest browser connected to this table.'
      , {
          title: 'Multiple Connections Detected'
        , okayText: 'Close Window'
        , okayEvent: 'self.events.exit'
        }
      );
      player.socket.disconnect(true);
      delete player.socket;
    }
    // set player.socket to socket
    player.socket = socket;
    // augment the socket
    player.onConnect(socket);
  };

  static_properties.room_events.socket_leave = 'onSocketDisconnect';
  TableSchema.methods.onSocketDisconnect = function(socket) {
    var self = this
      , player = socket.player;

    if (player instanceof Player) {
      player.onDisconnect(socket);
    }
  };

  static_properties.player_events.sit = 'playerSits';
  TableSchema.methods.playerSits = function(player, seat_num) {
    var socket = player.socket;

    this.seats[seat_num] = player;
    this.num_seats_taken++;

    socket.emitToOthers('player_sits', player.serialize(), false);
    socket.emit('player_sits', player.serialize(['preferences']), true);
    
    io.sockets.emit('new_num_players', this.name, this.num_seats_taken);
    };

  static_properties.player_events.stand = 'playerStands';
  TableSchema.methods.playerStands = function(player, seat_num) {
    var socket = player.socket
      , player_obj = player.serialize();

    delete this.seats[seat_num];
    this.num_seats_taken--;

    socket.emitToOthers('player_stands', player_obj, seat_num, false);
    socket.emit('player_stands', player_obj, seat_num, true);

    io.sockets.emit('new_num_players', this.name, this.num_seats_taken);
  };

  static_properties.player_events.sit_out = 'playerSitsOut';
  TableSchema.methods.playerSitsOut = function(player) {
    this.room.broadcast('player_sits_out', player.serialize(), this.game.SIT_OUT_TIME_ALLOWED);
  };

  static_properties.player_events.sit_in = 'playerSitsIn';
  TableSchema.methods.playerSitsIn = function(player) {
    this.room.broadcast('player_sits_in', player.serialize());
  };

  static_properties.player_events['message:get_table_state'] = 'sendTableState';
  TableSchema.methods.sendTableState = function(player, fields, cb) {
    var self = this;
    fields = fields || 'all';
    self.getTableState(player.socket.user, fields, function(err, table_state) {
      player.socket.emit('table_state', table_state);
      player.sendCurrentPromptIfAny();
      if (_.isFunction(cb)) cb();
    })
  };

  TableSchema.methods.getTableState = function(user, hand_include, cb) {
    var self = this;
    async.parallel({
      messages: function(acb) {
        Message.getMessagesByHandNum(self.getCurrentHand().hand_num, acb);
      }
    , balance: function(acb) {
        user.checkBalance('funbucks', acb);
      }
    }, function(err, results) {
      if (err) { 
        console.error('Error while looking up messages or balance:', err);
        return cb(err);
      }
      var username = user.username
        , player = self.players[username]
        , table_state = self.getCurrentHand().serialize(username, hand_include);
      _.extend(table_state, {
        table_name: self.name
      , preferences: user.preferences
      });
      if (player instanceof Player) {
        table_state.num_chips = player.num_chips;
      }
      else {
        console.error('No player currently exists for username', username);
      }
      //Add messages field to table_state object
      table_state.messages = results.messages;
      // Add balance field to table_state object
      table_state.balance = results.balance;
      if (_.isFunction(cb)) cb(null, table_state);
    });
  };

  static_properties.player_events['message:get_add_chips_info'] = 'sendAddChipsInfo';
  TableSchema.methods.sendAddChipsInfo = function(player) {
    var add_chips_info = {
          table_name: this.name
        , small_blind:   this.game.SMALL_BLIND
        , big_blind:     this.game.BIG_BLIND
        , table_min:     this.game.MIN_CHIPS
        , table_max:     this.game.MAX_CHIPS
        , currency:      this.game.CURRENCY
        , min_increment: this.game.MIN_INCREMENT
    };
    player.calculateAddChipsInfo(function(err, player_add_chips_info) {
      if (err) {
        console.error('Error during Player.calculateAddChipsInfo:', err);
        player.sendMessage('error', err.message || err);
      }
      else {
        _.extend(add_chips_info, player_add_chips_info);
        player.sendMessage('add_chips_info', add_chips_info);
      }
    });
  };

  static_properties.player_events.chips_added = 'playerAddsChips';
  TableSchema.methods.playerAddsChips = function(player, num_chips) {
    var socket = player.socket;
    socket.emitToOthers('player_adds_chips', player.serialize(), false);
    socket.emit('player_adds_chips', player.serialize(), true);
  };

  TableSchema.methods.getNumSeatsTaken = function() {
    var num_players = _.size(this.seats);
    return num_players;
  };

  TableSchema.methods.isFull = function() {
    return this.num_seats_taken === this.game.MAX_PLAYERS;
  };

  TableSchema.methods.getPlayer = function(username) {
    var player = this.players[username];
    return player;
  };

  // stop starting new hands (after this one)
  TableSchema.methods.stop = function() {
    this.flags.stop = true;
    _.each(this.players, function(player) {
      if (_.isNumber(player.seat)) {
        player.handleStand(); // stand the player at the end of the hand
      }
    });
    var current_hand = this.getCurrentHand();
    if (! current_hand.isAfterStage('waiting')) {
      current_hand.toStage('done');
    }
  };

  // refund any existing bets, the server is going down!
  TableSchema.methods.refund = function(cb) {
    var self = this;
    self.flags.stop = true;
    self.room.broadcast('server_message', 'The server is going down unexpectedly. Bets have been refunded, and pots have been split.');
    var current_hand = self.getCurrentHand();
    if (current_hand.isAfterStage('waiting')) {
      current_hand.refundAndEndHand();
    }
    else {
      current_hand.toStage('done');
    }
    async.each(_.values(self.players), function(player, acb) {
      if (_.isNumber(player.seat)) {
        player.on('stand', function() {
          acb();
        });
        player.handleStand();
      }
      else {
        acb();
      }
    }, function() {
      console.log('All players have stood for', self.name);
      cb();
    });
  };

  /* the model - a fancy constructor compiled from the schema:
   *   a function that creates a new document
   *   has static methods and properties attached to it
   *   gets exported by this module */
  var Table = mongoose.model('Table', TableSchema);

  // static properties (defined above)
  _.extend(Table, static_properties);

  Table.setup();

  return Table;
})();