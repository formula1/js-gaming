var callprom = require("../utility/cbpromise");
var MessageDuplex = require("./MessageDuplex");
var StreamPromise = require(__dirname+"/StreamPromise.js");
var EventEmitter = require("events").EventEmitter;
var util = require("util");

/**
	An io listener that sends messages to the functions wanting to handle them.
	@interface
	@augments EventEmitter
	@param {function} wSendFn - Function that will be called when you wish to write something to a target.
*/
function MessageWriter(wSendFn){
  EventEmitter.call(this);
  this.on = this.addListener.bind(this);
  this.off = this.removeListener.bind(this);
	if(typeof this.getListeners == "undefined"){
		this.getListeners = this.listeners.bind(this);
	}
	if(wSendFn) this.wSendFn = wSendFn;
  this.queue = [];
	this._ready = false;
  // method calls that are sent and waiting an answer
}

util.inherits(MessageWriter,EventEmitter);


MessageWriter.prototype.wSendFn = function(message,user){
	throw new Error("this message is abstract and needs to be overwritten");
};


MessageWriter.prototype.ready = function(){
	this._ready = true;
  while(this.queue.length){
    this.wSendFn(this.queue.shift());
  }
	return this;
};


MessageWriter.prototype.stop = function(){
	this._ready = false;
};


MessageWriter.prototype.returnMessage = function (message) {
  if (this.getListeners(message.id).length === 0)
    throw new Error("non Existant Message");
  this.emit(message.id, message.error,message.data);
};


MessageWriter.prototype.trigger = function(name,data){
  this.messageFactory("trigger",name).send(data);
};

MessageWriter.prototype.get = function (name, data, cb) {
	var cr = callprom(cb,this);
  // save callback so we can call it when receiving the reply
	this.messageFactory("get", name, cr.cb).send(data);
	return cr.ret;
};

MessageWriter.prototype.listen = function(name, data, callback){
  var ret;
  var args = [];
  if(arguments.length > 2){
    args = Array.prototype.slice.call(arguments, 0);
    callback = args.pop();
    name = args.shift();
  }else if(arguments.length == 1){
    ret = new StreamPromise();
    callback = ret._write.bind(ret);
  }
  var p = this.messageFactory("pipe", name, callback);
  while(args.length > 0)
    p.send(args.shift());
  if(ret){
    ret.inherit(p.send.bind(p));
    return ret;
  }
  return p;
};

MessageWriter.prototype.duplex = function(name){
	return new MessageDuplex(function(){

	},function(){

	});
};

MessageWriter.prototype._send = function(template,data){
	var clone = JSON.parse(JSON.stringify(content));
	clone.data = data;
	if(this._ready){
		this.wSendFn(clone);
	}else{
		//if there is an error queue it for later when socket connects
		this.queue.push(clone);
	}
};

MessageWriter.prototype.abort = function(ob){
  if(!ob)
    throw Error("cannot unpipe "+ob);
  var id = (ob.id)?ob.id:ob;
  if(this.listeners(id).length === 0)
    throw new Error("Cannot abort what doesn't exist");
	this.removeAllListeners(id);
  return this;
};

MessageWriter.prototype.templateFactory = function(type,name,callback){
  //id to find callback when returned data is received
  var id = Date.now() + "-" + Math.random();
  var template = {
    id: id,
    name: name,
    type: type,
  };
  if(type == "trigger")
    return template;
  if(type == "get")
		this.once(id,callback);
	if(type == "listen")
		this.on(id,callback);
  return template;
};

module.exports = MessageWriter;
