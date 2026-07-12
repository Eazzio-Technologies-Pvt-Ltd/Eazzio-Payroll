const prisma = require('../config/prisma');
const logger = require('../config/logger');

const auditLogger = (req, res, next) => {
  req.logAudit = async ({ action, resource, resourceId, oldValues = null, newValues = null }) => {
    try {
      const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];
      const userId = req.user?.id || null;

      await prisma.auditLog.create({
        data: {
          userId,
          action,
          resource,
          resourceId: String(resourceId),
          oldValues: oldValues ? JSON.parse(JSON.stringify(oldValues)) : null,
          newValues: newValues ? JSON.parse(JSON.stringify(newValues)) : null,
          ipAddress,
          userAgent
        }
      });
    } catch (err) {
      logger.error('Failed to write audit log:', err);
    }
  };

  next();
};

module.exports = auditLogger;
