var passport = require("passport");
var express = require("express");
var session = require("express-session");
var url = require("url");
var bodyParser = require('body-parser');

module.exports.renderware = function(req,res,next){
  res.locals.user = req.user;
  res.locals.authTypes= this.providers;
  next();
};

module.exports.middleware = function(config,waterline){
  if(!config) config = require("getconfig");
  return [
    require("cookie-parser")(config.session.secret),
    session({
      secret: config.session.secret,
      store: new session.MemoryStore()
    }),
    passport.initialize(),
    passport.session(),
    function(req,res,next){
      if(req.user) return next();
      var auth = req.headers.authorization;
      if(!auth) return next();
      auth = auth.split(" ");
      if(auth.length != 2) return next();
      if(auth[0] != "Basic") return next();
      auth = new Buffer(auth[1], 'base64').toString('ascii').split(":");
      if(auth.length != 2) return next();
      var profile = {
        provider:"local",
        id:auth[0],
        displayName:auth[0],
        password:auth[1]
      };
      waterline.collections._userprovider.findAndValidate(void(0),void(0),profile,function(err,user){
        if(err) return next();
        if(!user) return next();
        req.user = user;
        next();
      });
    }
  ];
};

module.exports.router = function(provider){
  var router = express.Router();
  router.param("authtype",function(req,res,next){
    var l = provider.providers.length;
    while(l--){
      if(req.params.authtype == provider.providers[l]) break;
    }
    if(l == provider.providers.length){
      return next(new Error("Not an accepted Authtype"));
    }
    req.provider = provider.providers[l];
    next();
  }).get("/self", function(req,res){
    if(req.user) return res.send(req.user.toJSON());
    res.send({
      displayName: "Anonymous"+Date.now(),
      loggedIn: false
    });
  }).get('/api', function(req,res){
    res.status(200).setHeader("content-type","application/javascript");
    provider.clientAPI.bundle().pipe(res);
  }).get("/login", function(req,res){
    res.render(provider.renderPath+"/index");
  }).get('/logout', function(req, res, next){
    if(!req.user) return res.redirect(req.baseUrl+'/login');
    req.user.loggedIn = false;
    req.user.save(function(err){
      if(err) return next(err);
      req.logout();
      res.redirect(req.baseUrl+'/login');
    });
  }).get('/:authtype',function(req,res,next){

  }).get('/:authtype/icon',function(req,res,next){
    if(!req.provider.icon) return next();
    res.sendFile(req.provider.icon);
  }).get('/:authtype/login', function(req, res, next){
    if(req.isAuthenticated()){
      return next(new Error("You are already Authenticated"));
    }
    passport.authenticate(req.params.authtype)(req,res,next);
  }).use(bodyParser.urlencoded({ extended: false }))
  .use(bodyParser.json())
  .all('/:authtype/callback', function(req,res,next){
    if(req.isAuthenticated()){
      return next(new Error('You are already Authorized'));
    }
    console.log("want to authenticate with: "+req.params.authtype);
    passport.authenticate(req.params.authtype,function(err,user,info){
      console.log("authenticated with: "+req.params.authtype);
      console.log(err);
      console.log(user);
      console.log(info);
      if(err) return next(err);
      if(!user) return res.redirect(req.baseUrl+'/login');
      user.loggedIn = true;
      req.logIn(user, function(err){
        if(err) return next(err);
        res.statusCode = 201;
        res.redirect(req.baseUrl+"/login");
      });
    })(req,res,next);
  });
  return router;
};
