/* jshint esversion:21 */

const fs = require('fs');
const exceljs = require('exceljs');
const sharp = require('sharp');

async function generateExcel(data) {
  const workbook = new exceljs.Workbook();
  const devicesSheet = workbook.addWorksheet('Devices');
  const measurementsSheet = workbook.addWorksheet('Measurements');
  const imagesSheet = workbook.addWorksheet('Images');

  console.log(data)

  // Add data to devices sheet
  devicesSheet.columns = [
    {header: 'device_id', key: 'device_id'},
    {header: 'device_name', key: 'device_name'}
  ];
  data.devices.forEach((device) => {
    devicesSheet.addRow(device);
  });

  // Add data to measurements sheet
  measurementsSheet.columns = [
    {header: 'measurement_id', key: 'measurement_id'},
    {header: 'device_id', key: 'device_id'},
    {header: 'timestamp', key: 'timestamp'},
    {header: 'measurement_type', key: 'measurement_type'},
    {header: 'value', key: 'value'}
  ];
  data.measurements.forEach((measurement) => {
    measurementsSheet.addRow(measurement);
  });

  // Add data to images sheet
  imagesSheet.columns = [
    {header: 'image_id', key: 'image_id'},
    {header: 'device_id', key: 'device_id'},
    {header: 'timestamp', key: 'timestamp'}
  ];

  const column = imagesSheet.getColumn(4);
  column.width = 200 / 8;

  let position = 1;
  const imagePromises = data.images.map((image, rowIndex) => {
    return sharp(image.image_data)
        .toFormat('jpg')
        .toBuffer()
        .then((imgBuffer) => {
          const imageId = workbook.addImage({
            buffer: imgBuffer,
            extension: 'jpg',
          });

          imagesSheet.addRow({
                image_id: image.image_id,
                device_id: image.device_id,
                timestamp: image.timestamp
           });

          imagesSheet.addImage(imageId,
            {  tl: { col: 3, row: position },
            ext: { width: 16*100/9, height: 100 }, // FIXME
            editAs: 'absolute'}
          );
          position++;

          const row = imagesSheet.getRow(position);
          row.height = 100;

        });
        });

    await Promise.all(imagePromises);

    return workbook;
}

module.exports = {
    generateExcel}
