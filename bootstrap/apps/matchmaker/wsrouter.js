var url = require("url");
var SocketRouter = require(__root+"/abstract/abstract/SocketRouter");
var Client = require(__root+"/abstract/clientserver/server2client");
var _ = require("lodash");

module.exports = function(app){
  var router = new SocketRouter();
  router.on("/apps",function(req,socket){
    console.log("got request");
    var body = req.body;
    delete req.body;
    var user = req.user.toJSON();
    delete req.user;
    console.log(JSON.stringify(req));
    var u = new Client({request:req,body:body,user:user},socket);
    u
    .add("find",function(query,next){
      app.MatchMaker.addUser(u,query,function(err,item){
        if(err) return next(err);
        u.add("stop",function(){
          MatchMaker.removeUser(item,next);
        })
        .on("close",function(){
          MatchMaker.removeUser(item,next);
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
