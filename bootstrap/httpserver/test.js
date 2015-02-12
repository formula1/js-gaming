var config = require('getconfig');
var semiStatic = require('semi-static');
var path = require('path');
var helmet = require('helmet');
var Moonboots = require('moonboots-express');
var templatizer = require('templatizer');
var stylizer = require('stylizer');


// a little helper for fixing paths for various environments
var fixPath = function (pathString) {
  return path.resolve(path.normalize(pathString));
};

module.exports.middleware = function(app){
  // in order to test this with spacemonkey we need frames
  if (!config.isDev) {
    app.use(helmet.xframe());
  }
  app.use(helmet.xssFilter());
  app.use(helmet.nosniff());
};


module.exports.routes = function(app){

  // -----------------
  // Enable the functional test site in development
  // -----------------
  if (config.isDev) {
    app.get('/test*', semiStatic({
      folderPath: fixPath('test'),
      root: '/test'
    }));
  }

  // -----------------
  // Set our client config cookie
  // -----------------
  app.use(function (req, res, next) {
    res.cookie('config', JSON.stringify(config.client));
    next();
  });

  // ---------------------------------------------------
  // Configure Moonboots to serve our client application
  // ---------------------------------------------------
  new Moonboots({
    moonboots: {
      jsFileName: 'js-gaming',
      cssFileName: 'js-gaming',
      main: fixPath('client/app.js'),
      developmentMode: config.isDev,
      libraries: [
      ],
      stylesheets: [
      fixPath('public/css/bootstrap.css'),
      fixPath('public/css/app.css')
      ],
      browserify: {
        debug: false
      },
      beforeBuildJS: function () {
        // This re-builds our template files from jade each time the app's main
        // js file is requested. Which means you can seamlessly change jade and
        // refresh in your browser to get new templates.
        if (config.isDev) {
          templatizer(fixPath('templates'), fixPath('client/templates.js'));
        }
      },
      beforeBuildCSS: function (done) {
        // This re-builds css from stylus each time the app's main
        // css file is requested. Which means you can seamlessly change stylus files
        // and see new styles on refresh.
        if (config.isDev) {
          stylizer({
            infile: fixPath('public/css/app.styl'),
            outfile: fixPath('public/css/app.css'),
            development: true
          }, done);
        } else {
          done();
        }
      }
    },
    server: app
  });
};
