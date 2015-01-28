var mongoose = require("mongoose");
var Schema = mongoose.Schema;
var moment = require("moment");

var MessageSchema = new Schema({
    sender: {type:String, required:true},
    message: {type:String, required:true},
    timestamp: {type:Date, required:true, default:Date.now }
});

MessageSchema.virtual("readableTimeStamp", function(){
  return moment(this.timestamp).fromNow();
});

module.exports = mongoose.model("messages",MessageSchema);
