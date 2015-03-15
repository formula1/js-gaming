/* global console */
var path = require('path');
var express = require('express');
var bodyParser = require('body-parser');
var compress = require('compression');
var config = require('getconfig');
var serveStatic = require('serve-static');
var app = express();

// a little helper for fixing paths for various environments
var fixPath = function (pathString) {
  return path.resolve(path.normalize(pathString));
};


// -----------------
// Configure express
// -----------------
app.use(compress());
// -----------------
// Set our client config cookie
// -----------------
app.use(function (req, res, next) {
  res.cookie('config', JSON.stringify(config.client));
  next();
});
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

module.exports = app;
