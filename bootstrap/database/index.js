var fs = require("fs");
var cbpr = require(__root+"/abstract/utility/cbpromise");
var Waterline = require('waterline');
var MongoAdapter = require('sails-mongo');

function ModelCompiler(config) {
  if(!(this instanceof ModelCompiler)) return new ModelCompiler(config);
  config = config ? config : require("getconfig");
  this.mconfig = config.mongodb;
  this.mconfig.adapter = 'mongo';
  this.orm = new Waterline();
}

ModelCompiler.prototype.collect = function(next){
  var self = this;
  var cbret = cbpr(this, next);
  
  fs.readdir(__dirname + "/models", function(err,files) {
    if (err) return cbret.cb(err);
    files.forEach(function(file_name) {
      try {
        model = require("./models/" + file_name);
        self.orm.loadCollection(model);
      }
      catch(e) {
        console.error('Error while requiring or loading ' + file_name, e);
      }
    });
      
    self.orm.initialize({
      adapters: {
        mongo: MongoAdapter
      },
      connections: {
        mongo: self.mconfig
      }
    }, function(err, models) {
      self.collections = models.collections;
      self.connections = models.connections;
      cbret.cb(void(0));
    });
  });
  return cbret.ret;
};

ModelCompiler.prototype.getRouter = require("./router");

module.exports = ModelCompiler;