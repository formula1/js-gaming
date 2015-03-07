
var util = require("util");
var _ = require("lodash");
var waitingPlayers = [];
var READY = "ready";
var MOVE = "move";
var COUNTDOWN = "countdown";

function RPSMatch(players){
  console.log("constructing rps");
  Match.call(this,players);
  this.timeout = void(0);
  this.playerInfo = {};
  var l = this.players.length;
  while(l--){
    this.playerInfo[players[l]._id] = {};
    this.players[l].on("exit",this.playerExit.bind(this));
    this.players[l].add(READY,this.playerReady.bind(this,players[l]));
    this.players[l].add(MOVE,this.move.bind(this,players[l]));
  }
  this.on("start",this.reset.bind(this));
  console.log("finished constructing rps");
}

util.inherits(RPSMatch,Match);

RPSMatch.prototype.reset = function(){
  this.state = READY;
  this.playerInfo = {};
  var l = this.players.length;
  while(l--){
    this.playerInfo[this.players[l]._id] = {move:false,ready:false};
  }
  console.log("reset match");
  var _this = this;
  this.lagCast(READY,function(){
    _this.timeout = setTimeout(_this.triggerTimeout.bind(_this,READY),30000);
  });
};

RPSMatch.prototype.triggerTimeout = function(toVerify){
  if(this.state != toVerify){
    console.log("this should be cleared");
    return;
  }
  this.timeout = void(0);
  var l = this.players.length;
  while(l--){
    if(this.playerInfo[this.players[l]._id][toVerify] === false){
      this.players[l].removeAllListeners();
      this.players[l].exit();
      this.players.splice(l,1);
    }
  }
  console.log("timeout triggered");
  return this.tooFewPlayers();
};

RPSMatch.prototype.playerExit = function(player){
  var i = _.findIndex(this.players,{_id:player._id});
  this.players.splice(i,1);
  return this.toofewPlayers();
};

RPSMatch.prototype.tooFewPlayers = function(){
  if(this.players.length > 1) return false;
  clearTimeout(this.timeout);
  this.end();
  console.log("too few players");
  return true;
};

RPSMatch.prototype.playerReady = function(player){
  if(this.state != READY){
    console.log("this.state != Ready");
    return;
  }
  if(this.playerInfo[player._id].ready){
    console.log("player "+player._id+" is already ready");
    return;
  }
  this.playerInfo[player._id].ready = true;
  var l = this.players.length;
  while(l--){
    if(this.playerInfo[this.players[l]._id].ready === false){
      console.log(this.players[l]._id+" is not ready");
      return;
    }
  }
  console.log("all players ready");
  clearTimeout(this.timeout);
  this.state = COUNTDOWN;
  this.start();
};

RPSMatch.prototype.start = function(){
  this.state = MOVE;
  var _this = this;
  console.log("state attempting to be action");
  this.lagCast(COUNTDOWN,function(){
    setTimeout(function(){
      _this.lagCast(MOVE,function(){
        _this.timeout = setTimeout(_this.finish.bind(_this),30000);
      });
    },5000);
  });
};

RPSMatch.prototype.move = function(player,data){
  if(this.state != MOVE) return;
  if(0 < data < 3 ) this.playerInfo[player._id].move = data;
};

RPSMatch.prototype.finish = function(){
  this.syncCast("results",this.playerInfo);
  if(!this.triggerTimeout(MOVE)){
    this.reset();
  }
};

module.exports = RPSMatch;
