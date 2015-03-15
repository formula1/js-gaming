var fs = require("fs");
var cbpr = require(__root+"/abstract/utility/cbpromise");
var Waterline = require('waterline');
var MongoAdapter = require('sails-mongo');
var ee = require("events").EventEmitter;


function ModelCompiler(config) {
  if(!(this instanceof ModelCompiler)) return new ModelCompiler(config);
  config = config ? config : require("getconfig");
  this.config = config.database;
  this.orm = new Waterline();
  ee.call(this.orm);
  for(var i in ee.prototype){
    if(this.orm[i]) console.log("has "+i);
    this.orm[i] = ee.prototype[i];
  }
  this.models = {};
}

ModelCompiler.prototype.addCollection = function(schema){
  var t = typeof schema;
  if(t == "string"){
    try {
      schema = require(schema);
    }catch(e){
      console.error('Error while requiring or loading ' + schema, e);
    }
  }
  if(t == "object" ){
    this.orm.loadCollection(model);
    this.models[schema.tablename] = model;
  }
};

ModelCompiler.prototype.connect = function(next){
  var cbret = cbpr(this, next);
  var self = this;
  var config = {adapters:{},connections:{}};
  config.adapters[self.config.adapter_name] = MongoAdapter;
  config.connections = self.config.connections;
  self.orm.initialize(config, function(err, models) {
    if(err) return cbret.cb(err);
    self.orm.emit("initialize", self.orm);
    self.collections = models.collections;
    self.connections = models.connections;
    cbret.cb(void(0));
  });
  return cbret.ret;
};

ModelCompiler.prototype.collect = function(next){
  var self = this;
  var cbret = cbpr(this, next);

  fs.readdir(__dirname + "/models", function(err,files) {
    if (err) return cbret.cb(err);
    files.forEach(function(file_name) {
      self.addCollection(__dirname+"/models/"+file_name);
    });
  });
  return cbret.ret;
};

ModelCompiler.prototype.getRouter = require("./router");

module.exports = ModelCompiler;
