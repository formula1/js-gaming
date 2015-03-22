var radix = require('radix64').radix64;
var async = require("async");
var superAgent = require("superagent");
var BrowserMatch = require("../../bootstrap/apps/sdk/Client/BrowserMatch");
var MessageDuplex = require("../../abstract/message/MessageDuplex");


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


async.map([{u:"sam",p:"poop"},{u:"apps",p:"login"}],function(i,next){
  var authStr = "Basic "+(new Buffer(i.u+":"+i.p)).toString('base64');
  var baseuri = "ws://localhost:3000/apps";
  var auth = {
    Authorization: authStr
  };
  var socket = new WebSocket(baseuri, void(0), void(0), auth);
  var MatchFinder = new c2s(baseuri, socket);
  MatchFinder.on("error", next);
  MatchFinder.add("game_location",function(){
    return {type:"rtc",amount:"5"};
  });
  MatchFinder.get("find", {game:{name:"rps"}},function(e,value){
    if(e) return next(e);
    console.log(value);
    var newuri = baseuri+"/"+value.game+"/"+value.match;
    socket = new WebSocket(newuri, void(0), void(0), auth);
    var TheAllower = new c2c(newuri,socket); //deja-vu, involves penguins somehow
    TheAllower.on("error", next);
    TheAllower.add("type",function(type,next){
      easyMode(TheAllower,function(){
        next(void(0),type);
      },function(host,next){
          HostUser = host.host;
          TheAllower.removeAllListeners("connection");
          if(HostUser._id != TheAllower.me._id){
            TheAllower.on("new-accept",function(connection){
              console.log("accepting from rtc-player");
              stdMatchHandling(connection);
            });
            return next();
          }
          console.log("creating real match: ",host.game);
          superAgent.get("http://localhost:3000/apps/"+host.game.name+"/match.js")
          .buffer().set("Authorization", authStr).end(function(err,res){
            console.log("finished get request");
            if(err) return next(err);
            var match = new BrowserMatch(host.users,res.text);
            TheAllower.on("connection",function(connection){
              console.log("joined from rtc");
              match.join(connection);
            });
            stdMatchHandling(joinSelf(TheAllower,match));
            next(void(0),match);
          });
      });
    });
    var stdMatchHandling = function (TheMatch){
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
        next(void(0),TheAllower);
      });
    };
  });
},function(err,res){
  if(err) throw err;
  res.forEach(function(rtchost){
    rtchost.close();
    rtchost.closeAll();
  });
  console.log("\n\n\n\nfinished webrtc\n\n\n\n".toUpperCase());
  process.exit();
});


function joinSelf(TheAllower, match){
  var ourPlayer, matchPlayer;
  matchPlayer = new MessageDuplex(function(mess){
    ourPlayer.handleMessage(mess);
  });
  matchPlayer.user = TheAllower.me;
  ourPlayer = new MessageDuplex(function(mess){
    matchPlayer.handleMessage(mess);
  });
  setImmediate(match.join.bind(match,matchPlayer));
  console.log("joined self");
  return ourPlayer;
}




setTimeout(function(){
  console.log("timing out");
  process.exit();
},10*1000);
