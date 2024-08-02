/* jshint esversion:6 */

const PORT = 8080;

const express = require('express');
const basicAuth = require('express-basic-auth');
const multer = require('multer');

const database = require('./database.js');
const exporter = require('./exporter.js');

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

const app = express();

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

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
  realm: '***REMOVED***-phenobottle',
}));

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
});

// POST endpoint for images
app.post('/images', upload.single('image'), (req, res) => {
    const device_id = req.header('Device-Id');
    const timestamp = req.header('Timestamp');

    if (!req.file) {
        return res.status(400).send('No files were uploaded.');
    }

    const imageHexString = req.file.buffer.toString('hex');

    database.insertImage(device_id, timestamp, imageHexString, (err, results) => {
        if (err) {
            console.error(err);
            res.status(500).send({ message: 'Error inserting image' });
        } else {
            res.send({ message: 'Image inserted successfully' });
        }
    });
});

app.get('/raw', async (req, res) => {
    const data = await database.getAllData();
    const workbook = await exporter.generateExcel(data);

    const excelBuffer = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Disposition', 'attachment; filename="data.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(excelBuffer);
});

app.use('/', express.static('public'));

app.listen(PORT, () => console.log(`server listening on port: ${PORT}`));
