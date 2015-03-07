require("setimmediate");
var path = require("path");
var config = require("getconfig");

if(!global.Promise) global.Promise = require("bluebird");

global.__root = path.resolve(__dirname+"/..");

var util = require('util');
function generic(prefix, argus, suffix){
  if(!suffix) suffix = "";
  if(!config.isDev) return false;
  var args = Array.prototype.slice.call(argus,0);
  if(typeof args[0] == "object"){
    args[0] = util.inspect(args[0]);
  }
  args[0] = prefix+args[0];
  return args;
}

global.RegExp.escape= function(s) {
    return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
};

var _debug = console.debug;
console.debug = function(){
  _debug.apply(console,generic("\033[42;30;1mDEBUG: \033[0m", arguments));
};

var _error = console.error;
console.error = function(){
  _error.apply(console,generic("\033[41;30;1mERROR: \033[0m", arguments));
};

var _warn = console.warn;
console.warn = function(){
  _warn.apply(console,generic("\033[43;30;1mWARNING: \033[0m", arguments));
};


var _log = console.log;
console.log = function(){
  _log.apply(console,generic("\033[46;30;1mLOG: \033[0m", arguments));
};

console.ns = function(){
  var args = Array.prototype.slice.call(arguments,0);
  var namespace = args.shift().toUpperCase();
  _log.apply(console,generic("\033[42;30;1m"+namespace+": \033[0m", args));
};

global.console = console;
