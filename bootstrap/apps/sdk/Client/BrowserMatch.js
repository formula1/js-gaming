var vm = require('vm-shim');
var Match = require("../Match");
var superAgent = require("superagent");

function BrowserMatch(players,script){
  console.log("constructing browsermatch");
  Match.call(this,players);
  var sandbox = {match:this};
  this.vm = vm.runInNewContext(script,sandbox);
}

BrowserMatch.prototype = Object.create(Match.prototype);
BrowserMatch.prototype.constructor = BrowserMatch;

BrowserMatch.createFromUri = function(uri,users,next){
  console.log("creating match from uri");
  superAgent.get(uri).end(function(err,res){
    console.log("finished get request");
    if(err) return next(err);
    next(void(0),new BrowserMatch(users,res.text));
  });
};


module.exports = BrowserMatch;
