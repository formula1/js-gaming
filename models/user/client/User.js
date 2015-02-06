/*
  So I have Login forms and such
  whenever

*/

var EventEmitter = require("events").EventEmitter;
var util = require("util");
var http = require("http");
function User(profile){
  EventEmitter.call(this);
  if(profile){
    this.provider = profile.provider;
    this.displayName = profile.displayName;
  }
}

util.inherits(User, EventEmitter);

User.prototype.loginWith = function(type){
  if(type==)
  window.open("/auth/"+type);
};

User.prototype.logout = function(next){
  var _this = this;
  jQuery.get('/auth/logout')
  .done(function(err){
    this.provider = void(0);
    this.displayName = void(0);
    if(next) next();
    _this.emit("logout");
  })
  .fail(function(err){
    if(next) next(err);
    this.emit("error",err);
  });
}
