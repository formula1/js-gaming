var MessageDuplex = require("../message/MessageDuplex");
var HandleDuplex = require("../handle/HandleDuplex");

function ProcessAbstract(context){
  this.context = context;
  MessageDuplex.call(this, function(message){
    this.context.send({type:"message",msg:message});
  }.bind(this));
  this.handle = new HandleDuplex(function(message,handle){
    this.context.send({type:"handle",msg:message},handle);
  }.bind(this));
  var that = this;
  if(context)
    setImmediate(this.open.bind(this,context));
  return this;
}

ProcessAbstract.prototype = Object.create(MessageDuplex.prototype);
ProcessAbstract.prototype.constructor = ProcessAbstract;

ProcessAbstract.prototype.open = function(context){
  if(typeof context === "undefined")
     throw new Error("to construct "+arguments.callee.name+" You need to provide a window");
  this.context = context;
  var that = this;
  this.context.on("message", function(message,handle){
    if(!message.type){
      console.log("no type");
      return;
    }
    switch(message.type){
      case "message":
        console.log("got a message");
        return that.handleMessage(message.msg);
      case "handle":
        console.log("got a socket");
        return that.handle.fromSender(message.msg, handle,function(err){
          if(err) console.log(err);
          else console.log("404: "+message.msg.path);
        });
    }
  });
  this.context.on("error", function(e){
    console.log(e.stack);
  });
  this.ready();
};

module.exports = ProcessAbstract;
