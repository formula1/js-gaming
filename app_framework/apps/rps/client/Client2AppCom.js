
var url = require("url");
var EventEmitter = require("events").EventEmitter;
var util = require("util");

function Client2ServerCom(uri){
  uri = url.parse(uri||document.URL);
  uri.protocol = "ws:";
  this.socket = new WebSocket(url.format(uri));
  this.socket.addEventListener("close",this.emit("close"));
  this.socket.on("message",function(){
    try{
      data = JSON.stringify(data);
    }catch(e){
      this.emit("error",e);
    }
    switch(data.type){
      case "error": return this.emit("error",data.reason,data.fatal);
      case "action": return this.emit(data.cmd,data.data);
    }
  });
}

util.inherits(Client2AppCom,EventEmitter);

module.exprots = Client2AppCom;
