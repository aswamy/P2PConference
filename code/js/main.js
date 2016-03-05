'use strict';

var isChannelReady;
var isInitiator = false;
var isStarted = false;
var localStream;
var pc;
var remoteStream;

var pc_config = {'iceServers': [{'url': 'stun:stun.l.google.com:19302'}]};

// Set up audio and video regardless of what devices are present.
var sdpConstraints = {'mandatory': {
    'OfferToReceiveAudio':true,
    'OfferToReceiveVideo':true }};

/////////////////////////////////////////////

var room = location.pathname.substring(1);

if (room === '') {
//  room = prompt('Enter room name:');
    room = 'foo';
} else {
    //
}

var socket = io.connect();

if (room !== '') {
    console.log('Create or join room', room);
    socket.emit('create or join', room);
}

socket.on('created', function (room){
    console.log('Created room ' + room);
    isInitiator = true;
});

socket.on('full', function (room){
    console.log('Room ' + room + ' is full');
});

socket.on('join', function (room){
    console.log('Another peer made a request to join room ' + room);
    console.log('This peer is the initiator of room ' + room + '!');
    isChannelReady = true;
});

socket.on('joined', function (room){
    console.log('This peer has joined room ' + room);
    isChannelReady = true;
});

/*
socket.on('log', function (array){
    console.log.apply(console, array);
});
*/

////////////////////////////////////////////////

function sendMessage(message){
    //console.log('Client sending message: ', message);
    // if (typeof message === 'object') {
    //   message = JSON.stringify(message);
    // }
    socket.emit('message', message);
}

socket.on('message', function (message){
    //console.log('Client received message:', message);
    if (message === 'got user media') {
        maybeStart();
    } else if (message.type === 'offer') {
        console.log("-->>> got an offer");

        if (!isInitiator && !isStarted) {
            maybeStart();
        }
        pc.setRemoteDescription(new RTCSessionDescription(message));
        doAnswer();
    } else if (message.type === 'answer' ){//&& isStarted) {
        console.log("-->>> got an answer");

        pc.setRemoteDescription(new RTCSessionDescription(message));
    } else if (message.type === 'candidate' ){//&& isStarted) {
        console.log("-->>> got a candidate");

        var candidate = new RTCIceCandidate({
            sdpMLineIndex: message.label,
            candidate: message.candidate
        });
        pc.addIceCandidate(candidate);
    } else if (message === 'bye' ){//&& isStarted) {
        handleRemoteHangup();
    }
});

////////////////////////////////////////////////////

var localVideo = document.querySelector('#remoteVideo0');
//var remoteVideo = document.querySelector('#remoteVideo1');

function handleUserMedia(stream) {
    console.log('Adding local stream.');
    localVideo.src = window.URL.createObjectURL(stream);
    localStream = stream;
    sendMessage('got user media');
    if (isInitiator) {
        maybeStart();
    }
}

var constraints = {video: true, audio: true};

navigator.mediaDevices.getUserMedia(constraints)
    .then(handleUserMedia)
    .catch(function(e) {
        alert('getUserMedia() error: ' + e.name);
    });

if (location.hostname != "localhost") {
    console.error("Not implementing TURN server");
    //requestTurn('https://computeengineondemand.appspot.com/turn?username=41784574&key=4080218913');
}

function maybeStart() {
    if (!isStarted && typeof localStream != 'undefined' && isChannelReady) {
        createPeerConnection();
        pc.addStream(localStream);
        //isStarted = true;
        console.log('isInitiator', isInitiator);
        if (isInitiator) {
            doCall();
        }
    }
}

window.onbeforeunload = function(e) {
    sendMessage('bye');
};

/////////////////////////////////////////////////////////

function createPeerConnection() {
    console.log("creating new peer");
    try {
        pc = new RTCPeerConnection(null);
        pc.onicecandidate = handleIceCandidate;
        pc.onaddstream = handleRemoteStreamAdded;
        pc.onremovestream = handleRemoteStreamRemoved;
        console.log('Created RTCPeerConnnection');
    } catch (e) {
        console.log('Failed to create PeerConnection, exception: ' + e.message);
        alert('Cannot create RTCPeerConnection object.');
        return;
    }
}

function handleIceCandidate(event) {
    //console.log('handleIceCandidate event: ', event);
    if (event.candidate) {
        sendMessage({
            type: 'candidate',
            label: event.candidate.sdpMLineIndex,
            id: event.candidate.sdpMid,
            candidate: event.candidate.candidate});
    } else {
        console.log('End of candidates.');
    }
}
var counter = 0;

function handleRemoteStreamAdded(event) {
    console.log('Remote stream added.');

    var broadcaster = "broadcaster" + ++counter;
    var newVid = $("<video id='" +broadcaster+ "' src='#' class='broadcaster'></video>");
    $("#casters").append( newVid );

    $("#" + broadcaster)[0].src = window.URL.createObjectURL(event.stream);
    remoteStream = event.stream;
}

function handleCreateOfferError(event){
    console.log('createOffer() error: ', event);
}

function doCall() {
    console.log('Sending offer to peer');
    pc.createOffer(setLocalAndSendMessage, handleCreateOfferError);
}

function doAnswer() {
    console.log('Sending answer to peer.');
    pc.createAnswer(setLocalAndSendMessage, null, sdpConstraints);
}

function setLocalAndSendMessage(sessionDescription) {
    // Set Opus as the preferred codec in SDP if Opus is present.
    pc.setLocalDescription(sessionDescription);
    console.log('setLocalAndSendMessage sending message' , sessionDescription);
    sendMessage(sessionDescription);
}

function handleRemoteStreamRemoved(event) {
    console.log('Remote stream removed. Event: ', event);
}

function handleRemoteHangup() {
//  console.log('Session terminated.');
    // stop();
    // isInitiator = false;
    console.log("remote hangup");
}

function stop() {
    isStarted = false;
    // isAudioMuted = false;
    // isVideoMuted = false;
    pc.close();
    pc = null;
}
