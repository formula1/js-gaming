var _ = require('lodash');
var ee = require("events").EventEmitter;
var util = require("util");
var db = {};
var id = 0;


exports.addClass = function(classname,validator){
  if(classname in db) throw new Error("Class["+classname+"] already exists");
  db[classname] = new FakeClass(classname, validator);
  return db[classname];
};

exports.getClass = function(classname,validator){
  if(!(classname in db)) throw new Error("Non Existant Class");
  return db[classname];
};


function FakeClass(name,validator){
  this.name = name;
  this.validate = (validator)?validator.bind(this):false;
  this.instances = [];
}
util.inherits(FakeClass,ee);

FakeClass.prototype.list =  function() {
    return this.instances;
};
FakeClass.prototype.search = function(equality){
  return _.where(this.instances, equality);
};
FakeClass.prototype.searchDelete = function(equality){
  var todel = _.where(this.instances, equality);
  var l = todel.length;
  while(l--){
    this.instances = _.without(this.instances, todel[l]);
    this.emit("delete", todel[l]);
  }
  return ;
};
FakeClass.prototype.add = function(data){
  if(this.validator){
    if(!(data = this.validator(data))) return false;
  }
  data.id = id++;
  this.instances.push(data);
  return data;
};
FakeClass.prototype.get = function(id){
  return _.findWhere(this.instances, {id: parseInt(id + '', 10)});
};
FakeClass.prototype.delete = function(id){
  var found = this.get(id);
  if(!found) return false;
  this.instances = _.without(this.instances, found);
  this.emit("delete", found);
  return found;
};
FakeClass.prototype.update = function(id, data){
  var found = this.get(id);
  if(!found) return false;
  if(this.validator){
    if(!(data = this.validator(data))) return false;
  }
  this.instances = _.extend(this.instances, data);
  return found;
};


var router = require("express").Router();
var url = require("url");
router.param('classname', function(req, res, next, classname){
  if(classname in db){
    req.params.class = db[classname];
    return next();
  }
  next(new Error("classname does not exist"));
});
router.get("/:classname",function(req,res){
  res.send(req.params.class.list());
});
router.get("/:classname/:id",function(req,res){
  var ret = req.params.class.get(req.params.id);
  if(ret) return res.status(200).send(ret);
  res.status(404).end();
});
router.delete("/:classname/:id",function(req,res){
  var ret = req.params.class.delete(req.params.id);
  if(ret) return res.status(200).send(ret);
  res.status(404).end();
});
router.put("/:classname/:id",function(req,res){
  var ret = req.params.class.update(req.params.id, req.body);
  if(ret) return res.status(200).send(ret);
  res.status(404).end();
});
router.post("/:classname",function(req,res){
  var ret = req.params.class.add(req.body);
  if(ret) return res.status(200).send(ret);
  res.status(404).end();
});

exports.router = router;
