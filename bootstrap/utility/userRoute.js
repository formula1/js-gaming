
var config = require("getconfig");
var express = require("express");
var router = express.Router();
var user = require(__root+"/models/user");
var session = require("express-session");


// -----------------
// Enable Sessions and cookies
// -----------------
router
.use(require("cookie-parser")(config.session.secret))
.use(session({
  secret: config.session.secret,
  store: new session.MemoryStore()
})).use(user.middleware);

module.exports = router;
