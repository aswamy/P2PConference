var socket = io.connect();
var localvideo = document.querySelector('video#mainvideo');
var localstream = null;

var peerconnections = {};
var datachannels = {};

var myId = '';
/*
 -----------------------------
 Messages via signaling server
 -----------------------------
 */

socket.on('clientid', function(data) {
    console.log("I am client " + data.id);
    myId = data.id;

    start();

    socket.emit('hello', data);
});

socket.on('newguy', function(data) {
    var id = data.id;
    console.info("New guy:", id);

    var pc = createPeerConnection(id);

    datachannels[id] = pc.createDataChannel('sendDataChannel', null);
    setupDatachannel(datachannels[id], id);

    pc.ondatachannel = onDataChannelHandler(id);

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

    pc.ondatachannel = onDataChannelHandler(id);

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

function onDataChannelHandler(id) {
    return function(e) {
        datachannels[id] = e.channel;
        datachannels[id].onopen = function() { console.log('data channel '+id+' state change') };
        datachannels[id].onclose = function() {
            delete datachannels[id];
            console.log("Removed " + id + " from datachannel list");
        };
        datachannels[id].onmessage = function(e) {
            displayClientMessage(id, e.data);
        };
    };
}

function setupDatachannel(channel, id) {
    channel.onopen = function() { console.log('data channel '+id+' state change') };
    channel.onclose = function() {
        delete datachannels[id];
        console.log("Removed " + id + " from datachannel list");
    };
    channel.onmessage = function(e) {
        displayClientMessage(id, e.data);
    };
}

function displayClientMessage(id, val) {
    $("#chatdisplay").append("<div><div><strong>" + id + ": </strong></div>" + val + "</div>");
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

document.getElementById("sendbtn").onclick = function() {
    var textbox = $("#chatinput textarea");

    $.each(datachannels, function(channelId, channel) {
        channel.send(textbox.val());
    });

    displayClientMessage(myId, textbox.val());
    textbox.val('');
};