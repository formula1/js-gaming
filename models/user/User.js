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
  },
  provider: {
    type: String,
    enum: ["local","persona","twitter"]
  }
});

UserSchema.virtual("fullname").get(function(){
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

UserSchema.static("Permission", function(req,next){
  if(!req.user) return next(false);
  if(req.user.groups != "admin") return next(false);
  next(true);
});


module.exports = mongoose.model("User", UserSchema);
