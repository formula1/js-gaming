var Waterline = require('waterline');
var stdSchema = require(__dirname+"/../../database/abstract/waterline");

var User = Waterline.Collection.extend(stdSchema({
  // Define a custom table name
  tableName: 'User',
  schema: true,
  connection: "database",
  attributes: {
    firstName: {type: 'string'},
    lastName: {type: 'string'},
    username: {type:"string", required:true, unique:true},
    groups:{
      type: "string",
      in: ["guest", "admin"],
      defaultsTo: "guest",
    },
    loggedIn: {
      type: "boolean",
      defaultsTo: true
    },
    provider: {
      type: "string",
      //    enum: ["local","persona","twitter"]
    },
    fullname: function(){
      var fullName;
      if (_.isEmpty(this.firstName) && _.isEmpty(this.lastName)) {
        fullName = 'Stranger';
      }
      else if (_.isEmpty(this.firstName)) {
        fullName = 'Mr. or Ms. ' + this.lastName;
      }
      else {
        fullName = this.firstName;
      }
      return fullName;
    }
  },
  Permission:function(req,next){
    if(!req.user) return next(false);
    if(req.user.groups != "admin") return next(false);
    next(true);
  },
}));

module.exports = User;
