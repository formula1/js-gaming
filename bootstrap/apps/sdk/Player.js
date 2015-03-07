
var ProxyDuplex = require("../../../abstract/message/ProxyDuplex");

function Player(userjson,client){
  Object.defineProperty(this,"isOnline",{
    get:function(){
      return this.fallbacks.length > 0;
    }
  });
  this._id = userjson._id;
  this.user = userjson;
  this.add("npt",function(){
    return Date.now();
  });
  ProxyDuplex.call(this,client);
}

Player.prototype = Object.create(ProxyDuplex.prototype);
Player.prototype.constructor = Player;

Player.prototype.exit = function(){
  this.closeAll();
  this.emit("exit",this);
};


Player.prototype.open = function(client){
  console.log("attempting to open");
  ProxyDuplex.prototype.open.call(this,client);
  client.add("exit",this.exit.bind(this));
  console.log("open");
};

Player.prototype.npt = function(next){
  console.log("attempting to npt");
  var old = Date.now();
  this.get("ntp", function(e,time){
    if(e){
      console.log(e);
      return this.emit("error",e);
    }
    console.log("In the server");
    console.log("inside npt");
    var now = Date.now();
    var lag = (now - old)/2;
    var offset = (time-old + now-time)/2;
    if(this.lag && this.lag-lag > 50 ){
      return next(new Error("the lag difference is too large"));
    }
    this.lag = (this.lag+lag)/2;
    if(this.offset && this.offset-offset > 50 ){
      return next(new Error("the offset difference is too large"));
    }
    this.offset = (this.offset+offset)/2;
    next(void(0));
  }.bind(this));
};

module.exports = Player;
