var FakeAPI = require(__root+"/abstract/fakeApi");

var Provider = FakeAPI.addClass("user_provider",function(data){
  if(typeof data.provider != "string") return false;
  if(typeof data.identity != "string") return false;
  if(!this.find({identity:data.identity})) return false;
  if(!FakeAPI.getClass("user").get(data.user)) return false;
  data.getUser = function(){
    FakeAPI.getClass("user").get(data.user);
  }
  return data;
})

Provider.findOrCreateUser = function(profile, token, tokenSecret){
  var p = this.find({identity:profile.provider+"|_|"+profile.id});
  if(p){
    p.token = token;
    p.tokenSecret = tokenSecret;
    return p.getUser();
  }
  var user = FakeAPI.getClass("user").add({
    name: profile.displayName
  });
  provider = this.add({
    provider: profile.provider,
    identity: profile.provider+"|_|"+profile.id,
    user: user.id,
    token: token,
    tokenSecret: tokenSecret
  });
  return user;
}

FakeAPI.getClass("user").on("delete", function(user){
  Provider.searchDelete({user:user.id});
})

module.exports = Provider;
