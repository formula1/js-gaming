var pathToRegExp = require('path-to-regexp');
var url = require("url");

function SocketRouter(){
  if(!(this instanceof SocketRouter)){
    return new SocketRouter();
  }
  this.listeners = [];
  this.trigger = this.trigger.bind(this);
}

SocketRouter.prototype.trigger = function(request, socket, fn){
  var path = url.parse(request.url).pathname;
  var that = this;
  var l = this.listeners.length;
  var i = 0;
  fn = fn?fn:function(err){ if(err) throw err; };
  var next = function(err,newpath){
    if(newpath){
      path = newpath;
    }
    if(i === l){ return setImmediate(fn.bind(fn,err)); }
    setImmediate(
      SocketRouter.runFunction.bind(
        that.listeners[i],
        path,request,socket,err,next
      )
    );
    i++;
  };
  next();
};


SocketRouter.prototype.use = function(fns){
  var that = this;
  if(!Array.isArray(fns)){
    fns = [fns];
  }
  fns.forEach(function(fn){
    if(typeof fn != "function") throw new Error("SocketRouter.use needs functions");
    that.listeners.push({
      method: "ws",
      key: "middleware",
      regex: /.*/,
      fn: fn,
    });
  });
  return this;
};

SocketRouter.prototype.on = function(keymethod){
  if(!keymethod)
    throw new Error("need either a Object{key:function}, a key and function");
  var that = this;
  var ob = {};
  var ret;
  if(arguments.length == 2){
    ob[arguments[0]] = arguments[1];
  }else{
    ob = keymethod;
  }

  Object.keys(ob).forEach(function(key){
    var item = {};
    item.method = "ws";
    item.key = key;
    item.regex = pathToRegExp(key,item.params);
    item.fn = ob[key];
    that.listeners.push(item);
  });
  return this;
};

SocketRouter.prototype.error = function(keymethod){
  if(!keymethod)
    throw new Error("need either a Object{key:function}, a key and function");
  var that = this;
  var ob = {};
  var ret;
  if(arguments.length == 2){
    ob[arguments[0]] = arguments[1];
  }else{
    ob = keymethod;
  }

  Object.keys(ob).forEach(function(key){
    var item = {};
    item.method = "error";
    item.key = key;
    item.regex = pathToRegExp(key,item.params);
    item.fn = ob[key];
    that.listeners.push(item);
  });
  return this;
};


SocketRouter.prototype.off = function(key){
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

SocketRouter.runFunction = function(path, request, socket, err, next){
  if(err && this.method != "error") return next(err);
  if(!err && this.method != "ws") return next();
  var matches = this.regex.exec(path);
  if(matches === null){
    console.error("no matches");
    return next();
  }
  matches.shift();
  request.params = {};
  if(this.params){
    var l = this.params.length;
    while(l--){
      if(typeof matches[l] == "undefined" && !this.params[l].optional){
        console.error("missing required params");
        return next();
      }
      request.params[this.params[l].name] = matches[l];
    }
  }
  var result;
  try{
    if(err){
      result = this.fn(request,socket,err,next);
    }else{
      result = this.fn(request,socket,next);
    }
  }catch(e){
    console.error(e);
    return next(e);
  }
  if(typeof result != "undefined"){
    console.log("have result: "+JSON.stringify(result));
    if(result === null) result = void(0);
    next(void(0),result);
  }
};

module.exports = SocketRouter;
