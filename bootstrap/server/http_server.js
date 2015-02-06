/* global console */
var path = require('path');
var express = require('express');
var bodyParser = require('body-parser');
var compress = require('compression');
var config = require('getconfig');
var serveStatic = require('serve-static');
var session = require("express-session");
var app = express();
var url = require("url");

// a little helper for fixing paths for various environments
var fixPath = function (pathString) {
  return path.resolve(path.normalize(pathString));
};

var user = require(__root+"/models/user");
var messages = require(__root+"/models/message");
var test = require(__dirname+"/test");
// -----------------
// Configure express
// -----------------
app.use(compress());
app.use(serveStatic(fixPath('public')));

// we only want to expose tests in dev
if (config.isDev) {
  app.use(serveStatic(fixPath('test/assets')));
  app.use(serveStatic(fixPath('test/spacemonkey')));
}

// -----------------
// Enable Sessions and cookies
// -----------------
app
.use(require("./generic_router"))
.use(bodyParser.urlencoded({ extended: false }))
.use(bodyParser.json())
.use(user.renderware);

// ----------------
// MiddleWare for Tests
// ----------------

test.middleware(app);

//app.set('view engine', 'jade');
app.engine('jade', require('jade').__express);
app.engine('ejs', require('ejs').renderFile);
app.set('view engine', 'ejs');
app.set('views', __root+"/tempviews");

// -----------------
// Set up our little demo API
// -----------------
var api = require(__root+'/abstract/mongooseAPI');
app.use('/api', api.router);
app.use('/auth', user.router);

// ----------------
// Temporary Router
// ----------------

app.use('/temp', require(__root+"/abstract/temporaryRouter"));

// ----------------
// Routes for Tests
// ----------------

test.routes(app);


// listen for incoming http requests on the port as specified in our config
app.listen(config.http.port);
console.log('HTTP is running at: http://localhost:' + config.http.port + '.');
