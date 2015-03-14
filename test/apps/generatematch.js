var radix = require('radix64').radix64;

global.WebSocket = require("websocket").w3cwebsocket;
global.window = {
  location:{
    href:"ws://localhost:3000/apps"
  }
};

var c2s = require("../../abstract/clientserver/client2server");


[{u:"sam",p:"poop"},{u:"apps",p:"login"}].forEach(function(i){
  var baseuri = "ws://localhost:3000/apps";
  var auth = {
    Authorization: "Basic "+(new Buffer(i.u+":"+i.p)).toString('base64')
  };
  var socket = new WebSocket(baseuri, void(0), void(0), auth);
  var MatchFinder = new c2s(baseuri, socket);
  MatchFinder.on("error", function(e){
    console.error(e);
  });
  MatchFinder.get("find", {game:{name:"rps"}},function(e,value){
    if(e) throw e;
    console.log(value);
    var newuri = baseuri+"/"+value.game+"/"+value.match;
    socket = new WebSocket(newuri, void(0), void(0), auth);
    var TheMatch = new c2s(newuri,socket);
    TheMatch.on("error", function(e){
      if(e.type == "error"){
        console.log(e);
      }
    });
    TheMatch.add("ntp",function(){
      console.log("ntp in the client");
      return Date.now();
    });
    TheMatch.add("me",function(me){
      console.log("me in the client");
      return true;
    });
  });
});

setTimeout(function(){
  console.log("timing out");
},10*1000);
