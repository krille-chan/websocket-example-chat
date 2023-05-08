const express = require('express');
const socket = require('socket.io');

const port = 4000;

var app = express();

var server = app.listen(port, ()=>{
    console.log('Listening to port ' + port);
});

app.use(express.static('public'));

var upgradedServer = socket(server);

upgradedServer.on('connection', (socket) => {
    socket.on('sendMessage', (event) => {
        console.log('Broadcast message', event);
        upgradedServer.emit('broadcastMessage', event);
    });
    console.log('Websocket connected', socket.id);
});