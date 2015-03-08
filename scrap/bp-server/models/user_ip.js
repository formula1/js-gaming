module.exports = (function() {
  var mongoose = require('mongoose') // MongoDB abstraction layer
    , Schema = mongoose.Schema // Mongoose Schema constructor
    , ObjectId = Schema.ObjectId // Mongoose ObjectId type

    , _ = require('underscore') // list utility library
    
    , db = require('./db'); // make sure db is connected


  /* Create collection */
  var UserIpSchema = new Schema({
    address: Number
  });

  /* Create static method on schema, searching for an entry with the given IP */
  UserIpSchema.statics.findOrInsert = function (address_str, cb) {
    var address_int = dot2num(address_str);
    UserIp.findOne({ address: address_int }, function(find_err, user_ip) {
      if (find_err) { return cb(find_err); }
      if (user_ip instanceof UserIp) {
        // IP exists
        cb(null, false);
      }
      else {
        // IP doesn't exist, so insert it
        new UserIp({ address: address_int }).save(function(save_err) {
          if (save_err) { return cb(save_err); }
          cb(null, true);
        });
      }
    });
  };

  /* Convert dot-separated IP address String to integer,
     from http://javascript.about.com/library/blipconvert.htm */
  function dot2num(dot) {
    var d = dot.split('.');
    return ((((((+d[0])*256)+(+d[1]))*256)+(+d[2]))*256)+(+d[3]);
  }

  /* Create model */
  var UserIp = mongoose.model('user_ip', UserIpSchema);

  return UserIp;
})();