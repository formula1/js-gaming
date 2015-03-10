var Waterline = require('waterline');
var stdSchema = require(__root+"/bootstrap/database/abstract/waterline");

var TestModel = Waterline.Collection.extend(stdSchema({
  // Define a custom table name
  tableName: 'TestModel',
  schema: true,
  connection: "database",
  attributes: {
    aString:{
      type:"string",
      defaultsTo:function(){
        return "in a function";
      }
    },
    someText:{
      type:"string",
      enum:["it", "is", "gone"],
      defaultsTo: "it",
      index:true
    },
    anInteger:{
      type:"integer",
      defaultsTo: 0,
      autoIncrement: true
    },
    aDateTime:{
      type:"date",
      defaultsTo: function(){
        return new Date();
      },
      unique:true
    },
  }
}));

module.exports = TestModel;
