var child_process = require("child_process");
var ProcessAbstract = require(__root+"/abstract/process/ProcessAbstract");
var MatchMaker = require(__root+"/bootstrap/apps/matchmaker");

var path = __dirname+"/../../bootstrap/apps/apps/rps";
module.exports = {
  compiled:[
    {
      name:"rps",
      min_players:2,
      max_players:2,
      fork: new ProcessAbstract(child_process.fork(
        __dirname+"/../../bootstrap/apps/sdk",[path],{cwd:path}
//        __dirname+"/child",["child"]
      ))
    }
  ],
};

module.exports.matchmaker = new MatchMaker(module.exports.compiled);
