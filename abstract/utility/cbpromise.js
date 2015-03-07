
if(!Promise){
  var Promise = require("bluebird");
}

module.exports = function(ret,cb){
  if(cb) return {cb:cb,ret:ret};
  var rej;
  var res;
  var p = new Promise(function(_rej,_res){
    rej = _rej;
    res = _res;
  });
  cb = function(err,val){
    if(err) return rej(err);
    res(val);
  };
  return {cb:cb,ret:p};
};
