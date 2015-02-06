var child_process = require("child_process");
var fs = require("fs");
var async = require("async");


module.exports.collectApps = function(directory){
  if(!directory) directory = __root+"/apps";
  var apps = fs.readdirSync(directory);
  var appCollection = {};

  async.each(apps,function(appfile,next){
    var ret = {};
    ret.name = appfile;
    ret.fork = child_process.fork("appFramework", [__root+"/apps/"+appfile]);
    
  },function(err,results){

  });
};
