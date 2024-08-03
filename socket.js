module.exports = (io) => {
  let users = [];

  console.log("listening for new ws connections")

  io.on('connection', (socket) => {
    console.log('a user connected');

    // Handle heartbeat
    socket.on('heartbeat', () => {
      socket.emit('heartbeatResponse');
    });

    socket.on('heartbeatResponse', () => {
    });

    // Send heartbeat request to client every second
    setInterval(() => {
        socket.emit('heartbeatRequest', Date.now());
    }, 1000);
  });
};
