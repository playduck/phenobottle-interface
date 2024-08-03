module.exports = (io, database) => {
  console.log("listening for new ws connections")

  io.on('connection', (socket) => {
    console.log('a user connected');

    function failureMessage(err) {
      socket.emit("failure", err);
    }

    function capitalizeFirstLetter(string) {
      return string.charAt(0).toUpperCase() + string.slice(1);
    }

    socket.on("deviceListRequest", () => {
        database.getDevices((err, rows, fields) => {
            if(err) {failureMessage(err);}

            socket.emit('deviceList', rows);
        });
    });

    socket.on("imageRequest", (device_id) => {
        database.getLatestImage(device_id, (err, rows, fields) => {
            if(err) {failureMessage(err);}

            const buffer = Buffer.from(rows[0].image_data);
            const timestamp = rows[0].timestamp;

            socket.emit('imageUpdate', { buffer: Array.from(buffer), timestamp });
        });
    });

    socket.on("measurementRequest", (device_id, type, amount) => {
      database.getLatestMeasurements(device_id, type, amount, (err, rows, fields) => {
        if(err) {failureMessage(err);}

        socket.emit(`measurement${capitalizeFirstLetter(type)}`, rows);
      });
    });

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
