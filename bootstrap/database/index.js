var mongoose = require("mongoose");
var fs = require("fs");
var cbpr = require(__root+"/abstract/utility/cbpromise");


function ModelCompiler(config){
  if(!(this instanceof ModelCompiler)) return new ModelCompiler(config);
  config = config?config:require("getconfig");
  if(config.isDev) mongoose.set("debug", true);
  if(!config.mongodb)
    throw new Error(
      "a mongoose configuration is required in the config.json"
    );
  var mconfig = config.mongodb;
  var url = "";
  if(typeof mconfig.hostname != "string")
  throw new Error(
    "\"hostname\" is a required \"mongodb\" property in config.json"
  );
  if(typeof mconfig.port != "number")
  throw new Error(
    "\"port\" is a required \"mongodb\" property in config.json"
  );
  url = "mongodb://";
  if(typeof mconfig.user == "undefined" || typeof mconfig.password == "undefined"){
    if(config.isDev){
      console.warn(
        "No User and/or Password Available. \n" +
        "When moving to production, its important to create a \n" +
        "\"username\" and \"password\" to keep your data safe"
      );
    }else{
      throw new Error(
        "\"user\" and \"password\" are required \"mongodb\" properties in config.json"
      );
    }
  }else{
    url += mconfig.user + ":" + mconfig.password + "@";
  }

  url += mconfig.hostname + ":" + mconfig.port + "/" + (mconfig.database||"");

  this.url = url;
  this.options = mconfig.options;
}

ModelCompiler.prototype.collect = function(next){
  var cbret = cbpr(this,next);
  mongoose.connect(this.url, this.options);
  var db = mongoose.connection;
  db.once( "error", function(err){
    db.removeAllListeners();
    cbret.cb(err);
  });
  db.once("open",function(){
    db.removeAllListeners();
    fs.readdir(__root+"/models",function(err,files){
      if(err) return cbret.cb(err);
      var l = files.length;
      while(l--){
        require(__root+"/models/"+files[l]);
      }
      cbret.cb(void(0),mongoose);
    });
  });
  return cbret;
};

ModelCompiler.prototype.router = require("./router");



module.exports = ModelCompiler;
