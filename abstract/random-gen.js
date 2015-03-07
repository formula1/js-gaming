
var radix = require('radix64').radix64;

module.exports = function(){
  return radix(parseInt(Date.now()+""+Math.floor(Math.random()*1000*1000*1000)));
};
