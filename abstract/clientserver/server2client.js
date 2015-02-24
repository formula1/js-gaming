var MessageDuplex = require("../message/MessageDuplex.js");
var util = require("util");
var websocket = require('websocket-driver');

function Client(info, socket){
  var _this = this;
  this.info = info;
  this.info.handShake = !!info.handShake;
  if(!this.info.handShake) info.readyState = -1;
  console.log("client");
  this.socket = socket;
  this.driver = websocket.http(info.request, info.options);
  MessageDuplex.call(this,function(message){
    _this.driver.send(JSON.stringify(message));
  });
  this.driver.on('open', function(event){
    console.log("opened");
    _this.info.handShake = true;
    _this.start();
  });
  this.driver.on('message', function(event) {
    console.log(event);
    try{
      _this.handleMessage(JSON.stringify(event));
    }catch(e){
      _this.emit("error",e);
    }
  });
  this.driver.on('error', this.emit.bind(this,"error"));
  this.driver.on("close", this.stop.bind(this));
  socket.pipe(this.driver.io).pipe(socket);
  console.log(info.readyState);
  if(info.readyState === -1){
    if(info.body) this.driver.io.write(info.body);
    this.driver.start();
  }else{
    this.driver.readyState = info.readyState;
    _this.start();
  }
}
Client.prototype = Object.create(MessageDuplex.prototype);
Client.prototype.constructor = Client;

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

module.exports = Client;
