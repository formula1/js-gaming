var passport = require("passport");
var fs = require("fs");
var browserify = require("browserify");
var async = require("async");
var mime = require("mime");
var mongoose = require("mongoose");
var Strategy = require("passport-strategy");

function ProviderCompiler(directory,options){
  if (!(this instanceof ProviderCompiler)){
    return new ProviderCompiler(directory);
  }
  this.renderPath = options && options.renderPath?options.renderPath:__root+"/views";
  this.directory = directory?directory:__root+"/user_framework/providers";
  this.UserModel = mongoose.model("User");

  passport.serializeUser(this.UserModel.serialize);
  passport.deserializeUser(this.UserModel.deserialize);
  this.providers = [];
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
    async.map(types, function(name,next){
      var loc, temp, ret = {};
      ret.name = /\.js$/.test(name)?name.substring(0, name.length - 3):name;
      ret.path = _this.directory+"/"+name;
      try{
        ret.provider = require(ret.path);
      }catch(e){
        console.error(name+" has an error: ");
        return next(e);
      }
      if(/\.js$/.test(name)){
        ret.name = name.substring(0, name.length - 3);
        ret.client = false;
        passport.use(ret.provider);
        return next(void(0),ret);
      }
      ret.name = name;
      ret.client = {};
      fs.readdir(ret.path,function(e,files){
        if(e) return next(e);
        var l = files.length;
        while(l--){
          if(/^icon/.test(files[l])){
            if(!/^image\//.test(mime.lookup(files[l]))){
              return next(new Error(name+" has an icon but it is not an image"));
            }
            ret.icon = ret.path+"/"+files[l];
            continue;
          }
          if(/^client(\.js)?$/.test(files[l])){
            try{
              require.resolve(ret.path+"/client");
            }catch(err){
              return next(err);
            }
            _this.clientAPI.require(
              ret.path+"/client",
              {expose:"auth-"+ret.name}
            );
            continue;
          }
          if(/^form.html$/.test(files[l])){
            ret.html=fs.readFileSync(ret.path+"/form.html").toString("utf8");
          }
        }
        passport.use(ret.provider);
        next(void(0),ret);
      });
    },function(err,providers){
      if(err) next(err);
      _this.providers = providers;
      _this.clientAPI.bundle(function(err,buff){
        if(err) next(err);
        this.clientAPI = buff;
        next(void(0),providers);
      });
    });
  });
};

module.exports = ProviderCompiler;
