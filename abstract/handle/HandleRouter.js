var HandleLayer = require('./HandleLayer');
var url = require("url");
var async = require("async");

function HandleRouter(){
  this.listeners = [];
  this.trigger = this.trigger.bind(this);
}

HandleRouter.prototype.fromHttp = function(request, socket, fn){
  this.trigger(url.parse(request.url).pathname,request,socket,fn);
};

HandleRouter.prototype.fromSender = function(data, socket, fn){
  this.trigger(data.path,data.data,socket,fn);
};


HandleRouter.prototype.trigger = function(path, request, socket, fn){
  var that = this;
  var err;
  async.eachSeries(
    this.listeners,
    function(listener,next){
      listener.run(path,request,socket,err,
        function(newerr,newpath){
        if(newpath) path = newpath;
        if(newerr) err = newerr;
        next();
      });
    },function(){
      if(fn) return fn(err);
      if(err) throw err;
    }
  );
};


HandleRouter.prototype.use = function(fns){
  var that = this;
  if(!Array.isArray(fns)){
    fns = [fns];
  }
  fns.forEach(function(fn){
    if(typeof fn != "function") throw new Error("HandleRouter.use needs functions");
    that.listeners.push(new HandleLayer("middleware","(.*)",fn));
  });
  return this;
};
HandleRouter.prototype.addListener = function(method, key, fn){
  if(typeof fn != "function") throw new Error("HandleRouter."+method+" needs functions");
  this.listeners.push(new HandleLayer(method,key,fn));
  return this;
};
["ws","error"].forEach(function(label){
  HandleRouter.prototype[label] = function(key,fn){
    return this.addListener(label,key,fn);
  };
});

HandleRouter.prototype.off = function(key){
  var l;
  var found = false;
  if(typeof key === "undefined"){
    this.listeners = [];
  }else if(typeof key === "string"){
    l = this.listeners.length;
    while(l--){
      if(this.listeners[l].key == key){
        this.listeners.splice(l,1);
        found = true;
      }
    }
    if(!found) throw new Error("non-existant key");
  }else if(typeof key === "function"){
    l = this.listeners.length;
    while(l--){
      if(this.listeners[l].fn == key){
        this.listeners.splice(l,1);
        found = true;
      }
    }
    if(!found) throw new Error("non-existant function");
  }else{
    throw new Error("turning off a listener requires undefined, a string or function");
  }
  return this;
};

module.exports = HandleRouter;
