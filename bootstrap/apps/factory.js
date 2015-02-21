var async = require("async");
var fs = require("fs");

var mime = require("mime");
var markdown = require("markdown").markdown;
var express = require("express");
var browserify = require("browserify");
var child_process = require("child_process");
var MessageDuplex = require(__root+"/abstract/message/MessageDuplex");



function startApp(path,next){
  async.waterfall([
    function(next){
      var ret = {};
      ret.path = path;
      ret.name = path.split("/").pop();
      next(void(0),ret);
    },
    compileFork,
    compileDuplex,
    compilePackage,
  ],next);
}

function compileFork(ret,next){
  console.log("creating fork: "+ret.name);
  try{
    require.resolve(ret.path);
  }catch(e){
    return process.nextTick(next.bind(next,e));
  }
  try{
    ret.fork = child_process.fork(__root+"/app_framework/sdk",[ret.path],{
      cwd:ret.path,
      env:{TERM:process.env.TERM}
    });
  }catch(e){
    return next(e);
  }
  var timeout = setTimeout(function(){
    ret.fork.removeAllListeners();
    ret.fork.kill();
    return next(new Error(j.title+"'s fork process timed out, this may be due to long syncrounous code on initialization'"));
  }, 5000);
  ret.fork.once("message",function(m){
    clearTimeout(timeout);
    ret.fork.removeAllListeners();
    if(m != "ready"){
      ret.fork.kill();
      return next(new Error("fork process sending messages before initialization"));
    }
    next(void(0),ret);
  });
  ret.fork.once("error",function(e){
    clearTimeout(timeout);
    ret.fork.removeAllListeners();
    return next(e);
  });
}

function compileDuplex(ret,next){
  ret.dup = new MessageDuplex(function(message){
    ret.fork.send({type:"forkdup", msg:message});
  });
  ret.fork.on("message", function(message,handle){
    if(message.type && message.type === "forkdup"){
      ret.dup.handleMessage(message.msg);
    }
  });
  ret.dup.ready();
  ret.dup.trigger("an_event");
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
        pkg = JSON.stringify(pkg.toString("utf8"));
      }catch(e){
        return next(e);
      }
      if(pkg.browser) ret.browser = pkg.browser;
      if(pkg.client) ret.client = pkg.client;
      if(!pkg.providerClient || !pkg.browser){
        return files2JSON(ret,files,next);
      }
      validateClient(ret,next);
    });
  });
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
  browserify(ret.browser).bundle(function(e,buff){
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

module.exports = startApp;
