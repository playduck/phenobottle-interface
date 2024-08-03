/* jshint esversion:6 */

const PORT = 8080;

const express = require('express');
const basicAuth = require('express-basic-auth');
const app = express();

const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({storage: storage});

const server = require('http').createServer(app);
const io = require('socket.io')(server);

const sharp = require('sharp');

const database = require('./database.js');
const exporter = require('./exporter.js');
const socket = require('./socket.js');
const {time} = require('console');

database.connect();

function exitHandler(options, exitCode) {
  database.disconnect();

  if (options.cleanup) {
    console.log('clean');
  }
  if (exitCode || exitCode === 0) {
    console.log('return code', exitCode);
  }
  if (options.exit) process.exit();
}

process.stdin.resume();  // so the program will not close instantly
process.on('exit', exitHandler.bind(null, {cleanup: true}));
process.on('SIGINT', exitHandler.bind(null, {exit: true}));
process.on('SIGUSR1', exitHandler.bind(null, {exit: true}));
process.on('SIGUSR2', exitHandler.bind(null, {exit: true}));
process.on('uncaughtException', exitHandler.bind(null, {exit: true}));

function getUnauthorizedResponse(req) {
  return req.auth ?
      ('Credentials ' + req.auth.user + ':' + req.auth.password + ' rejected') :
      'No credentials provided'
}

app.use('/favicon.ico', express.static('public/assets/favicon.ico'));

app.use(basicAuth({
  users: {
    '***REMOVED***': '***REMOVED***',
  },
  unauthorizedResponse: getUnauthorizedResponse,
  challenge: true,
}));

socket(io, database);

app.use(express.json())

// POST endpoint for temperature, CO2, and OD measurements
app.post('/measurements', (req, res) => {
  const {device_id, timestamp, measurement_type, value} = req.body;
  database.insertMeasurement(
      device_id, timestamp, measurement_type, value, (err, results) => {
        if (err) {
          console.error(err);
          res.status(500).send({message: 'Error inserting measurement'});
        } else {
          res.send({message: 'Measurement inserted successfully'});
        }
      });

  socket.emit(
      `measurement${capitalizeFirstLetter(measurement_type)}`,
      [{timestamp: timestamp, value: value}]);
});

async function convertImage(image_data, image_mime) {
  const sharpImage = sharp(image_data);
  let format;

  // Determine the format of the input image
  switch (image_mime) {
    case 'image/webp':
      format = 'webp';
      break;
    case 'image/jpeg':
      format = 'jpeg';
      break;
    case 'image/png':
      format = 'png';
      break;
    default:
      throw new Error(`Unsupported image format: ${image_mime}`);
  }

  // Convert the image to the desired format (avif)
  const avifBuffer = sharpImage.toFormat(format)
                         .avif({
                           quality: 50,
                           effort: 5,
                         })
                         .toBuffer();

  return avifBuffer;
}

// POST endpoint for images
app.post('/image', upload.single('image'), async (req, res) => {
  const device_id = req.header('Device-Id');
  const timestamp = req.header('Timestamp');
  const image_mime = req.header('Form-Mime');

  if (!req.file) {
    return res.status(400).send('No files were uploaded.');
  }

  let avifBuffer;
  const avif_mime = 'image/avif';
  if (image_mime == avif_mime) {
    avifBuffer = req.file.buffer;
  } else {
    avifBuffer = await convertImage(req.file.buffer, image_mime);
  }
  const imageHexString = avifBuffer.toString('hex');

  database.insertImage(
      device_id, timestamp, avif_mime, imageHexString, (err, results) => {
        if (err) {
          console.error(err);
          res.status(500).send({message: 'Error inserting image'});
        } else {
          res.send({message: 'Image inserted successfully'});
        }
      });

  io.emit('imageUpdate', {buffer: Array.from(avifBuffer), timestamp});
});

app.get('/image/:id', (req, res) => {
  const deviceId = req.params.id;

  database.getLatestImage(deviceId, (err, rows, fields) => {
    if (err || rows.length < 1) {
      res.status(404).send(`Image not found for id ${deviceId}`);
    } else {
      res.set('Cache-Control', 'public, max-age=60');
      res.set('Content-Type', 'image/webp');
      res.set('timestamp', rows[0].timestamp.toString());
      res.send(rows[0].image_data);
    }
  });
});

app.get('/export', async (req, res) => {
  const data = await database.getAllData();
  const workbook = await exporter.generateExcel(data);

  const excelBuffer = await workbook.xlsx.writeBuffer();
  res.setHeader('Content-Disposition', 'attachment; filename="data.xlsx"');
  res.set('Cache-Control', 'public, max-age=0');
  res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(excelBuffer);
});

// FIXME
setInterval(() => {
  io.emit(
      'measurementTemperature',
      [{timestamp: Date.now(), value: (Math.sin(Date.now() / 5000) * 0.5 + 0.5) * 60 - 10}]);
  io.emit('measurementOD', [{timestamp: Date.now(), value:  Math.sin(Date.now() / 500) * 0.5 + 0.5}]);
  io.emit(
      'measurementCO2', [{timestamp: Date.now(), value:  (Math.sin(Date.now() / 2000) * 0.5 + 0.5) * 1000}]);
}, 1000);

app.use('/', express.static('public'));

server.listen(PORT, () => console.log(`server listening on port: ${PORT}`));
