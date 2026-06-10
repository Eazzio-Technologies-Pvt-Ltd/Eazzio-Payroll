const rateLimit = require('express-rate-limit');
const { errorResponse } = require('../utils/response');

// const authLimiter = rateLimit({
//   windowMs: 30 * 60 * 1000, // 15 minutes
//   max: 12, // Limit each IP to 5 requests per windowMs
//   standardHeaders: true,
//   legacyHeaders: false,
//   validate: false,
//   handler: (req, res) => {
//     return errorResponse(res, 'Too many login attempts. Please try again after 15 minutes.', 429, null, 'RATE_LIMIT_ERROR');
//   }
// });

// Disabling authLimiter temporarily as per request
const authLimiter = (req, res, next) => next();

// const apiLimiter = rateLimit({
//   windowMs: 60 * 1000, // 1 minute
//   max: 100, // Limit each IP or User to 100 requests per minute
//   standardHeaders: true,
//   legacyHeaders: false,
//   validate: false,
//   keyGenerator: (req) => req.user?.id || req.ip,
//   handler: (req, res) => {
//     return errorResponse(res, 'Too many API requests. Please slow down.', 429, null, 'RATE_LIMIT_ERROR');
//   }
// });
const apiLimiter = (req, res, next) => next();

// const exportLimiter = rateLimit({
//   windowMs: 60 * 60 * 1000, // 1 hour
//   max: 10, // Limit each IP or User to 10 exports per hour
//   standardHeaders: true,
//   legacyHeaders: false,
//   validate: false,
//   keyGenerator: (req) => req.user?.id || req.ip,
//   handler: (req, res) => {
//     return errorResponse(res, 'Export limit reached. Maximum 10 exports per hour.', 429, null, 'RATE_LIMIT_ERROR');
//   }
// });
const exportLimiter = (req, res, next) => next();

module.exports = {
  authLimiter,
  apiLimiter,
  exportLimiter
};

