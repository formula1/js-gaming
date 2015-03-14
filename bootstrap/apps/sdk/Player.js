
var ProxyDuplex = require("../../../abstract/message/ProxyDuplex");

function Player(userjson,client){
  Object.defineProperty(this,"isOnline",{
    get:function(){
      console.log(this);
      return this.fallbacks.length > 0;
    }
  });
  this.id = userjson.id;
  this.user = userjson;
  this.add("ntp",function(){
    return Date.now();
  });
  ProxyDuplex.call(this,client);
}

Player.prototype = Object.create(ProxyDuplex.prototype);
Player.prototype.constructor = Player;

Player.prototype.exit = function(){
  this.trigger("exit");
  this.closeAll();
  this.emit("exit",this);
};


Player.prototype.open = function(client){
  console.log("attempting to open");
  ProxyDuplex.prototype.open.call(this,client);
  client.add("exit",this.exit.bind(this));
  console.log("open");
};

Player.prototype.ntp = function(next){
  console.log("attempting to ntp");
  var old = Date.now();
  this.get("ntp", function(e,time){
    if(e){
      return next(e);
    }
    console.log("In the server");
    console.log("inside npt");
    var now = Date.now();
    var lag = (now - old)/2;
    var offset = (time-old + now-time)/2;
    if(this.lag && this.lag-lag > 50 ){
      return next(new Error("the lag difference is too large"));
    }
    this.lag = this.lag?(this.lag+lag)/2:lag;
    if(this.offset && this.offset-offset > 50 ){
      return next(new Error("the offset difference is too large"));
    }
    this.offset = this.offset?(this.offset+offset)/2:offset;
    next();
  }.bind(this));
};

Player.prototype.me = function(next){
  this.get("me", this.user, function(e,boo){
    if(e){
      return next(e);
    }
    if(boo !== true) return next("Improper Value");
    next();
  }.bind(this));
};


module.exports = Player;
