
var express = require("express");

module.exports = function(ob){
  var router = express.Router();
  router.param("/:appname", function(req,res,next,appname){
    var l = ob.compiled.length;
    while(l--){
      if(ob.compiled.name == appname) break;
    }
    if(l < 0) return next(new Error("404"));
    req.theApp = this.compiled[l];
    next();
  });

  router.get("/:appname", function(req,res,next){

  });

  router.get("/:appname/public", function(req,res,next){
    req.theApp.public(req,res,next);
  });

  router.get("/:appname/client.js", function(req,res,next){
    res.status(200).setHeader('content-type', 'application/javascript');
    req.theApp.client.pipe(res);
  });
  return router;
};
