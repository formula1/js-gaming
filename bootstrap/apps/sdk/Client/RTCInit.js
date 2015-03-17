var UNSTARTED = 0, INITIALIZING = 1;
var NetworkHost = require("../../../../../abstract/network/NetworkHost");
var MatchConnection = require("./MatchConnection");
var Match = require("../Match");
var async = require("async");
var superAgent = require("super-agent");
var BrowserMatch = require("./BrowserMatch");
var status = 0;
var me;
var HostUser;

var RTCHost = new NetworkHost();

var MatchConnection = new MatchConnection();
var HostedMatch = void(0);

RTCHost.on("connection",function(connection){
  if(HostedMatch){
    return HostedMatch.join(connection);
  }
  MatchConnection.open(connection);
});

var state = UNSTARTED;
RTCHost
.add("ntp",function(){
  console.log("clientside npt");
  return Date.now();
}).add("me",function(data){
  me = data;
  return true;
}).add("request-offers",function(users,next){
  if(state !== UNSTARTED) return next("have host");
  HostedMatch = new Match(users);
  async.each(users,function(user,next){
    //@-POSSIBLE_HOST creates that number of RTC offers
    RTCHost.offer(user,next);
    //@-POSSIBLE_HOST sends the RTC offers to the server
  },next);
}).add("request-accept",function(offer,next){
  if(HostUser && HostUser.id !== offer.user.id) return next("have host");
  //@-TESTER sends back an RTC accept
  RTCHost.accept(offer,next);
}).add("request-handshake",function(accept,next){
  if(!HostedMatch) return next("we are not the host");
  //@-POSSIBLE_HOST Initiates Connection
  //@-POSSIBLE_HOST tells server when connection is ready
  RTCHost.ok(accept,next);
}).add("request-ntp",function(next){
  if(state !== UNSTARTED) return next("have host");
  //@-User runs NTP
  //@-User sends ntp data to server
  var times = 10;
  async.times(times,function(next){
    if(HostedMatch){ return HostedMatch.ntp("ntp",next);}
    MatchConnection.ntp(next);
  },function(err,res){
    next(err,res.pop());
  });
}).add("request-closeAll",function(next){
  //@-Users disconnect
  if(HostedMatch) return HostedMatch.end();
  RTCHost.closeAll(next);
}).add("host",function(host){
  HostUser = host;
}).add("real-offers",function(users,next){
  if(HostUser.id != me.id) return next("I'm not the host");
  //@-BEST_HOST CREATES A FAUX USER FOR HIMSELF
  finalizeMatch(users.concat(me),function(err){
    if(err) return next(err);
    async.each(users,function(user,next){
      //@-BEST_HOST creates that number of RTC offers
      RTCHost.offer(user,next);
      //@-BEST_HOST sends the RTC offers to the server
    },next);
  });
});


function finalizeMatch(users,next){
  superAgent.get(window.location.path+"/match.js").end(function(err,res){
    if(err) return next(err);
    HostedMatch = new BrowserMatch(users,res.text);
    var self = new MessageDuplex(function(mess){
      MatchConnection.handleMessage(mess);
    });
    MatchConnection.open(new MessageDuplex(function(mess){
      self.handleMessage(mess);
    }));
    self.user = me;
    Match.join(self);
  });
}
