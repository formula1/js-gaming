var Match = require("./Match");
var async = require("async");


function RTCMatch(players,gameInfo){
  this._gameInfo = gameInfo;
  console.log(gameInfo);
  console.log("inside RTCMatch");
  this.playerInfo = players;
  Match.call(this,players);
  console.log("match has been called");
  this._playerInitializers.unshift(function(player,next){
    player.get("type","rtc",function(err,type){
      if(err) return next(err);
      if(type != "rtc") return next(new Error("improper type"));
      next();
    });
  });
  console.log("added initializer");
  var that = this;
  this._playerInitializers.push(function(player,next){
    player.add("ice",function(message,next){
      var target = findPlayer(that.players,message.target);
      if(!target){
        console.log("cannot ice to a nonexistant user");
        return next("cannot ice to a nonexistant user");
      }
      if(target.user._id == player.user._id){
        console.log("cannot ice to self: "+target.user._id+", "+player.user._id);
        return next("cannot ice to self: "+target.user._id+", "+player.user._id);
      }
      message.sender = player.user;
      target.trigger("ice",message);
    });
    var others = that.players.slice(0);
    others.splice(others.indexOf(player),1);
    player.others = others;
    next();
  });
  console.log("added initializer");
  this.on("start",this.bestHost.bind(this));
  console.log("listening to start");
}

RTCMatch.prototype = Object.create(Match.prototype);
RTCMatch.prototype.constructor = RTCMatch;

RTCMatch.prototype.applyHost = function(host,next){
  host.get("request-offers",this.playerInfo,function(err,offers){
    if(err) return next(err);
    async.each(offers,function(offer,next){
      //$-Request an RTC accept from TESTER by sending TESTER a unique RTC offer
      offer.sender = host.user;
      var other = findPlayer(host.others,offer.target);
      if(!other){
        return next(new Error("Target does not exist"));
      }
      other.get("request-accept",offer,function(err,accept){
        if(err) return next(err);
        //$-Server sends accept to POSSIBLE_HOST
        accept.sender = other.user;
        host.get("request-handshake",accept,next);
      });
    },function(err){
      if(err) return next(err);
      console.log("requesting ok");
      host.get("request-ready",next);
    });
  });
};

RTCMatch.prototype.bestHost = function(){
  console.log("initiating best host");
  var bestHost = {host:null, netLag:Math.POSITIVE_INFINITY};
  var that = this;
  var players = this.players;
  async.eachSeries(players,function(possible_host,next){
    console.log("one player");
    //$-Request RTC offers from POSSIBLE_HOST for each other Player
    that.applyHost(possible_host,function(err){
      console.log("host applied");
      if(err) return next(err);
      var tester_ntps = {};
      var host_ntps = false;
      var net_ntp = 0;
      async.each(players,function(player,next){
        player.get("request-ntp",function(err,ntp){
          if(err) return next(err);
          console.log("ntp returned");
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
        console.log("checking best host");
        bestHost = bestHost.netLag < net_ntp?
          bestHost:{host:possible_host, ntp:net_ntp};
        // $-Server orders all users to disconnect
        async.each(players,function(player,next){
          player.get("request-closeAll",next);
        },next);
      });
    });
  },function(err){
    if(err){
      console.log(err);
      throw err;
    }
    console.log("finished finding best host: ",that._gameInfo);
    that.syncGet("host",{
      host:bestHost.host.user,
      users:that.playerInfo,
      game:that._gameInfo
    },function(err){
      that.applyHost(bestHost.host,function(err){
        console.log(err);
        if(err) throw err;
        console.log("best host given");
      });
    });
  });
};

function findPlayer(players,target){
  for(var i=0;i<players.length;i++){
    if(players[i].user._id == target._id){
      return players[i];
    }
  }
}

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
