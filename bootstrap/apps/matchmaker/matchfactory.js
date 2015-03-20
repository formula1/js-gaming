var async = require("async");
var random = require(__root+"/abstract/random-gen");



module.exports = function(players,game,allgames){
  async.waterfall([
    function(next){
      next(void(0),players,game);
    },
//    chooseGameType,
    gameLocation,
  ],function(err){
    if(err) throw err;
  });

};

function chooseGameType(players,game,allgames,next){
  var gamesAvailable = {};
  var games;
  var voteweight = players.length/2;

  async.each(players,function(player,next){
    player.gameNames = [];
    for(var i=0,l=player.games.length, game;i<l;i++){
      player.gameNames.push(player.games[i].name);
      game = player.games[i].name;
      gamesAvailable[game] = gamesAvailable[game]?gamesAvailable[game]+1:0;
    }
    setImmediate(next);
  },function(err,res){
    games = Object.keys(gamesAvailable);
    if(games.length == 1){
      for(var i=0,l=allgames.length;i<l;i++){
        if(allgames[i].name == games[0]){
          games = allgames[i];
          break;
        }
      }
      return next(void(0),players,games);
    }
    async.each(players,function(player,next){
      player.client.get("choose-game",{
        yourChoices:player.gameNames,
        netVotes:gamesAvailable,
        originalGame:game.name
      },function(err,choices){
        if(err) return next(err);
        choices.forEach(function(name){
          gamesAvailable[name] += voteweight;
        });
        next();
      });
    },function(err,res){
      if(err) return next(err);
      games.sort(function(a,b){
        return gamesAvailable[a] - gamesAvailable[b];
      });
      players.forEach(function(player){
        player.trigger("chosenGame",gamesAvailable[0]);
      });
      next(players,gamesAvailable[0]);
    });
  });
}

function gameLocation(players,game,next){
  var rtc = 1;
  var ws = 0;
  var paying_users = [];
  async.each(players,function(player,next){
    player.client.get("game-location",function(err,ob){
      if(err) return next(err);
      switch(ob.type){
        case "rtc": rtc += 1+parseInt(ob.amount); break;
        case "ws": ws += ob.amount?parseInt(ob.amount)+1:0;
      }
      paying_users.push({player:player,amount:ob.amount,type:ob.type});
      next();
    });
  },function(err,res){
    if(err) return next(err);
    takeTheirMoney(paying_users,{rtc:rtc,ws:ws},function(err){
      if(err) return next(err);
      if(ws > rtc) createServerMatch(players,game);
      else createClientMatch(players,game);
    });
    next();
  });
}


function takeTheirMoney(payers,winners,next){
  return next();
}

function createServerMatch(players,game){
  var match_id = random();
  for(i=0, l = players.length;i<l;i++){
    players[i].res(void(0),{game:game.name, match:match_id, type:"ws"});
    players[i] = players[i].user;
  }
  game.fork.trigger("match",{match_id:match_id, players:players,type:"ws"});
}

function createClientMatch(players,game){
  var match_id = random();
  for(i=0, l = players.length;i<l;i++){
    players[i].res(void(0),{game:game.name, match:match_id, type:"rtc"});
    players[i] = players[i].user;
  }
  game.fork.trigger("match",{match_id:match_id, players:players,type:"rtc"});
}
