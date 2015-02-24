var EventEmitter = require("events").EventEmitter;
var ForkContext = require("./ForkContext.js");

function ForkManager(configs){
  EventEmitter.call(this);
  this.configs = [];
  this.windows = {};
  if(configs)
    setTimeout(this.load.bind(this,configs),1);
}
ForkManager.prototype = Object.create(EventEmitter);
ForkManager.prototype.constructor = ForkManager;

ForkManager.prototype.load = function(configs){
  configs.forEach(this.registerWindow.bind(this));
  this.emit("load");
  return this;
};

ForkManager.prototype.register = function(config,ctx,cb){
  var win;
  if(!(config instanceof FrameContext)){
    win = new FrameContext(this, config);
  }else if(config.id in this.windows){
     return;
  }
  this.windows[config.id] = win;
  this.configs.push(config);
  this.emit("registered", win);
  if(ctx){
    return win.open(ctx,cb);
  }
  return win;
};

module.exports = WindowManager;
