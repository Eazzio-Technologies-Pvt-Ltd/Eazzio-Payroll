const sharp = require('sharp');
const { BadRequestError } = require('./errors');

/**
 * Detects if a human face is likely present in a base64 image
 * by analyzing skin tone pixel distribution.
 * 
 * Skin tone detection works by checking if enough pixels
 * fall within human skin color ranges in RGB space.
 */
const detectFaceInBase64 = async (base64Str) => {
  // Strip data URI prefix if present
  const base64Data = base64Str.includes(',')
    ? base64Str.split(',')[1]
    : base64Str;

  const buffer = Buffer.from(base64Data, 'base64');

  // Resize to 100x100 for fast processing
  const { data, info } = await sharp(buffer)
    .resize(100, 100)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const totalPixels = info.width * info.height;
  let skinPixels = 0;

  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Skin tone detection in RGB space
    const isSkin =
      r > 95 && g > 40 && b > 20 &&
      r > g && r > b &&
      Math.abs(r - g) > 15 &&
      r - b > 15;

    if (isSkin) skinPixels++;
  }

  const skinRatio = skinPixels / totalPixels;

  // At least 8% of pixels should be skin tone for a valid selfie
  if (skinRatio < 0.08) {
    throw new BadRequestError(
      'No face detected in selfie. Please take a clear selfie showing your face.'
    );
  }

  return true;
};

module.exports = { detectFaceInBase64 };