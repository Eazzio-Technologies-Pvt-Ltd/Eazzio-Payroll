const rateLimit = require('express-rate-limit');
const { errorResponse } = require('../utils/response');
const logger = require('../config/logger');

const authLimiter = rateLimit({
  windowMs: 30 * 60 * 1000, // 30 minutes
  max: 12, // Limit each IP to 12 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  handler: (req, res) => {
    logger.warn('SECURITY_EVENT', {
      type: 'RATE_LIMIT_EXCEEDED',
      limiter: 'authLimiter',
      ip: req.ip,
      path: req.originalUrl,
      timestamp: new Date().toISOString()
    });
    return errorResponse(res, 'Too many login attempts. Please try again after 30 minutes.', 429, null, 'RATE_LIMIT_ERROR');
  }
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // Limit each IP or User to 100 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  keyGenerator: (req) => req.user?.id || req.ip,
  handler: (req, res) => {
    logger.warn('SECURITY_EVENT', {
      type: 'RATE_LIMIT_EXCEEDED',
      limiter: 'apiLimiter',
      userId: req.user?.id,
      ip: req.ip,
      path: req.originalUrl,
      timestamp: new Date().toISOString()
    });
    return errorResponse(res, 'Too many API requests. Please slow down.', 429, null, 'RATE_LIMIT_ERROR');
  }
});

const exportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP or User to 10 exports per hour
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  keyGenerator: (req) => req.user?.id || req.ip,
  handler: (req, res) => {
    logger.warn('SECURITY_EVENT', {
      type: 'RATE_LIMIT_EXCEEDED',
      limiter: 'exportLimiter',
      userId: req.user?.id,
      ip: req.ip,
      path: req.originalUrl,
      timestamp: new Date().toISOString()
    });
    return errorResponse(res, 'Export limit reached. Maximum 10 exports per hour.', 429, null, 'RATE_LIMIT_ERROR');
  }
});

module.exports = {
  authLimiter,
  apiLimiter,
  exportLimiter
};
