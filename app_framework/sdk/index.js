var path = require("path");
global.__root = path.resolve(__dirname+"/../..");

var Match = require("./Match");
var MatchMaker = require("./MatchMaker");
var Player = require("./Player");
var MessageDuplex = require(__root+"/abstract/message/MessageDuplex");
var Client = require(__root+"/abstract/clientserver/server2client");

var parentCom = new MessageDuplex(function(message){
  process.send({type:"forkdup", msg:message});
});
process.on("message",function (message,handle){
  if(message.type && message.type === "forkdup"){
    parentCom.handleMessage(message.msg);
  }
});

parentCom.add("an_event", function(data){
  console.log("I got an event!!!!!!!");
}).add("match", function(data){
  console.log("new match: "+data.match_id);
  console.log("expected players: ", data.players);
});

parentCom.ready();

if(!module.parent){
  global.Match = Match;
  global.MatchMaker = MatchMaker;
  global.Player = Player;

  var websocket = require('websocket-driver');
  var app = require(process.argv[2].toString("utf8"));

  process.on("message",function (message,handle){
    if(message.type && message.type !== "socket") return;
    var User = new Client(message,handle);
    User.user = message.user;
    switch(message.cmd){
      case "enter": return app.playerEnter(User);
      case "match": return app.find().requestEntry(User);
    }
  });
  process.send("ready");
}else{
  module.exports.Match = Match;
  module.exports.MatchMaker = MatchMaker;
  module.exports.Player = Player;
}
