var MessageWriter = require("../abstract/MessageWriter.js");
var url = require("url");

function Server(url){
  var that = this;
  this.url = url.parse(url);
  this.url.protocol = "ws:";
  MessageWriter.call(this, this.sendMessage.bind(this));
  try {
    this.socket = new WebSocket(url.format(this.url));
    this.socket.onopen = this.ready.bind(this);
    this.socket.onmessage = function(message){
      try{
        message = JSON.parse(message.data);
      }catch(e){
        this.emit("error",e);
      }
      console.log("recieved message");
      that.returnMessage(message);
    };
    this.socket.onclose = function(){
      console.log('Socket Status: ' + that.socket.readyState + ' (Closed)');
      that.stop();
    };
  } catch (exception) {
    console.log('Error' + exception);
  }
}

Server.prototype = Object.create(MessageWriter.prototype);
Server.prototype.constructor = Server;

Server.prototype.sendMessage = function(message){
  if(this.path) message.name = path + message.name;
  that.socket.send(JSON.stringify(message));
};

if(typeof module != "undefined" && module.exports){
  module.exports = Server;
}else{
  window.DocumentHost = null;
  (function(url){
    url = /^(http[s]?):\/\/([0-9\.]+|[a-z\-.]+)([?::][0-9]+)?([\/][A-Za-z0-9_\-]+)?(\?.*)?/.exec(url);
    var port = (typeof wp != "undefined")?wp:(document.cookie.pwp)?document.cookie.pwp:9999+(parseInt(url[3].substring(1))-3000);
    console.log(port);
    window.DocumentHost = new Server(url[2],port);
    if(url[4])
      window.ApplicationFork = new Server(url[2],port,url[4].substring(1)+"-");
  })(document.URL);
}
