var callprom = require("../utility/cbpromise");
var MessageDuplex = require("../message/MessageDuplex.js");

function NetworkInstance(nethost, user){
  this.self = nethost.me;
  this.user = user;
  this.nethost = nethost;
  MessageDuplex.call(this, function(message){
    if(!this._ready) console.log("not ready");
    console.log(JSON.stringify(message).length);
    console.log(JSON.stringify(message));
    this.channel.send(JSON.stringify(message));
	}.bind(this));
  this.pconn = new RTCPeerConnection(nethost.config,{
    optional: [
        {DtlsSrtpKeyAgreement: true},
        {RtpDataChannels: true}
    ]
	});
  this.pconn.onicecandidate = this.iceCB.bind(this);
}
NetworkInstance.prototype = Object.create(MessageDuplex.prototype);
NetworkInstance.prototype.constructor = NetworkInstance;

NetworkInstance.prototype.close = function(){
  this.stop();
  this.channel.close();
  this.pconn.close();
};

NetworkInstance.prototype.offer = function(cb){
  var cr = callprom(this,cb);
  var that = this;
  this.registerChannel(this.pconn.createDataChannel("sendDataChannel",this.nethost.sconfig));
  this.pconn.createOffer(function(desc){
    that.pconn.setLocalDescription(desc, function () {
      console.log("desc offered");
      cr.cb(void(0),{target:that.user,sender:that.self,offer:desc});
    }, cr.cb);
  }, cr.cb);
};

NetworkInstance.prototype.registerChannel = function(channel){
	var that = this;
	this.channel = channel;
  this.channel.onmessage = function(event){
    var message;
		try{
		   message = JSON.parse(event.data);
		}catch(e){
		  event.target.close();
			return;
		}
    that.handleMessage(message,event.target);
	};
	this.channel.onopen = function(){
    that.ready();
    that.emit("open",that);
  };
  this.channel.onclose = this.stop.bind(this);
};
/**
  Accepts a webrtc offer from another party
  @memberof NetwokInstance
  @param {object} message - the original message from the other party
  @param {netCallback} cb
*/
NetworkInstance.prototype.accept = function(message,cb){
  var cr = callprom(this,cb);
  var that = this;
  this.pconn.ondatachannel = function (event) {
      that.registerChannel(event.channel);
  };
  this.pconn.setRemoteDescription(new RTCSessionDescription(message.offer),function(){
    that.pconn.createAnswer(function(desc){
      that.pconn.setLocalDescription(desc, function () {
        console.log("desc accepted");
        cr.cb(void(0),{
          target:that.user,
          sender:that.self,
          accept:that.pconn.localDescription
        });
      }, cr.cb);
    }, cr.cb);
  },cr.cb);
  return cr.ret;
};

/**
  Solidifies a webrtc connection after the other party accepts
  @memberof NetwokInstance
  @param {object} message - the original message from the other party
*/
NetworkInstance.prototype.ok = function(message){
  console.log("desc okayed");
  this.pconn.setRemoteDescription(new RTCSessionDescription(message.accept));
  return this;
};

NetworkInstance.prototype.remoteIce = function(candidate){
  this.pconn.addIceCandidate(new RTCIceCandidate(candidate));
};

NetworkInstance.prototype.iceCB = function(event){
  if (!event.candidate)
    return;
  this.nethost.trigger("ice",{
    target:this.user,
    sender:this.self,
		ice:event.candidate
	});
};

module.exports = NetworkInstance;
