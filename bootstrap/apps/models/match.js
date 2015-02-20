var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var Match;

var MatchSchema = new Schema({
  creator: {
    type:mongoose.SchemaTypes.ObjectId,
    ref:"player"
  },
  currentPlayers: {
    type: [mongoose.SchemaTypes.ObjectId],
    ref: "player",
    index: true
//    validate: uniqueVal
  },
  currentPlayersLength:{
    type: Number,
    index: true
  },
  allPlayers: {
    type: [mongoose.SchemaTypes.ObjectId],
    ref: "player"
  },
  state: {
    type:String,
    enum:["dormant","active","ended"],
    default:"dormant"
  },
  GameType: {
    type: String,
    index: true
//    enum: Available Games
  },
  joinTimes: [{
    player:mongoose.SchemaTypes.ObjectId,
    time:{
      type: Date,
      defualt: Date.now
    }
  }],
  startTime: Date,
  endTime: Date,
  advertisement: {
    type: String,
//    default:
  },
});

MatchSchema.static("post", function(req,res,next){
  player.findOne({user:req.user})
  .exec(function(err,player){
    if(err) return next(err);
    Match.create({
      creator:player,
      currentPlayers:[player],
      allPlayers:[player],
      GameType:req.params.appname,
      joinTimes: [{player:player}],
      advertisement:req.body.title||req.params.appname
    });
  });
});

MatchSchema.static("search",function(req,res,next){
  var query = this.find();
  var tofind = {};
  if(req.query.gameType[0]){
    if(req.query.gameType[1] === "regex"){
      query = query.regex("gameType", new RegExp(req.query.gameType[0]));
    }else if(req.query.gameType[1] === "like"){
      query = query.regex(
        "gameType",
        new RegExp(Regex.escape(req.query.gameType[0]), "i")
      );
    }else{
      query = query.where("gameType", req.query.gameType[0]);
    }
  }
  if(req.query.numPlayers[0]){
    if(req.query.numPlayers[1] === "gt"){
      query = query.gt("numPlayers", parseInt(req.query.numPlayers[0]));
    }else if(req.query.gameType[1] === "lt"){
      query = query.lt("numPlayers", parseInt(req.query.numPlayers[0]));
    }else{
      query = query.where("numPlayers", req.query.numPlayers[0]);
    }
  }
  if(req.query.hasPlayer.length){
    query = query.elemMatch(currentPlayers, {$in: req.query.hasPlayer});
  }
  query.exec().then(res.json.bind(res),next);
});

Match = mongoose.model("match",MatchSchema);

module.exports = Match;
