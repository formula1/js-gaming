
var EventEmitter = require("events").EventEmitter;

function Timer(inittime){
  EventEmitter.call(this);
  this.time = inittime || 0;
  this.timeChecker =  setInterval(this.updateClock.bind(this), 10);
  this.expired = false;
  this.on("newListener", this.newListener.bind(this));
}

Timer.prototype = Object.create(EventEmitter.prototype);
Timer.prototype.constructor = Timer;

Timer.prototype.newListener = function(event,fn){
  if(event == "timeout" && this.expired) return fn();
};

Timer.prototype.setTime = function(newTime){
  this.time= newTime+Date.now();
  if(newTime === 0){
    if(!this.timeChecker) throw new Error("this timer has already expired");
    this.timeout();
  }
  if(!this.timeChecker){
    this.timeChecker =  setInterval(this.updateClock.bind(this), 10);
  }
};

Timer.prototype.updateClock = function(){
  var now = Date.now();
  var time = this.time - now;
  if(this.time - now <= 0){
    this.timeout();
  }else{
    this.emit("tick",time);
  }
};

Timer.prototype.timeout = function(){
  var time = -1;
  this.expired = true;
  clearInterval(this.timeChecker);
  this.timeChecker = void(0);
  this.emit("timeout");
};

module.exports = Timer;
