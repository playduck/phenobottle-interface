const fs = require('fs');
const path = require('path');
const mysql = require('mysql');

const db = mysql.createConnection({
  host: '***REMOVED***',
  user: 'k122486_pheno_***REMOVED***',
  password: '***REMOVED***',
  database: '***REMOVED***'
});

function connect() {
  console.log('connecting to db');
  db.connect();

  createDb();
}

function disconnect() {
  console.log('disconnecting form db')
  db.end()
}

function runCommand(sqlCommand, callback) {
  if (!sqlCommand || !(/\S/.test(sqlCommand))) {
    return;
  }
  db.query(sqlCommand, callback);
}

function readCommand(filename) {
  const filePath = path.join(__dirname, 'sql', filename) + '.sql';
  const text = fs.readFileSync(filePath, {encoding: 'utf-8'}).toString();
  const commands = text.split(/;/g);
  return commands;
}

function createDb() {
  console.log('building db')
  const commands = readCommand('createDb');

  commands.forEach((command) => {
    runCommand(command);
  });
}

function getTables() {
  runCommand('SHOW FULL TABLES;', (err, rows, fields) => {
    if (err) throw err;

    for (const row in rows) {
      console.log(rows[row])
    }
  });
}

function insertMeasurement(
    device_id, timestamp, measurement_type, value, callback) {
  const query =
      `INSERT INTO Measurements (device_id, timestamp, measurement_type, value) VALUES (?, ?, ?, ?)`;
  db.query(
      query, [device_id, timestamp, measurement_type, value], callback);
}

function insertImage(device_id, timestamp, image_data, callback) {
  const query =
      `INSERT INTO Images (device_id, timestamp, image_data) VALUES (?, ?, X'${image_data}')`;
  db.query(query, [device_id, timestamp], callback);
}

async function getAllData() {
  const devicesQuery = 'SELECT * FROM Devices';
  const measurementsQuery = 'SELECT * FROM Measurements';
  const imagesQuery = 'SELECT * FROM Images';

  const [devicesResult, measurementsResult, imagesResult] = await Promise.all([
    new Promise((resolve, reject) => {
      db.query(devicesQuery, (err, results) => {
        if (err) {
          reject(err);
        } else {
          resolve(results);
        }
      });
    }),
    new Promise((resolve, reject) => {
      db.query(measurementsQuery, (err, results) => {
        if (err) {
          reject(err);
        } else {
          resolve(results);
        }
      });
    }),
    new Promise((resolve, reject) => {
      db.query(imagesQuery, (err, results) => {
        if (err) {
          reject(err);
        } else {
          resolve(results);
        }
      });
    })
  ]);

  const data = {
    devices: devicesResult,
    measurements: measurementsResult,
    images: imagesResult
  };

  return data;
}

module.exports = {
  connect,
  disconnect,
  getTables,
  insertMeasurement,
  insertImage,
  getAllData
}
