var browserify = require("browserify");
module.exports = function(req,res,next){
  res.status(200).setHeader("content-type", "application/javascript");
  var b = browserify();
  b.require("url");
  b.require("qs");
  b.require("events");
  b.require("async");
  b.require(__root+"/abstract/message/MessageRouter", {expose:"MessageRouter"});
  b.require(__root+"/abstract/message/MessageWriter", {expose:"MessageWriter"});
  b.require(__root+"/abstract/message/MessageDuplex", {expose:"MessageDuplex"});
  b.require(__root+"/abstract/window/WindowManager", {expose:"WindowManager"});
  b.require(__root+"/abstract/window/WindowAbstract", {expose:"WindowAbstract"});
  b.require(__root+"/abstract/clientserver/client2server", {expose:"Server"});
//  b.require(__root+"/abstract/network/NetworkHost", {expose:"Network"});
  b.bundle().pipe(res);
};
