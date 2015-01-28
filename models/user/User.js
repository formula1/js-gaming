var mongoose = require("mongoose");
var Schema = mongoose.Schema;
var passport = require("passport");


var UserSchema = new Schema({
  firstName: String,
  lastName: String,
  username: {type:String, required:true, unique:true, index:true},
  groups:{
    type: String,
    enum: ["guest", "admin"],
    default: "guest",
  },
  loggedIn: {
    type: Boolean,
    default: true
  }
});

UserSchema.virtual("fullname", function(){
  var fullName;
  if (_.isEmpty(this.firstName) && _.isEmpty(this.lastName)) {
    fullName = 'Stranger';
  }
  else if (_.isEmpty(this.firstName)) {
    fullName = 'Mr. or Ms. ' + this.lastName;
  }
  else {
    fullName = this.firstName;
  }
  return fullName;
});



module.exports = mongoose.model("user", UserSchema);
