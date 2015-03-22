var MatchConnection = require("./MatchConnection");
var NetworkHost = require("../../../../abstract/network/NetworkHost");
var MatchInitiator = new NetworkHost();
var RTCInit = require("./RTCInit");
var superAgent = require("superagent");
var BrowserMatch = require("./BrowserMatch");
var MessageDuplex = require("../../../../abstract/message/MessageDuplex");

var ret = new MatchConnection();

MatchInitiator.add("type",function(type,next){
  switch(type){
    case "ws": ret.open(MatchInitiator); return next(void(0), "ws");
    case "rtc":
      RTCInit(
        MatchInitiator,
        function(){
          return next(void(0),"rtc");
        },
        function(host,next){
          MatchInitiator.removeAllListeners("connection");
          if(host.host._id != MatchInitiator.me._id){
            MatchInitiator.on("new-accept",ret.open.bind(ret));
            return next();
          }
          superAgent.get(
            "/apps/"+host.game.name+"/match.js"
          ).end(function(err,res){
            if(err) return next(err);
            var match = new BrowserMatch(host.users,res.text);
            MatchInitiator.on("connection",match.join.bind(match));
            ret.open(joinSelf(match));
            next(void(0),match);
          });
        }
      );
  }
});


function joinSelf(match){
  var ourPlayer, matchPlayer;
  matchPlayer = new MessageDuplex(function(mess){
    ourPlayer.handleMessage(mess);
  });
  matchPlayer.user = MatchInitiator.me;
  ourPlayer = new MessageDuplex(function(mess){
    matchPlayer.handleMessage(mess);
  });
  setImmediate(match.join.bind(match,matchPlayer));
  return ourPlayer;
}




module.exports = ret;
