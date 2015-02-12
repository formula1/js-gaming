var doAsync;
if(typeof module != "undefined" && module.exports){
  var EventEmitter = require("events").EventEmitter;
  doAsync = process.nextTick.bind(process);
}else{
  doAsync = function(fn){
    setTimeout(fn,1);
  };
}

/**
An io listener that sends messages to the functions wanting to handle them.
@constructor
@interface
@augments EventEmitter
@param {function} rSendFn - Function that will be called when the router wants to send to the originator {@link MessageRouter#rSendFn}.
*/

function SocketRouter(sSendFn){
  EventEmitter.call(this);
  if(!this.getListeners){
    this.getListeners = this.listeners.bind(this);
  }
  if(!rSendFn) throw new Error("Need a manner to send back");
  this.on = this.addListener.bind(this);
  this.off = this.removeListener.bind(this);
  this.sSendFn = sSendFn;
}
MessageRouter.prototype = Object.create(EventEmitter.prototype);
MessageRouter.prototype.constructor = MessageRouter;

/**
The method that is called when the MessageRouter responds.
@abstract
@memberof MessageRouter
@param {object} message - The response message
@param {object} user - that transport method that was given to us by {@link MessageRouter#RouteMessage}.
@return {undefined}
*/
MessageRouter.prototype.sSendFn = function(message){
  throw new Error("this message is abstract and needs to be overwritten");
};

/**
The method that is called when the MessageRouter responds.
@memberof MessageRouter
@param {object|string} keymethod - An object containing a key to listen for and an associated method
@param {object} [method] - If there are two arguments then this adds a listener with the first argument as key and second as function
@return this
*/
MessageRouter.prototype.add = function(keymethod){
  if(!keymethod)
    throw new Error("need either a Object(key:function), a key and function or a key");
  var that = this;
  var ob = {};
  var ret;
  if(arguments.length == 2){
    ob[arguments[0]] = arguments[1];
  }else{
    ob = keymethod;
  }

  Object.keys(ob).forEach(function(key){
    that.addListener(key,function(message){
      that.processSocket(socket,websocket, ob[key]);
    });
    that.emit("add",key,ob[key]);
  });
  return this;
};


/**
wrapper message that allows the function to return data and/or send it in a callback
@memberof MessageRouter
@param {object} message - request message
@param {function} fn - the function that will be called
*/
MessageRouter.prototype.processMessage = function(message,fn){
  var that = this;
  var next = function(err,result){
    message.error = (err)?err.stack:null;
    message.data =(err)?null:result;
    that._returns.emit(message.id,message);
  };
  var result;
  try{
    result = fn(message.data,message,next);
  }catch(e){
    return next(e);
  }
  if(typeof result != "undefined") next(void(0),result);
};

if(typeof module != "undefined"){
  module.exports = MessageRouter;
}
