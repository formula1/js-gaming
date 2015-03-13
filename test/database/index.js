global.__root = __dirname+"/../../";
var config = require("getconfig");
var database = require(__root+"/bootstrap/database");
var http = require("http");
var router = require('express')();
var child_process = require("child_process");
var browserify = require("browserify");

var testModel = require(__dirname+"/testmodel");
var depModel = require(__dirname+"/modular-approach");
var database = database(config);


//initiate our models
database.orm.loadCollection(testModel);
depModel(database.orm);


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
//  console.log(database.orm.collections.testmodel.waterline.collections.validator);
  server.listen(3000,function(err){
    if(err) throw err;
    database.orm.collections.testmodel
    .destroy({},function(err,docs){
      if(err) throw err;
      child_process.fork(__dirname+"/calls").on("close",function(){
        child_process.fork(__dirname+"/modular-calls").on("close",function(){

        });
      });
    });
  });
});
