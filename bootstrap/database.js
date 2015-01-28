var mongoose = require("mongoose");

module.exports = function(config,next){
  if(typeof config == "function"){
    next = config;
    config = require("getconfig");
  }
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

  mongoose.connect(url, mconfig.options);

  var db = mongoose.connection;
  var fs = require("fs");

  db.once( "error", function(error){
    db.removeAllListeners();
    process.nextTick(next.bind(void(0),error));
  });
  db.once("open",function(){
    db.removeAllListeners();
    process.nextTick(next.bind(void(0),void(0), mongoose));
  });
};
