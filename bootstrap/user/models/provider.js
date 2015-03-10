var Waterline = require('waterline');
var stdSchema = require(__dirname+"/../database/abstract/waterline");

var User = require("./User");

var UserProvider = Waterline.Collection.extend({
  tableName: '_UserProvider',
  schema: true,
  connection: "database",
  attributes: {
    profile_id:{
      type: String,
      unique: true
    },
    provider:{
      type: String,
  //    enum: setup.authTypes
    },
    user:{
      model: 'User',
      index:true
    },
    token: String,
    token_secret: String,
    pass: String
  },
  applyToUser: function(user, token, tokenSecret, profile, next){
    var UserProvider = this;
    UserProvider.findOne({profile_id:profile.provider+"-"+profile.id})
    .populate('user')
    .then(function(provider){
      if(provider){
        if(user._id != provider.user)
          throw new Error("This profile is already associated to someone else");
        throw new Error("This is already connected to you");
      }
      return user;
    }).then(function(user){
      UserProvider.create({
        provider: profile.provider,
        profile_id: profile.provider+"-"+profile.id,
        user: user,
        token: token,
        tokenSecret: tokenSecret,
        pass: profile.password
      }).then(function(provider){
        user.provider = profile.provider;
        user.save(function(err){
          next(err,provider.user,provider);
        });
      }).catch(next);
    }).catch(next);
  },findAndValidate: function(token, tokenSecret, profile, next){
    this
    .findOne({profile_id:profile.provider+"-"+profile.id})
    .populate("user")
    .then(function(provider){
      if(!provider) return next();
      console.log("found a provider");
      if(provider.pass){
        if(provider.pass != profile.password)
          return next("passwords are incorrect");
      }
      provider.user.provider = profile.provider;
      provider.user.save().then(function(user){
        next(void(0),user,provider);
      }).catch(next);
    }).catch(next);
  },findOrCreateUser:function(token, tokenSecret, profile, next){
    var UserProvider = this;
    UserProvider.findAndValidate(token, tokenSecret, profile, function(err,user,provider){
      if(err) return next(err,user,provider);
      if(user && provider) return next(err,user,provider);
      console.log("create user");
      User.create({
        username: profile.displayName,
        provider:profile.provider
      }).then(function(user){
        UserProvider.create({
          provider: profile.provider,
          profile_id: profile.provider+"-"+profile.id,
          user: user,
          token: token,
          tokenSecret: tokenSecret,
          pass: profile.password
        }).then(function(provider){
          return next(void(0),user,provider);
        }).catch(next);
      }).catch(next);
    });
  }
});

UserProvider.after("destroy",function(values,next){
  UserProvider.find({user:values.user}, function(err,docs){
    if(err) throw err;
    if(docs.length > 0) next();
    values.user.destroy(next);
  });
});

User.schema.after('destroy', function(doc){
  UserProvider.find({user:doc.user}).remove(function(err,docs){
    if(err) throw err;
  });
});

module.exports = UserProvider;
