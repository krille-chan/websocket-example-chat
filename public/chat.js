var socket = io.connect('http://localhost:4000');

document.getElementById('sendMessageForm').onsubmit = (event) => {
    event.preventDefault();
    var messageField = document.getElementById('messageTextField');
    var username = document.getElementById('usernameTextField').value;
    var event = {
        'username': username,
        'message': messageField.value,
    };
    console.log('Send message...', event);
    socket.emit('sendMessage', event);
    messageField.value = '';
};

socket.on('broadcastMessage', (event) => {
    console.log('Received broadcast message', event);
    var messageNode = document.createElement('p');
    var timestamp = new Date();
    messageNode.innerText = event.username + ' (' + timestamp.toLocaleTimeString() + '): ' + event.message;
    document.getElementById('timeline').prepend(messageNode);
});