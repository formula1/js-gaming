var passport = require("passport");
var fs = require("fs");
var FakeAPI = require(__root+"/abstract/fakeApi");

var User = FakeAPI.addClass("user",function(data){
  if(!/string|undefined/.test(typeof data.displayName)) return false;
  if(!data.displayName) data.displayName = "Anonymous"+Date.now();
  data.loggedIn = false;
  return data
});

var possible = [];
(function(){
  var ari = fs.readdirSync(__dirname+"/types");
  ari.forEach(function(file){
    try{
      var temp = require(__dirname+ "/types/"+file);
      possible.push(file.substring(0, file.length - 3));
      passport.use(temp);
    }catch(e){
      console.log(file+" doesn't want to be a passport: "+e);
    }
  });
})();

passport.serializeUser(function(user, next){
  if(user && user.id) return next(void(0), user.id);
  next(new Error("no user"));
});

passport.deserializeUser(function(id, next){
  next(void(0), User.get(id));
});

module.exports.User = User;
module.exports.authTypes = possible;
module.exports.passport = passport;
