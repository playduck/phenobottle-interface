/* jshint esversion:21 */

const PORT = process.env.PORT || 8080;

const express = require('express');
const app = express();

const cors = require('cors');
const cookieParser = require('cookie-parser');

const server = require('http').createServer(app);
const io = require('socket.io')(server);

const database = require('./database.js');
const socket = require('./socket.js');
const loggerMiddleware = require('./util/logger.js');

const frontend_router = require('./routes/frontend.js');
const {authenticate, authenticateToken, auth_router, basic} =
    require('./auth/auth.js');
const api_v1_router = require('./routes/api_v1.js');

const exitHandler = (options, exitCode) => {
  database.disconnect();

  if (options.cleanup) {
    console.log('clean');
  }
  if (exitCode || exitCode === 0) {
    console.log('return code', exitCode);
  }
  if (options.exit) process.exit();
};

process.stdin.resume();  // so the program will not close instantly
process.on('exit', exitHandler.bind(null, {cleanup: true}));
process.on('SIGINT', exitHandler.bind(null, {exit: true}));
process.on('SIGUSR1', exitHandler.bind(null, {exit: true}));
process.on('SIGUSR2', exitHandler.bind(null, {exit: true}));
process.on('uncaughtException', exitHandler.bind(null, {exit: true}));

const corsOptions = {
  optionsSuccessStatus: 200
};

actionQueue = [];

app.use(loggerMiddleware);
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser('secret'));
app.use(authenticate);
app.use(frontend_router);
app.use(auth_router);
app.use(api_v1_router(basic, io, actionQueue));

// catch-all handler
app.get('*', (req, res) => {
  return res.status(401).redirect('/?failed=unauthorized');
})

// start ws server
socket(io, authenticateToken, database, actionQueue);

// FIXME test sending data
setInterval(() => {
  io.emit('measurementTemperature', [{
            timestamp: Date.now(),
            value: (Math.sin(Date.now() / 5000) * 0.5 + 0.5) * 60 - 10
          }]);

  io.emit(
      'measurementOD',
      [{timestamp: Date.now(), value: Math.sin(Date.now() / 500) * 0.5 + 0.5}]);


  io.emit('measurementCO2', [{
            timestamp: Date.now(),
            value: (Math.sin(Date.now() / 2000) * 0.5 + 0.5) * 1000
          }]);
}, 1000);

database.connect();

server.keepAliveTimeout = 30 * 1000;  // seconds
server.listen(PORT, () => console.log(`server listening on port: ${PORT}`));
