var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var User;
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
//    enum: ["local","persona","twitter"]
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

UserSchema.static("serialize", function(user,next){
  console.log('in User.serialize, user is', user);
  if(user && user._id) return next(void(0), user._id);
  next(new Error("no user"));
});

UserSchema.static("deserialize", function(id,next){
  User.findOne({_id:id},next);
});

User = mongoose.model("User", UserSchema);
module.exports = User;
