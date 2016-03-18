var fs = require('fs');
var file = new(require('node-static').Server)();

var options = {
	key: fs.readFileSync('../fake-keys/privatekey.pem'),
	cert: fs.readFileSync('../fake-keys/certificate.pem')
};

var proxy = require('http').createServer(function (req, res) {
	res.writeHead(301, { "Location": "https://" + req.headers['host'] + req.url });
	res.end();
}).listen(80);

var app = require('https').createServer(options, function (req, res) {
	file.serve(req, res);
}).listen(443);

var io = require('socket.io')(app);

io.on('connection', function (socket) {

	socket.on('join', function(message) {
		// Tell everyone in the room "hello!"
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

	socket.emit('clientid', { id: socket.id });
});