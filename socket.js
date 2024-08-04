const cookie = require('cookie');

module.exports = (io, authenticateToken, database) => {
  console.log("listening for new ws connections")

  const authenticate = (socket, callback) => {
    if(socket.handshake?.headers?.cookie)  {
      token = cookie.parse(socket.handshake.headers.cookie)?.token;
        authenticateToken(token, (err, user) => {
          if (err) {
            socket.user = null;
            return callback(new Error('Authentication error'));
          }
          socket.user = user;
          callback();
        });
      } else {
        socket.user = null;
        callback(new Error('Authentication error'));
      }
  }

  io.use(authenticate).on('connection', (socket) => {
    console.log('a user connected');
    let queueTokenCheck = false;

    function failureMessage(err) {
      socket.emit("failure", err);
    }

    function capitalizeFirstLetter(string) {
      return string.charAt(0).toUpperCase() + string.slice(1);
    }

    socket.use((_, next) =>  {

      if(queueTokenCheck) {
        authenticate(socket, (err) => {
          if(err) {
            socket.disconnect();
            next(err);
          } else  {
            queueTokenCheck = false;
            next();
          }
        });
      } else  {
        next();
      }
    });

    socket.on("deviceListRequest", () => {
        database.getDevices((err, rows, fields) => {
            if(err) {failureMessage(err);}

            socket.emit('deviceList', rows);
        });
    });

    socket.on("imageRequest", (device_id) => {
        database.getLatestImage(device_id, (err, rows, fields) => {
            if(err) {failureMessage(err);}

            if(rows.length > 1) {
              const buffer = Buffer.from(rows[0].image_data);
              const timestamp = rows[0].timestamp;
              socket.emit('imageUpdate', { buffer: Array.from(buffer), timestamp });
            } else  {
              failureMessage("no image");
            }
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
        queueTokenCheck = true;
        socket.emit('heartbeatRequest', Date.now());
    }, 2500);
  });
};
