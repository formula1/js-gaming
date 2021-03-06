var UNSTARTED = 0, INITIALIZING = 1;
var MC = require("./MatchConnection");
var async = require("async");
var Match = require("../Match");

module.exports = function(RTCHost,cb,hostHandler){
  var MatchConnection = new MC();
  var HostedMatch = void(0);
  var ishost = false;
  var ready = false;
  var HostUser;
  var me;

  var connhandler = function(connection){
    if(HostUser) return;
    if(HostedMatch){
      return HostedMatch.join(connection);
    }
    MatchConnection.open(connection);
  };

  var state = UNSTARTED;
  RTCHost.add("ntp",function(){
    return Date.now();
  }).add("me",function(me,next){
    console.log("setting me",me);
    RTCHost.me = me;
    setImmediate(next.bind(next,void(0),true));
  }).add("host",function(host,next){
    HostUser = host.host;
    console.log("creating real match: ",host.game);
    hostHandler(host,function(err,match){
      if(match){
        console.log("have match");
        match.on("ready",function(){
          console.log("MATCH IS READY");
          if(!ready) ready = true;
          else ready();
        });
      }
      next();
    });
  }).add("request-ready",function(nil,next){
    if(ready){
      console.log("ready is already set");
      return next();
    }
    console.log("waiting for ready");
    ready = next;
  }).add("request-offers",function(users,next){
    for(var i=0,l=users.length;i<l;i++){
      if(users[i]._id == RTCHost.me._id){
        users.splice(i,1);
        break;
      }
    }
    ready = false;
    if(HostUser){
      if(HostUser._id != RTCHost.me._id) return next("I'm not the host");
    }else{
      RTCHost.removeAllListeners("connection");
      RTCHost.on("connection",connhandler);
      console.log(users.length);
      HostedMatch = new Match(users);
      HostedMatch.on("start",function(){
        console.log("browser match start");
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
    console.log("offer recieved");
    if(HostUser){
      if(HostUser._id == RTCHost.me._id){
        return next("I am host");
      }
      RTCHost.accept(offer,next);
    }else{
      //@-TESTER sends back an RTC accept
      connhandler(RTCHost.accept(offer,next));
    }
  }).add("request-handshake",function(accept,next){
    if(HostUser && HostUser._id !== RTCHost.me._id){
      return next("I'm not the host");
    }
    //@-POSSIBLE_HOST Initiates Connection
    //@-POSSIBLE_HOST tells server when connection is ready
    RTCHost.ok(accept,next);
    return true;
  }).add("request-ntp",function(nil,next){
    //@-User runs NTP
    //@-User sends ntp data to server
    var times = 3;
    async.times(times,function(nil,next){
      if(HostedMatch){
        return HostedMatch.ntp(next);
      }
      MatchConnection.ntp(next);
    },function(err,res){
      console.log("ntp done");
      next(err,res.pop());
    });
  }).add("request-closeAll",function(nil,next){
    //@-Users disconnect
    if(HostedMatch){
      HostedMatch.end();
      HostedMatch = void(0);
    }
    RTCHost.closeAll();
    next();
  });
  cb();
};
