/* jshint esversion:6 */

const PORT = process.env.PORT || 8080;

const users = require('./users.json');

const express = require('express');
const cors = require('cors')
const basicAuth = require('express-basic-auth');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const path = require('path');

const bcrypt = require('bcrypt');
const saltRounds = 10;

const crypto = require('crypto');
const authSecretKey = crypto.randomBytes(256).toString('base64');

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
  console.log(req)
  return req.auth ?
      ('Credentials ' + req.auth.user + ':' + req.auth.password + ' rejected') :
      'No credentials provided'
}

var corsOptions = {
  optionsSuccessStatus:
      200  // some legacy browsers (IE11, various SmartTVs) choke on 204
}

                  app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser('secret'));

const authenticateToken =
    (token, callback) => {
      jwt.verify(token, authSecretKey, callback);
    }

const authenticate = (req, res, next) => {
  const token = req.cookies['x-auth-token'];

  if (token) {
    authenticateToken(token, (err, user) => {
      if (err) {
        req.user = null;
      } else {
        req.user = user;
      }
      next();
    });
  } else {
    req.user = null;
    next();
  }
};

let basicAuthUsers = {};
for (const user in users) {
  users[user].hashedPassword =
      bcrypt.hashSync(users[user].plainPassword, saltRounds);

  if (users[user].level >= 1) {
    basicAuthUsers[users[user].username] = users[user].plainPassword;
  }
}

const basic = (basicAuth({
  users: basicAuthUsers,
  unauthorizedResponse: getUnauthorizedResponse,
  challenge: true,
}));

const faviconPath = path.join(__dirname, '/www', 'public/assets/favicon.ico');
app.use('/favicon.ico', express.static(faviconPath));

app.use(authenticate);

const publicPath = path.join(__dirname, '/www', 'public');
const privatePath = path.join(__dirname, '/www', 'private');

app.use('/', (req, res, next) => {
  const rootDir = req.user ? privatePath : publicPath;
  express.static(rootDir)(req, res, next);
});

// Login route
app.post('/api/v1/login', async (req, res) => {
  const {username, password} = req.body;

  for (const user in users) {
    if (basicAuth.safeCompare(username, users[user].username)) {
      if ((await bcrypt.compare(password, users[user].hashedPassword)) ===
          true) {
        const token = jwt.sign({username}, authSecretKey, {expiresIn: '6h'});

        res.cookie('x-auth-token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
        });

        res.status(200).send({message: '/'});
        return;
      }
    }
  }
  // deter side-channel attacks, by delaying for a random amount of time
  await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 2500));
  res.status(401).send({message: 'failure'});
});

app.post('/api/v1/logout', (req, res) => {
  res.cookie('x-auth-token', '', {
    expires: new Date(Date.now() - 1000)
  });  // Set the cookie to expire immediately
  res.status(200).send({message: '/'});
});

// POST endpoint for temperature, CO2, and OD measurements
app.post('/api/v1/measurement', basic, (req, res) => {
  const device_id = req.header('Device-Id');
  const timestamp = req.header('Timestamp');
  const {measurement_type, value} = req.body;

  if(!device_id || !timestamp || !measurement_type || !value) {
    return res.status(400).send("Invalid request");
  }

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
    case 'image/jpg':
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
app.post('/api/v1/image', basic, upload.single('image'), async (req, res) => {
  const device_id = req.header('Device-Id');
  const timestamp = req.header('Timestamp');
  const image_mime = req.header('Form-Mime');

  if (!req.file) {
    return res.status(400).send('No files were uploaded.');
  }
  if(!device_id || !timestamp || !image_mime) {
    return res.status(400).send("Invalid request");
  }

  let avifBuffer;
  const avif_mime = 'image/avif';
  if (image_mime == avif_mime) {
    avifBuffer = req.file.buffer;
  } else {
    avifBuffer = await convertImage(req.file.buffer, image_mime);
  }

  io.emit('imageUpdate', {buffer: Array.from(avifBuffer), timestamp});

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
});

socket(io, authenticateToken, database);

app.get('/api/v1/image/:id', (req, res) => {
  if (!req.user) {
    return res.status(401).redirect('/?failed=unauthorized');
  }

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

app.get('/api/v1/export', async (req, res) => {
  if (!req.user) {
    return res.status(401).redirect('/?failed=unauthorized');
  }

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

app.get('*', (req, res) => {
  return res.status(401).redirect('/?failed=unauthorized');
})

// FIXME
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

server.keepAliveTimeout = 30 * 1000; // seconds
server.listen(PORT, () => console.log(`server listening on port: ${PORT}`));
