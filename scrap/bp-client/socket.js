(function() {
window.socket = io.connect(window.location.origin, {
  transports: [
    'websocket'
  , 'xhr-multipart'
  , 'htmlfile'
  , 'xhr-polling'
  ]
});

var emit = socket.emit;
socket.emit = function() {
  console.warn('Sending message:', Array.prototype.slice.call(arguments));
  emit.apply(socket, arguments);
};

var $emit = socket.$emit;
socket.$emit = function() {
  console.warn('Message received:', Array.prototype.slice.call(arguments));
  $emit.apply(socket, arguments);
};
})();