var callprom = require("../utility/cbpromise");

function NeworkInstance(nethost, user){
  this.self = nethost.me;
  this.target = user;
  this.nethost = nethost;
  MessageDuplex.call(this, function(message){
		message.originator = this.self;
    message.reciever = this.target;
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

NetworkInstance.prototype.offer = function(cb){
  var cr = callprom(this,cb);
  var that = this;
  this.registerChannel(this.pconn.createDataChannel("sendDataChannel",this.nethost.sconfig));
  this.pconn.createOffer(function(desc){
    that.pconn.setLocalDescription(desc, function () {
      cr.cb(void(0),{target:that.target,sender:that.self,offer:desc});
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
    this.emit("open",this);
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
  var that = this;
  this.pconn.ondatachannel = function (event) {
      that.registerChannel(event.channel);
  };
  this.pconn.setRemoteDescription(new RTCSessionDescription(message.desc),function(){
    that.pconn.createAnswer(function(desc){
      that.pconn.setLocalDescription(desc, function () {
        that.nethost.RTCHandle.send({
          cmd:"accept",
          identity:message.identity,
          desc:that.pconn.localDescription
        });
        cb(void(0),that);
      }, cb);
    }, cb);
  },cb);
};

/**
  Solidifies a webrtc connection after the other party accepts
  @memberof NetwokInstance
  @param {object} message - the original message from the other party
*/
NetworkInstance.prototype.ok = function(message){
  this.pconn.setRemoteDescription(new RTCSessionDescription(message.desc));
};

NetworkInstance.prototype.remoteIce = function(message){
  this.pconn.addIceCandidate(new RTCIceCandidate({
      sdpMLineIndex: message.label,
      candidate: message.candidate
  }));
};

NetworkInstance.prototype.iceCB = function(event){
  if (!event.candidate)
    return;
  this.nethost.RTCHandle.send({
    cmd:"ice",
    identity:this.target,
		data:{
	    type: 'candidate',
	    label: event.candidate.sdpMLineIndex,
	    id: event.candidate.sdpMid,
	    candidate: event.candidate.candidate
		}
	});
};
