var MatchMaker = require(__root+"/bootstrap/apps/matchmaker");
var s2c = require("../../abstract/clientserver/server2client");


module.exports = function(games){
  var matchmaker = new MatchMaker(games);
  return function(req,socket,next){
    console.log("hit apps");
    if(!req.user) return next(new Error("matchmaking requires login"));
    console.log("have user");
    var u = new s2c(req,socket);
    console.log("created client");
    u.add("find",function(query,res){
      matchmaker.addUser(u.user,query,res,function(err,item){
        if(err) return res(err);
        u.add("stop",function(){
          matchmaker.removeUser(item,next);
        }).on("close",function(){
          matchmaker.removeUser(item,next);
        });
      });
    });
  };
};
