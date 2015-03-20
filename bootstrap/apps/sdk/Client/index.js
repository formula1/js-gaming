var MatchConnection = require("./MatchConnection");
var NetworkHost = require(__dirname+"/../../../abstract/network/NetworkHost");
var MatchInitiator = new NetworkHost();
var RTCInit = require("./RTCInit");

var ret = new MatchConnection();

MatchInitiator.add("type",function(type,next){
  switch(type){
    case "ws": ret.open(MatchInitiator); return next(void(0), "ws");
    case "rtc": RTCInit(MatchInitiator,function(err,match){
      if(match){
        joinSelf(match);
        MatchInitiator.on("connection",match.join.bind(match));
      }else{
        MatchInitiator.on("connection",ret.open.bind(ret));
      }
    });
    return next(void(0),"rtc");
  }
});


function joinSelf(match){
  var self = new MessageDuplex(function(mess){
    ret.handleMessage(mess);
  });
  ret.open(new MessageDuplex(function(mess){
    self.handleMessage(mess);
  }));
  self.user = MatchInitiator.user;
  match.join(self);
}




module.exports = ret;
