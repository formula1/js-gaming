var Match = require("./Match");
var MatchMaker = require("./MatchMaker");
var Player = require("./Player");

if(!module.parent){
  global.Match = Match;
  global.MatchMaker = MatchMaker;
  global.Player = Player;

  var websocket = require('websocket-driver');
  var app = require(process.argv[2].toString("utf8"));
  process.on("message",function (message,handle){
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
