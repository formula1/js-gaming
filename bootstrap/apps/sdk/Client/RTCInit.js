var UNSTARTED = 0, INITIALIZING = 1;
var MC = require("./MatchConnection");
var async = require("async");
var Match = require("../Match");

module.exports = function(RTCHost,next){
  var MatchConnection = new MC();
  var HostedMatch = void(0);
  var ishost = false;
  var ready = false;
  var HostUser;
  var me;

  RTCHost.on("connection",function(connection){
    if(HostedMatch){
      return HostedMatch.join(connection);
    }
    MatchConnection.open(connection);
  });

  var state = UNSTARTED;
  RTCHost.add("host",function(host,users){
    HostUser = host;
    RTCHost.removeListeners("connection");
    if(host.id != me.id) return next();
    BrowserMatch.createFromUri(
      window.location.path+"/match.js",
      users,
      next
    );
  }).add("ntp",function(){
    console.log("clientside npt");
    return Date.now();
  }).add("me",function(data){
    me = data;
    return true;
  }).add("request-ready",function(nil,next){
    console.log("ready requested");
    if(ready){
      console.log("ready is already set");
      return next();
    }
    console.log("waiting for ready");
    console.log(arguments);
    ready = next;
  }).add("request-offers",function(users,next){
    if(HostUser){
      if(HostUser.id != me.id) return next("I'm not the host");
    }else{
      for(var i=0,l=users.length;i<l;i++){
        if(users[i].id == me.id){
          users.splice(i,1);
          break;
        }
      }
      ready = false;
      HostedMatch = new Match(users);
      HostedMatch.on("start",function(){
        console.log("browser match start");
        console.log(typeof ready);
        if(!ready) ready = true;
        else ready();
      });
    }
    async.map(users,function(user,next){
      //@-POSSIBLE_HOST creates that number of RTC offers
      console.log("offering to ",user);
      RTCHost.offer(user,next);
      //@-POSSIBLE_HOST sends the RTC offers to the server
    },next);
  }).add("request-accept",function(offer,next){
    if(HostUser && HostUser.id !== offer.user.id) return next("have host");
    //@-TESTER sends back an RTC accept
    RTCHost.accept(offer,next);
  }).add("request-handshake",function(accept,next){
    if(HostUser && HostUser.id != me.id) return next("I'm not the host");
    //@-POSSIBLE_HOST Initiates Connection
    //@-POSSIBLE_HOST tells server when connection is ready
    RTCHost.ok(accept,next);
    return true;
  }).add("request-ntp",function(nil,next){
    //@-User runs NTP
    //@-User sends ntp data to server
    var times = 10;
    async.times(times,function(nil,next){
      if(HostedMatch){ return HostedMatch.ntp(next);}
      MatchConnection.ntp(next);
    },function(err,res){
      next(err,res.pop());
    });
  }).add("request-closeAll",function(nil,next){
    //@-Users disconnect
    if(HostedMatch) return HostedMatch.end();
    RTCHost.closeAll(next);
  });
};
