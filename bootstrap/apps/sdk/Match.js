
var MersenneTwister = require('mersennetwister');
var Player = require("./Player");
var EventEmitter = require("events").EventEmitter;
var async = require("async");

function Match(players_info){
  console.log("constructing match");
  this.random = new MersenneTwister();
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
