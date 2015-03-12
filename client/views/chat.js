var React = require('react');

var ChatMessages = React.createClass({
  render: function() {
    var messages = this.props.messages;
    console.log('ChatMessages.render called, messages is', messages);
    var messages_markup = messages.map(function(message) {
      return (
        <div>
          <strong>{message.sender}:</strong> 
          <span>{message.message}</span>
        </div>
      );
    })
    return (
      <div class="chat_messages">
        {messages_markup}
      </div>
    );
  }
})

var ChatMessageForm = React.createClass({
  render: function() {
    var room = this.props.room;
    console.log('ChatMessageForm.render called, room is', room);
    return <div>This will be a form that submits messages to the room named {room}.</div>
  }
})

var ChatView = React.createClass({
  render: function() {
    console.log('ChatView.render called with props:', this.props);
    return (
      <div>
        <ChatMessages messages={this.props.messages} />
        <ChatMessageForm room={this.props.room} />
      </div>
    );
  }
});

module.exports = ChatView;