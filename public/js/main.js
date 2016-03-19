var localvideo = document.querySelector('video#mainvideo');
var localstream = null;

var peerconnections = {};
var datachannels = {};

var idNameMap = {};
var myId = '';
var name = '';
var room = '';
var pwd = '';

var idFileBufferMap = {};   // Each client gets their own file buffer for receiving files


/*
 -----------------------------
 Static Variables
 -----------------------------
 */

var FILE_CHUNK_SIZE = 512*32;
var NOTIF = "Notification";
var DOWNLOAD = "Download";


/*
 -----------------------------
 Prompts for data (temp only)
 -----------------------------
 */

name = prompt("What's your name?") || '';
name = name.trim();

room = prompt("What room do you want to join?") || '';
room = room.trim();
if(room == '') room = "default_room";

$('#room-name').append(room);

pwd = prompt("What is the password?") || '';


/*
 -----------------------------
 Messages via signaling server
 -----------------------------
 */

var socket = io.connect();

socket.on('clientid', function(data) {
    console.log("I am client " + data.id);

    myId = data.id;
    data.name = name || "Anonymous";
    data.room = room;
    data.pwd = pwd;

    idNameMap[myId] = 'Me';

    start();

    socket.emit('join', data);
});

socket.on('newguy', function(data) {
    var id = data.id;

    console.info("New guy:", id);

    var pc = createPeerConnection(id);
    idNameMap[id] = data.name;

    datachannels[id] = pc.createDataChannel('sendDataChannel', null);
    setupDatachannel(datachannels[id], id);

    pc.ondatachannel = onDataChannelHandler(id);

    pc.createOffer(function(offer) {
        pc.setLocalDescription(new RTCSessionDescription(offer), function() {
            console.log('Sending client ' + id + ' a call offer');
            socket.emit('peerconnsetuprequest', {id: id, name: name, data: offer});
        }, null);
    }, null);
});

socket.on('peerconnsetuprequest', function(data) {
    var id = data.id;
    console.log("Receving a call offer from " + id);

    var pc = createPeerConnection(id);
    idNameMap[id] = data.name;

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
        setupDatachannel(datachannels[id], id);
    };
}

function setupDatachannel(channel, id) {
    channel.onopen = function() { console.log('data channel '+id+' state change') };
    channel.onclose = function() {
        delete datachannels[id];
        console.log("Removed " + id + " from datachannel list");
    };
    channel.onmessage = function(e) {
        decodeClientMessage(id, e.data);
    };
    channel.binaryType = 'arraybuffer';
    idFileBufferMap[id] = new FileMetadata();
    idFileBufferMap[id].buffer = [];
    idFileBufferMap[id].received = 0;
}

function decodeClientMessage(id, val) {
    if (val instanceof ArrayBuffer) {
        readFileChunk(idFileBufferMap[id], val);
    } else {
        try {
            readFileMetaData(id, JSON.parse(val));
        } catch(e) {
            displayNotification(idNameMap[id], val);
        }
    }
}

function displayNotification(from, data, color) {
    if(data.trim() == '') return;
    var newdiv = $("<div><div><strong>" + from + ": </strong></div>" + data.split('\n').join('<br>') + "</div>");
    if(color) newdiv.css("color", color);
    $("#chatdisplay").append(newdiv);
    $("#chatdisplay").scrollTop($("#chatdisplay")[0].scrollHeight);
}

function readFileMetaData(id, metadata) {
    console.log("Got file metadata for " + metadata.name);
    displayNotification(NOTIF, "Receiving file " + metadata.name, "gray");
    idFileBufferMap[id].name = metadata.name;
    idFileBufferMap[id].size = metadata.size;
}

function readFileChunk(fileData, data) {
    fileData.buffer.push(data);
    fileData.received += data.byteLength;

    if(fileData.received == fileData.size) {
        var receivedFile = new window.Blob(fileData.buffer);

        displayNotification(DOWNLOAD, "<a href='" + URL.createObjectURL(receivedFile) + "' download='" + fileData.name + "'>" + fileData.name + "</a>" , "forestgreen");

        fileData.name = '';
        fileData.size = 0;
        fileData.received = 0;
        fileData.buffer = [];
    }
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


/*
 -----------------------------
 Classes
 -----------------------------
 */

function FileMetadata() {
    this.name = '';
    this.size = 0;
}


/*
 -----------------------------
 HTML Button functions
 -----------------------------
 */

document.getElementById("sendbtn").onclick = function() {
    var textbox = $("#chatinput textarea");

    $.each(datachannels, function(channelId, channel) {
        channel.send(textbox.val());
    });

    decodeClientMessage(myId, textbox.val());
    textbox.val('');
};

document.getElementById("attachfile").onchange = function() {
    var file = this.files[0];

    if(file != undefined) {
        document.getElementById("attachfile").disabled = true;
        $.each(datachannels, function(channelId, channel) {
            var metadata = new FileMetadata();
            metadata.name = file.name;
            metadata.size = file.size;
            channel.send(JSON.stringify(metadata));

            var sliceFile = function(offset) {
                var reader = new window.FileReader();
                reader.onload = (function() {
                    return function(e) {
                        channel.send(e.target.result);
                        if (file.size > offset + e.target.result.byteLength)
                            window.setTimeout(sliceFile, 0, offset + FILE_CHUNK_SIZE); // To send each slice in parallel
                    };
                })(file);
                var slice = file.slice(offset, offset + FILE_CHUNK_SIZE);
                reader.readAsArrayBuffer(slice);
            };
            sliceFile(0);
        });
        displayNotification(NOTIF, "File " + file.name + " has been uploaded.", "gray");
        document.getElementById("attachfile").disabled = false;
    }
};