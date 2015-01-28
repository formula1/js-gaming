var config = require("getconfig");

require("./polyfill");

require("./database")(config,function(e,mongo){
  if(e) throw e;
  mongo.connection.on("disconnection", function(){
    console.error(arguments);
    throw new Error("mongo disconnected");
  });
  mongo.connection.on("error", function(e){
    console.error(e);
    throw e;
  });
  require("./server");
});
