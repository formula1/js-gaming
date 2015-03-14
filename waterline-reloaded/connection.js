/**
 * Module Dependencies
 */
var _ = require('lodash'),
  util = require('util'),
  STATES = require("./states");

var Connection = function(name,config,waterline){
  if(!name) throw new Error(
    "Every connection needs a name."+
    " This is done so you can user the same model in different environments."
  );
  // Ensure an adapter module is specified
  if(!config.adapter) {
    throw new Error(util.format(
      'Connection ("%s") is missing a required property (`adapter`).'+
      '  You should indicate the name of one of your adapters.', name
    ));
  }

  // Ensure the adapter exists in the adapters options
  if(typeof config.adapter != "string"){
    throw new Error(
      "we do not currently support specifying an adapter while loading a connection"
    );
  }
  if(!(config.adapter in waterline.adapters)){
    throw new Error(util.format(
      'Invalid `adapter` property in connection `%s`.'+
      '  It should be a string (the name of one of the'+
      ' adapters you passed into `waterline.initialize()`)',
      key
    ));
  }

  var finish = function(adapter){
    this.config = _.merge({}, adapter.defaults, config);
    this.adapter = _.cloneDeep(adapter);
  }.bind(this);

  if(!waterline.adapters[config.adapter]){
    var adapter_listener = function(adapter){
      if(adapter.name != config.adapter) return;
      finish(adapter);
      waterline.off("adapter", adapter_listener);
    };
    waterline.on("adapter",adapter_listener);
  }else{
    finish(waterline.adapters[config.adapter]);
  }
  this.collections = [];

  Object.defineProperty(this,"state",{
    get:function(){
      if(!this.adapter) return STATES.QUEUED;
      return this.adapter.state;
    }
  });
};
