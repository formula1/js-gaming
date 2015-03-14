var REQUIREABLE = [
  "assert", "buffer", "crypto", "querystring", "url", "events",
  "path", "stream", "punycode", "string_decoder", "timers",
  "util", "sys", "zlib"
];

var GLOBALS = [
  "console",
  "setTimeout", "clearTimeout",
  "setInterval", "clearInterval",
  "setImmediate", "clearImmediate"
];

var OK = [
  "super-agent", "waterline", "sails-memory", "sails-http",
  "lodash", "mersennetwister", "async", "bluebird"
];

module.exports = function(dir){
  var ret = {};
  GLOBALS.forEach(function(glob){
    ret[glob] = global[glob];
  });
  var startswith = new RegExp(
    "^"+dir.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
  );

  ret.require = function(name){
    if(REQUIREABLE.indexOf(name) !== -1) return require(name);
    if(OK.indexOf(name) !== -1) return require(name);
    if(!startswith.test(require.resolve(name))) return require(name);
    throw new Error("You don't have permission to require"+name);
  };
  return ret;
};
