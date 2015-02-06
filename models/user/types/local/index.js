
var LocalStrategy = require("passport-local");
var Provider = require(__dirname+"/../../Provider");

module.exports = new LocalStrategy({
    usernameField: 'username',
    passwordField: 'password',
    passReqToCallback: true
  },
  function(req,username, password, done) {
    var profile = {
      provider:"local",
      id:username,
      displayName:username,
      password:password
    };
    if(!req.user){
      return Provider.findOrCreateUser(void(0),void(0),profile,done);
    }
    Provider.applyToUser(req.user,void(0),void(0),profile,done);
  }
);
