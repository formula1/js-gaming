var url = require("url");

function HandleSender(fn,types){
  if(typeof fn !== "function") throw new Error("Handle Sender requires a function");
  this.sendfn = fn;
}

// findout the types of things that can be sent between the two
// example: In browser I can pass webworkers, bloburls, websockets, httprequests

HandleSender.prototype.httpSend = function(req,socket){
  delete req.socket;
  delete req.client;
  delete req.connection;
  delete req._passport;
  console.log("sending");
  this.send(url.parse(req.url).pathname,req,socket);
};

HandleSender.prototype.send = function(path,data,socket){
  if(!socket){
    if(!data.export || typeof data.export !== "function"){
      throw new Error("cannot send without exportable data or a socket");
    }
    data = data.export();
    data[0] = {path:path,data:data[0]};
    return this.sendfn(data[0], data[1]);
  }
  this.sendfn({
    path:path,
    data:data,
  },socket);
};

module.exports = HandleSender;
