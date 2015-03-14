var async = require("async");
var cbpr = require(__root+"/abstract/utility/cbpromise");
var fs = require("fs");

var passport = require("passport");
var browserify = require("browserify");

var factory = require("./factory");
var waterlineinit = require("./waterline");
var provider = require("./models/provider");
var user = require("./models/user");

function ProviderCompiler(waterline,config,options){
  if (!(this instanceof ProviderCompiler)){
    return new ProviderCompiler(waterline,config,options);
  }
  this.renderPath = options && options.renderPath?options.renderPath:__root+"/tempviews/auth";
  this.providers = [];
  var temp = require("./router");
  this.middleware = temp.middleware(config,waterline);
  this.renderware = temp.renderware.bind(this);
  this.router = temp.router(this);
  waterline.loadCollection(provider);
  waterline.loadCollection(user);
  waterlineinit(waterline,passport,this);
  this.waterline = waterline;
}

ProviderCompiler.prototype.addProvider = function(path,next){
  var _this = this;
  factory(path,function(err,ret){
    if(err){
      console.log("Bad Provider: "+path);
      console.log(err);
      return next(false);
    }
    _this.waterline.once("initialize",function(waterline){
      passport.use(ret.provider(waterline.collections._userprovider));
      console.log("using "+ret.name);
    });
    _this.providers.push(ret);
    if(ret.browser){
      console.log("adding to bundle: "+ret.name);
      _this.clientAPI.require(
        ret.browser,
        {expose:"auth-"+ret.name}
      );
    }
    return next(true);
  });
};

ProviderCompiler.prototype.collect = function(directory,next){
  if(typeof directory !== "string"){
    next = directory;
    directory = __dirname+"/providers";
  }
  var cbret = cbpr(this,next);
  var _this = this;
  this.clientAPI = browserify();
  fs.readdir(directory,function(err,types){
    if(err) return next(err);
    async.filter(types,function(type,next){
      _this.addProvider(directory+"/"+type,next);
    },function(results){
      console.log("Good Providers: "+JSON.stringify(results));
      cbret.cb(void(0),_this.providers);
    });
  });
  return cbret.ret;
};

module.exports = ProviderCompiler;
