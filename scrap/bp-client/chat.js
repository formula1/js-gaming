var $chat_form = $('#chat_form')
  , $chat_sender = $('#chat_sender')
  , $chat_message = $('#chat_message')
  , chat_message_template = 
    '<p id="new_message">' +
      '<strong><%= sender %> : </strong>' +
      '<span><%= message %></span>' +
    '</p>'
  , game_event_template = 
    '<p id="new_message">' +
      '<strong><span><%= message %></span></strong>' +
    '</p>';

socket.on('user_chats', function(data) {
  console.log('user_chats message received: ', data);
  var sender = data.sender
    , message = data.message
    , message_text = _.escape(message.message)
    , $message = $(_.template(chat_message_template, { sender: sender, message: message_text }));
  $('#chat_messages')
    .append($message)
    .scrollTop($('#chat_messages').height());
  $('#new_message')
    .effect('highlight', {color: '#b3d4fc'}, 4000)
    .removeAttr('id');
});

socket.on('game_event', function(message, timestamp) {
  console.log('game_event message received: ', message, timestamp);
  var message_text = _.escape(message.message)
    , $message = $(_.template(game_event_template, { message: message_text }));
  $('#chat_messages')
    .append($message)
    .scrollTop($('#chat_messages').height());
  $('#new_message')
    .effect('highlight', {color: '#b3d4fc'}, 4000)
    .removeAttr('id');
});

$chat_form.submit(function(e) {
  e.stopPropagation();
  e.preventDefault();
  var data = {
    sender: $chat_sender.val()
  , message: $chat_message.val()
  };
  $chat_message.val('');
  if (! _.isEmpty(data.message)) {
    console.log('Emitting message', 'chat', data);
    socket.emit('chat', data);
  }
  else {
    console.log('Ignoring empty chat message!');
  }
});

var users = $('#server_values').data('room_state').users
  , $user_list = $('#user_list')
  , $user_to_add;
//Display initial user list.
console.log('Pre-Displaying initial user list:', users);
for (var i = 0, len = users.length; i < len; i++) {
  var initial_user = users[i];
  if ($user_list.find('#' + initial_user).length === 0) {
    console.log('adding ' + initial_user + ' to the initial users list.');
    $user_to_add = $('<li />', { id: initial_user, text: initial_user });
    $user_list.append($user_to_add);
  }    
}

//User joins handler - updates the user list.
socket.on('user_joins', function(user) {
  var username = user.username;
  //add user named username to the user list (if it doesn't exist already)
  if ($user_list.find('#' + username).length === 0) {
    console.log('adding ' + username + ' to the users list.');
    $user_to_add = $('<li />', { id: username, text: username });
    $user_list.append($user_to_add);
  }
});

//User leaves handler - updates the user list.
socket.on('user_leaves', function(user) {
  var username = user.username;
  //remove user named username from the user list (if it exists)
  console.log('removing ' + username + ' from the users list.');
  $user_list.find('#' + username).remove();
});