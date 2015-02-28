var _ = require("lodash");
module.exports = function() {

// router will be called as a prototype method of database
var database = this;

var isHidden = /^_.*/;

var router = require("express").Router();

router.param('classname', function(req, res, next, classname){
  if(isHidden.test(classname)) return res.status(404).end();
  try {
    req.mClass = database.collections[classname];
    console.log('set req.mClass to', require('util').inspect(req.mClass));
  }
  catch(e) {
    console.error('Error while requiring', classname, e);
    return res.status(404).end();
  }
  next();
});

router.param("id", function(req,res,next,id){
  req.mClass.findOne({_id:req.params.id}, function(err, doc){
    if(err) return next(new Error(err));
    if(!doc) return res.status(404).end();
    req.doc = doc;
    next();
  });
});

router.param('method', function(req, res, next, method){
  if(isHidden.test(method)) return res.status(404).end();
  if(req.doc && !req.doc[method]) return res.status(404).end();
  if(!req.doc && !req.mClass[method]) return res.status(404).end();
  next();
});

router.use(["/:classname","/:classname/*"],function(req,res,next){
  if(!req.mClass.Permission) return next();
  req.mClass.Permission(req,function(boo){
    if(!boo) return res.status(403).end();
    next();
  });
});
router.get("/:classname",function(req,res){
  var ipp = 10;
  if(req.query.ipp){
    ipp = delete req.query.ipp;
  }
  var sort = "-createdOn";
  if(req.query.sort){
    sort = delete req.query.sort;
  }
  var search = req.mClass.defaultSearch||{};
  _.merge(search,req.query||{});
  console.log('calling find with', search, ipp, sort);
  req.mClass.find(search).limit(ipp).sort(sort).exec(function(err,docs){
    console.log('find returns', err, docs);
    if(err) return next(err);
    var l = docs.length;
    res.send(docs);
  });
});
router.get("/:classname/:id",function(req,res,next){
  res.status(200).send(req.doc.toObject());
});
router.delete("/:classname/:id",function(req,res){
  req.doc.remove(function(err,doc){
    if(err) return next(new Error(err));
    if(!doc) return res.status(404).end();
    res.status(200).send(doc.toObject());
  });
});
router.put("/:classname/:id",function(req,res){
  req.doc.update(req.body,function(err, doc){
    if(err) return next(new Error(err));
    if(!doc) return res.status(404).end();
    res.status(200).send(doc.toObject());
  });
});
router.post("/:classname",function(req,res){
  req.mClass.create(req.body,function(err,doc){
    if(err) return next(new Error(err));
    if(!doc) return res.status(404).end();
    res.redirect(201, req.params.classname+"/"+doc._id);
  });
});
router.post("/:classname/:method",function(req,res){
  req.mClass[req.params.method](req.body,function(err,ret){
    if(err) return next(new Error(err));
    if(!ret) return res.status(404).end();
    if( ret instanceof mongoose.Document ||
    ret instanceof mongoose.DocumentArray){
      ret = ret.toObject();
    }
    res.status(200).send(ret);
  });
});
router.post("/:classname/:id/:method",function(req,res){
  req.doc[req.params.method](req.body,function(err,doc){
    if(err) return next(new Error(err));
    if(!ret) return res.status(404).end();
    if( ret instanceof mongoose.Document ||
    ret instanceof mongoose.DocumentArray){
      ret = ret.toObject();
    }
    res.status(200).send(ret);
  });
});

return router;
};