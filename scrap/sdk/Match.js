
var _ = require("lodash");
var MersenneTwister = require('mersennetwister');
var util = require("util");
var EventEmitter = require("events").EventEmitter;

function DisplayMyName()
{
  myName =  arguments.callee.toString();
  return myName.substr('function '.length)
  .substr(0, myName.indexOf('('));
}

function Match(players,matchpool){
  this.matchpool = matchpool;
  this.seed = Date.now();
  this.players = players||[];
  this.random = new MersenneTwister(this.seed);
  this.lag = 0;
  if(this.verifyAction == this.notAbstract){
    this.verifyAction();
  }
  if(this.requestEnty == this.notAbstract){
    this.requestEntry();
  }
}

util.inherits(Match,EventEmitter);

Match.prototype.delete = function(){
  this.matchpool.delete(this);
};

Match.prototype.quickCast = function(data){
  var l = this.players.length;
  while(l--){
    this.players[l].send(data);
  }
};

Match.prototype.lagCast = function(data){
  var l = this.players.length;
  while(l--){
    setTimeout(
      this.players[l].send.bind(this.players[l],data),
      this.lag - player.lag
    );
  }
};

Match.prototype.requestEntry = function(player){
  var index = this.verifyPlayer(player);
  if(index !== -1) throw new Error("this player is already here");
  this.verifyEntry(player);
  this.players.push(player);
  this.emit("enter",player);
};

Match.prototype.processAction = function(player,action,data){
  var index = verifyPlayer(player);
  if(index === -1) throw new Error("player doesn't exist");
  this.data.time = Date.now();
  this.data.random = this.random.rnd();
  if(this.verifyAction(player,action,data)){
    this.emit("action",player,action,data);
  }
};

Match.prototype.removePlayer = function(player){
  var index = this.verifyPlayer(player);
  if(index === -1) throw new Error("player doesn't exist");
  this.players.splice(index,1);
  this.emit("exit",player);
};

Match.prototype.notAbstract = function(){
  throw new Error("the method \'"+DisplayMyName()+"\' need to be overridden");
};

Match.prototype.verifyAction = Match.prototype.notAbstract;
Match.prototype.verifyEntry = Match.prototype.notAbstract;
Match.prototype.verifyPlayer = function(player){
  return _.findIndex(this.players,{_id:player._id});
};

Match.findMatch = Match.prototype.notAbstract;

module.exports = Match;
