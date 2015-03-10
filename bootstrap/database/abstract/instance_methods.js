

return function(schema){
  var instance = schema.attributes;

  instance.update = function(props,next){
    var keys = _.keys(this.constructor.definition);
    keys = _.without(keys,"id","createdAt","updatedAt");
    keys = _.intersection(_.keys(req.body),keys);
    if(keys.length === 0) return next(new Error("no keys to update"));
    keys.forEach(function(key){
      this[key] = props[key];
    });
    return this.save(next);
  };
};
