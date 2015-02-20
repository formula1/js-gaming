var passport = require("passport");
var fs = require("fs");
var browserify = require("browserify");
var async = require("async");
var mime = require("mime");
var mongoose = require("mongoose");
var Strategy = require("passport-strategy");
var factory = require("./factory");

function ProviderCompiler(directory,options){
  if (!(this instanceof ProviderCompiler)){
    return new ProviderCompiler(directory);
  }
  this.renderPath = options && options.renderPath?options.renderPath:__root+"/views";
  this.directory = directory?directory:__dirname+"/providers";
  this.providers = [];
  this.UserModel = require(__dirname+"/models/user");
  passport.serializeUser(this.UserModel.serialize);
  passport.deserializeUser(this.UserModel.deserialize);
  var temp = require("./router");
  this.middleware = temp.middleware();
  this.renderware = temp.renderware.bind(this);
  this.router = temp.router(this);
}

ProviderCompiler.prototype.collect = function(next){
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
        if(ret.client && ret.client.api){
          console.log("adding to bundle: "+ret.name);
          _this.clientAPI.require(
            ret.client.api,
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
        next(void(0),_this.providers);
      });
    });
  });
};

module.exports = ProviderCompiler;
