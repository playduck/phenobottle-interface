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

function insertMeasurement(
    device_id, timestamp, measurement_type, value, callback) {
  const query =
      `INSERT INTO Measurements (device_id, timestamp, measurement_type, value) VALUES (?, ?, ?, ?)`;
  db.query(query, [device_id, timestamp, measurement_type, value], callback);
}

function insertImage(device_id, timestamp, image_mime, image_data, callback) {
  const query =
      `INSERT INTO Images (device_id, timestamp, image_mime, image_data) VALUES (?, ?, ?, X'${
          image_data}')`;
  db.query(query, [device_id, timestamp, image_mime], callback);
}

function getDevices(callback) {
  const deviceQuery = 'SELECT * FROM Devices';
  db.query(deviceQuery, callback);
}

function getDeviceTasks(device_id, callback) {
  const taskQuery = 'SELECT * FROM Tasks WHERE device_id = ?';
  db.query(taskQuery, [device_id], callback);
}

function getLatestImage(device_id, callback) {
  // TODO implement caching?
  const imageQuery =
      'SELECT * FROM Images WHERE device_id = ? ORDER BY timestamp DESC LIMIT 1';
  db.query(imageQuery, [device_id], callback);
}

function getLatestMeasurements(device_id, type, amount, callback) {
  const imageQuery =
      'SELECT * FROM Measurements WHERE device_id = ? AND measurement_type = ? ORDER BY timestamp DESC LIMIT ?';
  db.query(imageQuery, [device_id, type, amount], callback);
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
  insertMeasurement,
  insertImage,
  getDevices,
  getDeviceTasks,
  getLatestImage,
  getLatestMeasurements,
  getAllData
}
