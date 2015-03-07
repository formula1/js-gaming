var mongoose = require("mongoose");
var Schema = mongoose.Schema;


var User = require(__dirname+"/user.js");
var UserProvider;

var UserProviderSchema = new Schema({
  profile_id:{
    type: String,
    unique: true,
    index:true
  },
  provider:{
    type: String,
//    enum: setup.authTypes
  },
  user:{
    type: Schema.Types.ObjectId,
    ref: 'User',
    index:true
  },
  token: String,
  token_secret: String,
  pass: String
});

UserProviderSchema.static("applyToUser",function(user, token, tokenSecret, profile, next){
  UserProvider
  .findOne({identity:profile.provider+"-"+profile.id})
  .populate('user')
  .exec(function(err,provider){
    if(err) return next(err);
    if(provider){
      if(user._id != provider.user)
        return next(new Error("This profile is already associated to someone else"));
      return next(new Error("This is already connected to you"));
    }
    UserProvider.create({
      provider: profile.provider,
      profile_id: profile.provider+"-"+profile.id,
      user: user,
      token: token,
      tokenSecret: tokenSecret,
      pass: profile.password
    }, function(err, provider){
      user.provider = profile.provider;
      user.save(function(err){
        next(err,provider.user,provider);
      });
    });
  });
});

UserProviderSchema.static("findAndValidate",function(token, tokenSecret, profile, next){
  UserProvider
  .findOne({profile_id:profile.provider+"-"+profile.id})
  .populate('user')
  .exec(function(err,provider){
    if(err) return next(err);
    if(!provider) return next();
    console.log("found a provider");
    if(provider.pass){
      if(provider.pass != profile.password)
        return next("passwords are incorrect");
    }
    provider.user.provider = profile.provider;
    provider.user.save(function(err){
      next(err,provider.user,provider);
    });
  });
});
UserProviderSchema.static("findOrCreateUser",function(token, tokenSecret, profile, next){
  UserProvider.findAndValidate(token, tokenSecret, profile, function(err,user,provider){
    if(err) return next(err,user,provider);
    if(user && provider) return next(err,user,provider);
    console.log("create user");
    User.create({
      username: profile.displayName,
      provider:profile.provider
    }, function(err, user){
      if(err) return next(err);
      UserProvider.create({
        provider: profile.provider,
        profile_id: profile.provider+"-"+profile.id,
        user: user,
        token: token,
        tokenSecret: tokenSecret,
        pass: profile.password
      },function(err,provider){
        if(err) return next(err);
        return next(void(0),user,provider);
      });
    });
  });
});

UserProviderSchema.post('remove', function (doc) {
  UserProvider.find({user:doc.user}, function(err,docs){
    if(err) throw err;
    if(docs.length > 0) return;
    User.findOneAndRemove({_id:doc.user}, function(err){
      if(err) throw err;
    });
  });
});

User.schema.post('remove', function(doc){
  UserProvider.find({user:doc.user}).remove(function(err,docs){
    if(err) throw err;
  });
});

UserProvider = mongoose.model('_UserProvider', UserProviderSchema);

module.exports = UserProvider;
