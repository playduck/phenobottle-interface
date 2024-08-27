const path = require('path');
const express = require('express');

const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({storage: storage});

const database = require('../database.js');
const {convertImage} = require('../util/image.js');
const exporter = require('../util/exporter.js');
const { time } = require('console');
const exp = require('constants');

// TODO refactor this to a utils class, copy exists in socket.js
function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

module.exports = (basic, io, actionQueue) => {
  const router = express.Router();

  // POST endpoint for temperature, CO2, and OD measurements
  router.post('/api/v1/measurement', basic, (req, res) => {
    const device_id = req.header('Device-Id');
    const timestamp = req.header('Timestamp');
    const {measurement_type, value} = req.body;

    if (device_id == undefined || timestamp == undefined || measurement_type == undefined || value == undefined) {
      return res.status(400).send('Invalid request');
    }

    // send to all ws clients
    if(io)  {
      io.emit(
          `measurement${capitalizeFirstLetter(measurement_type)}`,
          [{timestamp: timestamp, value: value}]);
    }

    // write to db
    database.insertMeasurement(
        device_id, timestamp, measurement_type, value, (err, results) => {
          if (err) {
            console.error(err);
            res.status(500).send({message: 'Error inserting measurement'});
          } else {
            res.send({status: "success", message: 'Measurement inserted successfully'});
          }
        });
  });

  // POST endpoint for images
  router.post(
      '/api/v1/image', basic, upload.single('image'), async (req, res) => {
        const device_id = req.header('Device-Id');
        const timestamp = req.header('Timestamp');
        const image_mime = req.header('Form-Mime');

        if (!req.file) {
          return res.status(400).send('No files were uploaded.');
        }
        if (!device_id || !timestamp || !image_mime) {
          return res.status(400).send('Invalid request');
        }

        // convert to avif if given mime type is different
        let avifBuffer;
        const avif_mime = 'image/avif';
        if (image_mime == avif_mime) {
          avifBuffer = req.file.buffer;
        } else {
          avifBuffer = await convertImage(req.file.buffer, image_mime);
        }

        if(io)  {
          // send buffer directly to ws clients
          io.emit('imageUpdate', {buffer: Array.from(avifBuffer), timestamp});
        }

        // save to db as hex blob
        const imageHexString = avifBuffer.toString(
            'hex');  // this can never produce SQL escaping content
        database.insertImage(
            device_id, timestamp, avif_mime, imageHexString, (err, results) => {
              if (err) {
                console.error(err);
                res.status(500).send({message: 'Error inserting image'});
              } else {
                res.send({status: "success", message: 'Image inserted successfully'});
              }
            });
      });

  router.get('/api/v1/state/:id', basic, (req, res) => {
    const deviceId = req.params.id;

    const response = {
      "state": "failure",
      "tasks": [],
      "settings": [],
      "actions": []
    };

    database.getDeviceTasks(deviceId, (terr, taskRows) => {
      if(terr) return res.send(response);
      database.getDeviceSettings(deviceId, (serr, settingsRows) => {
        if(serr) return res.send(response);

        const actions = actionQueue[deviceId] || [];
        actionQueue[deviceId] = [];

        response.state = "success";
        response.tasks = taskRows;
        response.settings = settingsRows;
        response.actions = actions;

        res.send(response);
      });
    });
  });

  // image get endpoint, latest image per device_id
  router.get('/api/v1/image/:id', (req, res) => {
    if (!req.user) {  // auth check
      return res.status(401).redirect('/?failed=unauthorized');
    }

    const deviceId = req.params.id;

    database.getLatestImage(deviceId, (err, rows, fields) => {
      if (err || rows.length < 1) {
        res.status(404).send(`Image not found for id ${deviceId}`);
      } else {
        // increase cache life to reduce db load
        res.set('Cache-Control', 'public, max-age=60');
        res.set('Content-Type', 'image/webp');
        res.set('timestamp', rows[0].timestamp.toString());
        res.send(rows[0].image_data);
      }
    });
  });

  // excel export endpoint
  router.get('/api/v1/export', async (req, res) => {
    if (!req.user) {  // auth check
      return res.status(401).redirect('/?failed=unauthorized');
    }

    const data = await database.getAllData();
    const workbook = await exporter.generateExcel(data);
    const excelBuffer = await workbook.xlsx.writeBuffer();

    // send as spreadsheet directly from mem buffer
    res.setHeader('Content-Disposition', 'attachment; filename="data.xlsx"');
    res.set('Cache-Control', 'public, max-age=0');
    res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(excelBuffer);
  });

  return router;
};
