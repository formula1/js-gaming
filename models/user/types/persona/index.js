var PersonaStrategy = require("passport-persona");
var config = require("getconfig");
var Provider = require(__dirname+"/../../Provider");

console.log(JSON.stringify(PersonaStrategy));

module.exports = new PersonaStrategy.Strategy({
  audience: 'http://'+config.http.host+':'+config.http.port,
  passReqToCallback: true
},
function(req, email, done) {
  var profile = {
    provider:"persona",
    id:email,
    displayName:/(.*)@.*/.exec(email)[0]
  };
  if(!req.user){
    return Provider.findOrCreateUser(void(0),void(0),profile,done);
  }
  Provider.applyToUser(req.user,void(0),void(0),profile,done);
});
