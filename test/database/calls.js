/*

router.param('classname', function(req, res, next, classname){});
router.param("id", function(req,res,next,id){});
router.param('method', function(req, res, next, method){});

router.use(["/:classname","/:classname/*"],function(req,res,next){
  if(!req.mClass.Permission) return next();
  req.mClass.Permission(req,function(boo){
    if(!boo) return res.status(403).end();
    next();
  });
});

router.get("/:classname",function(req,res){}); //search
router.get("/:classname/:id",function(req,res,next){}); //item
router.delete("/:classname/:id",function(req,res){}); //destroy
router.put("/:classname/:id",function(req,res){}); //update
router.post("/:classname",function(req,res){}); //create
router.post("/:classname/:method",function(req,res){}); //run static method
router.post("/:classname/:id/:method",function(req,res){}); //run instance method

*/

var request = require("superagent");
var async = require("async");
var base = "http://localhost:3000";
var model = "testmodel";
var instance;

async.series([runPost,runGet,runPut,runSearch,runDel],function(err,results){
  if(err) throw err;
});


function runPost(next){
  console.log("POSTING: "+base+"/"+model);
  request
    .post(base+"/"+model)
    .send({someText:"it"})
    .end(function(err, res){
      if(err) return next(err);
      if (!res.ok){
        return next("NOT OK("+res.status+"): "+res.text);
      }
      console.log("POST SUCCESSFUL");
      instance = res.body.id;
      next();
    });
}
function runGet(next){
  console.log("GETTING: "+base+"/"+model+"/"+instance);
  request
    .get(base+"/"+model+"/"+instance)
    .end(function(err, res){
      if(err) return next(err);
      if (!res.ok){
        return next("NOT OK("+res.status+"): "+res.text);
      }
      if(instance != res.body.id){
        return next("the ids aren't the same");
      }
      console.log("GET SUCCESSFUL");
      instance = res.body;
      next();
    });
}
function runPut(next){
  console.log("PUTTING: "+base+"/"+model+"/"+instance.id);
  request
    .put(base+"/"+model+"/"+instance.id)
    .send({someText:"is"})
    .end(function(err, res){
      if(err) return next(err);
      if (!res.ok) return next(res.text);
      if("is" != res.body.someText){
        return next("not the expected value");
      }
      console.log("PUT SUCCESSFUL");
      instance = res.body;
      next();
    });
}
function runSearch(next){
  console.log("SEARCHING: "+base+"/"+model);
  request
    .get(base+"/"+model)
    .query({ipp:20})
     .query({someText:"is"})
    .end(function(err, res){
      if(err) return next(err);
      if (!res.ok){
        return next("NOT OK("+res.status+"): "+res.text);
      }
      if(res.body.length === 0){
        return next("should have at least 1 value");
      }
      var cur = res.body.pop();
      if(cur.id != instance.id){
        return next("["+cur.id+" != "+instance.id+"]");
      }
      console.log("SEARCH SUCCESSFUL");
      next();
    });
}
function runDel(next){
  console.log("DELETING: "+base+"/"+model+"/"+instance.id);
  request
    .del(base+"/"+model+"/"+instance.id)
    .end(function(err, res){
      if(err) return next(err);
      if (!res.ok) return next(res.text);
      if(instance.id != res.body.id){
        return next("not the expected value");
      }
      request
        .get(base+"/"+model+"/"+instance.id)
        .end(function(err, res){
          if(err) return next(err);
          if(res.ok) return next("document still exists");
          if(res.status !== 404) return next("recieving wrong status code");
          console.log("DELETE SUCCESSFUL");
          next();
        });
    });
}
