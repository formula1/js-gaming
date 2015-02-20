var pathToRegexp = require('path-to-regexp');

function GenericRouter(){
  if(this instanceof SocketRouter) return this.trigger.apply(this,arguments);
  this.listeners = [];
}

GenericRouter.prototype.on = function(keymethod){
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

GenericRouter.prototype.off = function(key){
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

GenericRouter.prototype.trigger = function(path){
  var that = this;
  var l = this.listeners.length;
  var hasError = false;
  var args = Array.prototype.slice.call(arguments,1);
  var origlen = args.length;
  var next = function(err,newpath){
    if(err){
      args.push(err);
      path = "error";
    }else if(newpath){
      path = newpath;
      args.splice(origlen,args.length-origlen);
    }
    l--;
    if(l < 0){
      if(path == "error") throw err;
      return;
    }
    if(hasError){
      err = hasError;
    }
    setImmediate(
      SocketRouter.runFunction.bind(
        that.listeners[l],args,next
      )
    );
  };
  next();
};

GenericRouter.runFunction = function(path, args, next){
  var matches = this.regex.exec(path);
  if(matches === null) return next();
  matches.shift();
  var l = this.params.length;
  var params = {};
  while(l--){
    if(typeof matches[l] == "undefined" && !this.params[l].optional) return next();
    params[this.params[l].name] = matches[l];
  }
  var result;
  try{
    result = this.fn.apply(this.fn,[params].concat(args).push(next));
  }catch(e){
    return next(e);
  }
  if(typeof result != "undefined"){
    if(result === null) result = void(0);
    next(void(0),result);
  }
};

module.exports = MessageRouter;
