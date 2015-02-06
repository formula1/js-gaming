var db = require("./database");
var async = require("async");
var polyfill = require("./polyfill");

db(function(err,mongoose){
  mongoose.connection.db.dropDatabase(function(err){
    if(err) return console.error(err.stack);
    console.log('database dropped');
  });
});
