var ancillary = require("ancillary");

module.exports.onSocket = function(c){
  ancillary.send(__dirname+"/child.js",c);
};
