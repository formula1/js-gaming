
var request = require("superagent");
var async = require("async");
var base = "http://localhost:3000";
var model = "pawn";
var model2 = "queen";
var pawn_instance;
var queen_instance;

async.series([
  runPost,runFollowerPost,runPawnDel,
  runPost,runFollowerPost,runQueenDel
],function(err,results){
  if(err) throw err;
});


function runPost(next){
  console.log("POSTING: "+base+"/"+model);
  request
    .post(base+"/"+model)
    .send({name:"itguy",pawnType:"A"})
    .end(function(err, res){
      if(err) return next(err);
      if (!res.ok){
        return next("NOT OK("+res.status+"): "+res.text);
      }
      pawn_instance = res.body;
      request
        .get(base+"/"+model2)
        .query({name:"itguy"})
        .end(function(err, res){
          if(err) return next(err);
          if (!res.ok){
            return next("NOT OK("+res.status+"): "+res.text);
          }
          if(res.body.length === 0 ){
            return next("expect at least one queen");
          }
          queen_instance = res.body[0];
          request
            .get(base+"/"+model)
            .query({queen:queen_instance.id})
            .end(function(err, res){
              if(err) return next(err);
              if (!res.ok){
                return next("NOT OK("+res.status+"): "+res.text);
              }
              if(res.body.length === 0 ){
                return next("expect at least one pawn");
              }
              console.log("POST SUCCESSFUL");
              next();
            });
        });
    });
}

function runFollowerPost(next){
  console.log("POSTING: "+base+"/"+model);
  request
    .post(base+"/"+model)
    .send({pawnType:"B",queen:queen_instance.id})
    .end(function(err, res){
      if(err) return next(err);
      if (!res.ok){
        return next("NOT OK("+res.status+"): "+res.text);
      }
      request
        .get(base+"/"+model)
        .query({queen:queen_instance.id})
        .end(function(err, res){
          if(err) return next(err);
          if (!res.ok){
            return next("NOT OK("+res.status+"): "+res.text);
          }
          if(res.body.length < 2 ){
            return next("expects at least 2 pawns for this queen");
          }
          pawn_instance = res.body;
          console.log("POST SUCCESSFUL");
          next();
        });
    });
}

function runPawnDel(next){
  console.log("DELETING: "+base+"/"+model+"/["+pawn_instance.map(JSON.stringify).join(", ")+"]");
  async.each(pawn_instance,function(value,next){
    request
      .del(base+"/"+model+"/"+value.id)
      .end(function(err, res){
        if(err) return next(err);
        if (!res.ok){
          return next("NOT OK("+res.status+"): "+res.text);
        }
        console.log("DELETE SUCCESSFUL");
        next();
      });  },function(err,results){
    if(err) return next(err);
    request
      .get(base+"/"+model2+"/"+queen_instance.id)
      .end(function(err, res){
        if(err) return next(err);
        if(res.ok) return next("queen still exists");
        if(res.status !== 404) return next("recieving wrong status code");
        console.log("DELETE SUCCESSFUL");
        next();
      });
  });
}

function runQueenDel(next){
  console.log("DELETING: "+base+"/"+model2+"/"+queen_instance.id);
  request
    .del(base+"/"+model2+"/"+queen_instance.id)
    .end(function(err, res){
      if(err) return next(err);
      if (!res.ok) return next(res.text);
      async.each(pawn_instance,function(value,next){
        request
          .get(base+"/"+model+"/"+value.id)
          .end(function(err, res){
            if(err) return next(err);
            if(res.ok) return next("pawn still exists");
            if(res.status !== 404) return next("recieving wrong status code");
            next();
          });
      },function(err,results){
        console.log("DELETE SUCCESSFUL");
      });
    });
}
