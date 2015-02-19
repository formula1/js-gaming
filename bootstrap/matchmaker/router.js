

var router = require("express").Router();
var Match = require("mongoose").model("match");

router
.get("/",function(req,res,next){
  Match.find().exec().then(function(matches){
    res.render("matches",{matches:matches});
  },next);
}).get("/:id",function(){

}).post("/",Match.post);

module.exports = router;
