var s2c = require("../../abstract/clientserver/server2client");
var ProcessAbstract = require("../../abstract/process/ProcessAbstract");
var procMessage = new ProcessAbstract(process);

var matches = {};
var othersocks = [];

procMessage.add("match",function(data){
  console.log("new match: "+data.match_id);
  console.log("expected # of players: "+data.players.length);
  matches[data.match_id] = data.players;
});

procMessage.handle.ws("/apps/:appname/:matchid",function(req,socket){
  var match = matches[req.params.matchid];
  if(!match) throw new Error("nonexistant match");
  var l = match.length;
  while(l--){
    if(match[l]._id == req.user._id) break;
  }
  if(l < 0) throw new Error("nonexistant person");
  match[l] = new s2c(req,socket);
  process.nextTick(checkSockets.bind(void(0),match));
});

function checkSockets(match){
  var l = match.length;
  while(l--){
    if(!match[l].socket){
      console.log("not ready");
      return;
    }
  }
  console.log("ready");
}
