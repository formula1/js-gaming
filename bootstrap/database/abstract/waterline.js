var async = require("async");

function MIDDLEWARE_FN(middleware,type,time){
  return function(values,next){
    async.eachSeries(middleware[type][time],function(fn,next){
      fn(values,next);
    },function(err){
      next(err,values);
    });
  };
}

var MIDDLEWARE_TYPES = [
  "validate",
  "create",
  "update",
  "destroy"
];

var MIDDLEWARE_TIMINGS = [
  "before",
  "after"
];

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function stdExtend(schema){
  var middleware = {};
  schema.getMiddleware = function(){
    return middleware;
  };
  MIDDLEWARE_TIMINGS.forEach(function(time){
    schema[time] = function(type,fn){
      if(MIDDLEWARE_TYPES.indexOf(type) === -1){
        throw new Error(
          "cannot add middleware not in types: "+
          JSON.stringify(MIDDLEWARE_TYPES)
        );
      }
      if(typeof fn != "function"){
        throw new Error(
          "callback supplied for("+
          time+" "+time+
          " is not a function"
        );
      }
      middleware[type][time].push(fn);
    };
  });
  MIDDLEWARE_TYPES.forEach(function(type){
    middleware[type] = {};
    MIDDLEWARE_TIMINGS.forEach(function(time){
      var dLabel = time+capitalizeFirstLetter(type);
      middleware[type][time] = !schema[dLabel]?[]:
        !Array.isArray(schema[dLabel])?[schema[dLabel]]:
        schema[dLabel];
      middleware[type][time].forEach(function(fn,i){
        if(typeof fn != "function"){
          throw new Error(
            "callback["+i+"] supplied for "+
            time+" "+type+
            " is not a function"
          );
        }
      });
      schema[dLabel] = MIDDLEWARE_FN(middleware,type,time);
    });
  });
  return schema;
}

module.exports = stdExtend;
