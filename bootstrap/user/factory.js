
var async = require("async");
var passport = require("passport");
var mime = require("mime");
var fs = require("fs");
var browserify = require("browserify");

var IS_FILE = /\.js$/;
var MAX_CLIENT_API_SIZE = 500000;

function compileProvider(path,next){
  async.waterfall([
    function(next){
      var name = path.split("/").pop();
      var ret = {};
      ret.isFile = IS_FILE.test(name);
      ret.name = ret.isFile?name.substring(0, name.length - 3):name;
      ret.path = path;
      next(void(0), ret);
    },
    passportUse,
    compileAsModule //here it will branch
  ],next);
}
function passportUse(ret,next){
  try{
    ret.provider = require(ret.path);
    next(void(0),ret);
  }catch(e){
    return next(e);
  }
}

function compileAsModule(ret,next){
  ret.client = {};
  if(ret.isFile) return next(void(0),ret);
  fs.readdir(ret.path,function(err,files){
    if(err) return next(err);
    if(files.indexOf("package.json") === -1){
      return files2JSON(ret,files,next);
    }
    fs.readFile(ret.path+"/package.json",function(err,pkg){
      if(err) return next(err);
      try{
        pkg = JSON.stringify(pkg.toString("utf8"));
      }catch(e){
        return next(e);
      }
      if(!pkg.providerClient) return files2JSON(ret,files,next);
      ret.client = pkg.providerClient;
      validateClient(ret,next);
    });
  });
}

function files2JSON(ret,files,next){
  var l = files.length;
  while(l--){
    if(/^icon\./.test(files[l])){
      ret.client.icon = ret.path+"/"+files[l];
      if(ret.client.api && ret.client.form) break;
      continue;
    }
    if(/^client(\.js)?$/.test(files[l])){
      ret.client.api = ret.path+"/"+files[l];
      if(ret.client.icon && ret.client.form) break;
      continue;
    }
    if(/^form.html$/.test(files[l])){
      ret.client.form = ret.path+"/"+files[l];
      if(ret.client.icon && ret.client.api) break;
    }
  }
  validateClient(ret,next);
}

function validateClient(ret,next){
  var torun = [];
  torun.push(function(next){
    next(void(0),ret);
  });
  if(ret.client.icon) torun.push(validateIcon);
  if(ret.client.api) torun.push(validateAPI);
  if(ret.client.form) torun.push(validateForm);
  async.waterfall(torun,next);
}

function validateIcon(ret,next){
  fs.stat(ret.icon,function(err,stats){
    if(err) return next(err);
    if(!/^image\//.test(mime.lookup(ret.icon))){
      return next(ret.name+" has an icon but it is not an image");
    }
    next(void(0),ret);
  });
}

function validateAPI(ret,next){
  try{
    require.resolve(ret.client.api);
  }catch(err){
    return next(err);
  }
  var b = browserify();
  b.require(ret.client.api);
  b.bundle(function(err,buff){
    if(err) return next(err);
    if(buff.length > MAX_CLIENT_API_SIZE){
      return next("Client Api for "+ret.name+" is too large"+buff.length);
    }
    next(void(0),ret);
  });
  //todo make sure the requirable module can execute
}

function validateForm(ret,next){
  fs.readFile(ret.client.form,function(err,file){
    if(err) return next(err);
    ret.client.form = file.toString("utf8");
    next(void(0),ret);
  });
}

module.exports = compileProvider;
