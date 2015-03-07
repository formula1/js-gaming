
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
    this.players[l].on("action",this.handleAction.bind(this));
  }
  this.on("start",this.reset.bind(this));
  console.log("finished constructing rps");
}

util.inherits(RPSMatch,Match);

RPSMatch.prototype.handleAction = function(player,action,data){
  if(!this.verifyAction(player,action,data)) return;
  switch(action){
    case READY: return this.playerReady(player);
    case MOVE: return this.move(player,data);
  }
};

RPSMatch.prototype.verifyAction = function(player,action,data){
  if(action != this.state) return false;
  if(action == READY) return true;
  if(action == MOVE && 0 < data < 3 ) return true;
  return false;
};

RPSMatch.prototype.reset = function(){
  this.state = "READY";
  this.playerInfo = {};
  var l = this.players.length;
  while(l--){
    this.playerInfo[this.players[l]._id] = {move:false,ready:false};
  }
  console.log("reset match");
  this.timeout = setTimeout(this.triggerTimeout.bind(this,READY),30000);
};

RPSMatch.prototype.triggerTimeout = function(toVerify){
  this.timeout = void(0);
  var l = this.players.length;
  while(l--){
    if(this.playerInfo[this.players[l]._id][toVerify] === false){
      this.players[l].removeAllListeners();
      this.players[l].exit();
      this.players.splice(l,1);
    }
  }
  console.log("timout triggered");
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
  if(this.playerInfo[player._id].ready) return;
  this.playerInfo[player._id].ready = true;
  var l = this.players.length;
  while(l--){
    if(this.playerInfo[this.players[l]._id].ready === false){
      return;
    }
  }
  clearTimeout(this.timeout);
  this.reset();
  this.lagCast({cmd:COUNTDOWN});
  this.state = COUNTDOWN;
  var match = this;
  this.timeout = setTimeout(this.start.bind(this),this.lag+2000+100);
};

RPSMatch.prototype.start = function(){
  this.state = MOVE;
  this.lagCast({cmd:MOVE});
  console.log("state attempting to be action");
  this.timeout = setTimeout(this.finish.bind(this),5000+100);
};

RPSMatch.prototype.move = function(player,data){
  if(this.state != MOVE) return;
  this.playerInfo[player._id].move = data.value;
};

RPSMatch.prototype.finish = function(){
  this.quickCast({cmd:"results",results:this.playerInfo});
  if(!this.triggerTimeout(MOVE)){
    this.reset();
  }
};

module.exports = RPSMatch;
