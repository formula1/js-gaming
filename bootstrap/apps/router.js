
var express = require("express");

module.exports = function(ob){
  var router = express.Router();
  router.param("appname", function(req,res,next,appname){
    var l = ob.compiled.length;
    while(l--){
      if(ob.compiled[l].name == appname) break;
    }
    if(l < 0) return next(new Error("404"));
    req.theApp = ob.compiled[l];
    next();
  });

  router.get("/:appname", function(req,res,next){
    console.log("appname");
    res.locals.theApp = req.theApp;
    res.render("game/index");
  });
  router.get("/:appname/join", function(req,res,next){
    console.log("joining list");
    res.locals.theApp = req.theApp;
    res.render("game/index");
  });
  router.get("/:appname/public", function(req,res,next){
    console.log("public");
    res.sendFile(req.theApp.path+"/public/index.html");
  });
  router.get("/:appname/public/*", function(req,res,next){
    req.theApp.public(req,res,next);
  });
  router.get("/:appname/client.js", function(req,res,next){
    res.status(200).setHeader('content-type', 'application/javascript');
    res.send(req.theApp.client);
  });
  /*
  router.ws("/:appname",function(req,res,next){
    req.theApp.fork.send({cmd:"socket",user:req.user.toJSON()},res.socket);
  });
  */
  return router;
};
