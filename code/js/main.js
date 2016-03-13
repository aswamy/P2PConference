var socket = io.connect();
var localvideo = document.querySelector('video#mainvideo');
var localstream = null;

var peerconnections = {};


/*
 -----------------------------
 Messages via signaling server
 -----------------------------
 */

socket.on('clientid', function(data) {
    console.log("I am client " + data.id);

    start();

    socket.emit('hello', data);
});

socket.on('newguy', function(data) {
    var id = data.id;
    console.info("New guy:", id);

    var pc = createPeerConnection(id);

    pc.createOffer(function(offer) {
        pc.setLocalDescription(new RTCSessionDescription(offer), function() {
            console.log('Sending client ' + id + ' a call offer');
            socket.emit('peerconnsetuprequest', {id: id, data: offer});
        }, null);
    }, null);
});

socket.on('peerconnsetuprequest', function(data) {
    var id = data.id;
    console.log("Receving a call offer from " + id);

    var pc = createPeerConnection(id);

    pc.setRemoteDescription(new RTCSessionDescription(data.data), function() {
        pc.createAnswer(function(answer) {
            pc.setLocalDescription(new RTCSessionDescription(answer), function() {
                socket.emit('peerconnsetupanswer', { id: id, data: answer });
                connEstablished();
            });
        });
    });
});

socket.on('peerconnsetupanswer', function(data) {
    console.log('Receving a call answer from ' + data.id);

    peerconnections[data.id].setRemoteDescription(
        new RTCSessionDescription(data.data), connEstablished, null);
});

socket.on('icecandidate', function(data) {
    peerconnections[data.id].addIceCandidate(new RTCIceCandidate(data.data));
});


/*
 -----------------------------
 Helper Functions
 -----------------------------
 */

function onAddStreamHandler(id) {
    return function(event) {
        var newVid = $("<video id='" +id+ "' class='broadcaster'></video>");
        $("#casters").append( newVid );
        document.getElementById(id).srcObject = event.stream;
        document.getElementById(id).onclick = videoSwitcher;
    };
}

function onAddIceCandidateHandler(id) {
    return function(event) {
        if(event.candidate)
            socket.emit('icecandidate', { id: id, data: event.candidate});
    };
}

function gotStream(stream) {
    localvideo.srcObject = stream;
    window.localstream = stream;
    localstream = stream;
}

function start() {
    navigator.mediaDevices.getUserMedia({
            audio: false,
            video: true
        })
        .then(gotStream)
        .catch(function(e) {
            console.log('getUserMedia() error: ', e);
        });
}

function connEstablished() {
    console.log("Connection has been established!");
}

function createPeerConnection(id) {
    var pc = new RTCPeerConnection();
    peerconnections[id] = pc;

    pc.addStream(localstream);
    pc.onicecandidate = onAddIceCandidateHandler(id);
    pc.onaddstream = onAddStreamHandler(id);
    pc.oniceconnectionstatechange = function() {
        if(pc.iceConnectionState == 'disconnected')
            document.getElementById(id).remove();
    };

    return pc;
}