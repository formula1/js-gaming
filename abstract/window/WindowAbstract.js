var MessageDuplex = require(__root+"/abstract/message/MessageDuplex.js");

function WinAbs(context, origin){
  this.origin = (origin)?origin:"*";
  MessageDuplex.call(this, function(message){
    message.user = null;
    this.context.postMessage(JSON.stringify(message),this.origin);
  }.bind(this));
  var that = this;
  if(context)
    setTimeout(function(){
      that.open(context);
    },10);
  return this;
}

WinAbs.prototype = Object.create(MessageDuplex.prototype);
WinAbs.prototype.constructor = WinAbs;

WinAbs.prototype.open = function(context){
  if(typeof context === "undefined")
     throw new Error("to construct "+arguments.callee.name+" You need to provide a window");
  this.context = context;
  var that = this;
  window.addEventListener("message",this.handleMessage.bind(this));
  this.ready();
};

WinAbs.prototype.handleMessage = function(message){
  if(message.source != this.context) return;
  message = JSON.parse(message.data);
  setImmediate(MessageDuplex.prototype.handleMessage.bind(
      this,message,this.context
  ));
};

WinAbs.prototype.getParent = function(){
  if(this.context.parent && this.context.parent != this.context){
    return new WinAbs(this.context.parent, this.origin);
  }
};

WinAbs.getParent = function(){
  if(window.parent && window.parent != window){
  }
  throw new Error("there is no parent to this window");
};

WinAbs.getTop = function(){
  if(window.top != window.parent)
    window.RootManager = new WinAbs(window.top);
  throw new Error("this parent has no parent");
};

moduele.exports = WinAbs;
