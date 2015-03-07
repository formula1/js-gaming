var s2c = require("../../abstract/clientserver/server2client");
var ProcessAbstract = require("../../abstract/process/ProcessAbstract");

var socks = [];

var procMessage = new ProcessAbstract(process);

var othersocks = [];


procMessage.handle.ws("/apps",function(req,socket){
  console.log("have a socket");
  var sock = new s2c(req,socket);
  socks.push(sock);
  sock.add("find",function(){
    return {game:"rps",match:"123"};
  });
}).ws("/apps/:appname/:matchid",function(req,socket){
  var sock = new s2c(req,socket);
  othersocks.push(sock);
  process.nextTick(checkSockets);
});

function checkSockets(){
  if(othersocks.length < 2){
    console.log("not ready");
    return;
  }
  console.log("ready");
}
