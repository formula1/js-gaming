
var Player = require("./Player");
var _ = require("lowdash");



function MatchMaker(MatchType){
  this.MatchType = MatchType;
  this.players =[];
  this.matches =[];
}

MatchMaker.prototype.findMatch = function(player){
  return this.MatchType.findMatch(player);
};

MatchMaker.prototype.find = function(matchid){
  return new Promise(function (resolve, reject) {
    var match = _.findWhere(db.players, {id: user._id});
    if(!match) return reject("no match found");
    resolve(match);
  });
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
