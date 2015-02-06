


if(!module.parent){
  global.Match = require("./Match");
  global.MatchMaker = require("./MatchMaker");
  global.Player = require("./Player");

  var websocket = require('websocket-driver');
  var app = require(process.argv[0]);
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
}else{
  module.exports.Match = require("./Match");
  module.exports.MatchMaker = require("./MatchMaker");
  module.exports.Player = require("./Player");
}
