
var _ = require("lodash"),
STATES = require("./states"),
connection = require("./connection");


function Waterline(){
  //queued
  this.adapters = {};
  this.collections = {};
  this.connections = {};

  this.defaults = {
    schema:Waterline.schemaDefaults,
    collection:Waterline.collectionDefaults,
  };

}

Waterline.prototype.addAdapter = function(name, adapter){
  if(!adapter){
    name = adapter.name;
    config = name;
  }
  var adap = new Adapter(name,config,this);
  this.adapters[name] = adap;
  this.emit("new-adapter",adap);
};

Waterline.prototype.addConnection = function(name, config){
  if(!config){
    name = config.name;
    config = adaptername;
  }
  var conn = new Connection(name,config,this);
  this.connections[name] = conn;
  this.emit("new-connection",conn);
};

Waterline.prototype.addCollection = function(name, config){

};

Waterline.collectionDefaults = {
  connection:"default",
  autoPK: true,
  autoCreatedAt: true,
  autoUpdatedAt: true,
  migrate: 'alter'
};

Waterline.prototype.setDefaults = function(type,config){
  if(!this.defaults[type]) throw new Error("Cannot set defaults to unknown type: "+type);

  for(var i in config){
    if(!this.defaults[type]) continue;
    defaultSettings.autoPK = defaults.autoPK;
  }
};
