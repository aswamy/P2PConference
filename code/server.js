var fs = require('fs');
var file = new(require('node-static').Server)();

var options = {
	key: fs.readFileSync('../fake-keys/privatekey.pem'),
	cert: fs.readFileSync('../fake-keys/certificate.pem')
};

var app = require('https').createServer(options, function (req, res) {
	file.serve(req, res);
}).listen(8888);

var io = require('socket.io')(app);

io.on('connection', function (socket) {

	socket.on('hello', function(message) {
		// Tell everyone in the room "hello!"
		io.to('alokroom').emit('newguy', message);
		socket.join('alokroom');
	});

	socket.on('peerconnsetuprequest', function(message) {
		console.log("Got a setup request from " + socket.id + " to " + message.id);

		io.sockets.connected[message.id]
				.emit('peerconnsetuprequest',
						{ id: socket.id, data: message.data }
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

	socket.emit('clientid', { id: socket.id });
});