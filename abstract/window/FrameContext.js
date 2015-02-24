var WinAbs = require("./WindowAbstract.js");
var cbpr = require(__dirname+"/../utility/cbpromise");

function FrameContext(manager,winconfig){
  manager.emit("preBuild",winconfig);
  if(!("id" in winconfig)) throw new Error("I want to ensure you are in control");
  this.id = winconfig.id;
  this.manager = manager;
  this.config = winconfig;
  console.log(1);
  Object.defineProperty(this,"state",{
    get: function () {
      if(typeof this.frame == "undefined")
        return "dormant";
      var doc = this.frame[0].contentDocument || this.frame[0].contentWindow.document;
      if (  doc.readyState  != 'complete' )
        return "loading";
      if(!this.channel)
        return "buildingchannel";
      return "running";
    }
  });
  WinAbs.call(this);
  this.buildMethods();
}
FrameContext.prototype = Object.create(WinAbs.prototype);
FrameContext.prototype.constructor = FrameContext;

FrameContext.prototype.open = function(container,cb){
  var cbret = cbpr(this,cb);
  if(this.state != "dormant"){
     return cbret.cb(new Error("This window is already open"));
  }
  if(typeof container == "undefined"){
    return cbret.cb(new Error("To Open, this window needs a container"));
  }
  if(container.prop("tagName").toLowerCase() != "iframe" ||
    container.attr("src") != this.config.url){
    this.frame = '<iframe class="content" data-name="'+this.config.title+'" src="'+this.config.url+'"></iframe>';
    this.frame = $(this.frame);
  }else{
    this.frame = container;
    container = false;
  }
  if(container) container.append(this.frame);
  WinAbs.prototype.open.call(this,this.frame[0].contentWindow,cbret.cb);
  return cbret.ret;
};

FrameContext.prototype.buildMethods = function(){
  var that = this;
  this.add("reverse", function(s,next) {
      console.log("received message: "+s);
      return s.split("").reverse().join("");
  });
};
module.exports = FrameContext;
