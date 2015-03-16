
var ProxyDuplex = require("../../../abstract/message/ProxyDuplex");

function MatchConnection(match_id, connection){
  this.me = void(0);
  Object.defineProperty(this,"isOnline",{
    get:function(){
      console.log(this);
      return this.fallbacks.length > 0;
    }
  });
  this.id = match_id;
  var that = this;
  this.add("ntp",function(){
    console.log("clientside npt");
    return Date.now();
  }).add("me",function(data){
    that.me = data;
    return true;
  });
  ProxyDuplex.call(this,connection);
}

MatchConnection.prototype = Object.create(ProxyDuplex.prototype);
MatchConnection.prototype.constructor = MatchConnection;

MatchConnection.prototype.exit = function(){
  this.trigger("exit");
  this.closeAll();
  this.emit("exit",this);
};


MatchConnection.prototype.open = function(client){
  console.log("attempting to open");
  ProxyDuplex.prototype.open.call(this,client);
  client.add("exit",this.exit.bind(this));
  console.log("open");
};

MatchConnection.prototype.ntp = function(next){
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

MatchConnection.prototype.me = function(next){
  this.get("me", function(err,me){
    this.me = me?me:this.me;
    next(err,me);
  }.bind(this));
};


module.exports = MatchConnection;
