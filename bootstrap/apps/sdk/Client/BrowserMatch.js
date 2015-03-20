var vm = require('vm-shim');
var Match = require("../Match");


function BrowserMatch(players,script){
  console.log("constructing browsermatch");
  Match.call(this,players);
  var sandbox = {match:this};
  this.vm = vm.runInNewContext(script,sandbox);
}

BrowserMatch.prototype = Object.create(Match.prototype);
BrowserMatch.prototype.constructor = BrowserMatch;

BrowserMatch.createMatchFromUri = function(uri,users,next){
  superAgent.get(uri).end(function(err,res){
    if(err) return next(err);
    next(void(0),new BrowserMatch(users,res.text));
  });
};


module.exports = BrowserMatch;
