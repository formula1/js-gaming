var Provider = require(__dirname+'/../provider.js');
var config = require('getconfig');
var TwitterStrategy = require('passport-twitter').Strategy;

module.exports = new TwitterStrategy({
  consumerKey: config.passport.twitter.key,
  consumerSecret: config.passport.twitter.secret,
  callbackURL: "http://"+config.http.hostname+":"+config.http.port+"/auth/twitter/callback",
  passReqToCallback: true
},
function(req, token, tokenSecret, profile, done) {
  if(!req.user){
    var u = Provider.findOrCreateUser(req,token.tokenSecret,profile);
    return done(void(0),u);
  }
  var p = Provider.search({identity:profile.provider+"|_|"+profile.id});
  if(p) return done(void(0),p.getUser());
  Provider.add({
    provider: profile.provider,
    identity: profile.provider+"|_|"+profile.id,
    user: req.user.id,
    token: token,
    tokenSecret: tokenSecret
  });
  done(void(0),req.user);
});
