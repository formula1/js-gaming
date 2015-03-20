var Server = require("../clientserver/client2server");
var NetworkInstance = require(__dirname+"/NetworkUser.js");
var callprom = require("../utility/cbpromise");

function ClientHost(uri,socket,config,sconfig){
  Server.call(this,uri,socket);
  this.connections = {};
  this.config = config||{'iceServers': [
    {url:'stun:stun.l.google.com:19302'},
    {url: "stun:"+uri.hostname+":3478"},
  ]};
  this._list = [];
  this.sconfig = sconfig||{reliable: false};
  var that = this;
  this.user = void(0);
  this
  .add("offer",this.emit.bind(this,"offer"))
  .add("accept",function(data){
    if(!that.connections[data.target._id])
      return console.log("accepting a gift ungiven");
    that.connections[data.target._id].ok(data);
    that.emit("handshake",that.connections[data.target._id]);
  }).add("ice",function(data){
    that.connections[data.sender._id].remoteIce(data.ice);
  }).get("me",function(me){
    that.user = me;
  });
  return this;
}
ClientHost.prototype = Object.create(Server.prototype);
ClientHost.prototype.constructor = ClientHost;

ClientHost.prototype.closeAll = function(){
  for(var i in this.connections)
    this.connections[i].close();
};

ClientHost.prototype.offer = function(user,cb){
  var cr = callprom(this,cb);
  var id = user._id;
	this.connections[id] = new NetworkInstance(this,user);
  this.connections[id].on("open",this.emit.bind(this,"connection"));
  this.connections[id].id = id;
	this.connections[id].offer(cr.cb);
  return cr.ret;
};

ClientHost.prototype.accept = function(message,cb){
  var cr = callprom(this,cb);
	var id = message.sender._id;
	this.connections[id] = new NetworkInstance(this,message.sender);
  this.connections[id].id = id;
  this.connections[id].on("open",this.emit.bind(this,"connection"));
	this.connections[id].accept(message,cr.cb);
  return cr.ret;
};

ClientHost.prototype.ok = function(message){
  return this.connections[message.sender._id].ok(message);
};

module.exports = ClientHost;
