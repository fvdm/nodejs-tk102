
var server = require('tk102');

server.createServer({
  port: 1337,
  address: '127.0.0.1',
  timeout: 1
});

server.on('track', function (gps) {
  console.log(gps);
});

server.on('timeout', function () {
  console.log("timed out!");
});

server.on('listening', function() {
  console.log('started listening!');
});

server.on('connection', function (socket) {
  console.log('Connection established with ' + socket.remoteAddress);
});

server.on('disconnection', function (socket) {
  console.log('Disconnected!');
});
