var path = require("path");
global.__root = path.resolve(__dirname+"/../..");

var Match = require("./Match");
var MatchMaker = require("./MatchMaker");
var Player = require("./Player");
var MessageDuplex = require(__root+"/abstract/abstract/MessageDuplex");

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
});

parentCom.ready();

if(!module.parent){
  global.Match = Match;
  global.MatchMaker = MatchMaker;
  global.Player = Player;

  var websocket = require('websocket-driver');
  var app = require(process.argv[2].toString("utf8"));

  process.on("message",function (message,handle){
    if(message.type && message.type !== "something else") return;
    var driver = websocket.http(message.request);
    driver.io.write(message.body);
    handle.pipe(driver.io).pipe(handle);
    switch(message.cmd){
      case "enter": return app.playerEnter(message.user,driver).then(function(){
        driver.start();
      });
      case "match": return app.playerEnter(message.user,driver)
      .call("requestEntry",match).then(function(){
        driver.start();
      });
    }
  });
  process.send("ready");
}else{
  module.exports.Match = Match;
  module.exports.MatchMaker = MatchMaker;
  module.exports.Player = Player;
}
