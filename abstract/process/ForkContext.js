var ProAbs = require("./PrcoessAbstract.js");
var cbpr = require(__dirname+"/../utility/cbpromise");

function ForkContext(manager,forkconfig){
  manager.emit("preBuild",forkconfig);
  if(!("id" in winconfig)) throw new Error("I want to ensure you are in control");
  this.id = winconfig.id;
  this.manager = manager;
  this.config = forkconfig;
  console.log(1);
  Object.defineProperty(this,"state",{
    get: function () {
      if(typeof this.frame == "undefined")
        return "dormant";
      var doc = this.fork.connected;
      if (  ! this.fork.connected )
        return "loading";
      if(!this.channel)
        return "buildingchannel";
      return "running";
    }
  });
  ProAbs.call(this);
  this.buildMethods();
}
ForkContext.prototype = Object.create(ProAbs.prototype);
ForkContext.prototype.constructor = ForkContext;

ForkContext.prototype.open = function(cb){
  var cbret = cbpr(this,cb);
  if(this.state != "dormant"){
     return cbret.cb(new Error("This fork is already open"));
  }
  try{
    require.resolve(this.config.path);
  }catch(e){
    return cbret.cb(e);
  }
  var that = this;
  var fork;
  try{
    fork = child_process.fork(this.config.path,{
      cwd:this.config.path,
      env:{TERM:process.env.TERM}
    });
  }catch(e){
    return cbret.cb(e);
  }
  var timeout = setTimeout(function(){
    ret.fork.removeAllListeners();
    ret.fork.kill();
    return cbret.cb(new Error(j.title+"'s fork process timed out, this may be due to long syncrounous code on initialization'"));
  }, 5000);
  fork.once("message",function(m){
    clearTimeout(timeout);
    ret.fork.removeAllListeners();
    if(m != "ready"){
      ret.fork.kill();
      return cbret.cb(new Error("fork process sending messages before initialization"));
    }
    next(void(0),ret);
  });
  fork.once("error",function(e){
    clearTimeout(timeout);
    ret.fork.removeAllListeners();
    return cbret.cb(e);
  });
  this.fork = fork;
  if(container) container.append(this.frame);
  ProAbs.prototype.open.call(this,this.frame[0].contentWindow,cbret.cb);
  return cbret.ret;
};

ForkContext.prototype.buildMethods = function(){
  var that = this;
  this.add("reverse", function(s,next) {
      console.log("received message: "+s);
      return s.split("").reverse().join("");
  });
};
module.exports = FrameContext;
