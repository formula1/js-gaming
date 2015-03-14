var config = require("getconfig");
require("./polyfill");

var database = require("./database")(config);
var http = require("http");
var httpserver = require("./httpserver");
var wsserver = require("./wsserver");

var appserver = require("./apps")();
var chatroom = require("./chatroom");
var userserver = require("./user");
//var matchmaker = require("./matchmaker");


console.log("Database finished");
userserver = userserver(database.orm);
userserver.collect(function(e,providers){
  if(e) throw e;
  console.log("UserServer finished");
  appserver.collect(function(e,applist){
    if(e) throw e;
    console.log("AppServer finished");

//      matchmaker = matchmaker();
    var test = require("./httpserver/test");
    database.connect(function(e){
      if(e) throw e;

      // -----------------
      // Enable Sessions and cookies
      // -----------------
      httpserver
      .get("/api.js",require(__root+"/abstract/messageAPI.js"))
      .use(function(req,res,next){
        res.locals.routePaths = {
          apps:"/apps",
          api:"/api",
          user:"/auth",
          match:"/match",
          index:"/temp",
        };
        next();
      })
      .use(userserver.middleware)
      .use(appserver.renderware)
      .use(userserver.renderware);
      test.middleware(httpserver);

      // listen for incoming http requests on the port as specified in our config
      httpserver
      .use("/apps",appserver.router)
      .use("/api",database.getRouter())
      .use("/auth",userserver.router)
//      .use("/match",matchmaker.router)
      .use('/temp', function(req,res,next){
        res.render("generic");
      });
      test.routes(httpserver);

      wsserver
      .use(userserver.middleware)
      .use(appserver.wsrouter);

      var server = new http.Server();
      server.on("request",httpserver);
      server.on("upgrade",wsserver.init);

      server.listen(config.http.port);
      console.log('HTTP and WebSocket is running at: http://localhost:' + config.http.port + '.');
    });
  });
});
