var pathToRegexp = require('path-to-regexp');

function SocketRouter(){
  if(this instanceof SocketRouter) return this.trigger.apply(this,arguments);
  this.listeners = [];
}

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

SocketRouter.prototype.trigger = function(path, request, socket, fn){
  var that = this;
  var l = this.listeners.length;
  var hasError = false;
  fn = fn?fn:function(err){ if(err) throw err; };
  var next = function(err,newpath){
    if(err){
      hasError = err;
      path = "error";
    }else if(newpath){
      path = newpath;
    }
    l--;
    if(l < 0){
      if(path == "error") setImmediate(fn.bind(fn,err));
      return;
    }
    if(hasError){
      err = hasError;
    }
    setImmediate(
      SocketRouter.runFunction.bind(
        that.listeners[l],
        path,request,socket,err,next
      )
    );
  };
  next();
};

SocketRouter.runFunction = function(path, request, socket, err, next){
  var matches = this.regex.exec(path);
  if(matches === null) return next();
  matches.shift();
  var l = this.params.length;
  request.params = {};
  while(l--){
    if(typeof matches[l] == "undefined" && !this.params[l].optional) return next();
    request.params[this.params[l].name] = matches[l];
  }
  var result;
  try{
    if(err){
      result = this.fn(request,socket,err,next);
    }else{
      result = this.fn(request,socket,next);
    }
  }catch(e){
    return next(e);
  }
  if(typeof result != "undefined"){
    if(result === null) result = void(0);
    next(void(0),result);
  }
};

module.exports = SocketRouter;
