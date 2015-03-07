var async = require("async");
var cbpr = require(__root+"/abstract/utility/cbpromise");
var fs = require("fs");

var passport = require("passport");
var browserify = require("browserify");

var factory = require("./factory");


function ProviderCompiler(directory,options,config){
  if (!(this instanceof ProviderCompiler)){
    return new ProviderCompiler(directory);
  }
  this.renderPath = options && options.renderPath?options.renderPath:__root+"/tempviews/auth";
  this.directory = directory?directory:__dirname+"/providers";
  this.providers = [];
  this.UserModel = require(__dirname+"/models/user");
  passport.serializeUser(this.UserModel.serialize);
  passport.deserializeUser(this.UserModel.deserialize);
  var temp = require("./router");
  this.middleware = temp.middleware(config);
  this.renderware = temp.renderware.bind(this);
  this.router = temp.router(this);
}

ProviderCompiler.prototype.collect = function(next){
  var cbret = cbpr(this,next);
  var _this = this;
  this.clientAPI = browserify();
  fs.readdir(this.directory,function(err,types){
    if(err) return next(err);
    async.filter(types,function(type,next){
      factory(_this.directory+"/"+type,function(err,ret){
        if(err){
          console.log("Bad Provider: "+type);
          console.log(err);
          return next(false);
        }
        passport.use(ret.provider);
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
    },function(results){
      console.log("Good Providers: "+JSON.stringify(results));
      _this.clientAPI.bundle(function(err,buff){
        if(err) next(err);
        _this.clientAPI = buff;
        cbret.cb(void(0),_this.providers);
      });
    });
  });
  return cbret.ret;
};

module.exports = ProviderCompiler;
