
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
  router.use(function(req,res,next){
    if(!req.user) return res.redirect("/auth/login");
    next();
  });
  router.get(/^\/?$/, function(req,res,next){
    res.locals.playerMatches = [];
    res.render("game/index");
  });
  router.get("/:appname/public/*", function(req,res,next){
    req.theApp.public(req,res,next);
  });
  router.get("/:appname/client.js", function(req,res,next){
    console.log("client");
    res.status(200).setHeader('content-type', 'application/javascript');
    res.send(req.theApp.browser);
  });
  router.get("/:appname/:match", function(req,res,next){
    console.log("public");
    res.sendFile(req.theApp.path+"/public/index.html");
  });
  /*
  router.ws("/:appname",function(req,res,next){
    req.theApp.fork.send({cmd:"socket",user:req.user.toJSON()},res.socket);
  });
  */
  return router;
};
