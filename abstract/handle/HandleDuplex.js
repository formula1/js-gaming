var HandleRouter = require("./HandleRouter");
var HandleSender = require("./HandleSender");

function HandleDuplex(sendFn){
  HandleSender.call(this,sendFn);
  HandleRouter.call(this);
  if(!this.sendfn) throw new Error("no send fn");
}

HandleDuplex.prototype = Object.create(HandleRouter.prototype);
HandleDuplex.prototype.httpSend = HandleSender.prototype.httpSend;
HandleDuplex.prototype.send = HandleSender.prototype.send;
HandleDuplex.prototype.constructor = HandleDuplex;

module.exports = HandleDuplex;
