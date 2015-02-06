var mongoose = require("mongoose");

var PlayerSchema = mongoose.Schema({
  user: {
    type:[mongoose.SchemaTypes.ObjectID],
    ref:"users"
  },
  won: {
    type:[mongoose.SchemaTypes.ObjectID]
  }
});
