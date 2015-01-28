var passport = require("passport");
var fs = require("fs");

var User = require("./User");
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
  if(user && user._id) return next(void(0), user._id);
  next(new Error("no user"));
});

passport.deserializeUser(function(id, next){
  Use.findOne({_id:id},next);
});

module.exports.User = User;
module.exports.authTypes = possible;
module.exports.passport = passport;
