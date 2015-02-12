var config = require("getconfig");
require("./polyfill");

var database = require("./database")(config);
var appserver = require("./apps")();
var userserver = require("./user");
var httpserver = require("./httpserver");
var wsserver = require("./wsserver");

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
      var test = require("./httpserver/test");

      // -----------------
      // Enable Sessions and cookies
      // -----------------
      httpserver
      .use(userserver.middleware)
      .use(appserver.renderware)
      .use(userserver.renderware);
      test.middleware(httpserver);

      // listen for incoming http requests on the port as specified in our config
      httpserver
      .use("/games",appserver.router)
      .use("/api",database.router)
      .use("/auth",userserver.router)
      .use('/temp', require(__root+"/abstract/temporaryRouter"));
      test.routes(httpserver);

      httpserver.listen(config.http.port);
      console.log('HTTP is running at: http://localhost:' + config.http.port + '.');

      wsserver.router.use(userserver.middleware);
      wsserver.listen(config.websocket.port);
      console.log('WebSocket Server is running at: http://localhost:' + config.websocket.port + '.');
    });
  });
});
