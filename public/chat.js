var username = window.localStorage.getItem('username');

while (!username || username === "" || username === "System") {
    username = prompt("Please enter your name", "Harry Potter");
    window.localStorage.setItem('username', username);
}

var socket = io.connect('http://192.168.178.20:4000');

const iceServers = { 'iceServers': [{ 'urls': 'stun:stun.l.google.com:19302' }] };
var rtcPeerConnection;
var userStream;

function randomWord() {
    const things = ['Rock', 'Paper', 'Scissor', 'Black', 'White', 'Red', 'Blue', 'Green', 'Orange', 'Koala', 'Tiger', 'Cat', 'Dog'];
    return things[Math.floor(Math.random() * things.length)];
}

if (window.location.hash == '') {
    window.location.hash = randomWord() + randomWord() + randomWord() + randomWord() + Math.floor(Math.random() * 9999);
}

document.getElementById('roomName').innerText = 'Room: ' + window.location.hash;

socket.emit('join', { 'username': username, 'room': window.location.hash });

document.getElementById('sendMessageForm').onsubmit = (event) => {
    event.preventDefault();
    var messageField = document.getElementById('messageTextField');
    var event = {
        'username': username,
        'message': messageField.value,
        'room': window.location.hash
    };
    console.log('Send message...', event);
    socket.emit('sendMessage', event);
    messageField.value = '';
};

function addMessageToTimeline(event) {
    var messageNode = document.createElement('p');
    var timestamp = new Date();
    messageNode.innerText = event.username + ' (' + timestamp.toLocaleTimeString() + '): ' + event.message;
    document.getElementById('timeline').prepend(messageNode);
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
    var videoElement = document.getElementById('peerVideo');
    videoElement.srcObject = event.streams[0];
    videoElement.onloadedmetadata = (e) => {
        videoElement.play();
    };
}

socket.on('sendMessage', (event) => {
    console.log('Received message', event);
    addMessageToTimeline(event);
});

socket.on('ready', (event) => {
    console.log('Received message', event);
    addMessageToTimeline({ 'username': event.username, 'message': 'Sent signal "ready"' });
    if (event.username === username) return;
    if (document.getElementById('userVideo').srcObject != null) {
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

document.getElementById('videocallButton').onclick = (event) => {
    event.preventDefault();
    startCall({
        audio: false,
        video: true
    });
};

document.getElementById('audiocallButton').onclick = (event) => {
    event.preventDefault();
    startCall({
        audio: false,
        video: false
    });
};

function startCall(userMediaData) {
    navigator.mediaDevices.getUserMedia(userMediaData).then((stream) => {
        userStream = stream;
        var videoElement = document.getElementById('userVideo');
        videoElement.srcObject = stream;
        videoElement.onloadedmetadata = (e) => {
            videoElement.play();
        };
        document.getElementById('callSession').classList.remove('hidden');
        document.getElementById('audiocallButton').classList.add('hidden');
        document.getElementById('videocallButton').classList.add('hidden');
        document.getElementById('closecallButton').classList.remove('hidden');
        socket.emit('ready', { 'username': username, 'room': window.location.hash });
    }).catch((err) => {
        addMessageToTimeline({ 'message': 'Error while trying to get user media: ' + err, 'username': 'System' });
    });
}

document.getElementById('closecallButton').onclick = (event) => {
    event.preventDefault();
    addMessageToTimeline({ 'message': 'Hangup...', 'username': 'System' });
    var videoElement = document.getElementById('userVideo');
    videoElement.srcObject.getTracks().forEach(function (track) {
        track.stop();
    });
    document.getElementById('callSession').classList.add('hidden');
    document.getElementById('audiocallButton').classList.remove('hidden');
    document.getElementById('videocallButton').classList.remove('hidden');
    document.getElementById('closecallButton').classList.add('hidden');
};