var Waterline = require('waterline');
var stdSchema = require(__dirname+"/../../database/abstract/waterline");

var UserProvider = Waterline.Collection.extend(stdSchema({
  tableName: '_UserProvider',
  schema: true,
  connection: "database",
  attributes: {
    profile_id:{
      type: "string",
      unique: true
    },
    provider:{
      type: "String",
    },
    user:{
      model: 'User',
      index:true
    },
    token: "String",
    token_secret: "String",
    pass: "String"
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
    console.log("attempting to find");
    this
    .findOne({profile_id:profile.provider+"-"+profile.id})
    .populate("user")
    .then(function(provider){
      console.log(arguments);
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
    console.log("find or create");
    var UserProvider = this;
    var User = this.waterline.collections.user;
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
}));

module.exports = UserProvider;
