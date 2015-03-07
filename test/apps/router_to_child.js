var http = require("http");
var child_process = require("child_process");
var ProcessAbstract = require("../../abstract/process/ProcessAbstract");
var fork = new ProcessAbstract(child_process.fork(__dirname+"/child",["child"]));
var server = new http.Server();

server.on("upgrade",function(req,socket){
  console.log("upgrade");
  fork.handle.httpSend(req,socket);
});

server.listen(3000);
