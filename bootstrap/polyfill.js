var path = require("path");

if(!global.Promise) global.Promise = require("bluebird");

global.__root = path.resolve(__dirname+"/..");
