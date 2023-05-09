var username = window.localStorage.getItem('username');

while (!username || username === "" || username === "System") {
    username = prompt("Please enter your name", "Anonymous");
    if (username !== null) {
        window.localStorage.setItem('username', username);
    }
}

var iceServers;
var rtcPeerConnection;
var userStream;
var socket;

const roomNameElement = document.getElementById('roomName');
const sendMessageFormElement = document.getElementById('sendMessageForm');
const messageFieldElement = document.getElementById('messageTextField');
const timelineElement = document.getElementById('timeline');

const videoCallButton = document.getElementById('videocallButton');
const closeCallButton = document.getElementById('closecallButton');
const callSessionElement = document.getElementById('callSession');
const userVideoElement = document.getElementById('userVideo');
const peerVideoElement = document.getElementById('peerVideo');

fetch('config.json').then((config) => {
    iceServers = { 'iceServers': config.iceServers };
    socket = io.connect(config.server);
    socket.emit('join', { 'username': username, 'room': window.location.hash });


    socket.on('sendMessage', (event) => {
        console.log('Received message', event);
        addMessageToTimeline(event);
    });

    socket.on('ready', (event) => {
        console.log('Received message', event);
        addMessageToTimeline({ 'username': event.username, 'message': 'Sent signal "ready"' });
        if (event.username === username) return;
        if (userVideoElement.srcObject != null) {
            console.log('Create RTCPeerConnection...');
            rtcPeerConnection = new RTCPeerConnection(iceServers);
            rtcPeerConnection.onicecandidate = onicecandidate;
            rtcPeerConnection.ontrack = ontrack;
            rtcPeerConnection.addTrack(userStream.getTracks()[0], userStream);
            //rtcPeerConnection.addTrack(userStream.getTracks()[1], userStream);
            rtcPeerConnection.createOffer((offer) => {
                console.log('On offer', offer);
                rtcPeerConnection.setLocalDescription(offer);
                socket.emit('offer', {
                    'username': username,
                    'room': window.location.hash,
                    'offer': offer,
                });
            }, (error) => console.log(error),
            );
            return;
        }

        startCall({
            audio: false,
            video: true
        });
    });

    socket.on('candidates', (event) => {
        console.log('Received message', event);
        addMessageToTimeline({ 'username': event.username, 'message': 'Sent signal "candidates"' });

        if (event.username !== username) {
            const iceCandidate = new RTCIceCandidate(event.candidate);
            rtcPeerConnection.addIceCandidate(iceCandidate);
        }
    });

    socket.on('offer', (event) => {
        console.log('Received message', event);
        addMessageToTimeline({ 'username': event.username, 'message': 'Sent signal "offer"' });

        if (event.username !== username) {
            console.log('Create RTCPeerConnection...');
            rtcPeerConnection = new RTCPeerConnection(iceServers);
            rtcPeerConnection.onicecandidate = onicecandidate;
            rtcPeerConnection.ontrack = ontrack;
            rtcPeerConnection.addTrack(userStream.getTracks()[0], userStream);
            //rtcPeerConnection.addTrack(userStream.getTracks()[1], userStream);
            rtcPeerConnection.setRemoteDescription(event.offer);
            rtcPeerConnection.createAnswer((answer) => {
                console.log('On answer', answer);
                rtcPeerConnection.setLocalDescription(answer);
                socket.emit('answer', {
                    'username': username,
                    'room': window.location.hash,
                    'answer': answer,
                });
            }, (error) => console.log(error),
            );
            return;
        }
    });

    socket.on('answer', (event) => {
        console.log('Received message', event);
        addMessageToTimeline({ 'username': event.username, 'message': 'Sent signal "answer"' });

        if (event.username !== username) {
            rtcPeerConnection.setRemoteDescription(event.answer);

        }
    });
});

function randomWord() {
    const things = ['Rock', 'Paper', 'Scissor', 'Black', 'White', 'Red', 'Blue', 'Green', 'Orange', 'Koala', 'Tiger', 'Cat', 'Dog'];
    return things[Math.floor(Math.random() * things.length)];
}

if (window.location.hash == '') {
    window.location.hash = randomWord() + randomWord() + randomWord() + randomWord() + Math.floor(Math.random() * 9999);
}

roomNameElement.innerText = 'Room: ' + window.location.hash;

sendMessageFormElement.onsubmit = (event) => {
    event.preventDefault();

    var event = {
        'username': username,
        'message': messageFieldElement.value,
        'room': window.location.hash
    };
    console.log('Send message...', event);
    socket.emit('sendMessage', event);
    messageFieldElement.value = '';
};

function addMessageToTimeline(event) {
    var messageNode = document.createElement('p');
    var timestamp = new Date();
    messageNode.innerText = event.username + ' (' + timestamp.toLocaleTimeString() + '): ' + event.message;
    timelineElement.prepend(messageNode);
}

function onicecandidate(event) {
    console.log('On IceCandidates', event);
    if (event.candidate) {
        socket.emit('candidates', {
            'username': username,
            'room': window.location.hash,
            'candidate': event.candidate,
        });
    }
}

function ontrack(event) {
    console.log('Ontrack', event);
    var videoElement = peerVideoElement;
    videoElement.srcObject = event.streams[0];
    videoElement.onloadedmetadata = (e) => {
        videoElement.play();
    };
}


videoCallButton.onclick = (event) => {
    event.preventDefault();
    startCall({
        audio: true,
        video: true
    });
};

function startCall(userMediaData) {
    navigator.mediaDevices.getUserMedia(userMediaData).then((stream) => {
        userStream = stream;
        var videoElement = userVideoElement;
        videoElement.srcObject = stream;
        videoElement.onloadedmetadata = (e) => {
            videoElement.play();
        };
        callSessionElement.classList.remove('hidden');
        videoCallButton.classList.add('hidden');
        closeCallButton.classList.remove('hidden');
        socket.emit('ready', { 'username': username, 'room': window.location.hash });
    }).catch((err) => {
        addMessageToTimeline({ 'message': 'Error while trying to get user media: ' + err, 'username': 'System' });
    });
}

closeCallButton.onclick = (event) => {
    event.preventDefault();
    addMessageToTimeline({ 'message': 'Hangup...', 'username': 'System' });
    var videoElement = userVideoElement;
    videoElement.srcObject.getTracks().forEach(function (track) {
        track.stop();
    });
    callSessionElement.classList.add('hidden');
    videoCallButton.classList.remove('hidden');
    closeCallButton.classList.add('hidden');
};