const path = require('path');
const express = require('express');

const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({storage: storage});

const sharp = require('sharp');

const database = require('../database.js');
const exporter = require('../util/exporter.js');

module.exports = (basic, io) => {
  const router = express.Router();

  // POST endpoint for temperature, CO2, and OD measurements
  router.post('/api/v1/measurement', basic, (req, res) => {
    const device_id = req.header('Device-Id');
    const timestamp = req.header('Timestamp');
    const {measurement_type, value} = req.body;

    if (!device_id || !timestamp || !measurement_type || !value) {
      return res.status(400).send('Invalid request');
    }

    // send to all ws clients
    socket.emit(
        `measurement${capitalizeFirstLetter(measurement_type)}`,
        [{timestamp: timestamp, value: value}]);

    // write to db
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

  // helper func to cnvert images to avif
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

        // send buffer directly to ws clients
        io.emit('imageUpdate', {buffer: Array.from(avifBuffer), timestamp});

        // save to db as hex blob
        const imageHexString = avifBuffer.toString(
            'hex');  // this can never produce SQL escaping content
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
