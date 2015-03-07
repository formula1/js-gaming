var async = require("async");
var cbpr = require(__root+"/abstract/utility/cbpromise");
var fs = require("fs");

var factory = require("./factory");
var MatchMaker = require("./matchmaker");

function AppCompiler(directory){
  if (!(this instanceof AppCompiler)){
    return new AppCompiler(directory);
  }
  var _this = this;
  this.directory = directory?directory:__dirname+"/apps";
  this.compiled = [];
  this.router = require("./router")(this);
  this.wsrouter = require("./wsrouter.js")(this);
  this.renderware = function(req,res,next){
    res.locals.appsList = _this.compiled;
    next();
  };
}

AppCompiler.prototype.collect = function(next){
  var cbret = cbpr(this,next);
  var _this = this;
  fs.readdir(this.directory,function(err,types){
    if(err) return next(err);
    async.filter(types,function(type,next){
      factory(_this.directory+"/"+type,function(err,ret){
        if(err){
          console.log("Bad App: "+type);
          console.log(err);
          return next(false);
        }
        _this.compiled.push(ret);
        return next(true);
      });
    },function(results){
      _this.matchmaker = new MatchMaker(_this.compiled);
      console.log("Good Apps: "+JSON.stringify(results));
      cbret.cb(void(0),_this.compiled);
    });
  });
  return cbret.ret;
};

module.exports = AppCompiler;
