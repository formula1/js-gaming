/*

Need to allow a user to download or delete applications

Saves the current configuration

Can give another user the configuration
-They test that configuration
-They can switch back
-They can delete a configuration
-They can merge the configurations togethor

Need to save currently installed apps
Need to save app-defaults


Configuration File
{
  main_manager: String,
  downloaded_apps: {
    name: version
  },

}

*/
var fs = require("fs");

function UserConfiguration(appfactory, user){
  if(!user) user = process.env.USER;
  var curconfig = false;
  var config = false;
  var file = fs.readFile(__root+"/user/"+process.env.USER);
  appfactory.on("install", function(fork){
    //config[fork.name] =
  });
}

Configuration.prototype.test = function(){

}

UserConfiguration.prototype.save = function(){

}

// Removes Unwanted Applications
UserConfiguration.prototype.clean = function(){

}
