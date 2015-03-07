var MessageDuplex = require("../message/MessageDuplex");
var SocketRouter = require("../abstract/HandleRouter");

function ProcessContext(){
  MessageDuplex.call(this,function(message){
    process.send({type:"forkdup", msg:message});
  });
  this.socketRouter = new SocketRouter();
}
var newPlayer = new SocketRouter();
newPlayer.on("/apps/:game/:matchid",function(req,sock,next){

});

var parentCom = new MessageDuplex(function(message){
});
process.on("message",function (message,handle){
  if(message.type && message.type !== "message") return;
  parentCom.handleMessage(message.msg);
});
parentCom.add("an_event", function(data){
  console.log("I got an event!!!!!!!");
}).add("match", function(data){
  console.log("new match: "+data.match_id);
  console.log("expected players: ", data.players);
});

parentCom.ready();

process.on("message",function (message,handle){
  if(!message.type){
    console.log("message has no type");
  }
  if(message.type && message.type !== "socket") return;

  var User = new Client(message.data,handle);
  User.user = message.user;
  switch(message.cmd){
    case "enter": return app.playerEnter(User);
    case "match": return app.find().requestEntry(User);
  }
});
process.send("ready");
