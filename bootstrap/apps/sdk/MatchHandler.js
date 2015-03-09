var Match = require("./Match");

function MatchHandler(matchtype,timeout){
  if(!matchtype) throw new Error("Need to provide a match to create");
  if(!(matchtype.prototype instanceof Match)){
    throw new Error("MatchType needs to be an instance of Match");
  }
  this.match = matchtype;
  this.timeout = timeout||Number.POSITIVE_INFINITY;
  this.matches = {};
  this.queuedPlayers = [];
}

MatchHandler.prototype.createMatch = function(matchid,players){
  console.log("inside createMatch");
  this.matches[matchid] = new this.match(players);
  this.matches[matchid].id = matchid;
  var t = Date.now();
  var l = this.queuedPlayers.length;
  while(l--){
    console.log("checking queued Player");
    var p = this.queuedPlayers[l];
    if(t - p.time > this.timeout){
      this.queuedPlayers[l].user.close();
      this.queuedPlayers.splice(l,1);
      continue;
    }
    if(this.queuedPlayers[l].match != matchid) continue;
    console.log("adding queued Player");
    this.matches[matchid].join(this.queuedPlayers.splice(l,1).user);
  }
  this.matches[matchid].on("end", this.removeMatch.bind(this,this.matches[matchid]));
  console.log("created a match");
};

MatchHandler.prototype.joinMatch = function(matchid, user){
  console.log("requesting match: "+matchid);
//  console.log(this.matches);
  if(!this.matches[matchid]){
    console.log("player is queued: "+matchid);
    this.queuedPlayers.push({match:matchid, user:user,time:Date.now()});
  }else{
    console.log("player will join: "+matchid);
    this.matches[matchid].join(user);
  }
};

MatchHandler.prototype.removeMatch = function(match){
  var l = match.players.length;
  while(l--){
    match.players[l].exit();
  }
  var _this = this;
  delete _this.matches[match.id];
  console.log("removed match");

};


module.exports = MatchHandler;
