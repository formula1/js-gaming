var $ = require("jquery");
$(".persona.login").click(function(e){
  e.preventDefault();
  navigator.id.request();
});

$('.logout').click(function(e){
  if(window.User.provider == "persona"){
    e.preventDefault();
    navigator.id.logout();
  }
});


$.getScript("https://login.persona.org/include.js").done(function(){
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
});
