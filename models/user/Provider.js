var mongoose = require("mongoose");
var Schema = mongoose.Schema;
var setup = require("./setup");


var User = require(__dirname+"/User.js");

var UserProviderSchema = new Schema({
  profile_id:{
    type: String,
    unique: true,
    index:true
  },
  provider:{
    type: String,
    enum: setup.authTypes
  },
  user:{
    type: Schema.Types.ObjectId,
    ref: 'User',
    index:true
  },
  token: String,
  token_secret: String
});

UserProviderSchema.statics.applyToUser = function(user, token, tokenSecret, profile, next){
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
      tokenSecret: tokenSecret
    }, function(err, provider){
      if(err) next(err);
      next(void(0), user);
    });
  });
};

UserProviderSchema.statics.findUserOrCreate = function(token, tokenSecret, profile, next){
  UserProvider
  .findOne({identity:profile.provider+"-"+profile.id})
  .populate('user')
  .exec(function(err,provider){
    if(err) return next(err);
    if(provider) return next(void(0),provider.user);
    console.log("create user");
    User.create({
      name: profile.displayName,
      associated: ["UserProvider"]
    }, function(err, user){
      if(err) return next(err);
      UserProvider.create({
        provider: profile.provider,
        identity: profile.provider+"-"+profile.id,
        user: user,
        token: token,
        tokenSecret: tokenSecret
      },function(err){
        if(err) return next(err);
        return next(void(0),user);
      });
    });
  });
};

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

module.exports = mongoose.model('_UserProvider', UserProviderSchema);
