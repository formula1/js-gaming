

module.exports = function(waterline, passport,provider){
  waterline.on("initialize", function(waterline){
    console.log(Object.keys(waterline.collections));
    var User = waterline.collections.user;
    var UserProvider = waterline.collections._userprovider;
    UserProvider.after("destroy",function(values,next){
      if(Array.isArray(values)){
        if(values.length === 0) return next();
      }else{
        values = [values];
      }
      var ad = [];
      async.each(values,function(values,next){
        if(ad.indexOf(values.user) !== -1) return next();
        UserProvider.find({queen:values.user}, function(err,pawns){
          if(err) return next(err);
          if(pawns.length > 0) return next();
          UserProvider.destroy({id:values.user},next);
        });
      },next);
    });
    User.after('destroy', function(values,next){
      if(Array.isArray(values)){
        if(values.length === 0) return next();
      }else{
        values = [values];
      }
      async.each(values,function(values,next){
        UserProvider.destroy({user:values.id},next);
      },next);
    });
    passport.serializeUser(function(user,next){
      if(user && user.id) return next(void(0), user.id);
      next(new Error("no user"));
    });
    passport.deserializeUser(function(id,next){
      User.findOne({id:id},next);
    });
    UserProvider.find().then(function(results){
      console.log(results);
    })
  });
};
