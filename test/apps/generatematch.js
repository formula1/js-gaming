var radix = require('radix64').radix64;
var async = require("async");

global.WebSocket = require("websocket").w3cwebsocket;
global.window = {
  location:{
    href:"ws://localhost:3000/apps"
  }
};

var c2s = require("../../abstract/clientserver/client2server");

async.each([{u:"sam",p:"poop"},{u:"apps",p:"login"}],function(i,next){
  var baseuri = "ws://localhost:3000/apps";
  var auth = {
    Authorization: "Basic "+(new Buffer(i.u+":"+i.p)).toString('base64')
  };
  var socket = new WebSocket(baseuri, void(0), void(0), auth);
  var MatchFinder = new c2s(baseuri, socket);
  MatchFinder.on("error",next);
  MatchFinder.add("game_location",function(){
    return {type:"ws",amount:"1"};
  });

  MatchFinder.get("find", {game:{name:"rps"}},function(e,value){
    if(e) return next(e);
    console.log(value);
    var newuri = baseuri+"/"+value.game+"/"+value.match;
    socket = new WebSocket(newuri, void(0), void(0), auth);
    var TheMatch = new c2s(newuri,socket);
    TheMatch.on("error", next);
    TheMatch.add("type",function(){
      return "ws";
    });
    TheMatch.add("ntp",function(){
      console.log("ntp in the client");
      return Date.now();
    });
    TheMatch.add("me",function(me){
      console.log("me in the client");
      return true;
    });
    TheMatch.add("ready",function(){
      console.log("match started");
      next();
    });
  });
},function(err){
  if(err) throw err;
  console.log("\n\n\n\nfinished websocket\n\n\n\n".toUpperCase());
  process.exit();
});

setTimeout(function(){
  console.log("timing out");
  process.exit();
},10*1000);
