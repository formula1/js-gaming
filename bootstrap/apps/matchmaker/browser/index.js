var $ = require("jquery");
var async = require("async");
var Server = require(__root+"/abstract/clientserver/client2server.js");
var url = require("url");

function MatchMaker(form,notify){
  Server.call(this, url.resolve(window.location,"/"));
  this.htmlForm = $(form);
  this.htmlNotify = $(notify);
}

MatchMaker.prototype = Object.create(Server.prototype);
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
