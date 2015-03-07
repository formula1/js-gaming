var path = require("path");
global.__root = path.resolve(__dirname+"/../../..");

var Client = require(__root+"/abstract/clientserver/server2client");
var ProcessAbstract = require(__root+"/abstract/process/ProcessAbstract");

var Match = require(__dirname+"/Match");
var MatchHandler = require(__dirname+"/MatchHandler");

var parentCom = new ProcessAbstract(process);

global.Match = Match;

var customMatch = require(process.argv[2].toString("utf8"));
var app = new MatchHandler(customMatch);
parentCom.handle.ws("/apps/:game/:matchid",function(req,sock,next){
  if(!req.user) return next("no user");
  var User = new Client(req,sock);
  console.log("bound user");
  setImmediate(app.joinMatch.bind(app,req.params.matchid,User));
});

parentCom.add("match", function(data){
  console.log("new match: "+data.match_id);
  console.log("expected # of players: "+data.players.length);
  app.createMatch(data.match_id,data.players);
});
process.send("ready");
