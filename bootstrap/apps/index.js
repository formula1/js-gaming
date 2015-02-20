var child_process = require("child_process");
var fs = require("fs");
var async = require("async");
var browserify = require("browserify");
var markdown = require("markdown").markdown;
var express = require("express");
var cbpr = require(__root+"/abstract/utility/cbpromise");

var MessageDuplex = require(__root+"/abstract/abstract/MessageDuplex");


function AppCompiler(directory){
  if (!(this instanceof AppCompiler)){
    return new AppCompiler(directory);
  }
  var _this = this;
  this.directory = directory?directory:__root+"/app_framework/apps";
  this.compiled = [];
  this.router = require("./router")(this);
  this.renderware = function(req,res,next){
    res.locals.appsList = _this.compiled;
    next();
  };
}

AppCompiler.prototype.collect = function(next){
  var cbret = cbpr(this,next);
  var _this = this;
  fs.readdir(this.directory,function(e,files){
    async.map(
      files,
      startApp.bind(void(0),_this.directory),
      function(e,apps){
        _this.compiled = apps;
        cbret.cb(e,apps);
      }
    );
  });
  return cbret.ret;
};

function startApp(directory,appfile,next){
  async.waterfall([
    function(next){
      var ret = {};
      ret.path = directory+"/"+appfile;
      ret.name = appfile;
      next(void(0),ret);
    },
    compileFork,
    compileBrowser,
    compileStatic,
    compileReadme,
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
  });
  ret.fork.once("error",function(e){
    clearTimeout(timeout);
    ret.fork.removeAllListeners();
    return next(e);
  });
}

function compileBrowser(ret,next){
  browserify(ret.path+"/client").bundle(function(e,buff){
    ret.client = buff;
    next(e,ret);
  });
}

function compileStatic(ret,next){
  ret.public = express.static(ret.path+"/public");
  next(void(0),ret);
}

function compileReadme(ret,next){
  fs.readFile(ret.path+"/README.md", function(err,file){
    if(err) return next(err);
    ret.readme = markdown.toHTML(file.toString("utf8"));
    next(void(0),ret);
  });

}

module.exports = AppCompiler;