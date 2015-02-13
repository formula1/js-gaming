var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var MatchSchema = new Schema({
  creator: {
    type:mongoose.SchemaTypes.ObjectId,
    ref:"user"
  },
  CurrentPlayers: {
    type: [mongoose.SchemaTypes.ObjectId],
    ref: "player"
//    validate: uniqueVal
  },
  AllPlayers: {
    type: [mongoose.SchemaTypes.ObjectId],
    ref: "player"
  },
  state: {
    type:String,
    enum:["dormant","active","ended"]
  },
  GameType: {
    type: String,
//    enum: Available Games
  },
  JoinTimes: [{
    player:mongoose.SchemaTypes.ObjectId,
    time:Date
  }],
  StartTime: Date,
  EndTime: Date,
  advertisement: {
    type: String,
//    default:
  },
});


module.exports = mongoose.model("match",MatchSchema);
