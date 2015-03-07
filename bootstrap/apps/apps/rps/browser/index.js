
var $ = require("jquery");
var Timer = require("./Timer");
var Server = require("../../../../../abstract/clientserver/client2server");

var status = 0;

var $winloss = $(".winloss");
var $pleasewait = $(".please_wait");
var $rps = $(".rps");
var $countdown = $(".count_down");

$winloss.find("button").click(isReady);
$rps.find("button").click(doMove);

var timer = new Timer();

timer.on("tick",tickCount);
timer.on("timeout",timeOut);

var GameConsole = new Server();

GameConsole
.add("countdown",countdown)
.add("move", play)
.add("results",winloss)
.add("ntp",function(){
  console.log("clientside npt");
  return Date.now();
}).add("ready",winloss);


function tickCount(time){
  $countdown.text(time);
}

function timeOut(){
  switch(status){
    case 2: return $countdown.text("Please wait");
    case 0: $countdown.text("You have Timed Out"); break;
    case 1: $countdown.text("All Opponents have Timed Out"); break;
  }
  GameConsole.close();
}

function isReady(e){
  $pleasewait.siblings().removeClass("active");
  $pleasewait.addClass("active");
  status = 1;
  GameConsole.trigger("ready");
}

function countdown(){
  timer.setTime(5*1000);
  status = 2;
}

function play(){
  timer.setTime(30*1000);
  status = 0;
  $rps.siblings().removeClass("active");
  $rps.addClass("active");
}

function doMove(e){
  status = 2;
  GameConsole.trigger("move", $(this).attr("data-move"));
}

function winloss(data){
  status = 0;
  timer.setTime(30*1000);
  $winloss.siblings().removeClass("active");
  parseResults(data);
  $winloss.addClass("active");
}

function parseResults(data){
  if(!data) return;
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
