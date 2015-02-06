var router = require("express").Router();

router.get("/", function(req,res,next){
  res.render("generic");
});
module.exports = router;
