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

var openRooms = {};


io.on('connection', function (socket) {

	socket.on('join', function(message) {
		// Tell everyone in the room "hello!"
		socket.peer_name = message.name;
		io.to(message.room).emit('newguy', message);
		socket.join(message.room);
	});

	socket.on('peerconnsetuprequest', function(message) {
		console.log("Got a setup request from " + socket.id + " to " + message.id);

		io.sockets.connected[message.id]
			.emit('peerconnsetuprequest',
				{ id: socket.id, data: message.data, name: message.name }
			);
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
	});

	socket.emit('clientid', { id: socket.id });
});