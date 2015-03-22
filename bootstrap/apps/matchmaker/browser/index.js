var url = require("url");
var querystring = require("qs");
var Server = require("../../../../abstract/clientserver/client2server");

jQuery(function($){
  var $matches = $("#match_container");
  var $form = $matches.find("form");
  var MatchMaker = new Server("/apps");
  MatchMaker.add("game_location",function(nil,next){
    console.log("choose ws/rtc");
    var form, dialog;
    dialog = $( "#game_location" ).dialog({
     modal: true,
     close: function() {
       form[ 0 ].reset();
       next(void(0),{type:"rtc",amount:0});
     }
   });
   form = dialog.find( "form" ).on( "submit", function( event ) {
     event.preventDefault();
     dialog.dialog("close");
     next(void(0),querystring.parse($form.serialize()));
   });
   setTimeout(dialog.dialog.bind(dialog,"close"),30*1000);
  });

  $form.on("submit",function(e){
    e.preventDefault();
    if(!MatchMaker.ready) return;
    MatchMaker.get("find", querystring.parse($form.serialize()), function(e,value){
      if(e) throw e;
      $matches.append($("<div><iframe "+
        "src=\"/apps/"+value.game+"/"+value.match+"\""+
        " ></iframe></div>"
      ));
    });
  });
  var uri = url.parse(document.location.href);
  if(!uri.search) return;
  $form.unserialize(uri.search.substring(/^\?/.test(uri)?1:0));
  $form.submit();
});
