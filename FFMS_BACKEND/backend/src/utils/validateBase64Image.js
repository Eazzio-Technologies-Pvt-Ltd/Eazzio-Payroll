const { BadRequestError } = require('./errors');

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const DEFAULT_MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

/**
 * Validate a base64-encoded image string.
 * Checks MIME type (if data URI) and estimated file size.
 * 
 * @param {string} base64Str - The base64 string (with or without data URI prefix)
 * @param {number} maxSizeBytes - Maximum allowed size in bytes (default 5MB)
 * @throws {BadRequestError} if validation fails
 */
const validateBase64Image = (base64Str, maxSizeBytes = DEFAULT_MAX_SIZE_BYTES) => {
  if (!base64Str || typeof base64Str !== 'string') {
    throw new BadRequestError('Image data is required');
  }

  // If it has a data URI prefix, validate the MIME type
  if (base64Str.startsWith('data:')) {
    const mimeMatch = base64Str.match(/^data:([\w/]+);base64,/);
    if (!mimeMatch) {
      throw new BadRequestError('Invalid image data URI format');
    }
    if (!ALLOWED_MIME_TYPES.includes(mimeMatch[1])) {
      throw new BadRequestError(`Invalid image type "${mimeMatch[1]}". Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`);
    }
  } else {
    // Raw base64 — validate it looks like base64
    if (!/^[A-Za-z0-9+/=]+$/.test(base64Str.substring(0, 100))) {
      throw new BadRequestError('Invalid base64 image data');
    }
  }

  // Estimate decoded size (base64 encodes 3 bytes into 4 chars)
  const base64Data = base64Str.includes(',') ? base64Str.split(',')[1] : base64Str;
  const sizeInBytes = Math.ceil((base64Data.length * 3) / 4);

  if (sizeInBytes > maxSizeBytes) {
    const maxMB = (maxSizeBytes / (1024 * 1024)).toFixed(1);
    throw new BadRequestError(`Image exceeds maximum size of ${maxMB}MB`);
  }
};

module.exports = { validateBase64Image };
