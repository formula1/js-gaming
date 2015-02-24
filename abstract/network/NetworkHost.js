var Server = require(__root+"/window/public/Window2Server_com");
var NetworkInstance = require(__dirname+"/NetworkUser.js");
var EventEmitter = require("events").EventEmitter;
var _ = require("lodash");
var url = require("url");

function ClientHost(uri,config,sconfig){
  EventEmitter.call(this);
  uri = url.parse(uri);
  uri.pathname += "/rtc";
  this.uri = url.format(uri);
  this.connections = {};
  this.config = config||{'iceServers': [
    {url: "stun:"+uri.hostname+":3478"},
  ]};
  this._list = [];
  this.sconfig = sconfig||{reliable: false};
  return this;
}
util.inherit(ClientHost,EventEmitter);

//The user is taken care of serverside through cookies
//What I can do is do a "user override", but not at the moment
ClientHost.prototype.connect = function(){
  if(!info) throw new Error("Network Server may not be able to handle no information");
  this.info = info;
  this.RTCHandle = new Server(this.uri);
  this.RTCHandle
  .on("error", this.emit.bind(this,"error"))
  .on("offer",this.emit.bind(this,"offer"))
  .on("list",function(data){
    that.updateList(data.list);
  }).on("accept",function(){
    console.log(data);
    if(!that.connections[data.identity])
    return console.log("accepting a gift ungiven");
    that.connections[data.identity].ok(data);
    that.emit("handshake",that.connections[data.identity]);
  }).on("ice",function(data){
    that.connections[data.identity].remoteIce(data.data);
  });
  return this;
};

ClientHost.prototype.updateList = function(list){
  var l = this._list.length;
  var not = Math.pow(2,list.length)-1;
  var i;
  while(l--){
    i = _findIndex(list,{_id:this._list[l]._id});
    if(i === -1){
      this._list.splice(l,1);
    }else{
      this._list[l] = list[i];
      not -= Math.pow(2,i);
    }
  }
  if(not === 0) return;
  not = not.toString(2).split();
  l = not.length;
  while(l--){
    if(not[l] == "0") continue;
    this._list.push(list[l]);
  }
};

ClientHost.prototype.closeAll = function(){
  for(var i in this.connections)
    this.connections[i].close();
};

ClientHost.prototype.getList = function(){
  var _this = this;
  return new Promise(function(resolve, reject){
    _this.RTCHandler.get("list",function(err,list){
      if(err) return reject(err);
      _this.updateList(list);
      resolve(_this._list);
    });
  });
};

ClientHost.prototype.offer = function(identity){
	return new Promise(function(resolve, reject){
		this.connections[identity] = new NetworkInstance(this);
		this.connections[identity].offer(function(err,cur){
		  if(err) return reject(err);
		  resolve(cur);
		});
	}.bind(this));
};

ClientHost.prototype.accept = function(message){
	return new Promise(function(resolve, reject){
		var identity = message.identity;
		this.connections[identity] = new NetworkInstance(this);
		this.connections[identity].accept(message,function(err,cur){
		  if(err) return reject(err);
		  resolve(cur);
		});
  }.bind(this));
};

module.exports = ClientHost;
