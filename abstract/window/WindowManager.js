var util = require("util");
var EventEmitter = require("events").EventEmitter;
var FrameContext = require("./FrameContext.js");

function WindowManager(configs){
  EventEmitter.call(this);
  this.configs = [];
  this.windows = {};
  if(configs)
    setTimeout(this.initialize.bind(this,configs),10);
}
util.inherits(WindowManager,EventEmitter);

WindowManager.prototype.load = function(configs){
  console.log("loading");
  configs.forEach(this.registerWindow.bind(this));
  console.log("done");
  this.emit("load");
  return this;
};

WindowManager.prototype.registerWindow = function(config){
  var win;
  if(!(config instanceof FrameContext)){
    win = new FrameContext(this, config);
  }else if(config.id in this.windows){
     return;
  }
  this.windows[config.id] = win;
  this.configs.push(config);
  this.emit("registered", win);
  return this;
};
