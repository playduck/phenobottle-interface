const cookie = require('cookie');

module.exports = (io, authenticateToken, database) => {
  let heartbeatInterval;
  console.log("listening for new ws connections")

  const authenticate = (socket, callback) => {
    if(socket.handshake?.headers?.cookie)  {
      token = cookie.parse(socket.handshake.headers.cookie)["x-auth-token"];
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

    function failureMessage(err) {
      socket.emit("failure", err);
    }

    function capitalizeFirstLetter(string) {
      return string.charAt(0).toUpperCase() + string.slice(1);
    }

    socket.use((_, next) =>  {
      authenticate(socket, (err) => {
        if(err) {
          socket.disconnect();
          next(err);
        } else  {
          next();
        }
      });
    });

    socket.on("disconnect", () => {
      console.log("user disconnect")
      clearInterval(heartbeatInterval);
    });

    socket.on("usernameRequest", () => {
      const username = socket?.user?.username;
      socket.emit("username", username);
    })

    socket.on("deviceListRequest", () => {
        database.getDevices((err, rows, fields) => {
            if(err) {failureMessage(err);}

            socket.emit('deviceList', rows);
        });
    });

    socket.on("imageRequest", (device_id) => {
        database.getLatestImage(device_id, (err, rows, fields) => {
            if(err) {failureMessage(err);}

            if(rows.length > 0) {
              const buffer = Buffer.from(rows[0].image_data);
              const timestamp = rows[0].timestamp;
              socket.emit('imageUpdate', { buffer: Array.from(buffer), timestamp });
            } else  {
              failureMessage(`no image for ${device_id}`);
            }
        });
    });

    socket.on("measurementRequest", (device_id, type, amount) => {
      database.getLatestMeasurements(device_id, type, amount, (err, rows, fields) => {
        if(err) {failureMessage(err);}

        socket.emit(`measurement${capitalizeFirstLetter(type)}`, rows);
      });
    });

    socket.on("taskRequest", (device_id) => {
      database.getDeviceTasks(device_id, (err, rows, fields) => {
        if(err) {failureMessage(err);}

        socket.emit("tasks", rows);
      });
    });

    let heartbeatTimeout = 0;

    // Handle heartbeat
    socket.on('heartbeat', () => {
      socket.emit('heartbeatResponse');
      heartbeatTimeout -= 1;
    });

    socket.on('heartbeatResponse', () => {
      heartbeatTimeout -= 1;
    });

    // Send heartbeat request to client every second
    heartbeatInterval = setInterval(() => {
        socket.emit('heartbeatRequest', Date.now());

        heartbeatTimeout += 2;
        if(heartbeatTimeout > 6)  {
          socket.disconnect();
        }
    }, 2500);
  });
};
