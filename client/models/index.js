var cbpr = require('app/abstract/utility/cbpromise');
var Waterline = require('waterline');
var RestAdapter = require('waterline-rest');

function ModelCompiler(config) {
  if(!(this instanceof ModelCompiler)) return new ModelCompiler(config);
  config = config ? config : require('clientconfig');
  this.config = config.api || config;
  this.orm = new Waterline();
}

ModelCompiler.prototype.collect = function(next){
  var self = this;
  var cbret = cbpr(this, next);
  
  var message = require('./message');
  self.orm.loadCollection(message);
    
  var adapter_name = self.config.adapter_name;
  var adapters = {};
  adapters[adapter_name] = RestAdapter;
  var connections = self.config.connections;
  console.log('connections is', connections);
  self.orm.initialize({
    adapters: adapters,
    connections: connections
  }, function(err, models) {
    console.log(self.config, 'initialize returns', err, models);
    self.collections = models.collections;
    self.connections = models.connections;
    cbret.cb(void(0));
  });
  return cbret.ret;
};

module.exports = ModelCompiler;