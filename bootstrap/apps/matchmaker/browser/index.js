var $ = require("jquery");
var async = require("async");
var Server = require(__root+"/abstract/clientserver/client2server.js");
var Manager = require(__root+"/abstract/window/WindowManager.js");
var url = require("url");

function MatchMaker(container,notify){
  Manager.call(this);
  this.ws = new Server(url.resolve(window.location,"/match"));
  this.form = $(form);
  var that = this;
  this.form.on("submit",function(e){
    e.preventDefault();
    var serialized = that.form.serialize();
    that.ws.get("find", function(e,value){
      that.loadWindow("/apps/"+value.gamename+"/"+value.matchid);
    });
  });
}

MatchMaker.prototype.showForm = function(){

};

MatchMaker.prototype = Object.create(Manager.prototype);
MatchMaker.constructor = MatchMaker;
/*
MatchMaker.prototype.parseForm = function(){
  var form = this.htmlForm.serialize();
  if(form.name)
  if(form.min_players)
  if(form.max_players)
  if(form.blocklist)
};
*/
//MatchMaker.prototype.sendQuery
