module.exports = (function() {
  var mongoose = require('mongoose') // MongoDB abstraction layer
    , Schema = mongoose.Schema // Mongoose Schema constructor
    , ObjectId = Schema.ObjectId // Mongoose ObjectId type

    , crypto = require('crypto') // encryption utility library
    , async = require('async') // flow control utility library
    , request = require('request') // HTTP/HTTPS request library
    , _ = require('underscore') // list utility library

    , GuestCounter = require('./guest_counter')
    , UserIp = require('./user_ip')
    
    , db = require('./db') // make sure db is connected

    , mailer = require('../mailer') // used to send emails

    , io = require('../sockets') // used to send server-initiated messages

    , btc_main = require('../btc/main')
    , btc_remote_apis = require('../btc/remote_apis');

  /* the schema - defines the "shape" of the documents:
   *   gets compiled into one or more models */
  var UserSchema = new Schema({
  // instance properties - document.field_name
    //the user's username
    username             : { type: String, unique: true }
    //the user's password, hashed with SHA-1
  , password             : String
    //the user's email address
  , email                : { type: String, trim: true, default: '' }
    //the code used to confirm this user's email
  , confirmation_code  : String
    //whether the user has confirmed his/r email address
  , email_confirmed      : { type: Boolean, default: false }
  , funbucks             : { type: Number, default: 100000000, min: 0 }
  , satoshi              : { type: Number, default: 0, min: 0 }
  , recovery_code        : { type: String }
  , registration_date    : { type: Date, default: Date.now }
  , deposit_address      : { type: String }
  , current_table_names: { type: [String], default: function() { return []; } }
  // persistent preferences shared across sessions/tables
  , preferences          : { type: Schema.Types.Mixed, default: function() { return {}; } }
  , transactions         : { type: [Schema.Types.Mixed], default: function() { return [{
            type: 'initial funbucks'
          , amount: 100000000
          , timestamp: Date.now
          , currency: 'funbucks'
          , new_balance: 100000000
          }]; } }
  , table_transactions   : { type: [Schema.Types.Mixed], default: function() { return []; } }
  // whether the user can see the admin page and perform admin-only actions
  , admin                : Boolean
  , emergency_BTC_address: { type: String, default: '' }
  }, { minimize: false }); // set minimize to false to save empty objects

  var FREE_SATOSHI = 1000; // how many satoshi to give to new users with new IPs

  // static methods - Model.method()
  UserSchema.statics.createUser = function(spec, cb) {
    var username = spec.username
      , pt_password = spec.pt_password
      , error;
    console.log('createUser called for', spec);
    if (_.escape(username) !== username) {
      error = 'The following characters are not allowed in usernames: & < > " \' /';
    }
    else if (User.isGuest(username)) {
      error = 'non-guest usernames may not begin with "guest"!';
    }
    else if (! _.isString(pt_password)) {
      error = 'User.createUser called without pt_password!';
    }
    if (error) {
      console.error(error);
      return cb(error);
    }

    spec.password = User.encryptPassword(pt_password);
    delete spec.pt_password;

    var user = new User(spec);
    console.log('created user with', spec, user);
    btc_main.createDepositAddress(user, function(create_err, deposit_address) {
      if (create_err) {
        error = 'Error during save: ' + create_err;
        return cb(error);
      }
      user.deposit_address = deposit_address;
      UserIp.findOrInsert(spec.ip_address, function(ip_err, new_ip) {
        if (ip_err) {
          error = 'Error while checking IP: ' + ip_err;
          return cb(error);
        }
        if (new_ip) {
          user.satoshi = FREE_SATOSHI;
          user.transactions.push({
            type: 'registration promotion'
          , amount: FREE_SATOSHI
          , timestamp: new Date()
          , currency: 'satoshi'
          , new_balance: user.satoshi
          });
        }
        user.save(function(save_err, result) {
          if (save_err) {
            error = 'Error during save: ' + save_err;
            return cb(error);
          }
          if (! _.isEmpty(spec.email)) {
            user.sendConfirmationEmail(spec.email, function(email_err) {
              if (email_err) {
                error = 'Error while sending email: ' + email_err;
                return cb(error);
              }
              cb(null, result);
            })
          }
          else {
            cb(null, result);
          }
        });
      });
    });
  };

  UserSchema.statics.createGuestUser = function(cb) {
    GuestCounter.increment(function (err, guest_num) {
      if (err) {
        console.error('Error during GuestCounter.increment:', err);
        return cb(null);
      }
      var username = 'guest' + guest_num
        , user = new User({ username: username });
      console.log('Created guest user:', user);
      cb(user);
    });
  };

  UserSchema.methods.convertFromGuest = function(spec, cb) {
    var self = this
      , username = spec.username
      , pt_password = spec.pt_password
      , keys = _.keys(spec)
      , error;
    console.log('convertFromGuest called for', username);

    if (! User.isGuest(self.username)) {
      error = 'User.convertFromGuest called for non-guest user! ' + username;
    }
    else if (! _.isString(username)) {
      error = 'User.convertFromGuest called without username!';
    }
    else if (_.escape(username) !== username) {
      error = 'The following characters are not allowed in usernames: & < > " \' /';
    }
    else if (User.isGuest(username)) {
      error = 'non-guest usernames may not begin with "guest"!';
    }
    else if (! _.isString(pt_password)) {
      error = 'User.convertFromGuest called without pt_password!';
    }
    if (error) {
      console.error(error);
      return cb(error);
    }

    if (! (keys.length === 3 || (keys.length === 4 && _.contains(keys, 'email')))) {
      error = 'User.convertFromGuest called with invalid spec keys:' + keys;
      console.error(error);
      return cb(error);
    }

    // encrypt pt_password and save it as password
    spec.password = User.encryptPassword(pt_password);
    delete spec.pt_password;
    
    console.log('updating user with', spec);
    _.extend(self, spec);
    self.save(function(update_err, result) {
      console.log('update callback called with', update_err, result);
      if (update_err) {
        error = 'Error in User.convertFromGuest: ' + update_err.message;
        console.error(error);
        return cb(error);
      }

      btc_main.createDepositAddress(self, function(create_err, deposit_address) {
        if (create_err) {
          error = 'Error during deposit address setup: ' + create_err;
          return cb(error);
        }
        self.deposit_address = deposit_address;
        UserIp.findOrInsert(spec.ip_address, function(ip_err, new_ip) {
          if (ip_err) {
            error = 'Error while checking IP: ' + ip_err;
            return cb(error);
          }
          if (new_ip) {
            self.satoshi = FREE_SATOSHI;
            self.transactions.push({
              type: 'registration promotion'
            , amount: FREE_SATOSHI
            , timestamp: new Date()
            , currency: 'satoshi'
            , new_balance: self.satoshi
            });
          }
          self.save(function(save_err, result) {
            if (save_err) {
              error = 'Error during save: ' + save_err;
              return cb(error);
            }
            if (! _.isEmpty(spec.email)) {
              self.sendConfirmationEmail(spec.email, function(email_err) {
                if (email_err) {
                  error = 'Error while sending email: ' + email_err;
                  return cb(error);
                }
                cb(null, result);
              });
            }
            else {
              cb(null, result);
            }
          });
        });
      });
    });
  };

  UserSchema.statics.authenticate = function(username, password, cb) {
    var model = this;
    // look for a matching username/password combination
    model.findOne({
      username: username,
      password: User.encryptPassword(password)
    }, cb);
  };

  UserSchema.statics.generateConfirmationCode = function(cb) {
    crypto.randomBytes(16, function(err, buf) {
      if (err) {
        cb(err);
      }
      else {
        var confirmation_code = buf.toString('hex');
        cb(null, confirmation_code);
      }
    });
  };
  
  UserSchema.statics.generatePasswordRecoveryCode = function(cb) {
    crypto.randomBytes(16, function(err, buf) {
      if (err) {
        cb(err);
      }
      else {
        var recovery_code = buf.toString('hex');
        cb(null, recovery_code);
      }
    });
  };

  UserSchema.statics.isGuest = function(username) {
    return username.substring(0, 5) === 'guest';
  };

  UserSchema.statics.getByIdWithoutPassword = function(id, cb) {
    User.findOne({ _id: id }, { password: false }, cb);
  };

  UserSchema.statics.getLeaders = function(currency, cb) {
    //console.log ('getLeaders called');
    User.find({ admin: { $ne: true } })
      .limit(25)
      .sort('-' + currency)
      .select('username ' + currency)
      .exec(function (err, users) {
        if (err) return cb(err);
        //console.log('users are', users);
        cb(err, users);
      });   
  };

  UserSchema.statics.encryptPassword = function(pt_password) {
    var shasum;
    if (_.isString(pt_password)) {
      shasum = crypto.createHash('sha1');
      shasum.update(pt_password);
      shasum = shasum.digest('hex');
    }
    else {
      console.log('User.encryptPassword called without pt_password!');
      shasum = null;
    }
    return shasum;
  };

  // instance methods - document.method()
  UserSchema.methods.sendConfirmationEmail = function(email, cb) {
    var self = this
      , error = null
      , valid = true; //this is a stub to hold the place for a email validator functionality. 
    //if email is valid, save it to MongoDB
    if (valid) {
      //attach e-mail to user
      User.generateConfirmationCode(function(err, confirmation_code) {
        if (err) {
          error = 'Error while generating confirmation code:' + err;
          console.error(error);
          cb(error);
        }
        else {
          self.update({ $set: { email: email, confirmation_code: confirmation_code } },
                      function(err) {
            if (err) {
              error = 'Error when saving email to database:' + err;
              console.error(error);
            }
            else {
              console.log('Email saved to ' + self.username + '\'s account.');
              mailer.sendConfirmationEmail(email, confirmation_code, self.username);
            }
            cb(error);
          });
        }
      });
    }
  };

  // look up and return current balance of the given currency type
  UserSchema.methods.checkBalance = function(type, cb) {
    if (type !== 'satoshi' && type !== 'funbucks') { return cb('Invalid type passed to checkBalance: ' + type); }
    User.findOne({ _id: this._id }, function(find_err, user) {
      if (find_err) {
        cb(find_err);
        return;
      }
      else {
        //console.log(user.username + ' has ' + (user && user[type]) + ' in ' + type + ' on ' + Date());
        cb(null, user && user[type]); //returns that which doesnt exist first
      }
    });
  };

  // Ensure that a user's balance will only be updated by one updateBalance call at a time
  var locks = {};
  // update balance of the given currency type, and create a transaction to store in the transactions array
  UserSchema.methods.updateBalance = function(currency, balance_change, transaction, cb) {
    if (currency !== 'satoshi' && currency !== 'funbucks') { return cb('Invalid currency passed to updateBalance: ' + currency); }
    var self = this
      , username = self.username;
    function performUpdate() {
      self.fetch(function(fetch_err, user) {
        if (fetch_err) { return cb(fetch_err); }
        var new_balance = user[currency] + balance_change
          , update_obj = { $set: {} };
        update_obj.$set[currency] = new_balance;
        if (_.isObject(transaction)) {
          transaction.currency = currency;
          transaction.new_balance = new_balance;
          // buyins and cashouts go into table_transactions, for easier periodic cleanup
          if (transaction.type === 'buyin' || transaction.type === 'cashout') {
            update_obj.$push = { table_transactions: transaction };
          }
          else {
            update_obj.$push = { transactions: transaction };
          }
        }
        //console.log('update_obj is', update_obj);
        user.update(update_obj, function(update_err) {
          delete locks[username];
          cb(update_err, new_balance);
        });
      });
    }
    if (locks[username]) {
      setTimeout(function() {
        self.updateBalance(currency, balance_change, transaction, cb);
      }, 500);
    }
    else {
      locks[username] = true;
      performUpdate();
    }
  };

  // lookup and return current, complete user document
  UserSchema.methods.fetch = function(cb) {
    User.findOne({ _id: this._id }, cb);
  };

  UserSchema.methods.onJoinTable = function(table_name) {
    this.update({ $addToSet: { current_table_names: table_name } }, function(err, result) {
      if (err) {
        var error = 'Error in User.joinTable: ' + err.message;
        console.error(error);
      }
      console.log('onJoinTable(' + table_name + ') update returns', err, result);
    });
  };

  UserSchema.methods.onLeaveTable = function(table_name) {
    this.update({ $pull: { current_table_names: table_name } }, function(err, result) {
      if (err) {
        var error = 'Error in User.leaveTable: ' + err.message;
        console.error(error);
      }
      console.log('onLeaveTable(' + table_name + ') update returns', err, result);
    });
  };

  UserSchema.methods.setPreference = function(name, value, cb) {
    var user = this;
    user.preferences[name] = value;
    user.markModified('preferences');
    user.save(function(save_err) {
      if (save_err) {
        console.error('Error during setPreference.save:', save_err);
      }
      cb(user);
    });
  };

  UserSchema.methods.setPreferences = function(preferences, cb) {
    var user = this;
    _.each(preferences, function(value, name) {
      user.preferences[name] = value;
    });
    user.markModified('preferences');
    user.save(function(save_err) {
      if (save_err) {
        console.error('Error during setPreferences.save:', save_err);
      }
      cb(user);
    });
  };

  UserSchema.methods.broadcastBalanceUpdate = function(currency, balance) {
    var Room = require('./room')
      , socket_list = io.sockets.in(Room.USER_ROOM_PREFIX + this.username);
    socket_list.emit('new_balance', currency, balance);
  };

  /* the model - a fancy constructor compiled from the schema:
   *   a function that creates a new document
   *   has static methods and properties attached to it
   *   gets exported by this module */
  var User = mongoose.model('User', UserSchema);

  return User;
})();