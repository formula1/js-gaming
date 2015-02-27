/* This is a template for defining a class
   as a Mongoose Schema and Model. */
module.exports = (function () {
  var mongoose = require('mongoose') // MongoDB abstraction layer
    , Schema = mongoose.Schema // Mongoose Schema constructor
    , ObjectId = Schema.ObjectId // Mongoose ObjectId type

    , _ = require('underscore') // list utility library
    
    , io = require('../sockets') // configured and listening Socket.IO
    
    , db = require('./db') // make sure mongoose is connected

    /* the schema - defines the "shape" of the documents:
     *   gets compiled into one or more models */
    , ClassSchema = new Schema({
    // instance properties
      // this instance's name and location
      doc_id : String 
    });

  var static_properties = {
  // static properties (attached below) - Model.property_name
    // message-to-handler map, { message_name: instance_method_name }
    messages: {
      chatMessage: { handler: 'broadcast', pass_message_name: true }
    }
  };

  // static methods - Model.method()
  ClassSchema.statics.setup = function() {
    // set up static variables
    // and define any instances that should exist from the start
  };

  ClassSchema.statics.createClass = function(spec) {
    /* our "constructor" function. Usage: Class.createClass({prop: 'val'})
       (see Schema definition for list of properties)*/
    console.log('Class.createClass called!');
    var instance = new Class(spec);
    return instance;
  };

  // instance methods - document.method()
  ClassSchema.methods.join = function(socket) {
    var self = this;
    console.log('Socket joining ' + self.room_id + ':', socket.user_id);
    socket.join(self.room_id);

    io.bindMessageHandlers.call(self, socket, static_properties.messages);
  };

  ClassSchema.methods.broadcast = function(message_name) {
    console.log(this.room_id, 'broadcasting message', arguments);
    var sockets = io.sockets.in(this.room_id);
    sockets.emit.apply(sockets, arguments);
  };

  ClassSchema.methods.serialize = function(also_include) {
    var self = this
      , default_include = ['room_id']
      , include = _.extend(default_include, also_include)
      , doc_obj = {};
    _.each(include, function(key) {
      doc_obj[key] = self[key];
    });
    return doc_obj;
  };

  /* the model - a fancy constructor compiled from the schema:
   *   a function that creates a new document
   *   has static methods and properties attached to it
   *   gets exported by this module */
  var Class = mongoose.model('Class', ClassSchema);

  //static properties (defined above)
  _.extend(Class, static_properties);

  Class.setup();

  return Class;
})();