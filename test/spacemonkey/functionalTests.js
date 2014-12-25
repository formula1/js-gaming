/*global monkey, test*/

// these tests assume you've loaded the default fixture
monkey.loadApp('/', {
    height: 500,
    width: 600,
    bugUrl: 'https://github.com/airandfingers/js-gaming/issues/new'
});

test('basic app experience', function () {
    monkey
        .log('starting')
        .waitForVisible('[data-hook="page-container"] .page')
        .confirm('The app loaded to the chat page')
        .confirm('The "chat" nav tab is active')
        .goToPage('/info')
        .confirm('Info page is visible (header starts with "Welcome to a skeleton for JS Gaming"')
        .goToPage('')
        .confirm('Chat page is visible again')
        .confirm('Message input and Send button look okay')
        .confirm('I can add messages to the list by typing into the Message field and hitting the Enter key')
        .confirm('I can add messages to the list by typing into the Message field and clicking "Send"')
        .confirm('Each message has a timestamp ("a few seconds ago")')
        .confirm('If I click "Send" without typing a message, the input border turns red and "Please enter a message." is displayed')
        .destroy();
});
