module.exports = (function () {
  var app = require('./app')
    , session_settings = app.session_settings
    , io = require('socket.io').listen(app.server)
    // parse cookies; code from https://github.com/senchalabs/connect/issues/588#issuecomment-8206494
    , sioCookieParser = require('express').cookieParser(session_settings.secret)

    , _ = require('underscore');

  // Configure Socket.IO
  io.enable('browser client minification');  // send minified client
  io.enable('browser client etag');          // apply etag caching logic based on version number
  io.enable('browser client gzip');          // gzip the file
  io.set('log level', 1);                    // reduce logging
  io.set('transports', [                     // enable all transports (optional if you want flashsocket)
      'websocket'
    , 'xhr-polling'
    //, 'flashsocket'
    , 'htmlfile'
  ]);
  io.set('close timeout', 30);
  
  //authorization handler - 
  io.set('authorization', function (data, cb) {
    var error = null
      , authorized = false;
    // check if there's a cookie header
    if (data.headers.cookie) {
      // if there is, parse the cookie using our previously-defined parser middleware
      sioCookieParser(data, {}, function(err) {
        // get the session ID off where the cookie parser added it ('req')
        data.sessionID = data.signedCookies[session_settings.sid_name];
        //if (session_settings.store.connected !== true) {
        //  error = 'Session store isn\'t ready yet.';
        //  cb(error, authorized);
        //}
        //else {
          // attempt to look up the session from our session store
        session_settings.store.get(data.sessionID, onSessionLookup);
        //}
      });
    } else {
      // if there isn't, turn down the connection with a message
      error = 'No cookie transmitted.';
      cb(error, authorized);
    }
    function onSessionLookup(err, session) {
      // session has been looked up (if it exists)
      if (err) {
          error = 'Error while looking up session: ' + err
      } else if (! session) {
          error = 'No session found with session ID: ' + data.sessionID;
      } else {
        // save the session data and accept the connection
        data.session = session;
        // parse the referer URL to determine which site this socket originates from
        var host = data.headers.host
          , referer = data.headers.referer
          , url = referer.slice(referer.indexOf(host) + host.length + 1); // get everything after
                                                                    //[protocol]://[host]:[port]/
        if (url.indexOf('?') !== -1) url = url.slice(0, url.indexOf('?'));
        data.room_id = url;
        // accept (or reject) the incoming connection
        authorized = true;
      }
      cb(error, authorized);
    }
  });

  io.bindMessageHandlers = function(socket, messages) {
    var self = this;
    if (! _.isObject(self)) { console.error('no context object given!'); return; }
    _.each(messages, function(how_to_handle, message_name) {
      if (_.isString(how_to_handle)) {
        how_to_handle = { handler: how_to_handle };
      }
      var handler_name = how_to_handle.handler
        , handler = self[handler_name];
      //console.log('binding', message_name, 'to', handler_name);
      if (! _.isFunction(handler)) {
        console.error('context object has no function', handler_name);
        return;
      }
      socket.on(message_name, function() {
        //console.log('calling instance\'s', handler_name, 'with', arguments);
        if (how_to_handle.pass_message_name !== true && how_to_handle.pass_socket !== true) {
          //console.log('calling instance\'s', handler_name, 'with', arguments);
          handler.apply(self, arguments);
        }
        else {
          //add socket or message_name to front of arguments list
          var arg_to_add = how_to_handle.pass_socket ? socket : message_name
            , args_array = _.toArray(arguments);
          args_array.unshift(arg_to_add);
          //console.log('calling instance\'s', handler_name, 'with', args_array);
          handler.apply(self, args_array);
        }
      });
    });
  }
  return io;
})();