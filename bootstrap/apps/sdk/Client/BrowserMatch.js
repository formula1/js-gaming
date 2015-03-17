var vm = require('vm-shim');
var stdSandbox = require("./stdSandbox");
var Match = require("./Match");


function BrowserMatch(players,script){
  console.log("constructing browsermatch");
  Match.call(this,players);
  var sandbox = {match:this};
  this.vm = vm.runInNewContext(script,sandbox);
}

VmMatch.prototype = Object.create(Match.prototype);
VmMatch.prototype.constructor = VmMatch;

module.exports = VmMatch;
