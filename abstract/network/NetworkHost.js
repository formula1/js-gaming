var Server = require("../clientserver/client2server");
var NetworkInstance = require(__dirname+"/NetworkUser.js");
var callprom = require("../utility/cbpromise");

function ClientHost(uri,socket,config,sconfig){
  Server.call(this,uri,socket);
  this.connections = {};
  this.config = config||{'iceServers': [
    {url: "stun:"+uri.hostname+":3478"},
  ]};
  this._list = [];
  this.sconfig = sconfig||{reliable: false};
  var that = this;
  this.user = void(0);
  this
  .add("offer",this.emit.bind(this,"offer"))
  .add("accept",function(data){
    if(!that.connections[data.identity])
      return console.log("accepting a gift ungiven");
    that.connections[data.identity].ok(data);
    that.emit("handshake",that.connections[data.identity]);
  }).on("ice",function(data){
    that.connections[data.identity].remoteIce(data.data);
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
  var id = user.id;
	this.connections[id] = new NetworkInstance(this,user);
  this.connections[id].on("open",this.emit.bind(this,"connection"));
  this.connections[id].id = id;
	this.connections[id].offer(cr.cb);
  return cr.ret;
};

ClientHost.prototype.accept = function(message){
  var cr = callprom(this,cb);
	var id = message.user.id;
	this.connections[id] = new NetworkInstance(this,message.user);
  this.connections[id].on("open",this.emit.bind(this,"connection"));
	this.connections[identity].accept(message,cr.cb);
  return cr.ret;
};

module.exports = ClientHost;
