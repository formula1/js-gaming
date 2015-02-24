var MessageDuplex = require("../message/MessageDuplex.js");
var url = require("url");
var util = require("util");


function Server(uri,socket){
  var that = this;
  var docuri = url.parse(window.location.href);
  if(typeof uri === "object"){
    uri = uri.format(uri); //for error checking
  }
  if(typeof uri === "string"){
    this.url = url.parse(uri);
    if(!this.url.host) this.url.host = docuri.host;
    if(!this.url.port) this.url.port = 3001;
    if(!this.url.pass) this.url.pass = docuri.pass;
    this.url.protocol = "ws:";
  }else{
    throw new Error("Url can only be a string or object");
  }
  if(!socket){
    try {
      this.socket = new WebSocket(url.format(this.url));
    } catch (exception) {
      console.log('Error' + exception);
      return;
    }
  }else{
    this.socket = socket;
  }
  this.socket.onopen = this.ready.bind(this);
  this.socket.onmessage = function(message){
    try{
      that.handleMessage(JSON.parse(message.data));
    }catch(e){
      that.emit("error",e);
    }
  };
  this.socket.onclose = this.stop.bind(this);
  MessageDuplex.call(this, function(message){
    that.socket.send(JSON.stringify(message));
  });
  this.ready();
}

util.inherits(Server,MessageDuplex);

Server.prototype.export = function(){
  this.stop();
  socket.onopen = void(0);
  socket.onmessage = void(0);
  socket.onclose = void(0);
  return [this.url, this.socket];
};

Server.import = function(url,socket){
  return new Server(url,socket);
};


module.exports = Server;
