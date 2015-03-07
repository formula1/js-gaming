var MessageDuplex = require("./MessageDuplex");

function ProxyDuplex(Duplex){
  this.fallbacks = [];
  var _this = this;
  MessageDuplex.call(this, function(message){
    try{
      _this.fallbacks[0].wSendFn(message);
    }catch(e){
      console.log(e);
    }
  }.bind(this),function(message){
    _this.fallbacks[0].rSendFn(message);
  }.bind(this));
  if(Duplex) this.open(Duplex);
}

ProxyDuplex.prototype = Object.create(MessageDuplex.prototype);
ProxyDuplex.prototype.constructor = ProxyDuplex;

ProxyDuplex.prototype.open = function(Duplex){
  this.fallbacks.push(Duplex);
  Duplex.on("close",this.close.bind(this,Duplex));
  Duplex._oldhandleMessage = Duplex.handleMessage;
  Duplex.handleMessage = this.handleMessage.bind(this);
  if(!this._ready) this.ready();
};

ProxyDuplex.prototype.close = function(Duplex){
  var l = this.fallbacks.length;
  while(l--){
    if(this.fallbacks[l] == Duplex){
      this.fallbacks.splice(l,1);
      Duplex.handleMessage = Duplex._oldhandleMessage;
      break;
    }
  }
  if(this.fallbacks.length === 0){
    this.stop();
  }
};

ProxyDuplex.prototype.closeAll = function(){
  var l = this.fallbacks.length;
  while(l--){
    this.fallbacks.pop().close();
  }
  this.stop();
};

module.exports = ProxyDuplex;
