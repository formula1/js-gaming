var _ = require("lodash");

module.exports =function(games){
  return function(req,socket,next){
    var game = _.where(games, {name:req.params.appname});
    console.log("game.length == "+game.length);
    if(game.length === 0) return next();
    req.user = req.user.toJSON();
    game[0].fork.handle.httpSend(
      req,socket
    );
  };
};
