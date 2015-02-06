
module.exports.scripts = ["https://login.persona.org/include.js"];

module.exports.onLogout = function(){
  navigator.id.logout();
};

module.exports.onLogin = function(){
  navigator.id.request();
};

module.exports.onLoad = function(){
  navigator.id.watch({
    loggedInUser: window.profile.id,
    onlogin: function(assertion) {
      $.ajax({
        type: 'POST',
        url: '/auth/persona/callback', // This is a URL on your website.
        data: {assertion: assertion},
        success: function(res, status, xhr) { window.location.reload(); },
        error: function(xhr, status, err) {
          navigator.id.logout();
          alert("Login failure: " + err);
        }
      });
    },
    onlogout: function() {
      window.location.replace("/auth/logout");
    }
  });
};
