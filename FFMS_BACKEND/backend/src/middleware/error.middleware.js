const logger = require('../config/logger');
const { errorResponse } = require('../utils/response');

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let code = err.code || 'INTERNAL_ERROR';
  let message = err.message || 'An unexpected error occurred';
  let details = err.details || null;

  // Log error (especially 500s)
  if (statusCode >= 500) {
    logger.error('Unhandled System Error:', {
      message: err.message,
      stack: err.stack,
      path: req.originalUrl,
      method: req.method
    });
  } else {
    logger.warn('Client Error:', {
      statusCode,
      code,
      message,
      path: req.originalUrl
    });
  }

  // Handle Prisma Known Errors (like unique constraints)
  if (err.code && err.code.startsWith('P')) {
    statusCode = 400;
    code = 'DATABASE_ERROR';
    if (err.code === 'P2002') {
      statusCode = 409;
      code = 'CONFLICT_ERROR';
      message = `Unique constraint failed on field(s): ${err.meta?.target?.join(', ')}`;
    } else if (err.code === 'P2025') {
      statusCode = 404;
      code = 'NOT_FOUND_ERROR';
      message = err.meta?.cause || 'Record not found';
    }
  }

  return errorResponse(res, message, statusCode, details, code);
};

module.exports = errorHandler;
