
module.exports =function(games){
  return function(req,socket,next){
   req.user = req.user.toJSON();
   games[0].fork.handle.httpSend(
     req,socket
   );
 };
};
