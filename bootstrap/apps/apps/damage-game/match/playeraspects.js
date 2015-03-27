var TEAM = "team";
var teamInfo = {};
var defaultChars = require("./defaultCharacters.json");

function createEmptyTeam(){
  return [0,0,0,0,0,0]
}

module.exports.applyToPlayer = function(player){
  player.damageInfo = {team:void(0),move:void(0)};
  player.add(TEAM,checkTeam.bind(player));
};

function checkTeam(team){

}

function checkChar(char){

}


function applyTeam(team){
    if(!team){
      if(!this.damageInfo.team) return createEmptyTeam();
    }
    if(!Array.isArray(team)) return createEmptyTeam();
    for(var i=0;i<6;i++){
      switch(typeof team[i]){
        case "string": team[i] = defaultChars[team[i]];
        case "object": team[i] = checkChar(team[i]);
      }
    }
}
