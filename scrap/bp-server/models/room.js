module.exports = (function () {
  var mongoose = require('mongoose') // MongoDB abstraction layer
    , Schema = mongoose.Schema // Mongoose Schema constructor
    , ObjectId = Schema.ObjectId // Mongoose ObjectId type

    , _ = require('underscore') // list utility library
    
    , io = require('../sockets') // configured and listening Socket.IO
    
    , db = require('./db') // make sure db is connected

    , User = require('./user')

    , Message = require('./message')

    /* the schema - defines the "shape" of the documents:
     *   gets compiled into one or more models */
    , RoomSchema = new Schema({
    // instance properties
      // this room's name and location
      room_id : String 
      // handlers to call when a socket joins this room
    , joinHandlers : { type: [], default: function() { return []; } }
    });

  var static_properties = {
  // static properties (attached below) - Model.property_name
    // list of rooms to be created in Room.setup
    ROOMS: ['']
    // existing rooms, { room_id: room_document }
  , rooms: {}
    // the messages a Table should react to, on each player's socket
    // {String message_name: {handler: Function, pass_socket: Boolean, pass_message_name: Boolean}}
  , messages: {
      chat: { handler: 'broadcastChatMessage', pass_socket: true }
    , fold: 'broadcast'
    }
    // text to prepend to names of user rooms
  , USER_ROOM_PREFIX: 'user_'
  };

  // static methods - Model.method()
  RoomSchema.statics.setup = function() {
    static_properties.ROOMS.forEach(function(room_id, i, ROOMS) {
      var room = Room.createRoom({
        room_id: room_id
      });
    });
  };

  RoomSchema.statics.createRoom = function(spec) {
    //console.log('creating room:', spec.room_id);
    var room = new Room(spec);
    static_properties.rooms[room.room_id] = room;
    return room;
  };

  RoomSchema.statics.getRoom = function(room_id) {
    //console.log('getting', room_id);
    return static_properties.rooms[room_id];
  };

  // instance methods - document.method()
  RoomSchema.methods.join = function(socket, is_user_room) {
    var self = this;

    self.emit('socket_join', socket);
    //console.log('Socket joining ' + self.room_id + ':', socket.id, socket.user.username);
    socket.join(self.room_id);
    socket.room_id = self.room_id;

    if (is_user_room !== true) {
      // attach handlers for messages as defined in Room.messages
      io.bindMessageHandlers.call(self, socket, static_properties.messages);
    }
  };

  RoomSchema.methods.leave = function(socket) {
    // notify anyone interested (the corresponding table)
    this.emit('socket_leave', socket);
    var user_only_username = _.pick(socket.user, 'username');
    socket.emitToOthers('user_leaves', user_only_username, false);
    socket.emit('user_leaves', user_only_username, true);
  };

  RoomSchema.methods.setJoinHandler = function(handler) {
    if (! _.isFunction(handler)) {
      console.error('setJoinHandler called with', handler);
    }
    else {
      this.joinHandlers.push(handler);
    }
  };

  RoomSchema.methods.broadcast = function(message_name) {
    var socket_list = io.sockets.in(this.room_id)
      , num_sockets = _.size(socket_list.sockets);
    if (num_sockets > 0) {
      console.log(this.room_id, 'broadcasting', arguments, 'to', num_sockets, 'sockets.');
      socket_list.emit.apply(socket_list, arguments);
    }
  };

  RoomSchema.methods.broadcastChatMessage = function(socket, message) {
    var username = socket.user && socket.user.username
      , seat_num = socket.player && socket.player.seat
      , chat_obj = { sender: username, message: message };
    if (! _.isString(username)) {
      console.error('Socket without user or user.username send chat message!', socket, message);
      return;
    }
    if (_.isNumber(seat_num)) { chat_obj.seat = seat_num; }
    this.broadcast('user_chats', chat_obj);
  };

  RoomSchema.methods.broadcastAndSave = function (hand_num) {
    //Shift and store first argument (hand_num)
    arguments = _.toArray(arguments);
    var _hand_num = arguments.shift();
    //Call Room.broadcast with remaining arguments
    this.broadcast.apply(this, arguments);
    //Call Message.createMessage & Message.save
    Message.createMessage({
      hand_num: _hand_num
    , type: arguments[0]
    , message: arguments[1]   
    }).save();
  };

  RoomSchema.methods.getUsernames = function() {
    var sockets = _.compact(io.sockets.clients(this.room_id))
      , users = _.compact(_.pluck(sockets, 'user'))
      , usernames = _.compact(_.pluck(users, 'username'));
    return usernames;
  };

  /* the model - a fancy constructor compiled from the schema:
   *   a function that creates a new document
   *   has static methods and properties attached to it
   *   gets exported by this module */
  var Room = mongoose.model('Room', RoomSchema);

  //static properties (defined above)
  _.extend(Room, static_properties);

  Room.setup();

  // listen for incoming socket connections
  io.sockets.on('connection', function(socket) {
    //console.log('A socket with sessionID ' + socket.handshake.sessionID + ' connected!');
    var room_id = socket.handshake.room_id //socket.handshake = data object from authorization handler
      , room = Room.getRoom(room_id);
    if (room === undefined) {
      console.error('no room with room_id', room_id);
      return;
    }

    // override emit method to log, then emit
    var emit = socket.emit;
    socket.emit = function() {
      var args_array = _.toArray(arguments)
        , user = socket.user || {};
      if (args_array[0] !== 'newListener') {
        console.log('Sending to ' + user.username + ':', args_array);
        emit.apply(socket, arguments);
      }
    };

    // override message-received trigger (called $emit) to log, then trigger
    var $emit = socket.$emit;
    socket.$emit = function() {
      var args_array = _.toArray(arguments)
        , user = socket.user || {};
      if (args_array[0] !== 'newListener') {
        console.log(room.room_id + ': ' + user.username + ' sent:', args_array);
        $emit.apply(socket, arguments);
      }
    };

    socket.emitToOthers = function() {
      var args_array = _.toArray(arguments);
      _.each(io.sockets.clients(room_id), function(_socket) {
        if (_socket.id !== socket.id) {
          _socket.emit.apply(_socket, args_array);
        }
      });
    };

    var user_id = socket.handshake.session.passport.user
      , user;
    if (! _.isUndefined(user_id)) {
      User.getByIdWithoutPassword(user_id, function(err, _user) {
        if (err) { console.error(err); }
        else if (! _user) {
          console.error( 'No user found with id', user_id, '!' );
          _user = {};
        }
        else {
          user = _user;
        }
        finishSocketSetup();
      });
    }
    else {
      user = {};
      finishSocketSetup();
    }

    function finishSocketSetup() {
      socket.user = user;
      var user_only_username = _.pick(user, 'username');
      // notify all users, including this one
      socket.emitToOthers('user_joins', user_only_username, false);
      socket.emit('user_joins', user_only_username, true);
      // TODO notify any interested server-side objects (the corresponding table)
      room.join(socket);
      //var room_id = room.room_id;
      //console.log(socket.id, 'Joined', room_id, _.keys(io.sockets.in(room_id).sockets));

      var user_room_name = Room.USER_ROOM_PREFIX + user.username
        , user_room = Room.getRoom(user_room_name);

      if (user_room === undefined) {
        user_room = Room.createRoom({
          room_id: user_room_name
        });
      }

      user_room.join(socket, true);
      //room_id = user_room.room_id;
      //console.log(socket.id, 'Joined', room_id, _.keys(io.sockets.in(room_id).sockets));

      socket.on('disconnect', function() {
        //console.log('disconnected:', socket.id);
        room.leave(socket);
        if (user_room instanceof Room) {
          user_room.leave(socket);
          var remaining_user_sockets = io.sockets.clients(user_room_name);
          if (_.isEmpty(remaining_user_sockets)) {
            console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~ ' + user.username + ' has left the building!!!!!');
          }
          else {
            console.log('One of ' + user.username + '\'s sockets left ' + room.room_id);
          }
        }
      });
    }
  });

  return Room;
})();