var passport = require("passport");
var fs = require("fs");
var browserify = require("browserify");
var b = browserify();

var User = require("./User");
var possible = {};
(function(){
  var ari = fs.readdirSync(__dirname+"/types");
  ari.forEach(function(file){
    try{
      var loc = __dirname+ "/types/"+file;
      var temp = require(loc);
      if(/\.js$/.test(file)){
        file = file.substring(0, file.length - 3);
        possible[file] = {};
      }else{
        if(fs.existsSync(loc+"/client.js")){
          b.require(loc+"/client.js", {expose:"auth-"+file});
        }
        possible[file] = {
          icon:fs.existsSync(loc+"/icon.png"),
          js: fs.existsSync(loc+"/client.js")
        };
        try{
          possible[file].html=fs.readFileSync(loc+"/client.html").toString("utf8");
        }catch(e){
        }
      }
      passport.use(temp);
    }catch(e){
      console.error(file+" doesn't want to be a passport: ");
      console.error(e.stack);
    }
  });
})();

passport.serializeUser(function(user, next){
  if(user && user._id) return next(void(0), user._id);
  next(new Error("no user"));
});

passport.deserializeUser(function(id, next){
  User.findOne({_id:id},next);
});

module.exports.User = User;
module.exports.authTypes = possible;
module.exports.passport = passport;
module.exports.bundle = b.bundle();
