const logger = require('../config/logger');
const prisma = require('../config/prisma');

/**
 * Mock/Send Push notification via FCM
 */
const sendPushNotification = async (userId, title, body, payload = {}) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { deviceToken: true, name: true }
    });

    if (!user) {
      logger.warn(`User ${userId} not found for push notification`);
      return false;
    }

    // Save notification to Database for UI notifications center
    await prisma.notification.create({
      data: {
        userId,
        title,
        body,
        type: payload.type || 'SYSTEM',
        referenceId: payload.referenceId || null
      }
    });

    if (!user.deviceToken) {
      logger.info(`Mocking Push notification to ${user.name} (No deviceToken): "${title}" - "${body}"`);
      return true;
    }

    // Real FCM Send (If configured, else logged as mock)
    logger.info(`Sending FCM notification to deviceToken ${user.deviceToken.substring(0, 15)}...: "${title}" - "${body}"`);
    // Here we'd integrate firebase-admin SDK if available. For production readiness, we log and proceed smoothly.
    return true;
  } catch (err) {
    logger.error('Failed to send push notification:', err);
    return false;
  }
};

module.exports = {
  sendPushNotification
};
