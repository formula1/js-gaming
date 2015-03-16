
var NetworkHost = require("../../../../../abstract/network/NetworkHost");
var ProxyDuplex = require("../../../../../abstract/message/ProxyDuplex");
var async = require("async");

var status = 0;
var me;

var RTCHost = new NetworkHost();

var ConsoleConnection = void(0);

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
  async.each(users,function(user,next){
    //@-POSSIBLE_HOST creates that number of RTC offers
    RTCHost.offer(user,next);
    //@-POSSIBLE_HOST sends the RTC offers to the server
  },next);
}).add("request-accept",function(offer,next){
  if(state !== UNSTARTED) return next("have host");
  //@-TESTER sends back an RTC accept
  RTCHost.accept(offer,next);
}).add("request-handshake",function(accept,next){
  if(state !== UNSTARTED) return next("have host");
  //@-POSSIBLE_HOST Initiates Connection
  //@-POSSIBLE_HOST tells server when connection is ready
  RTCHost.ok(accept,next);
}).add("request-ntp",function(next){
  if(state !== UNSTARTED) return next("have host");
  //@-User runs NTP
  //@-User sends ntp data to server
  RTCHost.syncGet("ntp",next);
}).add("request-closeAll",function(next){
  //@-Users disconnect
  RTCHost.closeAll(next);
}).add("host",function(host){
  if(host.id !== me.id){
    GameConsole = RTCHost.connections[host.id];
    return;
  }

  @-BEST_HOST initiates the match
    @-BEST_HOST signals to themself by timeouts and
});
