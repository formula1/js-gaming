
var mongoose = require('mongoose');

function stringToSchemaType(str){
  switch(str){
    case "string": return String;
    case "date": return Date;
    case "number": return Number;
    case "boolean": return Boolean;
    case "array": return [mongoose.Schema.Types.Mixed];
    case "object": return Object;
    case "any": return mongoose.Schema.Types.Mixed;
  }
}

function schemaTypeToString(str){
  switch(str){
    case String: return "string";
    case Date: return "date";
    case Number: return "number";
    case Boolean: return "boolean";
    case mongoose.Schema.Types.Mixed: return "any";
  }
  if(Array.isArray(str)){
    return "array";
  }
  return "object";
}



function notNull(val){
  if(typeof val == "undefined") return false;
  if(val === null) return false;
  return true;
}

module.exports.Ampersand2Mongoose = function(amp){
  var schema = {};
  Object.keys(amp.props).forEach(function(i){
    var value = amp.props[i];
    if(typeof value == "string"){
      schema[i] = {type: stringToSchemaType(value)};
      return;
    }
    if(Array.isArray(value)){
      schema[i] = {
        type: stringToSchemaType(value[0]),
        required: value[1],
        default: value[2]
      };
      return;
    }else{
      schema[i] = {
        type: stringToSchemaType(value.type)
      };
      if(value.required){
        schema[i].required = true;
      }
      if(value.default){
        schema[i].default = value.default;
      }
      var validators = [];
      if(value.allowNull === false){
        validators.push({validator:notNull, msg:"{PATH} cannot be null"});
      }
      if(value.setOnce){
        throw new Error("cannot parse setOnce for now");
      }
      schema[i].validator = validators;
    }
  });
  schema = new mongoose.Schema(schema);
  Object.keys(amp.derived).forEach(function(i){
    schema.virtual(i).get(amp.derived[i].fn);
  });
};

module.exports.Mongoose2Ampersand = function(mon){
  var amp = {};
  Object.keys(mon).forEach(function(key){
    var value = mon[key];
    if(!value.type){
      amp[key] = {type:schemaTypeToString(value)};
      return;
    }
    amp[key] = {type:schemaTypeToString(value.type)};
    if(value.required) amp[key].required = value.required;
    if(value.default) amp[key].default = value.default;
    if(value.validate){
      var hasNotNull = false;
      var hasSetOnce = false;
      value.validate.forEach(function(ob){
        if(notNull == ob.validator){
          amp[key].allowNull = false;
          return;
        }
        if(setOnce == ob.validator){
          amp[key].setOnce = true;
        }
      });
    }
  });
};
