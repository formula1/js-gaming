var mongoose = require("mongoose");

PlayerSchema = mongoose.Schema({
  user:{
    type: mongoose.SchemaTypes.ObjectId,
    ref:"user",
    unique:true
  },
  displayName: String,
  currentMatch: {
    type: mongoose.SchemaTypes.ObjectId,
    ref:"match"
  },
  localsLength: {
    type: Number,
    default: 1
  },
  playerType: {
    type:String,
    enum:["UI","Controller","RTC","RTCController"],
    default: "UI"
  }
});

PlayerSchema.pre("create", function(player,next){
  if(!player.user) return next(new Error("player has no user"));
  if(player.displayName) return next();
  player.populate("user")
  .then(
    function(user){
      player.displayName = user.displayName;
      next();
    },
    next
  );
});
