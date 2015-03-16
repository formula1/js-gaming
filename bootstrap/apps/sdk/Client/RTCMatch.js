
var Player = require("./Player");
var EventEmitter = require("events").EventEmitter;
var async = require("async");

module.exports = function(match){
  var bestHost = {host:null, avg_ntp:Math.POSITIVE_INFINITY};
  var l = match.players.length;
  async.each(match.players,function(player){
    player.add("ice",function(message,next){
      console.log("ice");
      if(!match.players[message.target.id]){
        return next("cannot ice to a nonexistant user");
      }
      if(message.target.id == player.id){
        return next("cannot ice to self: "+message.identity+", "+user.id);
      }
      match.players[message.target.id].trigger("ice",message);
    });
    var others = players.slice(0);
    others.splice(testers.indexOf(possible_host),1);
    player.others = others;
    others = others.map(function(other){
      return other.user;
    });
    player.get("register-others",others,next);
  },function(err,res){
    //$-Foreach User as POSSIBLE_HOST
    async.eachSeries(match.players,function(possible_host,next){
      //$-Request RTC offers from POSSIBLE_HOST for each other Player
      possible_host.get("request-offers",function(err,offers){
        async.each(possible_host.others,function(tester,next){
          //$-Request an RTC accept from TESTER by sending TESTER a unique RTC offer
          tester.get("request-accept",offers[tester.id],function(err,accept){
            //$-Server sends accept to POSSIBLE_HOST
            possible_host.get("request-handshake",accept,next);
          });
        },function(err){
          if(err) return next(err);
          //$-After All connections are ready
          //$-Server Sends Test command to Every User
          match.syncGet("request-ntp",function(err,ntps){
            //$-Server calculates the net_ntp=ntp.map(^2).sum(ntp^2)/ntp.length
            //server makes sure that ntp's are close to eachother
            host_ntps = ntps[possible_host.id];
            delete ntps[possible_host.id];
            var net_ntp;
            for(var i in host_ntps){
              if(Math.abs(ntps[i][0].lag - host_ntps[i].lag) > 20){
                console.log("something is off");
              }
              //Calculate the ntp
              // avg_ntp = (person_a->possible_host + possible_host->person_a)/2
              // weighted_ntp = Math.pow(avg_ntp,2) this is important since big
              // brings everyone down
              // net_ntp += weighted/(players.length-1) I could also just find max
              net_ntp += Math.pow(
                  (ntps[i][0].lag + host_ntps[i].lag)/2,
                  2
                )/(match.player.length-1);
            }
            //$-Check if its the best host yet
            bestHost = bestHost.ntp < net_ntp?
              bestHost:
              {host:possible_host, ntp:net_ntp};
            // $-Server orders all users to disconnect
            match.syncGet("request-closeAll",next);
          });
        });
      });
    },function(err,results){
      //$-Request RTC offers from BEST_HOST.host = Number of players - 1
      bestHost.host.get("request-offers",function(err,offers){
        if(err) return next(err);
        async.each(bestHost.host.others,function(other,next){
          //$-Request an RTC accept from all other players
          other.get("request-accept",offers[other.id],function(err,accept){
            if(err) return next(err);
            //$-Server sends RTC accept to POSSIBLE_HOST
            possible_host.get("request-handshake",accept,next);
          });
        },function(err){
          if(err) return next(err);
          //$-Server Tells All players BEST_HOST is the host
          match.players.syncCast("host",bestHost.host.user);
        });
      });
    });
  });
};

function Match(players_info){
  var players = this.players = [];
  var _this = this;
  players_info.forEach(function(player){
    player = new Player(player);
    players.push(player);
    player.on("error",function(e){
      _this.emit("player-error", e, player);
    });
    player.on("exit",function(e){
      var l = _this.players.length;
      while(l--){
        if(_this.players[l] == player){
          _this.players.splice(l,1);
          break;
        }
      }
      _this.emit("player-exit",player);
    });
  });
  this.lag = 0;
  this.data = {};
  this._state = Match.UNSTARTED;
  console.log("finished constructing match");
}

Match.prototype = Object.create(EventEmitter.prototype);
Match.prototype.constructor = Match;

Match.prototype.join = function(client){
  console.log("attempting to join");
  var l = this.players.length;
  var player = false;
  while(l--){
    if(this.players[l].id == client.user.id){
      player = this.players[l];
      break;
    }
  }
  if(!player){
    console.log("this is not a player I want");
    return client.close();
  }
  player.open(client);
  _this = this;
  player.ntp(function(err){
    if(err){
      console.log(err);
      player.trigger("reopen");
      player.close(client);
      return;
    }
    console.log("after ntp");
    _this.lag = Math.max(player.lag,_this.lag);
    player.me(function(err){
      if(err){
        console.log(err);
        player.close(client);
      }
      _this.emit("player-join",player);
      _this.initialize();
    });
  });
};

Match.prototype.initialize = function(){
  if(_this._state !== Match.UNSTARTED){
    return;
  }
  console.log("initializing");
  this._state = Match.STARTING;
  var l = this.players.length;
  while(l--){
    if(!this.players[l].isOnline){
      console.log(this.players[l].isOnline);
      this._state = Match.UNSTARTED;
      console.log("a player is not online init right now");
      return;

    }
    if(!this.players[l].lag){
      console.log(this.players[l].lag);
      this._state = Match.UNSTARTED;
      console.log("a player's npt has not been completed");
      return;
    }
  }
  this._state = Match.STARTED;
  this.emit("start");
};


Match.prototype.syncCast = function(event,data){
  var l = this.players.length;
  while(l--){
    this.players[l].trigger(event,data);
  }
};

Match.prototype.syncGet = function(event,data,next){
  if(typeof data === "function"){
    next = data;
    data = void(0);
  }
  async.each(this.players[l],
    function(item,next){
      item.get(event,data,next);
    },next
  );
};

Match.prototype.lagCast = function(event,data,next){
  if(typeof data === "function"){
    next = data;
    data = void(0);
  }
  var l = this.players.length;
  while(l--){
    setTimeout(
      this.players[l].trigger.bind(this.players[l],event,data),
      this.lag - this.players[l].lag
    );
  }
  setTimeout(next,this.lag+1);
};

Match.prototype.lagGet = function(event,data,next){
  if(typeof data === "function"){
    next = data;
    data = void(0);
  }
  var lag = this.lag;
  async.each(this.players[l],
    function(item,next){
      setTimeout(item.get.bind(item,event,data,next), lag - item.lag);
    },next
  );
};


Match.prototype.end = function(){
  this._state = Match.ENDING;
  var l = this.players.length;
  while(l--){
    this.players[l].removeAllListeners();
    this.players[l].exit();
  }
  this.emit("end",this);
  this._state = Match.ENDED;
};

Match.UNSTARTED = -1;
Match.STARTING = 0;
Match.STARTED = 1;
Match.ENDING = 2;
Match.ENDED = 3;

module.exports = Match;
