
var http = require('http'),
websocket = require('websocket-driver');
var server = http.createServer();
var url = require("url");
var express = require("express");
var router = express.Router();
server.on('upgrade', function(request, socket, body) {
  if (!websocket.isWebSocket(request)) return;
  console.log(request);
  router(request,{},function(err){
    if(err) return socket.end();
    var uri = url.parse(request.url);
    var path = uri.path.split("/");
    path.shift();
    console.log(request.user);
    socket.end();
  });
});

module.exports = server;
module.exports.router = router;
