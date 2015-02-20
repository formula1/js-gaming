
var _ = require("lodash");

/*

Player Enters
-Query for compatible games
-Add the player to a list for those games
-Do next tick - Find a match with current players

Find a match with current players
-For each player
--for each of those players compatible game's waiting list
---check if that players player query matches the games waiting list (Remove blocked players/leavers/winloss/etc)
----If the remaining players is enough to start a game
-----Remove players until we hit maximum
-----Remove the players here from all waiting lists
-----Send a match Start request to the game.

*/

function MatchMaker(games){
  this.games = games;
  this.gameIndex = {};
  this.waiting_players = [];
  this.needing_players = [];
  this.isChecking = false;
  var l = games.length;
  var game;
  while(l--){
    game = games[l];
    this.gameIndex[game.name] = {
      min_players:game.minplayers,
      waiting:[]
    };
  }
}

MatchMaker.prototype.addUser = function(user,query,next){
  var _this = this;
  var games = applyGameQuery(this.games, query.game);
  var l = games.length;
  if(!l) return next(new Error("404"));
  var item = {user:user,query:query,games:games};
  if(!user.joinInProgress || !this.needing_players.length){
    return this.addToWaitingList(item,next);
  }
  this.checkActiveMatches(item,function(err){
    if(err) return next(err);
    _this.addToWaitingList(item,next);
  });
};

MatchMaker.prototype.removeUser = function(userInfo){
  var i = _.indexOf(this.waiting_players, userInfo);
  this.waiting_players.splice(i,1);
  var l = userInfo.games.length;
  while(l--){
    i = _.indexOf(this.gameIndex[userInfo.games[l].name].waiting, userInfo);
    this.gameIndex[userInfo.games[l].name].waiting.splice(i,1);
  }
};

MatchMaker.prototype.checkActiveMatches = function(userItem,next){
  //We would cast a query on the active matches
  //Nothing for now though

  this.addToWaitingList(userItem,next);
};

MatchMaker.prototype.addToWaitingList = function(userItem,next){
  var games = userItem.games;
  var l = games.length;
  this.waiting_players.push(userItem);
  while(l--){
    this.gameIndex[games[l]].waiting.push(userItem);
  }
  this.checkForMatch();
  next();
};

MatchMaker.prototype.checkForMatch = function(){
  if(this.isChecking) return;
  this.isChecking = true;
  process.nextTick(this.createMatch.bind(this));
};

MatchMaker.prototype.needPlayer = function(matchInfo, game){
  game = _.findOne(this.games, {name:game});
  var l = this.waiting_players.length;
  var match_found = this.waiting_players.some(function(player) {
    if(_.matches(player.query.game)(game)){
      this.removePlayer(player);
      game.sendPlayerToMatch(player,matchInfo);
      return true; //break
    }
  });
  if (match_found) return;

  var index = _.indexOf(_.pluck(this.needing_players,"id"),id);
  if(index === -1){
    this.needing_players.push({
      id:matchInfo.id,
      matchInfo:matchInfo,
      game:game,
      needs:1
    });
  }else{
    this.needing_players[index].number++;
  }
};

MatchMaker.prototype.deadGame = function(matchid, name){
  //Happens when all players leave
};

function applyPlayerQuery (players, player_query) {
  return player_query?_.filter(players, player_query):players;
}

function applyGameQuery (games, game_query) {
  return game_query?_.filter(this.games, game_query):games;
}


MatchMaker.prototype.createMatch = function(){
  var l, ll, lll;
  var i, ii, iii;
  var player;
  var game;
  var players;
  for(i=0, l=this.waiting_players.length;i<l;i++){
    player = this.waiting_players[i];
    for(ii=0, ll = player.games.length;ii<ll;ii++){
      game = player.games[ii];
      players = game.waiting;
      // TODO: update this to apply all players' player queries
      // this should prefer the players first in the queue, but
      // should start a new game if at all possible
      players = applyPlayerQuery(players, player.query.player);
      if(players.length < game.minplayers) continue;

      while(players.length > game.maxplayers) players.pop();
      for(iii=0, lll = players.length;iii<lll;iii++){
        players[iii].trigger("newmatch", match);
        this.removeUser(players[iii]);
      }
      process.nextTick(this.createMatch.bind(this));
      return game.sendNewMatch(players);
    }
  }
  this.isChecking = false;
};

module.exports = MatchMaker;
