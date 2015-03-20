var Match = require("./Match");
var async = requirE("async");
var browserify = require("browserify");

var game = browserify();

game.add(process.argv[2].toString());
game.bundle(function(err,value){
  if(err) throw err;
  game = value;
});

function RTCMatch(players){
  this.info = players;
  Match.call(this,players);
  this._playerInitializers.push(function(player,next){
    player.get("type","rtc",function(err,type){
      if(err) return next(err);
      if(type != "rtc") return next(new Error("improper type"));
      next();
    });
  });
  var that = this;
  this._playerInitializers.push(function(player,next){
    player.add("ice",function(message,next){
      console.log("ice");
      if(!that.players[message.target.id]){
        return next("cannot ice to a nonexistant user");
      }
      if(message.target.id == player.id){
        return next("cannot ice to self: "+message.identity+", "+user.id);
      }
      that.players[message.target.id].trigger("ice",message);
    });
    var others = that.players.slice(0);
    others.splice(others.indexOf(player),1);
    player.others = others;
    next();
  });
  this.on("start",this.bestHost.bind(this));
}

RTCMatch.prototype = Object.create(Match.prototype);
RTCMatch.prototype.constructor = RTCMatch;

RTCMatch.prototype.applyHost = function(host,next){
  host.get("request-offers",this.info,function(err,offers){
    async.each(host.others,function(other,next){
      //$-Request an RTC accept from TESTER by sending TESTER a unique RTC offer
      offers[other.id].sender = host.user;
      other.get("request-accept",offers[other.id],function(err,accept){
        //$-Server sends accept to POSSIBLE_HOST
        accept.sender = other.user;
        host.get("request-handshake",accept,next);
      });
    },function(err){
      if(err) return next(err);
      possible_host.get("request-ready",function(){
        next();
      });
    });
  });
};

RTCMatch.prototype.bestHost = function(){
  var bestHost = {host:null, netLag:Math.POSITIVE_INFINITY};
  var that = this;
  async.eachSeries(this.players,function(possible_host,next){
    //$-Request RTC offers from POSSIBLE_HOST for each other Player
    that.applyHost(possible_host,function(err){
      if(err) return next(err);
      var tester_ntps = {};
      var host_ntps = false;
      var net_ntp = 0;
      async.each(players,function(player,next){
        player.get("request-ntp",function(err,ntp){
          if(err) return next(err);
          if(player == possible_host){
            host_ntps = ntp;
            for(var i in host_ntps){
              if(!tester_ntps[i]) continue;
              net_ntp += calculateNTPWeight(tester_ntps[i],host_ntps[i],players);
            }
            return next();
          }
          if(!host_ntps){
            tester_ntps[player.id] = ntp;
          }else{
            net_ntp += calculateNTPWeight(ntp,host_ntps[player.id],players);
          }
          next();
        });
      },function(){
        bestHost = bestHost.netLag < net_ntp?
          bestHost:
          {host:possible_host, ntp:net_ntp};
        // $-Server orders all users to disconnect
        async.each(players,function(player,next){
          player.get("request-closeAll",next);
        },next);
      });
    });
  },function(err){
    that.syncCast("host",{host:bestHost.host.user,users:that.info});
    that.applyHost(bestHost.host,function(err){
      if(err) throw err;
    });
  });
};


function calculateNTPWeight(a,b,all,next){
  if(Math.abs(a.lag - b.lag) > 20){
    throw new Error(
      "The difference between "+
      a.id+" and "+b.id+
      " lags is too large"
    );
  }
  return Math.pow(
        (a.lag + b.lag)/2,
        2
        )/(all.length-1);
}



module.exports = RTCMatch;
