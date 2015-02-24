var MessageDuplex = require(__root+"/core/abstract/MessageDuplex.js");

function ProcessAbstract(context){
  this.context = context;
  MessageDuplex.call(this, function(message){
    this.context.send({type:"message",msg:message});
  }.bind(this));
  var that = this;
  if(context)
    setTimeout(function(){
      that.open(context);
    },10);
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
    if(message.type && message.type === "forkdup"){
      that.handleMessage(message.msg);
    }
  });
  this.ready();
};

ProcessAbstract.prototype.handleMessage = function(message){
  setImmediate(MessageDuplex.prototype.handleMessage.bind(
      this,message,this.context
  ));
};

ProcessAbstract.prototype.getParent = function(){
  if(this.context.parent && this.context.parent != this.context){
    return new WinAbs(this.context.parent, this.origin);
  }
};
