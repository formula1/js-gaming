var MessageRouter = require(__dirname+"/MessageRouter.js");
var MessageWriter = require(__dirname+"/MessageWriter.js");
var util = require("util");

function MessageDuplex(wSendFn, rSendFn){
  if(!rSendFn) rSendFn = wSendFn;
  if(typeof wSendFn == "undefined") throw new Error("Need at least 1 function");
  var _writeFn = wSendFn;
  this.originator = Date.now()+"|"+Math.random();
  var that = this;
  wSendFn = function(message){
    if(message.originator){
      if(!Array.isArray(message.originator)){
        throw new Error("something went wrong in the originator chain");
      }
      message.originator.push(that.originator);
    }else{
      message.originator = [that.originator];
    }
    _writeFn(message);
  };
  MessageRouter.call(this, rSendFn);
  MessageWriter.call(this, wSendFn);
}
util.inherits(MessageDuplex, MessageWriter);
util.inherits(MessageDuplex, MessageRouter);

MessageDuplex.prototype.handleMessage = function(message,user){
  console.log(message.originator);
  if(message.originator.indexOf(this.originator) != -1){
    console.log("return");
    this.returnMessage(message);
  }else{
    console.log("route");
    this.routeMessage(message,user);
  }
};

module.exports = MessageDuplex;
