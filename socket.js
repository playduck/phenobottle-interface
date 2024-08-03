module.exports = (io, database) => {
  console.log("listening for new ws connections")

  io.on('connection', (socket) => {
    console.log('a user connected');

    socket.on("deviceListRequest", () => {
        database.getDevices((err, rows, fields) => {
            if(err) {return;}

            socket.emit('deviceList', rows);
        });
    });

    socket.on("imageRequest", (device_id) => {
        database.getLatestImage(device_id, (err, rows, fields) => {
            if(err) {return;}

            const buffer = Buffer.from(rows[0].image_data);
            const timestamp = rows[0].timestamp;

            socket.emit('imageUpdate', { buffer: Array.from(buffer), timestamp });
        });
    })

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
