
var Player = require("./Player");
var _ = require("lodash");



function MatchMaker(MatchType){
  this.MatchType = MatchType;
  this.players = [];
  this.matches = [];
  this.flaggedMatches = [];
  this.cleaning = false;
}

MatchMaker.prototype.findMatch = function(player){
  return this.MatchType.findMatch(player);
};

MatchMaker.prototype.find = function(matchid){
  var _this = this;
  return new Promise(function (resolve, reject) {
    var match = _.findWhere(_this.players, {_id: user._id});
    if(!match) return reject("no match found");
    resolve(match);
  });
};

MatchMaker.prototype.delete = function(match){
  var index = _.findIndex(this.matches, {_id: match._id});
  this.matches.splice(index,1);
  this.flaggedMatches.push(match);
  if(!this.cleaning){
    this.cleaning = true;
    process.nextTick(this.clean.bind(this));
  }
};

MatchMaker.prototype.clean = function(match){
  var l = this.flaggedMatches.length;
  while(l--){
    this.flaggedMatches.pop().emit("end");
  }
  this.cleaning = false;
};

MatchMaker.prototype.playerEnter = function(user,handle){
  return new Promise(function(res,rej){
    var player;
    if(player = _.findWhere(this.players, {_id: user._id})){
      player.online(handle);
    }else{
      player =  new Player(user,handle,this);
      db.players.push(player);
    }
    res(player);
  });
};

module.exports = MatchMaker;
