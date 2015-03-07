var url = require("url");
var SocketRouter = require(__root+"/abstract/handle/HandleRouter");
var Client = require(__root+"/abstract/clientserver/server2client");
var _ = require("lodash");

module.exports = function(app){
  var router = new SocketRouter();
  router.ws("/apps",function(req,socket,next){
    console.log("hit apps");
    if(!req.user) return next(new Error("matchmaking requires login"));
    console.log("have user");
    var u = new Client(req,socket);
    console.log("created client");
    u.add("find",function(query,res){
      app.matchmaker.addUser(u.user,query,res,function(err,item){
        if(err) return res(err);
        u.add("stop",function(){
          app.matchmaker.removeUser(item,next);
        }).on("close",function(){
          app.matchmaker.removeUser(item,next);
        });
      });
    });
  }).ws("/apps/:appname/:matchid",function(req,socket,next){
    var game = _.where(app.compiled, {name:req.params.appname});
    console.log("game.length == "+game.length);
    if(game.length === 0) return next();
    req.user = req.user.toJSON();
    game[0].fork.handle.httpSend(
      req,socket
    );
    console.log("tried to send");
  });
  return function(req,soc,next){
    router.fromHttp(req,soc,next);
  };
};
