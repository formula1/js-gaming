var vm = require('vm');
var fs = require("fs");
var stdSandbox = require("./stdSandbox");
var Match = require("./Match");

var game = new vm.Script(fs.readFileSync(require.resolve(
  process.argv[2].toString("utf8")
)));
var stdOps = {
  filename: process.argv[2].toString("utf8")
};

function VmMatch(players){
  console.log("constructing rps");
  Match.call(this,players);
  var sandbox = stdSandbox(process.argv[2].toString("utf8"));
  sandbox.match = this;
  this.vm = game.runInNewContext(sandbox, stdOps);
}

VmMatch.prototype = Object.create(Match.prototype);
VmMatch.prototype.constructor = VmMatch;

module.exports = VmMatch;
