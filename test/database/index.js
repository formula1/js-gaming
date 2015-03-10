global.__root = __dirname+"/../../";
var config = require("getconfig");
var database = require(__root+"/bootstrap/database");
var http = require("http");
var router = require('express')();
var child_process = require("child_process");
var browserify = require("browserify");

var testModel = require(__dirname+"/testmodel");
var database = database(config);
database.orm.loadCollection(testModel);
router.get("/api.js",function(req,res,next){
  var b = browserify(__dirname+"/calls");
  res.set('Content-Type', 'application/javascript');
  res.status(200);
  b.bundle().pipe(res);
});
router.get("/",function(req,res,next){
  res.sendFile(__dirname+"/index.html");
});
router.use(database.getRouter());
var server = http.createServer(router);

database.connect(function(err){
  if(err) throw err;
  server.listen(3000,function(err){
    if(err) throw err;
    database.orm.collections.testmodel
    .destroy({},function(err,docs){
      if(err) throw err;
      var fork = child_process.fork(__dirname+"/calls");
    });
  });
});
