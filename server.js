var express = require('express');
var express_inst = express();

express_inst.use('/', express.static('public'));
express_inst.use('/js', express.static(__dirname + '/node_modules/bootstrap/dist/js')); // redirect bootstrap JS
express_inst.use('/js', express.static(__dirname + '/node_modules/jquery/dist')); // redirect JS jQuery
express_inst.use('/css', express.static(__dirname + '/node_modules/bootstrap/dist/css')); // redirect CSS bootstrap

var fs = require('fs');

var app = require('https')
		.createServer({
			key: fs.readFileSync('fake-keys/privatekey.pem'),
			cert: fs.readFileSync('fake-keys/certificate.pem')
		}, express_inst)
		.listen(443);

var proxy = require('http').createServer(function (req, res) {
	res.writeHead(301, { "Location": "https://" + req.headers['host'] + req.url });
	res.end();
}).listen(80);

var io = require('socket.io')(app);

var RoomMap = require('./classes/Peer.js');
var roomMap = new RoomMap();

io.on('connection', function (socket) {

	socket.on('join', function(message) {
		// Tell everyone in the room "hello!"
		socket.peer_name = message.name;
		socket.room_name = message.room;
		if (roomMap.roomExists(message.room)) {
			console.log("Room " + message.room + " exists");

			if (message.pwd.length == 0) {
				console.log("Adding watcher");
				roomMap.addRoomWatcher(message.room, message.id, message.name);
				io.to(message.room).emit('newwatcher', message);
				socket.join(message.room);
				socket.emit('successfullogin', 'viewer');
				console.log(roomMap.rooms);
				return;
			}

			if (message.pwd == roomMap.rooms[message.room].pwd) {
				console.log("Adding caster");
				roomMap.addRoomCaster(message.room, message.id, message.name);
				io.to(message.room).emit('newcaster', message);
				socket.emit('successfullogin', 'caster');
			} else {
				console.log("Failed to add caster");
				socket.emit('failcaster', message);
				console.log(roomMap.rooms);
				return;
			}

		} else {
			console.log("Room " + message.room + " does not exist");

			if(message.pwd.length > 0) {
				console.log("Adding caster");
				roomMap.addRoom(message.room, message.pwd);
				roomMap.addRoomCaster(message.room, message.id, message.name);
				socket.emit('successfullogin', 'caster');
			} else {
				console.log("Failed to add watcher");
				socket.emit('failwatcher', message);
				console.log(roomMap.rooms);
				return;
			}
		}
		console.log(roomMap.rooms);
		socket.join(message.room);
	});

	socket.on('peerconnsetuprequest', function(message) {
		console.log("Got a setup request from " + socket.id + " to " + message.id);

		var to = message.id;

		message.id = socket.id;

		io.sockets.connected[to]
			.emit('peerconnsetuprequest', message);
	});

	socket.on('peerconnsetupanswer', function(message) {
		console.log("Got a setup answer from " + socket.id + " to " + message.id);

		io.sockets.connected[message.id]
				.emit('peerconnsetupanswer',
						{ id: socket.id, data: message.data }
				);
	});

	socket.on('icecandidate', function(message) {
		console.log("Got a candidate message from " + socket.id + " to " + message.id);

		io.sockets.connected[message.id]
				.emit('icecandidate',
						{ id: socket.id, data: message.data }
				);
	});

	socket.on('disconnect', function() {
		console.log("Client: " + " - " + socket.peer_name + " has disconnected");

		if (roomMap.rooms[socket.room_name] != undefined) {
			if (roomMap.removeRoomCaster(socket.room_name, socket.id) == 0) {
				var watchers = roomMap.rooms[socket.room_name].watchers;
				Object.keys(watchers).forEach(function(w) {
					io.sockets.connected[watchers[w].id].leave(socket.room_name);
				});
				roomMap.removeRoom(socket.room_name);
			}

			if(roomMap.rooms[socket.room_name])
				roomMap.removeRoomWatcher(socket.room_name, socket.id);
		}

		console.log(roomMap.rooms);
	});

	socket.emit('clientid', { id: socket.id });
});