
var http = require('http'),
websocket = require('websocket-driver');
var url = require("url");
var HandleRouter = require(__root+"/abstract/handle/HandleRouter");
var wsrouter = new HandleRouter();

wsrouter.init = function(req,soc,body){
  if (!websocket.isWebSocket(req)) return;
  console.log("socket");
  req.body = body;
  this.fromHttp(req,soc,function(err){
    if(err){
      console.error(err.stack);
    }else{
      console.error("404: "+req.url);
    }
    soc.end();
  });
}.bind(wsrouter);

wsrouter.listen = function(port){
  var server = http.createServer();
  server.on("upgrade",this.init);
  server.listen(port);
};

module.exports = wsrouter;
