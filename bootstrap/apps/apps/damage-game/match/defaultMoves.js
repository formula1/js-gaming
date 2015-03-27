module.exports = {
  equilize: function(user,target){
    var uhp = user.hp;
    var thp = target.hp;
    var netdiff = (thp-uhp)/2;
    if(netdiff > 0){
      netdiff = Math.min(netdiff,user.maxHP-uhp);
      netdiff = Math.min(netdiff,thp);
    }else{
      netdiff = Math.min(-netdiff,target.maxHP-thp);
      netdiff = Math.min(-netdiff,uhp);
    }
    return [netdiff,-netdiff];
  },
  lastStand: function(user,target){
    return [0,user.hp-user.maxHP];
  },
  whileTheyDown: function(user,target){
    return [0,target.hp-target.maxHP];
  },
  square: function(user,target){
    return [0,-25];
  }


}
