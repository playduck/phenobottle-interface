const sharp = require('sharp');

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

module.exports = {convertImage};
