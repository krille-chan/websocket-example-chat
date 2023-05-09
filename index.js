const express = require('express');
const socket = require('socket.io');

const port = 4000;

var app = express();

var server = app.listen(port, () => {
    console.log('Server is listening to port', port);
});

app.use(express.static('public'));

var upgradedServer = socket(server, { origin: "http://192.168.178.20:4000" });

upgradedServer.on('connection', (socket) => {
    socket.on('sendMessage', (event) => {
        console.log('Send message', event);
        upgradedServer.to(event.room).emit('sendMessage', event);
    });
    socket.on('join', (event) => {
        console.log('Join room', event);
        var rooms = upgradedServer.sockets.adapter.rooms;
        var room = rooms.get(event.room);

        if (room == undefined || room.size == 1) {
            socket.join(event.room);
            console.log('Room joined', event.room);
            upgradedServer.to(event.room).emit('sendMessage', { 'username': 'System', 'message': 'Room joined: ' + event.username });
        } else {
            console.log('Room is full!');
            upgradedServer.to(event.room).emit('sendMessage', { 'username': 'System', 'message': 'Room is full: ' + event.room });
        }
    });
    socket.on('ready', (event) => {
        console.log('Ready event', event);
        upgradedServer.to(event.room).emit('ready', event);
    });
    socket.on('candidates', (event) => {
        console.log('Candidates event', event);
        upgradedServer.to(event.room).emit('candidates', event);
    });
    socket.on('offer', (event) => {
        console.log('Offer event', event);
        upgradedServer.to(event.room).emit('offer', event);
    });
    socket.on('answer', (event) => {
        console.log('Answer event', event);
        upgradedServer.to(event.room).emit('answer', event);
    });
    console.log('Websocket connected', socket.id);
});