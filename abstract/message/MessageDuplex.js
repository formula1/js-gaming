var MessageRouter = require("./MessageRouter.js");
var MessageWriter = require("./MessageWriter.js");

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
MessageDuplex.prototype = Object.create(MessageWriter.prototype);
MessageDuplex.prototype.rSendFn = MessageRouter.prototype.rSendFn;
MessageDuplex.prototype.add = MessageRouter.prototype.add;
MessageDuplex.prototype.routeMessage = MessageRouter.prototype.routeMessage;
MessageDuplex.prototype.processMessage = MessageRouter.prototype.processMessage;
MessageDuplex.prototype.constructor = MessageDuplex;

MessageDuplex.prototype.handleMessage = function(message,user){
  if(message.originator.indexOf(this.originator) != -1){
    this.returnMessage(message);
  }else{
    this.routeMessage(message,user);
  }
};

module.exports = MessageDuplex;
