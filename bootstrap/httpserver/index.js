/* global console */
var path = require('path');
var express = require('express');
var bodyParser = require('body-parser');
var compress = require('compression');
var config = require('getconfig');
var serveStatic = require('serve-static');
var app = express();
var url = require("url");

// a little helper for fixing paths for various environments
var fixPath = function (pathString) {
  return path.resolve(path.normalize(pathString));
};


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

//app.set('view engine', 'jade');
app.engine('jade', require('jade').__express);
app.engine('ejs', require('ejs').renderFile);
app.set('view engine', 'ejs');
app.set('views', __root+"/tempviews");


// -----------------
// Enable Sessions and cookies
// -----------------
app
.use(bodyParser.urlencoded({ extended: false }))
.use(bodyParser.json());

module.exports = app;
