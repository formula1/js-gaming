var s2c = require("../../abstract/clientserver/server2client");
var ProcessAbstract = require("../../abstract/process/ProcessAbstract");
var procMessage = new ProcessAbstract(process);

var Match = require("../../bootstrap/apps/sdk/Match");
var MatchHandler = require("../../bootstrap/apps/sdk/MatchHandler");

global.Match = Match;

var customMatch = require("../../bootstrap/apps/apps/rps");
var app = new MatchHandler(customMatch);

procMessage.add("match",function(data){
  console.log("new match: "+data.match_id);
  console.log("expected # of players: "+data.players.length);
  app.createMatch(data.match_id,data.players);
});

procMessage.handle.ws("/apps/:appname/:matchid",function(req,sock){
  if(!req.user) return next("no user");
  var User = new s2c(req,sock);
  process.nextTick(app.joinMatch.bind(app,req.params.matchid,User));
});
