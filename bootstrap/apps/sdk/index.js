var path = require("path");
global.__root = path.resolve(__dirname+"/../../..");

var Client = require(__root+"/abstract/clientserver/server2client");
var ProcessAbstract = require(__root+"/abstract/process/ProcessAbstract");

var MatchHandler = require(__dirname+"/MatchHandler");

var VmMatch = require("./VmMatch");
var RTCMatch = require("./RTCMatch");

var parentCom = new ProcessAbstract(process);

var app = new MatchHandler();

parentCom.handle.ws("/apps/:game/:matchid",function(req,sock,next){
  if(!req.user) return next("no user");
  var User = new Client(req,sock);
  console.log("bound user");
  setImmediate(app.joinMatch.bind(app,req.params.matchid,User));
});

parentCom.add("match", function(data){
  console.log("new match: "+data.match_id);
  console.log("expected # of players: "+data.players.length);
  if(data.type == "ws"){
    console.log("child: ws match");
    app.createMatch(
      data.match_id,
      data.players,
      VmMatch
    );
    console.log("child: after ws match");
  }
  if(data.type == "rtc"){
    console.log("child: rtc match");
    app.createMatch(
      data.match_id,
      data.players,
      RTCMatch
    );
    console.log("child: after rtc match");
  }
});
process.send("ready");
