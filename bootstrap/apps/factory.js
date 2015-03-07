var async = require("async");
var fs = require("fs");

var mime = require("mime");
var markdown = require("markdown").markdown;
var express = require("express");
var browserify = require("browserify");
var child_process = require("child_process");
var ProcessAbstract = require(__root+"/abstract/process/ProcessAbstract");



function startApp(path,next){
  async.waterfall([
    function(next){
      var ret = {};
      ret.path = path;
      ret.name = path.split("/").pop();
      next(void(0),ret);
    },
    compilePackage,
    compileClient,
    gameConfig,
    compileFork,
    compileProcessAbstract,
  ],next);
}

function compileFork(ret,next){
  console.log("creating fork: "+ret.name);
  try{
    require.resolve(ret.path);
  }catch(e){
    return setImmediate(next.bind(next,e));
  }
  var fork;
  try{
    fork = child_process.fork(__dirname+"/sdk",[ret.path],{cwd:ret.path});
  }catch(e){
    return next(e);
  }
  var errlist, timeout, msglist;
  errlist = function(e){
    clearTimeout(timeout);
    fork.removeListener("message",msglist);
    try{
      fork.kill();
    }catch(err){
      //just kill.
    }
    return next(e);
  };
  msglist = function(m){
    clearTimeout(timeout);
    fork.removeListener("error",errlist);
    if(m != "ready"){
      fork.kill();
      return next(new Error("fork process sending messages before initialization"));
    }
    next(void(0),ret,fork);
  };
  fork.once("error",errlist);
  fork.once("message",msglist);
  timeout = setTimeout(function(){
    fork.removeListener("message",msglist);
    fork.removeListener("error",errlist);
    fork.kill();
    return next(new Error(ret.name+"'s fork process timed out, this may be due to long syncrounous code on initialization'"));
  }, 5000);
}

function compileProcessAbstract(ret,fork,next){
  ret.fork = new ProcessAbstract(fork);
  next(void(0),ret);
}

function compilePackage(ret,next){
  ret.client = {};
  fs.readdir(ret.path,function(err,files){
    if(err) return next(err);
    if(files.indexOf("package.json") === -1){
      return files2JSON(ret,files,next);
    }
    fs.readFile(ret.path+"/package.json",function(err,pkg){
      if(err) return next(err);
      try{
        ret.package = JSON.parse(pkg.toString("utf8"));
      }catch(e){
        return next(e);
      }
      next(void(0),ret,files);
    });
  });
}

function compileClient(ret,files,next){
  if(ret.package.browser) ret.browser = ret.package.browser;
  if(ret.package.client) ret.client = ret.package.client;
  if(!ret.package.client || !ret.package.browser){
    return files2JSON(ret,files,next);
  }
  validateClient(ret,next);
}

function files2JSON(ret,files,next){
  var l = files.length;
  while(l--){
    if(!ret.client.public && /^public$/.test(files[l])){
      ret.client.public = ret.path+"/"+files[l];
      if(ret.browser && ret.client.readme) break;
      continue;
    }
    if(!ret.browser && /^browser(\.js)?$/.test(files[l])){
      ret.browser = ret.path+"/"+files[l];
      if(ret.client.public && ret.client.readme) break;
      continue;
    }
    if(!ret.client.readme && /^README\./.test(files[l])){
      ret.client.readme = ret.path+"/"+files[l];
      if(ret.client.public && ret.client.browser) break;
    }
  }
  validateClient(ret,next);
}

function validateClient(ret,next){
  var torun = [];
  torun.push(function(next){
    next(void(0),ret);
  });
  if(ret.client.readme) torun.push(validateReadme);
  if(ret.browser) torun.push(validateBrowser);
  if(ret.client.public) torun.push(validatePublic);
  async.waterfall(torun,next);
}

function validateBrowser(ret,next){
  browserify()
  .add("setimmediate")
  .add(ret.browser)
  .bundle(function(e,buff){
    ret.browser = buff;
    next(e,ret);
  });
}

function validatePublic(ret,next){
  ret.public = express.static(ret.client.public);
  next(void(0),ret);
}

function validateReadme(ret,next){
  fs.readFile(ret.client.readme, function(err,file){
    if(err) return next(err);
    var type = mime.lookup(ret.client.readme);
    if(type === "text/html"){
      ret.readme = file.toString("utf8");
    }else if(type === "text/x-markdown"){
      ret.readme = markdown.toHTML(file.toString("utf8"));
    }else{
      ret.readme = "<pre>"+file.toString("utf8")+"</pre>";
    }
    next(void(0),ret);
  });
}

function gameConfig(ret,next){
  if(!ret.package.game){
    ret.max_players = ret.min_players = 1;
    return next(void(0),ret);
  }
  ret.min_players = ret.package.game.minimum_players||1;
  ret.max_players = ret.package.game.maximum_players||ret.min_players;
  if(ret.max_players == "infinity") ret.max_players = Number.POSITIVE_INFINITY;
  next(void(0),ret);
}


module.exports = startApp;
