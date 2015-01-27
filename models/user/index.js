var setup = require('./setup');

module.exports.middleware = function(app){
  app
  .use(setup.passport.initialize())
  .use(setup.passport.session())
  .use(function(req,res,next){
    res.locals.user = req.user;
    res.locals.logins= setup.authTypes;
    next();
  })
  ;
};

var router = require("express").Router();

router.param("authtype",function(req,res,next){
  if(setup.authTypes.indexOf(req.params.authtype) == -1){
    return next(new Error("Not an accepted Authtype"));
  }
  next();
}).get("/self", function(req,res){
  if(req.user) return res.send(req.user);
  res.send({
    displayName: "Anonymous"+Date.now(),
    loggedIn: false
  });
}).get("/login", function(req,res){
  res.render("login");
}).get('/logout', function(req, res, next){
  req.user.loggedIn = false;
  req.logout();
  res.redirect('/login');
}).get('/:authtype', function(req, res, next){
  if(req.isAuthenticated()){
    return next(new Error("You are already Authenticated"));
  }
  setup.passport.authenticate(req.params.authtype)(req,res,next);
}).get('/:authtype/callback', function(req,res,next){
  if(req.isAuthenticated()){
    return next(new Error('You are already Authorized'));
  }
  setup.passport.authenticate(req.params.authtype,function(err,user,info){
    if(err) return next(err);
    if(!user) return res.redirect('/login');
    user.loggedIn = true;
    req.logIn(user, function(err){
      if(err) return next(err);
      //        req.flash("info", info);
      res.statusCode = 201;
      res.redirect("/login");
    })
  })(req,res,next);
});

module.exports.router = router;
