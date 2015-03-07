var MessageDuplex = require("../message/MessageDuplex.js");
var websocket = require('websocket-driver');

function Client(info, socket){
  var _this = this;
  if(!info.request){
    this.info = info = Client.parseFromRequest(info);
  }else{
    this.info = info = Client.parseFromImport(info);
  }
  this.user = info.user;
  this.socket = socket;
  socket.on("close",this.close.bind(this));
  this.driver = websocket.http(info.request, info.options);
  MessageDuplex.call(this,function(message){
    _this.driver.text(JSON.stringify(message));
  });
  this.driver.on('open', function(event){
    _this.info.handShake = true;
    _this.ready();
  });
  this.driver.on('message', function(event) {
    try{
      _this.handleMessage(JSON.parse(event.data));
    }catch(e){
      _this.emit("error",e);
    }
  });
  this.driver.on('error', this.emit.bind(this,"error"));
  this.driver.on("close", function(){
    _this.stop();
    _this.emit("close");
  });
  socket.pipe(this.driver.io).pipe(socket);
  if(info.readyState === -1){
    if(info.body){
      this.driver.io.write(info.body);
      delete this.info.body;
    }
    this.driver.start();
  }else{
    this.driver.readyState = info.readyState;
    _this.ready();
  }
}
Client.prototype = Object.create(MessageDuplex.prototype);
Client.prototype.constructor = Client;

Client.prototype.close = function(){
  this.removeAllListeners();
  this._returns.removeAllListeners();
  this.driver.close();
};

Client.prototype.export = function(){
  this.stop();
  this.socket.pause();
  this.socket.unpipe(this.driver.io);
  this.driver.io.unpipe(this.socket);
  this.info.readyState = this.driver.readyState;
  return [this.info, this.socket];
};

Client.import = function(info,socket){
  return new Client(info,socket);
};

Client.parseFromRequest = function(req){
  var info = {};
  info.body = req.body;
  if(req.user){
    info.user = req.user;
    delete req.user;
  }else{
    info.user = "anonymous";
  }
  info.handshake = false;
  info.readyState = -1;
  info.request = req;
  return info;
};

Client.parseFromImport = function(info){
  info.handShake = !!info.handShake;
  if(!this.info.handShake) info.readyState = -1;
  return info;
};

module.exports = Client;
