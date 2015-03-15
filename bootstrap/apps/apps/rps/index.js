var _ = require("lodash");
var waitingPlayers = [];
var READY = "ready";
var COUNTDOWN = "countdown";
var MOVE = "move";

var state = void(0);
var timeout = void(0);
var playerInfo = {};

match.players.forEach(function(player){
  playerInfo[player.id] = {};
  player.once("stop",playerExit);
  player.add(READY,playerReady.bind(void(0),player));
  player.add(MOVE,move.bind(void(0),player));
});
match.on("start",reset);
console.log("finished constructing rps");

function reset(){
  state = READY;
  playerInfo = {};
  match.players.forEach(function(player){
    playerInfo[player.id] = {move:false,ready:false};
  });
  console.log("reset match");
  match.lagCast(READY,function(){
    timeout = setTimeout(triggerTimeout.bind(void(0),READY),30000);
  });
}

function playerReady(player){
  if(state != READY){
    console.log("state != Ready");
    return;
  }
  if(playerInfo[player.id].ready){
    console.log("player "+player.id+" is already ready");
    return;
  }
  playerInfo[player.id].ready = true;
  var l = match.players.length;
  while(l--){
    if(playerInfo[match.players[l].id].ready === false){
      console.log(match.players[l].id+" is not ready");
      return;
    }
  }
  console.log("all players ready");
  clearTimeout(timeout);
  start();
}

function start(){
  state = COUNTDOWN;
  match.lagCast(COUNTDOWN,function(){
    setTimeout(function(){
      console.log("state attempting to be action");
      match.lagCast(MOVE,function(){
        state = MOVE;
        timeout = setTimeout(finish,30000);
      });
    },5000);
  });
}

function move(player,data){
  if(state != MOVE) return;
  if(0 < data < 4 ) playerInfo[player.id].move = data;
}

function finish(){
  match.syncCast("results",playerInfo);
  if(!triggerTimeout(MOVE)){
    reset();
  }
}


function triggerTimeout(toVerify){
  if(state != toVerify){
    console.log("this should be cleared");
    return;
  }
  timeout = void(0);
  match.players.forEach(function(player){
    if(playerInfo[player.id][toVerify] === false){
      player.exit();
    }
  });
  console.log("timeout triggered");
  tooFewPlayers();
}

function playerExit(player){
  player.exit();
  return tooFewPlayers();
}

function tooFewPlayers(){
  if(match.players.length > 1) return false;
  clearTimeout(timeout);
  match.end();
  console.log("too few players");
  return true;
}
