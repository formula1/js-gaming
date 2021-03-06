var http = require("http");
global.__root = __dirname+"/../..";
var HandleRouter = require(__root+"/abstract/handle/HandleRouter");

var config = require("getconfig");

var database = require(__root+"/bootstrap/database")(config);
var userserver = require(__root+"/bootstrap/user");
var appserver = require(__root+"/bootstrap/apps")();

var server = new http.Server();


var serverRouter = new HandleRouter();
server.on("upgrade",function(req,soc,body){
  console.log("upgrade");
  req.body = body;
  serverRouter.fromHttp(req,soc,function(err){
    soc.end();
    if(err) throw err;
    throw "404 "+req.url;
  });
});

database.collect(function(e,mongo){
  if(e) throw e;
  console.log("Database finished");
  userserver = userserver(void(0),void(0),{

  });
  userserver.collect(function(e,providers){
    if(e) throw e;
    appserver.collect(function(e,applist){
      if(e) throw e;
      serverRouter
        .use(userserver.middleware)
        .use(appserver.wsrouter);
      server.listen(3000);
      console.log("listining");
    });
  });
});
