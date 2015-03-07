var pathToRegExp = require('path-to-regexp');


function HandleLayer(method,key,fn){
  this.method = method;
  this.key = key;
  this.fn = fn;
  this.params = [];
  this.regex = pathToRegExp(key,this.params);
  if(this.params.length === 0 || key == "(.*)"){
    this.params = void(0);
  }
}

HandleLayer.prototype.parseParams = function(path){
  var matches = this.regex.exec(path);
  if(matches === null){
    console.error(path+" / "+this.regex+": no matches");
    return false;
  }
  matches.shift();
  ret = {};
  if(this.params){
    var l = this.params.length;
    while(l--){
      if(typeof matches[l] == "undefined" && !this.params[l].optional){
        console.error("missing required params");
        return false;
      }
      ret[this.params[l].name] = matches[l];
    }
  }
  return ret;
};

HandleLayer.prototype.run = function(path,data,socket,err,next){
  if(err && this.method != "error") return next(err);
  if(!err && this.method == "error") return next();
  data.params = this.parseParams(path);
  if(!data.params) return next();
  var result;
  try{
    if(err){
      result = this.fn(data,socket,err,next);
    }else{
      result = this.fn(data,socket,next);
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

module.exports= HandleLayer;
