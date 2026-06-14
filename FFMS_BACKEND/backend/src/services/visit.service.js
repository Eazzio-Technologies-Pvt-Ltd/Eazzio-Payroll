const prisma = require('../config/prisma');
const cloudinary = require('../config/cloudinary');
const logger = require('../config/logger');

/**
 * Upload multiple visit report images to Cloudinary
 */
const uploadVisitImages = async (images) => {
  const uploadedUrls = [];
  if (!images || !Array.isArray(images)) return uploadedUrls;
  for (const imgBase64 of images) {
    try {
      const formattedStr = imgBase64.startsWith('data:image') 
        ? imgBase64 
        : `data:image/jpeg;base64,${imgBase64}`;

      const res = await cloudinary.uploader.upload(formattedStr, {
        folder: 'ffms/visits',
        resource_type: 'image'
      });
      uploadedUrls.push(res.secure_url);
    } catch (err) {
      logger.error('Failed to upload visit image:', err);
    }
  }
  return uploadedUrls;
};

/**
 * Upload signature base64 to Cloudinary
 */
const uploadSignature = async (signatureBase64) => {
  if (!signatureBase64) return null;
  try {
    const formatted = signatureBase64.startsWith('data:image')
      ? signatureBase64
      : `data:image/jpeg;base64,${signatureBase64}`;
    const res = await cloudinary.uploader.upload(formatted, {
      folder: 'ffms/signatures',
      resource_type: 'image'
    });
    return res.secure_url;
  } catch (err) {
    logger.error('Failed to upload signature:', err);
    return null;
  }
};

/**
 * Create a new visit report
 */
const createVisitReport = async (userId, data) => {
  const { images, signatureBase64, ...rest } = data;

  const imageUrls = await uploadVisitImages(images);
  const signatureUrl = await uploadSignature(signatureBase64);

  const visitReport = await prisma.visitReport.create({
    data: {
      ...rest,
      userId,
      images: imageUrls,
      signatureUrl,
      checkInTime: rest.checkInTime ? new Date(rest.checkInTime) : null,
      checkOutTime: rest.checkOutTime ? new Date(rest.checkOutTime) : null,
      nextFollowUpDate: rest.nextFollowUpDate ? new Date(rest.nextFollowUpDate) : null,
    }
  });

  return visitReport;
};

module.exports = {
  createVisitReport
};
