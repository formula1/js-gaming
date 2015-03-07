var child_process = require("child_process");
var ProcessAbstract = require(__root+"/abstract/process/ProcessAbstract");

module.exports = [
  {
    name:"rps",
    min_players:2,
    max_players:2,
    fork: new ProcessAbstract(child_process.fork(__dirname+"/child",["child"]))
  }
];
