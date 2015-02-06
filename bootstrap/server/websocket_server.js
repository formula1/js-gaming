
var http = require('http'),
websocket = require('websocket-driver');
var genrouter = require("./generic_router.js");
var server = http.createServer();
var url = require("url");

server.on('upgrade', function(request, socket, body) {
  if (!websocket.isWebSocket(request)) return;
  console.log(request);

  genrouter(request,{},function(err){
    if(err) return socket.close();
    var uri = url.parse(request.url);
    var path = uri.path.split("/");
    path.shift();
  });
});

server.listen(config.websocket.port);

console.log('WebSocket Server is running at: http://localhost:' + config.websocket.port + '.');
