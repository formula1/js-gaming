var radix = require('radix64').radix64;
var async = require("async");

global.WebSocket = require("websocket").w3cwebsocket;
global.RTCPeerConnection = require("wrtc").RTCPeerConnection;
global.RTCSessionDescription = require("wrtc").RTCSessionDescription;
global.RTCIceCandidate = require("wrtc").RTCIceCandidate;

global.window = {
  location:{
    href:"ws://localhost:3000/apps"
  }
};

var c2s = require("../../abstract/clientserver/client2server");
var c2c = require("../../abstract/network/NetworkHost");
var easyMode = require("../../bootstrap/apps/sdk/Client/RTCInit");


async.each([{u:"sam",p:"poop"},{u:"apps",p:"login"}],function(i,next){
  var baseuri = "ws://localhost:3000/apps";
  var auth = {
    Authorization: "Basic "+(new Buffer(i.u+":"+i.p)).toString('base64')
  };
  var socket = new WebSocket(baseuri, void(0), void(0), auth);
  var MatchFinder = new c2s(baseuri, socket);
  MatchFinder.on("error", next);
  MatchFinder.add("game-location",function(){
    return {type:"rtc",amount:"5"};
  });
  MatchFinder.get("find", {game:{name:"rps"}},function(e,value){
    if(e) return next(e);
    console.log(value);
    var newuri = baseuri+"/"+value.game+"/"+value.match;
    socket = new WebSocket(newuri, void(0), void(0), auth);
    var TheAllower = new c2c(newuri,socket); //deja-vu, involves penguins somehow
    TheAllower.add("ntp",function(){
      console.log("ntp in the client");
      return Date.now();
    });
    TheAllower.add("me",function(me){
      TheAllower.me = me;
      console.log("me in the client");
      return true;
    });
    TheAllower.on("error", next);
    TheAllower.add("type",function(){
      return "rtc";
    });
    easyMode(TheAllower,function(err,match){
      if(err) return next(e);
      if(match) console.log("we are the host");
      else console.log("we are not the host");
      TheAllower.close();
      TheAllower.closeAll();
      next();
    });
  });
},function(err){
  if(err) throw err;
  console.log("\n\n\n\nfinished webrtc\n\n\n\n".toUpperCase());
});

setTimeout(function(){
  console.log("timing out");
},10*1000);
