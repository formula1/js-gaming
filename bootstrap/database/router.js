var _ = require("lodash");
var bodyParser = require('body-parser');
module.exports = function() {

// router will be called as a prototype method of database
var database = this;

var isHidden = /^_.*/;

var router = require("express").Router();

router.param('classname', function(req, res, next, classname){
  if(isHidden.test(classname)) return res.status(404).end();
  if(!(classname in database.orm.collections)) return res.status(404).end();
  req.mClass = database.orm.collections[classname];
//  console.log('set req.mClass to', require('util').inspect(req.mClass));
  next();
});

router.param("id", function(req,res,next,id){
  req.mClass.findOne({id:req.params.id}, function(err, doc){
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

router
  .use(bodyParser.urlencoded({ extended: false }))
  .use(bodyParser.json());


router.get("/:classname",function(req,res){
  var ipp = 10;
  if(req.query.ipp){
    ipp = req.query.ipp;
    delete req.query.ipp;
  }
  var sort = "createdOn DESC";
  if(req.query.sort){
    sort = req.query.sort;
    delete req.query.sort;
  }
  var search = req.mClass.defaultSearch||{};
  _.merge(search,req.query||{});
  req.mClass.find().where(search).limit(ipp).sort(sort).exec(function(err,docs){
    if(err) return next(err);
    res.status(200).send(docs);
  });
});
router.get("/:classname/:id",function(req,res,next){
  res.status(200).send(req.doc.toObject());
});
router.delete("/:classname/:id",function(req,res){
  req.doc.destroy(function(err,doc){
    if(err) return next(new Error(err));
    if(!doc) return res.status(404).end();
    res.status(200).send(doc[0]);
  });
});
router.put("/:classname/:id",function(req,res){
  console.log(req.mClass.definition);
  //I should try to find the schema
  var keys = _.keys(req.mClass.definition);
  keys = _.without(keys,"id","createdAt","updatedAt");
  keys = _.intersection(_.keys(req.body),keys);
  if(keys.length === 0) return res.status(404).end();
  keys.forEach(function(key){
    req.doc[key] = req.body[key];
  });
  req.doc.save(function(err, doc){
    if(err) return next(new Error(err));
    if(!doc) return res.status(404).end();
    res.status(200).send(doc.toObject());
  });
});
router.post("/:classname",function(req,res,next){
  req.mClass.create(req.body,function(err,doc){
    if(err) return next(new Error(err));
    if(!doc) return res.status(404).end();
    res.status(200).send(doc.toObject());
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
