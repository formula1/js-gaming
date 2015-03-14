var config = require('getconfig');
var TwitterStrategy = require('passport-twitter').Strategy;

module.exports = function(Provider){
  return new TwitterStrategy({
    consumerKey: config.passport.twitter.key,
    consumerSecret: config.passport.twitter.secret,
    callbackURL: "http://"+config.http.hostname+":"+config.http.port+"/auth/twitter/callback",
    passReqToCallback: true
  },
  function(req, token, tokenSecret, profile, done) {
    if(!req.user){
      return Provider.findOrCreateUser(token,tokenSecret,profile,done);
    }
    Provider.applyToUser(req.user,token.tokenSecret,profile,done);
  });
};
