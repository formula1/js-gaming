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


database.collect(function(e,mongo){
  if(e) throw e;
  mongo.connection.on("disconnection", function(){
    console.error(arguments);
    throw new Error("mongo disconnected");
  });
  mongo.connection.on("error", function(e){
    console.error(e);
    throw e;
  });
  console.log("Database finished");
  userserver = userserver();
  userserver.collect(function(e,providers){
    if(e) throw e;
    console.log("UserServer finished");
    appserver.collect(function(e,applist){
      if(e) throw e;
      console.log("AppServer finished");

//      matchmaker = matchmaker();
      var test = require("./httpserver/test");

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
      .use("/api",database.router)
      .use("/auth",userserver.router)
//      .use("/match",matchmaker.router)
      .use('/temp', function(req,res,next){
        res.render("generic");
      });
      test.routes(httpserver);

      wsserver
      .on("*",userserver.middleware)
      .on("/apps",appserver.wsrouter);

      var server = new http.Server();
      server.on("request",httpserver);
      server.on("upgrade",wsserver.init);

      server.listen(config.http.port);
      console.log('HTTP and WebSocket is running at: http://localhost:' + config.http.port + '.');
    });
  });
});
