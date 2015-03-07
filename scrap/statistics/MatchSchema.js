var mongoose = require("mongoose");
var async = require("async");

var MatchSchema = mongoose.Schema({
  state: {
    type: String,
    enum: ["egg","dormant", "active","ended"],
    default:"egg"
  },
  available: {type:Boolean, default:true},
  players: {
    type:[mongoose.SchemaTypes.ObjectID],
    ref:"users"
  },
  moves: [{
    time:{type:Date, default:Date.now},
    event:{type:String, required:true},
    user:{type:mongoose.SchemaTypes.ObjectID, ref:"users"},
    data:{type:mongoose.SchemaTypes.Mixed}
  }]
});

MatchSchema.method("addPlayer", function(user,next){
  var _this = this;
  var user_id = user._id?user._id:user;
  var pl = this.players.length;
  while(pl--){
    if(this.players[pl] == user_id){
      return next("Player already Exists");
    }
  }
  this.lag = Math.max(user.lag);
  this.players.push(user_id);
  this.save(next);
});

MatchSchema.method("removePlayer", function(user,next){
  var _this = this;
  var user_id = user._id?user._id:user;
  var pl = this.players.length;
  while(pl--){
    if(this.players[pl] != user_id) continue;
    this.players.splice(pl,1);
    return this.save(next);
  }
  return next("This player doesn't exist");
});

MatchSchema.method("validateMoves", function(moves,next){
  if(moves.length != this.moves.length) return next(false);
  var l = this.moves.length;
  var count = 0;
  async.whilst(
    function () {
      return count < l &&
      JSON.stringify(this.moves[count]) < JSON.stringify(moves[count]);
    },
    function (callback) {
      count++;
      process.nextTick(callback);
    },
    function (err) {
      next(count == l);
    }
  );
});
