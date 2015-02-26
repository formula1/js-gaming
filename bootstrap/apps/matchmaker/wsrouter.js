var url = require("url");
var SocketRouter = require(__root+"/abstract/abstract/SocketRouter");
var Client = require(__root+"/abstract/clientserver/server2client");
var _ = require("lodash");

module.exports = function(app){
  var router = new SocketRouter();
  router.on("/apps",function(req,socket,next){
    console.log("hit apps");
    if(!req.user) return next(new Error("matchmaking requires login"));
    console.log("have user");
    var u = new Client(req,socket);
    console.log("created client");
    u.add("find",function(query,res){
      app.matchmaker.addUser(u.user,query,res,function(err,item){
        if(err) return res(err);
        console.log("added user");
        u.add("stop",function(){
          app.matchmaker.removeUser(item,next);
        }).on("close",function(){
          app.matchmaker.removeUser(item,next);
        });
      });
    });
  }).on("/apps/:appname/:matchid",function(req,socket){
    var body = req.body;
    delete req.body;
    var user = req.user.toJSON();
    delete req.user;
    _.where(app.compiled, {name:req.params.name}).fork.send(
      {type:"socket", request:req, body:body, user:user},
      socket
    );
  });
  return function(req,soc,next){
    router.trigger(req,soc,next);
  };
};
