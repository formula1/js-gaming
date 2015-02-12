var util = require("util");
var EventEmitter = require("events").EventEmitter;
var _ = require("lodash");

function Player(userjson,socket,matchpool){
  for(var i in userjson){
    this[i] = userjson[i];
  }
  EventEmitter.call(this);
  this.isOnline = true;
  this.socket = handle;
  this.matchpool = matchpool;
  handle.on("message", function(message){
    switch(message.cmd){
      case "find": return this.findMatch();
      case "enter": return this.enterMatch(message.match);
      case "action": return this.doAction(message.match,message.action,message.data);
      case "quit": return this.quit(message.match);
    }
  }.bind(this));
  handle.on("end", this.offline.bind(this));
}
util.inherits(Player,EventEmitter);

Player.prototype.offline = function(){
  this.isOnline = false;
  this.emit("exit");
};

Player.prototype.online = function(socket){
  if(this.isOnline){
    this.error("You have started a new socket",true);
  }
  this.socket = socket;
  this.isOnline = true;
};

Player.prototype.findMatch = function(){
  this.matchPool.findMatch(this);
};

Player.prototype.invite = function(match,inviter,message){
  this.send({
    type:"event",
    purpose:"invitation",
    match:match._id,
    inviter:inviter.name,
    message:message
  });
};

/*
What can be sent?
-match finding data-Choosable/One was successfully created/etc
-Invitations to a match in progress or a match that wants to start
-An action of another player
-The fact that the player was booted

*/
Player.prototype.send = function(data){
  if(!this.isOnline) return;
  this.socket.text(JSON.stringify(data));
};
Player.prototype.error = function(reason,fatal){
  if(!this.isOnline) return;
  this.socket.text(JSON.stringify({
    type:"event",
    purpose:"error",
    reason:reason
  }));
  if(fatal){
    this.socket.close();
    this.isOnline = false;
  }
};

Player.prototype.boot = function(match){
  this.error("The other players have removed you from the game");
};

Player.prototype.enterMatch = function(match){
  this.matchpool
  .find(match)
  .call("requestEntry",this)
  .catch(this.error.bind(this));
};

Player.prototype.doAction = function(match,action,data){
  this.matchpool
  .find(match)
  .call("processAction",this,action,data)
  .catch(this.error.bind(this));
};

Player.prototype.quit = function(match){
  this.matchpool
  .find(match)
  .call("removePlayer",this)
  .catch(this.error.bind(this));
};

module.exports = Player;
