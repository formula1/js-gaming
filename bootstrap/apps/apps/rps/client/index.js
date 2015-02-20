
var $ = require("jquery");
var Timer = require("./Timer");
var Client2ServerCom = require("./Client2ServerCom");
// var Frame2ManagerCom = require("./Frame2ManagerCom");

var status = 0;

var $winloss = $(".winloss");
var $pleasewait = $(".please_wait");
var $rps = $(".rps");
var $countdown = $(".count_down");


$winloss.find("button").click(isReady);
$rps.find("button").click(doMove);

var timer = new Timer(30*1000);

timer.on("tick",tickCount);
timer.on("timeout",timeOut);

var GameConsole = new Client2ServerCom();

GameConsole
.on("countdown",countdown)
.on("move", play)
.on("results",winloss);



function tickCount(time){
  $countdown.text(time);
}

function timeOut(){
  $countdown.text("Please wait");
  GameConsole.close();
  switch(this.status){
    case 0: $countdown.text("You have Timed Out");
    return this.game.exit("Timed Out");
    case 1: $countdown.text("All Opponents have Timed Out");
    return this.game.setScene("finder_scene");
  }
}

function isReady(e){
  $winloss.css("display", "none");
  $pleasewait.css("display", "block");
  that.status = 1;
  this.game.socket.emit("ingame", {cmd:"ready"});
}

function countdown(){
  timer.setTime(5*1000);
}

function play(){
  timer.setTime(30*1000);
  this.status = 0;
  $please_wait.css("display","none");
  $rps.css("display","block");
}

function doMove(e){
  that.status = 2;
  that.game.socket.emit("ingame", {cmd:"move",value:$(this).attr("data-move")});
}

function winloss(data){
  this.status = 0;
  this.setTime(30*1000);
  $rps.css("display","none");
  parseResults(data);
  $winloss.css("display","block");
}

function parseResults(data){
  if(!data.opp){
    $winloss.find(".wl").text("You won!");
    $winloss.find(".reason").text("because they left.....");
    $winloss.find("button").css("display","none");
  }else{
    var you = $rps.find("button[data-move="+data.you+"]>h2").text();
    var opp = $rps.find("button[data-move="+data.opp+"]>h2").text();
    if(data.you == data.opp){
      $winloss.find(".wl").text("You tied. :|");
      $winloss.find(".reason").text(you+" equals "+opp);
    }else if(data.you-data.opp%3 == 1){
      $winloss.find(".wl").text("You won! :D");
      $winloss.find(".reason").text("because "+you+" beats "+opp);
    }else{
      $winloss.find(".wl").text("You lost :C");
      $winloss.find(".reason").text("because "+opp+" beats "+you);
    }
  }
}
